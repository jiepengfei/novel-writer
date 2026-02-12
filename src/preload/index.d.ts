import type { ProjectManifest, FileNode } from '../shared/types'

declare global {
  interface Window {
    electron: import('@electron-toolkit/preload').ElectronAPI
    appAPI: {
      getConfig: () => Promise<{ lastOpenedProject: string | null }>
      setProjectPath: (path: string) => Promise<boolean>
      openFolder: () => Promise<string | null>
    }
    projectAPI: {
      init: (path?: string) => Promise<ProjectManifest | null>
      load: () => Promise<ProjectManifest | null>
    }
    fileAPI: {
      create: (
        category: 'outlines' | 'content' | 'settings',
        title: string,
        parentId?: string
      ) => Promise<FileNode | null>
      delete: (category: 'outlines' | 'content' | 'settings', id: string) => Promise<boolean>
      rename: (category: 'outlines' | 'content' | 'settings', id: string, newTitle: string) => Promise<boolean>
      read: (category: string, id: string) => Promise<string>
      save: (category: string, id: string, content: string) => Promise<boolean>
    }
  }
}
