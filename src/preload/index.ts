import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const appAPI = {
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  setProjectPath: (path: string) => ipcRenderer.invoke('app:set-project-path', path),
  openFolder: () => ipcRenderer.invoke('dialog:open-folder')
}

const projectAPI = {
  init: (path?: string) => ipcRenderer.invoke('project:init', path),
  load: () => ipcRenderer.invoke('project:load')
}

const fileAPI = {
  create: (
    category: 'outlines' | 'content' | 'settings',
    title: string,
    parentId?: string
  ) => ipcRenderer.invoke('file:create', category, title, parentId),
  delete: (category: 'outlines' | 'content' | 'settings', id: string) =>
    ipcRenderer.invoke('file:delete', category, id),
  rename(category: 'outlines' | 'content' | 'settings', id: string, newTitle: string) {
    return ipcRenderer.invoke('file:rename', category, id, newTitle)
  },
  read: (category: string, id: string) => ipcRenderer.invoke('file:read', category, id),
  save: (category: string, id: string, content: string) =>
    ipcRenderer.invoke('file:save', category, id, content)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('appAPI', appAPI)
    contextBridge.exposeInMainWorld('projectAPI', projectAPI)
    contextBridge.exposeInMainWorld('fileAPI', fileAPI)
  } catch (e) {
    console.error(e)
  }
} else {
  ;(window as unknown as { electron: typeof electronAPI }).electron = electronAPI
  ;(window as unknown as { appAPI: typeof appAPI }).appAPI = appAPI
  ;(window as unknown as { projectAPI: typeof projectAPI }).projectAPI = projectAPI
  ;(window as unknown as { fileAPI: typeof fileAPI }).fileAPI = fileAPI
}
