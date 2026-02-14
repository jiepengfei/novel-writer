import { readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { ProjectManifest, FileNode } from '../shared/types'
import { DEFAULT_MANIFEST } from '../shared/types'

const PROJECT_JSON = 'project.json'
const OUTLINES_DIR = 'outlines'
const CONTENT_DIR = 'content'
const SETTINGS_DIR = 'settings'

export async function initProject(path: string): Promise<ProjectManifest> {
  await mkdir(join(path, OUTLINES_DIR), { recursive: true })
  await mkdir(join(path, CONTENT_DIR), { recursive: true })
  await mkdir(join(path, SETTINGS_DIR), { recursive: true })
  const manifestPath = join(path, PROJECT_JSON)
  try {
    const raw = await readFile(manifestPath, 'utf-8')
    return JSON.parse(raw) as ProjectManifest
  } catch {
    const manifest: ProjectManifest = { ...DEFAULT_MANIFEST }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    return manifest
  }
}

export async function loadProject(path: string): Promise<ProjectManifest> {
  const manifestPath = join(path, PROJECT_JSON)
  try {
    const raw = await readFile(manifestPath, 'utf-8')
    return JSON.parse(raw) as ProjectManifest
  } catch {
    return { ...DEFAULT_MANIFEST }
  }
}

function getDir(category: string): string {
  if (category === 'outlines') return OUTLINES_DIR
  if (category === 'content') return CONTENT_DIR
  if (category === 'settings') return SETTINGS_DIR
  return CONTENT_DIR
}

/** 将树形文件列表扁平化为数组（深度优先） */
function flattenFileNodes(nodes: FileNode[]): FileNode[] {
  const out: FileNode[] = []
  for (const n of nodes) {
    out.push(n)
    if (n.children?.length) out.push(...flattenFileNodes(n.children))
  }
  return out
}

function findInTree(nodes: FileNode[], id: string): FileNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const found = findInTree(n.children, id)
      if (found) return found
    }
  }
  return null
}

function removeFromTree(nodes: FileNode[], id: string): boolean {
  const idx = nodes.findIndex((n) => n.id === id)
  if (idx !== -1) {
    nodes.splice(idx, 1)
    return true
  }
  for (const n of nodes) {
    if (n.children && removeFromTree(n.children, id)) return true
  }
  return false
}

/** 收集某节点及其所有后代的 id（用于递归删除） */
function collectDescendantIds(node: FileNode): string[] {
  const ids = [node.id]
  if (node.children?.length) {
    for (const c of node.children) ids.push(...collectDescendantIds(c))
  }
  return ids
}

/** 确保树中节点为 { id, filename, title, children? }，兼容旧版扁平数据 */
function ensureTreeShape(nodes: FileNode[]): FileNode[] {
  return nodes.map((n) => ({
    ...n,
    children: n.children?.length ? ensureTreeShape(n.children) : undefined
  }))
}

export async function createFile(
  projectPath: string,
  category: 'outlines' | 'content' | 'settings',
  title: string,
  parentId?: string
): Promise<FileNode> {
  const id = uuidv4()
  const filename = `${id}.md`
  const dir = join(projectPath, getDir(category))
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), '', 'utf-8')
  const node: FileNode = { id, filename, title }
  const manifest = await loadProject(projectPath)
  const roots = (manifest.files[category] ?? []) as FileNode[]
  if (parentId) {
    const parent = findInTree(roots, parentId)
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  } else {
    roots.push(node)
  }
  manifest.files[category] = ensureTreeShape(roots)
  await writeFile(
    join(projectPath, PROJECT_JSON),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )
  return node
}

export async function renameFile(
  projectPath: string,
  category: 'outlines' | 'content' | 'settings',
  id: string,
  newTitle: string
): Promise<boolean> {
  const manifest = await loadProject(projectPath)
  const roots = (manifest.files[category] ?? []) as FileNode[]
  const node = findInTree(roots, id)
  if (!node) return false
  node.title = newTitle.trim() || node.title
  await writeFile(
    join(projectPath, PROJECT_JSON),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )
  return true
}

export async function deleteFile(
  projectPath: string,
  category: 'outlines' | 'content' | 'settings',
  id: string
): Promise<boolean> {
  const manifest = await loadProject(projectPath)
  const roots = (manifest.files[category] ?? []) as FileNode[]
  const node = findInTree(roots, id)
  if (!node) return false
  const dir = getDir(category)
  for (const fileId of collectDescendantIds(node)) {
    const n = findInTree(roots, fileId)
    if (n?.filename) {
      try {
        await unlink(join(projectPath, dir, n.filename))
      } catch {
        // ignore if file missing
      }
    }
  }
  removeFromTree(roots, id)
  manifest.files[category] = ensureTreeShape(roots)
  await writeFile(
    join(projectPath, PROJECT_JSON),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )
  return true
}

export async function readFileContent(
  projectPath: string,
  category: string,
  id: string
): Promise<string> {
  const manifest = await loadProject(projectPath)
  const roots = (manifest.files[category as keyof typeof manifest.files] ?? []) as FileNode[]
  const node = findInTree(roots, id)
  if (!node) return ''
  const filePath = join(projectPath, getDir(category), node.filename)
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
}

