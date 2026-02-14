// 代理在 app.whenReady 中根据设置应用（见下方）
import { setGlobalDispatcher, ProxyAgent } from 'undici'
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
  saveFileContent,
  setFileActive as pmSetFileActive,
  getStoryContext,
  reorderFiles as pmReorderFiles,
  exportProject as pmExportProject
} from './projectManager'
import type { ProjectManifest } from '../shared/types'
import { streamChat, streamExpand } from './aiService'

interface ConfigSchema {
  lastOpenedProject: string | null
  geminiApiKey: string | null
  /** 代理地址，如 http://127.0.0.1:7897，空则不使用代理 */
  proxyUrl: string
  /** Gemini 模型名，如 gemini-2.5-flash */
  geminiModel: string
  /** 注入 AI 的「前文章节摘要」数量上限（滑动窗口），默认 20 */
  maxHistoryChapters: number
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
    defaults: {
      lastOpenedProject: null,
      geminiApiKey: null,
      proxyUrl: 'http://127.0.0.1:7897',
      geminiModel: 'gemini-2.5-flash',
      maxHistoryChapters: 20
    }
  })

  // 根据设置应用代理（主进程 fetch 走 undici）
  const proxyUrl = (store.get('proxyUrl') as string)?.trim()
  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl))
    process.env.HTTPS_PROXY = proxyUrl
    process.env.HTTP_PROXY = proxyUrl
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }

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
  ipcMain.handle('dialog:show-save', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const opts = {
      title: '导出合并文件',
      defaultPath: 'novel.txt',
      filters: [{ name: '文本文件', extensions: ['txt'] }]
    }
    const { canceled, filePath } = win
      ? await dialog.showSaveDialog(win, opts)
      : await dialog.showSaveDialog(opts)
    return canceled ? null : filePath
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
  ipcMain.handle(
    'file:set-active',
    async (_, category: 'outlines' | 'content' | 'settings', id: string, isActive: boolean) => {
      if (category !== 'settings') return false
      const p = getProjectPath()
      if (!p) return false
      return pmSetFileActive(p, id, isActive)
    }
  )
  ipcMain.handle(
    'file:reorder',
    async (
      _,
      payload: { category: 'outlines' | 'content' | 'settings'; parentId: string | null; newOrderIds: string[] }
    ) => {
      const p = getProjectPath()
      if (!p || !payload?.category || !Array.isArray(payload.newOrderIds)) return false
      return pmReorderFiles(p, payload.category, payload.parentId ?? null, payload.newOrderIds)
    }
  )
  ipcMain.handle(
    'project:export',
    async (
      _,
      payload: { category: 'outlines' | 'content' | 'settings'; path: string }
    ) => {
      const p = getProjectPath()
      if (!p || !payload?.path || !payload?.category) return
      await pmExportProject(p, payload.category, payload.path)
    }
  )

  ipcMain.handle('settings:get', () => ({
    geminiApiKey: store.get('geminiApiKey') as string | null,
    proxyUrl: (store.get('proxyUrl') as string) ?? '',
    geminiModel: (store.get('geminiModel') as string) ?? 'gemini-2.5-flash',
    maxHistoryChapters: (store.get('maxHistoryChapters') as number) ?? 20
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
    const model = ((store.get('geminiModel') as string) || 'gemini-2.5-flash').trim()
    const projectPath = getProjectPath()
    const maxHistoryChapters = (store.get('maxHistoryChapters') as number) ?? 20
    const systemContext = projectPath
      ? await getStoryContext(projectPath, { maxHistoryChapters })
      : ''
    try {
      await streamChat(message, apiKey, model, event.sender, systemContext || undefined)
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      event.sender.send('ai:error', raw)
    }
  })

  ipcMain.on('ai:expand-start', async (event, payload: { text: string }) => {
    const apiKey = store.get('geminiApiKey') as string | null
    if (!apiKey?.trim()) {
      event.sender.send('ai:expand-error', '请先在设置中配置 API Key')
      return
    }
    const text = typeof payload?.text === 'string' ? payload.text.trim() : ''
    if (!text) {
      event.sender.send('ai:expand-error', '请先选中要扩展的文本')
      return
    }
    const model = ((store.get('geminiModel') as string) || 'gemini-2.0-flash').trim()
    const projectPath = getProjectPath()
    const maxHistoryChapters = (store.get('maxHistoryChapters') as number) ?? 20
    const systemContext = projectPath
      ? await getStoryContext(projectPath, { maxHistoryChapters })
      : ''
    try {
      await streamExpand(text, apiKey, model, event.sender, systemContext || undefined)
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      event.sender.send('ai:expand-error', raw)
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
