import { useEffect } from 'react'
import { FileTreeSidebar } from '../FileTreeSidebar/FileTreeSidebar'
import { Editor } from '../Editor/Editor'
import { useAppStore } from '../../store/useAppStore'

export function MainLayout() {
  const { projectPath, setFileTree } = useAppStore()

  useEffect(() => {
    if (!projectPath || !window.projectAPI) return
    window.projectAPI.load().then((manifest) => {
      if (manifest) setFileTree(manifest)
    })
  }, [projectPath, setFileTree])

  if (!projectPath) return null

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white text-gray-800">
      <aside className="w-64 min-w-[200px] border-r border-gray-200 bg-gray-50 flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-gray-200 font-medium text-gray-700">文件</div>
        <div className="flex-1 overflow-y-auto p-2">
          <FileTreeSidebar />
        </div>
      </aside>
      <main className="flex-1 h-full overflow-y-auto bg-white relative flex flex-col min-w-0">
        <Editor />
      </main>
      <aside className="w-80 border-l border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
        AI Assistant (Coming in v0.2)
      </aside>
    </div>
  )
}
