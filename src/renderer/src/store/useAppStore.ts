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
  /** 从编辑器选中“带到聊天”的草稿，用于 Chat with Selection */
  chatDraft: string
  setProjectPath: (path: string | null) => void
  setFileTree: (tree: ProjectManifest | null) => void
  setActiveFile: (file: ActiveFile | null) => void
  setChatDraft: (text: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  projectPath: null,
  fileTree: null,
  activeFile: null,
  chatDraft: '',
  setProjectPath: (projectPath) => set({ projectPath }),
  setFileTree: (fileTree) => set({ fileTree }),
  setActiveFile: (activeFile) => set({ activeFile }),
  setChatDraft: (chatDraft) => set({ chatDraft })
}))
