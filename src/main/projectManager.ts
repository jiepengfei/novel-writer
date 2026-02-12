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
