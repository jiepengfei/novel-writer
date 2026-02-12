// 最先设置代理，让主进程内请求（如 Gemini API）走本地代理
import { setGlobalDispatcher, ProxyAgent } from 'undici';

// 👇 你的 Clash 端口
const PROXY_URL = 'http://127.0.0.1:7897';

// 创建一个代理 Agent
const dispatcher = new ProxyAgent(PROXY_URL);

// ⚡️ 强制所有 fetch 请求（包括 Google SDK）都走这个代理
setGlobalDispatcher(dispatcher);

// 忽略 SSL 证书错误 (防止 fetch failed: certificate error)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log(`✅ 网络层已强制接管，代理指向: ${PROXY_URL}`);

import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initProject,
  loadProject,
  createFile as pmCreateFile,
  deleteFile as pmDeleteFile,
  renameFile as pmRenameFile,
  readFileContent,
  saveFileContent
} from './projectManager'
import type { ProjectManifest } from '../shared/types'
import { streamChat } from './aiService'

interface ConfigSchema {
  lastOpenedProject: string | null
  geminiApiKey: string | null
}

let store: { get: (k: keyof ConfigSchema) => unknown; set: (k: keyof ConfigSchema, v: unknown) => void }

function getProjectPath(): string | null {
  return store?.get('lastOpenedProject') as string | null
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  const storePkg = 'electron-store'
  const StoreModule = await import(/* @vite-ignore */ storePkg)
  type StoreInstance = { get: (k: keyof ConfigSchema) => unknown; set: (k: keyof ConfigSchema, v: unknown) => void }
  const StoreClass = (StoreModule.default ?? StoreModule) as new (opts: { name: string; defaults: ConfigSchema }) => StoreInstance
  store = new StoreClass({
    name: 'config',
    defaults: { lastOpenedProject: null, geminiApiKey: null }
  })

  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('app:get-config', () => ({
    lastOpenedProject: store.get('lastOpenedProject')
  }))
  ipcMain.handle('dialog:open-folder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const opts = { properties: ['openDirectory' as const], title: '选择项目文件夹' }
    const { canceled, filePaths } = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (canceled || filePaths.length === 0) return null
    return filePaths[0]
  })
  ipcMain.handle('app:set-project-path', async (_, path: string) => {
    store.set('lastOpenedProject', path)
    await initProject(path)
    return true
  })

  ipcMain.handle('project:init', async (_, path?: string) => {
    const p = path ?? getProjectPath()
    if (!p) return null
    return initProject(p) as Promise<ProjectManifest>
  })
  ipcMain.handle('project:load', async () => {
    const p = getProjectPath()
    if (!p) return null
    return loadProject(p) as Promise<ProjectManifest>
  })
  ipcMain.handle(
    'file:create',
    async (
      _,
      category: 'outlines' | 'content' | 'settings',
      title: string,
      parentId?: string
    ) => {
      const p = getProjectPath()
      if (!p) return null
      return pmCreateFile(p, category, title, parentId)
    }
  )
  ipcMain.handle('file:delete', async (_, category: 'outlines' | 'content' | 'settings', id: string) => {
    const p = getProjectPath()
    if (!p) return false
    return pmDeleteFile(p, category, id)
  })
  ipcMain.handle('file:rename', async (_, category: 'outlines' | 'content' | 'settings', id: string, newTitle: string) => {
    const p = getProjectPath()
    if (!p) return false
    return pmRenameFile(p, category, id, newTitle)
  })
  ipcMain.handle('file:read', async (_, category: string, id: string) => {
    const p = getProjectPath()
    if (!p) return ''
    return readFileContent(p, category, id)
  })
  ipcMain.handle('file:save', async (_, category: string, id: string, content: string) => {
    const p = getProjectPath()
    if (!p) return false
    return saveFileContent(p, category, id, content)
  })

  ipcMain.handle('settings:get', () => ({
    geminiApiKey: store.get('geminiApiKey') as string | null
  }))
  ipcMain.handle('settings:save', async (_, key: keyof ConfigSchema, value: unknown) => {
    store.set(key, value)
    return true
  })

  ipcMain.on('ai:chat-start', async (event, payload: { message: string }) => {
    const apiKey = store.get('geminiApiKey') as string | null
    if (!apiKey?.trim()) {
      event.sender.send('ai:error', '请先在设置中配置 API Key')
      return
    }
    const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
    if (!message) {
      event.sender.send('ai:error', '请输入消息内容')
      return
    }
    try {
      await streamChat(message, apiKey, event.sender)
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      event.sender.send('ai:error', raw)
    }
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
