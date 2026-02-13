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

const settingsAPI = {
  get: () => ipcRenderer.invoke('settings:get'),
  save: (key: string, value: unknown) => ipcRenderer.invoke('settings:save', key, value)
}

const aiAPI = {
  startChat: (message: string) => ipcRenderer.send('ai:chat-start', { message }),
  onChunk: (cb: (text: string) => void) => {
    const handler = (_: unknown, text: string) => cb(text)
    ipcRenderer.on('ai:chat-chunk', handler)
    return () => ipcRenderer.removeListener('ai:chat-chunk', handler)
  },
  onDone: (cb: () => void) => {
    ipcRenderer.on('ai:chat-done', cb)
    return () => ipcRenderer.removeListener('ai:chat-done', cb)
  },
  onError: (cb: (msg: string) => void) => {
    const handler = (_: unknown, msg: string) => cb(msg)
    ipcRenderer.on('ai:error', handler)
    return () => ipcRenderer.removeListener('ai:error', handler)
  },
  expandStart: (text: string) => ipcRenderer.send('ai:expand-start', { text }),
  onExpandChunk: (cb: (text: string) => void) => {
    const handler = (_: unknown, text: string) => cb(text)
    ipcRenderer.on('ai:expand-chunk', handler)
    return () => ipcRenderer.removeListener('ai:expand-chunk', handler)
  },
  onExpandDone: (cb: () => void) => {
    ipcRenderer.on('ai:expand-done', cb)
    return () => ipcRenderer.removeListener('ai:expand-done', cb)
  },
  onExpandError: (cb: (msg: string) => void) => {
    const handler = (_: unknown, msg: string) => cb(msg)
    ipcRenderer.on('ai:expand-error', handler)
    return () => ipcRenderer.removeListener('ai:expand-error', handler)
  }
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
    ipcRenderer.invoke('file:save', category, id, content),
  setActive: (
    category: 'outlines' | 'content' | 'settings',
    id: string,
    isActive: boolean
  ) => ipcRenderer.invoke('file:set-active', category, id, isActive)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('appAPI', appAPI)
    contextBridge.exposeInMainWorld('projectAPI', projectAPI)
    contextBridge.exposeInMainWorld('settingsAPI', settingsAPI)
    contextBridge.exposeInMainWorld('aiAPI', aiAPI)
    contextBridge.exposeInMainWorld('fileAPI', fileAPI)
  } catch (e) {
    console.error(e)
  }
} else {
  ;(window as unknown as { electron: typeof electronAPI }).electron = electronAPI
  ;(window as unknown as { appAPI: typeof appAPI }).appAPI = appAPI
  ;(window as unknown as { projectAPI: typeof projectAPI }).projectAPI = projectAPI
  ;(window as unknown as { settingsAPI: typeof settingsAPI }).settingsAPI = settingsAPI
  ;(window as unknown as { aiAPI: typeof aiAPI }).aiAPI = aiAPI
  ;(window as unknown as { fileAPI: typeof fileAPI }).fileAPI = fileAPI
}
