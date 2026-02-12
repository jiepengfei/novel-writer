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
  setProjectPath: (path: string | null) => void
  setFileTree: (tree: ProjectManifest | null) => void
  setActiveFile: (file: ActiveFile | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  projectPath: null,
  fileTree: null,
  activeFile: null,
  setProjectPath: (projectPath) => set({ projectPath }),
  setFileTree: (fileTree) => set({ fileTree }),
  setActiveFile: (activeFile) => set({ activeFile })
}))
