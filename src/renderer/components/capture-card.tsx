import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/app-store'
import type { CaptureMetadata } from '../../shared/types'

interface CaptureCardProps {
  capture: CaptureMetadata
}

export default function CaptureCard({ capture }: CaptureCardProps) {
  const { removeCapture, showToast, setView, setCurrentImageDataUrl, setCurrentCaptureId } = useAppStore()
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    loadThumbnail()
  }, [capture.filepath])

  async function loadThumbnail() {
    try {
      if (window.captureAPI) {
        const dataUrl = await window.captureAPI.readFileAsDataUrl(capture.filepath)
        setThumbnailUrl(dataUrl)
      }
    } catch (err) {
      console.error('Failed to load thumbnail:', err)
    }
  }

  async function handleCopyImage() {
    try {
      if (window.captureAPI) {
        await window.captureAPI.copyImageToClipboard(capture.filepath)
        showToast('Copied to clipboard!')
      }
    } catch (err) {
      showToast('Failed to copy', 'error')
    }
  }

  async function handleShare() {
    try {
      if (window.captureAPI) {
        showToast('Uploading...', 'info')
        const shareUrl = await window.captureAPI.uploadAndShare(capture.id)
        await window.captureAPI.copyToClipboard(shareUrl)
        showToast('Link copied to clipboard!')
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to share', 'error')
    }
  }

  async function handleDelete() {
    try {
      if (window.captureAPI) {
        await window.captureAPI.deleteCapture(capture.id)
        removeCapture(capture.id)
        showToast('Deleted')
      }
    } catch (err) {
      showToast('Failed to delete', 'error')
    }
  }

  function handleOpen() {
    if (capture.type === 'screenshot' && thumbnailUrl) {
      setCurrentImageDataUrl(thumbnailUrl)
      setCurrentCaptureId(capture.id)
      setView('annotation')
    } else if (capture.type === 'recording') {
      setCurrentCaptureId(capture.id)
      setView('video-editor')
    }
  }

  function handleShowInFinder() {
    if (window.captureAPI) {
      window.captureAPI.showItemInFolder(capture.filepath)
    }
  }

  const timeAgo = getTimeAgo(capture.createdAt)

  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all cursor-pointer"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={handleOpen}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-secondary flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          capture.type === 'screenshot' ? (
            <img
              src={thumbnailUrl}
              alt={capture.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={thumbnailUrl}
              className="w-full h-full object-cover"
              muted
            />
          )
        ) : (
          <div className="text-muted-foreground text-xs">Loading...</div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span className={`
            px-2 py-0.5 rounded-md text-xs font-medium backdrop-blur-sm
            ${capture.type === 'screenshot'
              ? 'bg-primary/80 text-white'
              : 'bg-destructive/80 text-white'
            }
          `}>
            {capture.type === 'screenshot' ? 'IMG' : 'VID'}
          </span>
        </div>

        {/* Hover actions */}
        {hovering && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleCopyImage}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
              title="Copy to clipboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-primary/60 hover:bg-primary/80 text-white backdrop-blur-sm"
              title="Share (upload & copy link)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
            <button
              onClick={handleShowInFinder}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
              title="Show in Finder"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg bg-destructive/60 hover:bg-destructive/80 text-white backdrop-blur-sm"
              title="Delete"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-muted-foreground truncate">{capture.filename}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">{timeAgo}</p>
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
