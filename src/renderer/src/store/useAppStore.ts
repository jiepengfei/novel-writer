import { create } from 'zustand'
import type { ProjectManifest } from '../../../shared/types'

export type FileCategory = 'outlines' | 'content' | 'settings'

export interface ActiveFile {
  id: string
  category: FileCategory
}

interface AppState {
  projectPath: string | null
  fileTree: ProjectManifest | null
  activeFile: ActiveFile | null
  /** 从编辑器选中“带到聊天”的上下文，以 tag 显示在输入框上方，可删不可编辑 */
  chatContextTags: string[]
  setProjectPath: (path: string | null) => void
  setFileTree: (tree: ProjectManifest | null) => void
  setActiveFile: (file: ActiveFile | null) => void
  addChatContextTag: (text: string) => void
  removeChatContextTag: (index: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  projectPath: null,
  fileTree: null,
  activeFile: null,
  chatContextTags: [],
  setProjectPath: (projectPath) => set({ projectPath }),
  setFileTree: (fileTree) => set({ fileTree }),
  setActiveFile: (activeFile) => set({ activeFile }),
  addChatContextTag: (text) =>
    set((state) => {
      const t = text.trim()
      if (!t || state.chatContextTags.includes(t)) return state
      return { chatContextTags: [...state.chatContextTags, t] }
    }),
  removeChatContextTag: (index) =>
    set((state) => ({
      chatContextTags: state.chatContextTags.filter((_, i) => i !== index)
    }))
}))
