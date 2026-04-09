import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../stores/app-store'

export default function VideoEditor() {
  const { currentCaptureId, captures, setView, showToast } = useAppStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const capture = captures.find(c => c.id === currentCaptureId)

  useEffect(() => {
    if (capture?.filepath) {
      loadVideo()
    }
  }, [capture])

  async function loadVideo() {
    if (!capture || !window.captureAPI) return
    try {
      const dataUrl = await window.captureAPI.readFileAsDataUrl(capture.filepath)
      setVideoUrl(dataUrl)
    } catch (err) {
      showToast('Failed to load video', 'error')
    }
  }

  function handleLoadedMetadata() {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration)
    setTrimEnd(video.duration)
  }

  function handleTimeUpdate() {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)

    // Stop at trim end
    if (video.currentTime >= trimEnd) {
      video.pause()
      setIsPlaying(false)
    }
  }

  function togglePlayPause() {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart
      }
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const time = percent * duration
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = Math.floor(secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="h-full flex flex-col px-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setView('dashboard')}
          className="titlebar-no-drag p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold">Edit Video</h2>
        <div className="flex-1" />
        <button
          onClick={() => { showToast('Saved!'); setView('dashboard') }}
          className="titlebar-no-drag px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Save
        </button>
      </div>

      {/* Video preview */}
      <div className="flex-1 flex items-center justify-center bg-neutral-900 rounded-xl overflow-hidden mb-4">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            className="max-w-full max-h-full rounded-lg cursor-pointer"
            onClick={togglePlayPause}
          />
        ) : (
          <div className="text-muted-foreground text-sm">Loading video...</div>
        )}
      </div>

      {/* Timeline controls */}
      <div className="bg-card rounded-xl p-4 border border-border">
        {/* Play button + time */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={togglePlayPause}
            className="titlebar-no-drag w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
          <span className="text-sm font-mono text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Timeline bar */}
        <div
          className="relative h-10 bg-secondary rounded-lg cursor-pointer overflow-hidden"
          onClick={handleTimelineClick}
        >
          {/* Trim region */}
          <div
            className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary"
            style={{
              left: `${(trimStart / duration) * 100}%`,
              width: `${((trimEnd - trimStart) / duration) * 100}%`
            }}
          />

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* Trim handles */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Start:</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={trimStart}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (val < trimEnd) setTrimStart(val)
              }}
              className="w-32 accent-primary"
            />
            <span className="text-xs font-mono text-muted-foreground">{formatTime(trimStart)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">End:</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={trimEnd}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (val > trimStart) setTrimEnd(val)
              }}
              className="w-32 accent-primary"
            />
            <span className="text-xs font-mono text-muted-foreground">{formatTime(trimEnd)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
