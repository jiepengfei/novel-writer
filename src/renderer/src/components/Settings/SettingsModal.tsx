import React, { useState, useEffect } from 'react'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.ReactElement | null {
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [proxyUrl, setProxyUrl] = useState('')
  const [geminiModel, setGeminiModel] = useState('')
  const [maxHistoryChapters, setMaxHistoryChapters] = useState(20)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && window.settingsAPI) {
      setLoading(true)
      window.settingsAPI
        .get()
        .then((config) => {
          setGeminiApiKey(config.geminiApiKey ?? '')
          setProxyUrl(config.proxyUrl ?? '')
          setGeminiModel(config.geminiModel ?? '')
          const n = config.maxHistoryChapters
          setMaxHistoryChapters(
            typeof n === 'number' && n >= 1 && n <= 100 ? n : 20
          )
        })
        .finally(() => setLoading(false))
    }
  }, [open])

  const handleSave = async (): Promise<void> => {
    if (!window.settingsAPI) return
    setSaving(true)
    try {
      await window.settingsAPI.save('geminiApiKey', geminiApiKey.trim() || null)
      await window.settingsAPI.save('proxyUrl', proxyUrl.trim() || '')
      await window.settingsAPI.save('geminiModel', geminiModel.trim() || 'gemini-2.5-flash')
      const chapters = Math.min(100, Math.max(1, Math.floor(Number(maxHistoryChapters)) || 20))
      await window.settingsAPI.save('maxHistoryChapters', chapters)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">设置</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">加载中…</p>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="请输入 Google Gemini API Key"
                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">密钥仅保存在本机。</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">代理地址</label>
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="http://127.0.0.1:7897"
                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">留空则不使用代理。修改后需重启应用生效。</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
              <input
                type="text"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                placeholder="gemini-2.5-flash"
                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">如 gemini-2.5-flash、gemini-1.5-pro 等。</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Context Window Size (Chapters)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxHistoryChapters}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    setMaxHistoryChapters(20)
                  } else {
                    const n = parseInt(raw, 10)
                    if (!Number.isNaN(n)) {
                      setMaxHistoryChapters(Math.min(100, Math.max(1, n)))
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800"
              />
              <p className="text-xs text-gray-500 mt-1">
                How many previous chapter summaries to send to AI.
              </p>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
