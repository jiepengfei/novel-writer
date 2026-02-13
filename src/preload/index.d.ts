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
    settingsAPI: {
      get: () => Promise<{
        geminiApiKey: string | null
        proxyUrl: string
        geminiModel: string
      }>
      save: (key: string, value: unknown) => Promise<boolean>
    }
    aiAPI: {
      startChat: (message: string) => void
      onChunk: (cb: (text: string) => void) => () => void
      onDone: (cb: () => void) => () => void
      onError: (cb: (msg: string) => void) => () => void
      expandStart: (text: string) => void
      onExpandChunk: (cb: (text: string) => void) => () => void
      onExpandDone: (cb: () => void) => () => void
      onExpandError: (cb: (msg: string) => void) => () => void
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