export async function saveFileContent(
  projectPath: string,
  category: string,
  id: string,
  content: string
): Promise<boolean> {
  const manifest = await loadProject(projectPath)
  const roots = (manifest.files[category as keyof typeof manifest.files] ?? []) as FileNode[]
  const node = findInTree(roots, id)
  if (!node) return false
  const filePath = join(projectPath, getDir(category), node.filename)
  await writeFile(filePath, content, 'utf-8')
  return true
}

/**
 * 重排某分类下根节点或某父节点下子节点的顺序，并写回 project.json。
 * @param parentId - 为 null 时重排根节点；否则重排该父节点的 children。
 * @param newOrderIds - 新的 ID 顺序（仅同层）。
 */
export async function reorderFiles(
  projectPath: string,
  category: 'outlines' | 'content' | 'settings',
  parentId: string | null,
  newOrderIds: string[]
): Promise<boolean> {
  const manifest = await loadProject(projectPath)
  const roots = (manifest.files[category] ?? []) as FileNode[]

  const reorder = (nodes: FileNode[], ids: string[]): FileNode[] => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const ordered: FileNode[] = []
    for (const id of ids) {
      const node = byId.get(id)
      if (node) ordered.push(node)
    }
    const appended = nodes.filter((n) => !ids.includes(n.id))
    return ensureTreeShape([...ordered, ...appended])
  }

  if (parentId === null) {
    manifest.files[category] = reorder(roots, newOrderIds)
  } else {
    const parent = findInTree(roots, parentId)
    if (!parent) return false
    const children = parent.children ?? []
    parent.children = reorder(children, newOrderIds)
  }

  await writeFile(
    join(projectPath, PROJECT_JSON),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )
  return true
}

/**
 * 按 project.json 中顺序将某分类下所有文件合并为单个文本并写入 targetPath。
 * 格式：### [标题]\n\n[内容]\n\n---\n\n（逐章拼接）。
 */
export async function exportProject(
  projectPath: string,
  category: 'outlines' | 'content' | 'settings',
  targetPath: string
): Promise<void> {
  const manifest = await loadProject(projectPath)
  const roots = (manifest.files[category] ?? []) as FileNode[]
  const ordered = flattenFileNodes(roots)
  const dir = join(projectPath, getDir(category))
  const parts: string[] = []
  for (const node of ordered) {
    if (!node.filename) continue
    const title = node.title?.trim() || node.filename
    parts.push(`### ${title}\n\n`)
    try {
      const content = await readFile(join(dir, node.filename), 'utf-8')
      parts.push(content.trimEnd())
    } catch {
      parts.push('')
    }
    parts.push('\n\n---\n\n')
  }
  const out = parts.join('').replace(/\n\n---\n\n$/, '\n')
  await writeFile(targetPath, out, 'utf-8')
}

/**
 * 仅对设定项有效：切换某文件的「参与 AI 上下文」状态，并写回 project.json。
 */
export async function setFileActive(
  projectPath: string,
  id: string,
  isActive: boolean
): Promise<boolean> {
  const manifest = await loadProject(projectPath)
  const roots = (manifest.files.settings ?? []) as FileNode[]
  const node = findInTree(roots, id)
  if (!node) return false
  node.isActive = isActive
  await writeFile(
    join(projectPath, PROJECT_JSON),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )
  return true
}

/**
 * 设置某文件节点的 summary（仅 content 章节用于上下文摘要）。
 */
export async function setFileSummary(
  projectPath: string,
  category: 'outlines' | 'content' | 'settings',
  id: string,
  summary: string
): Promise<boolean> {
  const manifest = await loadProject(projectPath)
  const roots = (manifest.files[category] ?? []) as FileNode[]
  const node = findInTree(roots, id)
  if (!node) return false
  node.summary = summary
  await writeFile(
    join(projectPath, PROJECT_JSON),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )
  return true
}

const STORY_BIBLE_HEADER = '--- STORY BIBLE ---'
const STORY_BIBLE_FOOTER = '-------------------'

export interface GetStoryContextOptions {
  /** 注入的「前文章节摘要」数量上限（滑动窗口），仅当存在章节摘要时生效 */
  maxHistoryChapters?: number
}

/**
 * 读取项目 settings 中仅 isActive === true 的 .md 文件，拼接为 Story Bible 字符串，用于注入 AI 系统指令。
 * options.maxHistoryChapters 供 Phase 8 章节摘要滑动窗口使用，当前仅 Active Settings 时未使用。
 */
export async function getStoryContext(
  projectPath: string,
  options?: GetStoryContextOptions // Phase 8: use options.maxHistoryChapters to slice chapter summaries
): Promise<string> {
  void options
  const manifest = await loadProject(projectPath)
  const allSettings = flattenFileNodes(manifest.files.settings ?? [])
  const active = allSettings.filter((n) => n.filename?.endsWith('.md') && n.isActive === true)
  if (active.length === 0) return ''

  const parts: string[] = [STORY_BIBLE_HEADER]
  const dir = join(projectPath, SETTINGS_DIR)

  for (const node of active) {
    const label = node.title.trim().endsWith('.md') ? node.title.trim() : `${node.title.trim()}.md`
    parts.push(`[File: ${label}]`)
    try {
      const content = await readFile(join(dir, node.filename), 'utf-8')
      parts.push(content.trim() ? content.trim() : '(empty)')
    } catch {
      parts.push('(read error)')
    }
  }

  parts.push(STORY_BIBLE_FOOTER)
  return parts.join('\n\n')
}
