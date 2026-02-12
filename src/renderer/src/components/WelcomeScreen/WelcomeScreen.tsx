import { useState } from 'react'

interface WelcomeScreenProps {
  onFolderSelected: () => void
}

export function WelcomeScreen({ onFolderSelected }: WelcomeScreenProps) {
  const [loading, setLoading] = useState(false)

  const handleOpenFolder = async () => {
    if (!window.appAPI) return
    setLoading(true)
    try {
      const path = await window.appAPI.openFolder()
      if (path) {
        await window.appAPI.setProjectPath(path)
        onFolderSelected()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Gemini Novelist</h1>
        <p className="text-gray-600 text-sm mb-6">请选择一个文件夹作为项目根目录</p>
        <button
          type="button"
          onClick={handleOpenFolder}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-70"
        >
          {loading ? '打开中…' : '选择文件夹'}
        </button>
      </div>
    </div>
  )
}
