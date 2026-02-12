import React, { useEffect, useState, useCallback } from 'react'
import { FileTreeSidebar } from '../FileTreeSidebar/FileTreeSidebar'
import { Editor } from '../Editor/Editor'
import { ChatSidebar } from '../ChatSidebar/ChatSidebar'
import { SettingsModal } from '../Settings/SettingsModal'
import { useAppStore } from '../../store/useAppStore'

const LEFT_MIN = 180
const LEFT_DEFAULT = 256
const RIGHT_MIN = 240
const RIGHT_DEFAULT = 320
const RESIZER_W = 6

export function MainLayout(): React.ReactElement | null {
  const { projectPath, setFileTree } = useAppStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT)
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT)
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null)

  useEffect(() => {
    if (!projectPath || !window.projectAPI) return
    window.projectAPI.load().then((manifest) => {
      if (manifest) setFileTree(manifest)
    })
  }, [projectPath, setFileTree])

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging === 'left') {
        const w = Math.max(LEFT_MIN, Math.min(e.clientX, 480))
        setLeftWidth(w)
      } else if (dragging === 'right') {
        const w = Math.max(RIGHT_MIN, Math.min(window.innerWidth - e.clientX, 560))
        setRightWidth(w)
      }
    },
    [dragging]
  )
  const onMouseUp = useCallback(() => setDragging(null), [])

  useEffect(() => {
    if (dragging === null) return
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging, onMouseMove, onMouseUp])

  if (!projectPath) return null

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white text-gray-800">
      <aside
        className="border-r border-gray-200 bg-gray-50 flex flex-col flex-shrink-0 min-h-0"
        style={{ width: leftWidth, minWidth: LEFT_MIN }}
      >
        <div className="p-2 border-b border-gray-200 font-medium text-gray-700">文件</div>
        <div className="flex-1 overflow-y-auto p-2">
          <FileTreeSidebar />
        </div>
        <div className="p-2 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            ⚙️ 设置
          </button>
        </div>
      </aside>
      <div
        role="separator"
        aria-label="调整左侧栏宽度"
        className="flex-shrink-0 cursor-col-resize hover:bg-gray-200 active:bg-gray-300 transition-colors flex justify-center group"
        style={{ width: RESIZER_W }}
        onMouseDown={() => setDragging('left')}
      >
        <div className="w-0.5 h-full bg-gray-300 group-hover:bg-gray-500 transition-colors" />
      </div>
      <main className="flex-1 h-full overflow-y-auto bg-white relative flex flex-col min-w-0">
        <Editor />
      </main>
      <div
        role="separator"
        aria-label="调整右侧栏宽度"
        className="flex-shrink-0 cursor-col-resize hover:bg-gray-200 active:bg-gray-300 transition-colors flex justify-center group"
        style={{ width: RESIZER_W }}
        onMouseDown={() => setDragging('right')}
      >
        <div className="w-0.5 h-full bg-gray-300 group-hover:bg-gray-500 transition-colors" />
      </div>
      <aside
        className="border-l border-gray-200 bg-gray-50 flex flex-col flex-shrink-0 min-h-0"
        style={{ width: rightWidth, minWidth: RIGHT_MIN }}
      >
        <ChatSidebar />
      </aside>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
