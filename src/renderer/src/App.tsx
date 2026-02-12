import { useState, useEffect, useCallback } from 'react'
import { WelcomeScreen } from './components/WelcomeScreen/WelcomeScreen'
import { MainLayout } from './components/Layout/MainLayout'
import { useAppStore } from './store/useAppStore'
import './assets/main.css'

export default function App() {
  const [loading, setLoading] = useState(true)
  const { projectPath, setProjectPath, setFileTree } = useAppStore()

  const loadConfig = useCallback(async () => {
    if (!window.appAPI) return
    const c = await window.appAPI.getConfig()
    setProjectPath(c.lastOpenedProject)
    if (c.lastOpenedProject) {
      const manifest = await window.projectAPI?.load()
      if (manifest) setFileTree(manifest)
    }
  }, [setProjectPath, setFileTree])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!window.appAPI) {
        if (!cancelled) setLoading(false)
        return
      }
      const c = await window.appAPI.getConfig()
      if (!cancelled) {
        setProjectPath(c.lastOpenedProject)
        if (c.lastOpenedProject && window.projectAPI) {
          const manifest = await window.projectAPI.load()
          if (manifest) setFileTree(manifest)
        }
        setLoading(false)
      }
    }
    run().catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [setProjectPath, setFileTree])

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100 text-gray-500">
        Loading…
      </div>
    )
  }

  if (!projectPath) {
    return <WelcomeScreen onFolderSelected={loadConfig} />
  }

  return <MainLayout />
}
