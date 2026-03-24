import { useEffect } from 'react'
import { useAppStore } from './stores/app-store'
import Dashboard from './pages/dashboard'
import ScreenshotFlow from './components/screenshot-flow'
import RecordingFlow from './components/recording-flow'
import AnnotationEditor from './components/annotation-editor'
import VideoEditor from './components/video-editor'
import Toast from './components/toast'

declare global {
  interface Window {
    captureAPI: import('../shared/types').CaptureAPI
  }
}

export default function App() {
  const { view, setView, setCaptures, showToast } = useAppStore()

  // Load library on mount
  useEffect(() => {
    loadLibrary()
  }, [])

  // Listen for global shortcut triggers from main process
  useEffect(() => {
    if (!window.captureAPI) return

    window.captureAPI.onScreenshotRequested(() => {
      setView('screenshot-flow')
    })

    window.captureAPI.onRecordingRequested(() => {
      setView('recording-flow')
    })
  }, [])

  async function loadLibrary() {
    try {
      if (window.captureAPI) {
        const captures = await window.captureAPI.getAllCaptures()
        setCaptures(captures)
      }
    } catch (err) {
      console.error('Failed to load library:', err)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Titlebar drag region */}
      <div className="titlebar-drag h-12 shrink-0 flex items-center px-20">
        <h1 className="text-sm font-semibold text-muted-foreground tracking-wide">
          McSnapface
        </h1>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {view === 'dashboard' && (
          <Dashboard onRefresh={loadLibrary} />
        )}
        {view === 'screenshot-flow' && <ScreenshotFlow />}
        {view === 'recording-flow' && <RecordingFlow />}
        {view === 'annotation' && <AnnotationEditor />}
        {view === 'video-editor' && <VideoEditor />}
      </div>

      <Toast />
    </div>
  )
}
