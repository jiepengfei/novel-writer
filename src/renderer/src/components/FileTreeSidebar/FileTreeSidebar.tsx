import React, { useState, useRef, useEffect } from 'react'
import { useAppStore, type FileCategory } from '../../store/useAppStore'
import type { FileNode } from '../../../../shared/types'

const CATEGORIES: { key: FileCategory; label: string }[] = [
  { key: 'outlines', label: '大纲' },
  { key: 'content', label: '正文' },
  { key: 'settings', label: '设定' }
]

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

function addChildToTree(nodes: FileNode[], parentId: string | null, newNode: FileNode): FileNode[] {
  if (!parentId) return [...nodes, newNode]
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children ?? []), newNode] }
    }
    if (n.children?.length) {
      return { ...n, children: addChildToTree(n.children, parentId, newNode) }
    }
    return n
  })
}

function removeFromTree(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children?.length ? { ...n, children: removeFromTree(n.children, id) } : n))
}

function updateInTree(nodes: FileNode[], id: string, patch: Partial<FileNode>): FileNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch }
    if (n.children?.length) {
      return { ...n, children: updateInTree(n.children, id, patch) }
    }
    return n
  })
}

function Section({
  label,
  category,
  roots,
  activeFile,
  editingId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onAddRoot,
  onAddChild,
  onDelete,
  onStartRename,
  onFinishRename,
  onToggleActive
}: {
  label: string
  category: FileCategory
  roots: FileNode[]
  activeFile: { id: string; category: string } | null
  editingId: string | null
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onSelect: (id: string, category: FileCategory) => void
  onAddRoot: (category: FileCategory) => void
  onAddChild: (category: FileCategory, parentId: string) => void
  onDelete: (id: string, category: FileCategory) => void
  onStartRename: (category: FileCategory, id: string) => void
  onFinishRename: (category: FileCategory, id: string, newTitle: string) => void
  onToggleActive?: (id: string, isActive: boolean) => void
}): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, id: string): void => {
    e.preventDefault()
    setContextMenu({ id, x: e.clientX, y: e.clientY })
  }

  const handleDelete = async (): Promise<void> => {
    if (!contextMenu) return
    await onDelete(contextMenu.id, category)
    setContextMenu(null)
  }

  const handleRenameClick = (): void => {
    if (!contextMenu) return
    onStartRename(category, contextMenu.id)
    setContextMenu(null)
  }

  const handleAddChildClick = (): void => {
    if (!contextMenu) return
    onAddChild(category, contextMenu.id)
    setContextMenu(null)
  }

  return (
    <div className="mb-2">
      <div
        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-100 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAddRoot(category)
          }}
          className="text-gray-500 hover:text-gray-800 text-lg leading-none"
          title="新建"
        >
          +
        </button>
      </div>
      {!collapsed && (
        <ul className="pl-2 text-sm">
          {roots.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              category={category}
              depth={0}
              activeFile={activeFile}
              editingId={editingId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onContextMenu={handleContextMenu}
              onStartRename={onStartRename}
              onFinishRename={onFinishRename}
              contextMenu={contextMenu}
              onCloseContextMenu={() => setContextMenu(null)}
              onRenameClick={handleRenameClick}
              onDeleteClick={handleDelete}
              onAddChildClick={handleAddChildClick}
              onToggleActive={onToggleActive}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function TreeNode({
  node,
  category,
  depth,
  activeFile,
  editingId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onAddChild,
  onDelete,
  onContextMenu,
  onStartRename,
  onFinishRename,
  contextMenu,
  onCloseContextMenu,
  onRenameClick,
  onDeleteClick,
  onAddChildClick,
  onToggleActive
}: {
  node: FileNode
  category: FileCategory
  depth: number
  activeFile: { id: string; category: string } | null
  editingId: string | null
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onSelect: (id: string, category: FileCategory) => void
  onAddChild: (category: FileCategory, parentId: string) => void
  onDelete: (id: string, category: FileCategory) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
  onStartRename: (category: FileCategory, id: string) => void
  onFinishRename: (category: FileCategory, id: string, newTitle: string) => void
  contextMenu: { id: string; x: number; y: number } | null
  onCloseContextMenu: () => void
  onRenameClick: () => void
  onDeleteClick: () => void
  onAddChildClick: () => void
  onToggleActive?: (id: string, isActive: boolean) => void
}): React.ReactElement {
  const hasChildren = !!node.children?.length
  const expanded = expandedIds.has(node.id)
  const showActiveToggle = category === 'settings' && typeof onToggleActive === 'function'

  return (
    <li className="relative">
      <div className="flex items-center group" style={{ paddingLeft: depth * 12 }}>
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.id)
            }}
            className="p-0.5 mr-0.5 text-gray-500 hover:text-gray-800 shrink-0"
            aria-label={expanded ? '折叠' : '展开'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-4 shrink-0 inline-block" />
        )}
        {showActiveToggle && (
          <input
            type="checkbox"
            checked={node.isActive === true}
            onChange={(e) => {
              e.stopPropagation()
              onToggleActive(node.id, !(node.isActive === true))
            }}
            onClick={(e) => e.stopPropagation()}
            title="参与 AI 上下文"
            className="mr-1.5 shrink-0 rounded border-gray-300"
          />
        )}
        {editingId === node.id ? (
          <RenameInput
            node={node}
            onFinish={(newTitle) => onFinishRename(category, node.id, newTitle)}
            onCancel={() => onFinishRename(category, node.id, node.title)}
          />
        ) : (
          <div className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onContextMenu={(e) => onContextMenu(e, node.id)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                onStartRename(category, node.id)
              }}
              onClick={() => onSelect(node.id, category)}
              className={`flex-1 text-left py-1 px-2 rounded truncate ${
                activeFile?.id === node.id && activeFile?.category === category
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {node.title || node.filename}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(category, node.id)
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-gray-800 shrink-0"
              title="新建子项"
            >
              +
            </button>
          </div>
        )}
      </div>
      {contextMenu?.id === node.id && (
        <>
          <div className="fixed inset-0 z-10" onClick={onCloseContextMenu} aria-hidden />
          <div
            className="fixed z-20 py-1 bg-white border border-gray-200 rounded shadow min-w-[100px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={onAddChildClick}
              className="w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              新建子项
            </button>
            <button
              type="button"
              onClick={onRenameClick}
              className="w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              重命名
            </button>
            <button
              type="button"
              onClick={onDeleteClick}
              className="w-full text-left px-3 py-1 text-sm text-red-600 hover:bg-gray-50"
            >
              删除
            </button>
          </div>
        </>
      )}
      {hasChildren && expanded && (
        <ul className="pl-2">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              category={category}
              depth={depth + 1}
              activeFile={activeFile}
              editingId={editingId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onContextMenu={onContextMenu}
              onStartRename={onStartRename}
              onFinishRename={onFinishRename}
              contextMenu={contextMenu}
              onCloseContextMenu={onCloseContextMenu}
              onRenameClick={onRenameClick}
              onDeleteClick={onDeleteClick}
              onAddChildClick={onAddChildClick}
              onToggleActive={onToggleActive}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function RenameInput({
  node,
  onFinish,
  onCancel
}: {
  node: FileNode
  onFinish: (newTitle: string) => void
  onCancel: () => void
}): React.ReactElement {
  const [value, setValue] = useState(node.title || node.filename)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const submit = (): void => {
    const t = value.trim()
    if (t) onFinish(t)
    else onCancel()
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit()
        if (e.key === 'Escape') onCancel()
      }}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 min-w-0 py-1 px-2 rounded border border-gray-300 text-gray-800 text-sm"
    />
  )
}

export function FileTreeSidebar(): React.ReactElement | null {
  const { fileTree, activeFile, setActiveFile, setFileTree } = useAppStore()
  const [editingNode, setEditingNode] = useState<{
    category: FileCategory
    id: string
  } | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddRoot = async (category: FileCategory): Promise<void> => {
    if (!window.fileAPI) return
    const title = category === 'outlines' ? '新大纲' : category === 'content' ? '新章节' : '新设定'
    const node = await window.fileAPI.create(category, title)
    if (node && fileTree) {
      const next = { ...fileTree, files: { ...fileTree.files } }
      next.files[category] = addChildToTree(next.files[category] ?? [], null, node)
      setFileTree(next)
      setActiveFile({ id: node.id, category })
    }
  }

  const handleAddChild = async (category: FileCategory, parentId: string): Promise<void> => {
    if (!window.fileAPI) return
    const title = category === 'outlines' ? '新大纲' : category === 'content' ? '新章节' : '新设定'
    const node = await window.fileAPI.create(category, title, parentId)
    if (node && fileTree) {
      setExpandedIds((prev) => new Set(prev).add(parentId))
      const next = { ...fileTree, files: { ...fileTree.files } }
      next.files[category] = addChildToTree(next.files[category] ?? [], parentId, node)
      setFileTree(next)
      setActiveFile({ id: node.id, category })
    }
  }

  const handleDelete = async (id: string, category: FileCategory): Promise<void> => {
    if (!window.fileAPI) return
    const ok = await window.fileAPI.delete(category, id)
    if (ok && fileTree) {
      const next = { ...fileTree, files: { ...fileTree.files } }
      next.files[category] = removeFromTree(next.files[category] ?? [], id)
      setFileTree(next)
      if (activeFile?.id === id && activeFile?.category === category) {
        setActiveFile(null)
      }
    }
  }

  const handleFinishRename = async (
    category: FileCategory,
    id: string,
    newTitle: string
  ): Promise<void> => {
    setEditingNode(null)
    const roots = fileTree?.files[category] ?? []
    const node = findInTree(roots, id)
    if (!node) return
    const trimmed = newTitle.trim()
    if (trimmed === node.title) return
    if (!window.fileAPI || typeof window.fileAPI.rename !== 'function') return
    const ok = await window.fileAPI.rename(category, id, trimmed)
    if (ok && fileTree) {
      const next = { ...fileTree, files: { ...fileTree.files } }
      next.files[category] = updateInTree(next.files[category] ?? [], id, { title: trimmed })
      setFileTree(next)
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean): Promise<void> => {
    if (!window.fileAPI?.setActive || !fileTree) return
    const ok = await window.fileAPI.setActive('settings', id, isActive)
    if (ok) {
      const next = { ...fileTree, files: { ...fileTree.files } }
      next.files.settings = updateInTree(next.files.settings ?? [], id, { isActive })
      setFileTree(next)
    }
  }

  if (!fileTree) return null

  return (
    <div className="flex flex-col h-full">
      {CATEGORIES.map(({ key, label }) => (
        <Section
          key={key}
          label={label}
          category={key}
          roots={fileTree.files[key] ?? []}
          activeFile={activeFile}
          editingId={editingNode?.category === key ? editingNode.id : null}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
          onSelect={(id, cat) => setActiveFile({ id, category: cat })}
          onAddRoot={handleAddRoot}
          onAddChild={handleAddChild}
          onDelete={handleDelete}
          onStartRename={(cat, id) => setEditingNode({ category: cat, id })}
          onFinishRename={handleFinishRename}
          onToggleActive={key === 'settings' ? handleToggleActive : undefined}
        />
      ))}
    </div>
  )
}
