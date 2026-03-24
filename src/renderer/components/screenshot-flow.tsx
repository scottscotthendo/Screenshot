import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/app-store'
import type { CaptureSource } from '../../shared/types'
import { motion } from 'framer-motion'

export default function ScreenshotFlow() {
  const { setView, setCurrentImageDataUrl, setCurrentCaptureId, showToast } = useAppStore()
  const [sources, setSources] = useState<CaptureSource[]>([])
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    loadSources()
  }, [])

  async function loadSources() {
    try {
      if (window.captureAPI) {
        const srcs = await window.captureAPI.getScreenSources()
        setSources(srcs)
      }
    } catch (err) {
      console.error('Failed to get sources:', err)
      showToast('Failed to access screen', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function captureSource(source: CaptureSource) {
    setCapturing(true)
    try {
      // Use getDisplayMedia in the renderer to capture the screen
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id
          }
        } as any
      })

      // Grab a frame
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)

      // Stop the stream
      stream.getTracks().forEach(t => t.stop())

      // Get data URL
      const dataUrl = canvas.toDataURL('image/png')
      setCurrentImageDataUrl(dataUrl)
      setCurrentCaptureId(null) // new capture
      setView('annotation')
    } catch (err) {
      console.error('Capture failed:', err)
      showToast('Capture failed', 'error')
      setView('dashboard')
    } finally {
      setCapturing(false)
    }
  }

  if (capturing) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground text-sm"
        >
          Capturing...
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col px-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setView('dashboard')}
          className="titlebar-no-drag p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold">Choose what to capture</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Loading sources...
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Screens */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Screens</h3>
            <div className="grid grid-cols-2 gap-3">
              {sources.filter(s => s.id.startsWith('screen:')).map(source => (
                <SourceCard key={source.id} source={source} onClick={() => captureSource(source)} />
              ))}
            </div>
          </div>

          {/* Windows */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Windows</h3>
            <div className="grid grid-cols-3 gap-3">
              {sources.filter(s => s.id.startsWith('window:')).map(source => (
                <SourceCard key={source.id} source={source} onClick={() => captureSource(source)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SourceCard({ source, onClick }: { source: CaptureSource; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="text-left rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all"
    >
      <div className="aspect-video bg-secondary overflow-hidden">
        <img
          src={source.thumbnailDataUrl}
          alt={source.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-2.5 flex items-center gap-2">
        {source.appIcon && (
          <img src={source.appIcon} alt="" className="w-4 h-4" />
        )}
        <span className="text-xs text-foreground truncate">{source.name}</span>
      </div>
    </motion.button>
  )
}
