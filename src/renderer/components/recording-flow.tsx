import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '../stores/app-store'
import type { CaptureSource } from '../../shared/types'
import { motion } from 'framer-motion'

type RecordingPhase = 'source-select' | 'recording' | 'preview'

export default function RecordingFlow() {
  const { setView, showToast, addCapture, setCurrentVideoPath, setCurrentCaptureId } = useAppStore()
  const [phase, setPhase] = useState<RecordingPhase>('source-select')
  const [sources, setSources] = useState<CaptureSource[]>([])
  const [loading, setLoading] = useState(true)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [withMic, setWithMic] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    loadSources()
    return () => {
      stopTimer()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  async function loadSources() {
    try {
      if (window.captureAPI) {
        const srcs = await window.captureAPI.getScreenSources()
        setSources(srcs)
      }
    } catch (err) {
      showToast('Failed to access screen', 'error')
    } finally {
      setLoading(false)
    }
  }

  function startTimer() {
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1)
    }, 1000)
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  async function startRecording(source: CaptureSource) {
    try {
      // Get screen stream
      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            maxFrameRate: 30
          }
        } as any
      })

      let combinedStream = screenStream

      // Add mic audio if enabled
      if (withMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const tracks = [...screenStream.getVideoTracks(), ...micStream.getAudioTracks()]
          combinedStream = new MediaStream(tracks)
        } catch {
          // Mic not available, continue without
          showToast('Mic not available, recording without audio', 'info')
        }
      }

      streamRef.current = combinedStream

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stopTimer()
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        setPhase('preview')

        // Save to disk via main process
        try {
          const arrayBuffer = await blob.arrayBuffer()
          // @ts-ignore - custom IPC handler
          const record = await (window as any).captureAPI_internal?.saveRecording?.(arrayBuffer, duration)
            || await saveRecordingViaIPC(arrayBuffer, duration)
          if (record) {
            addCapture(record)
          }
        } catch (err) {
          console.error('Failed to save recording:', err)
        }
      }

      recorder.start(1000) // collect chunks every second
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setDuration(0)
      startTimer()
      setPhase('recording')
    } catch (err) {
      console.error('Recording failed:', err)
      showToast('Failed to start recording', 'error')
    }
  }

  async function saveRecordingViaIPC(arrayBuffer: ArrayBuffer, dur: number) {
    // Use the electron IPC to save
    const { ipcRenderer } = window.require?.('electron') || {}
    if (ipcRenderer) {
      return ipcRenderer.invoke('recording:save', arrayBuffer, dur)
    }
    return null
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    setIsRecording(false)
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      stopTimer()
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      startTimer()
    }
  }

  function cancelRecording() {
    stopRecording()
    setPhase('source-select')
    setDuration(0)
  }

  function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Source selection phase
  if (phase === 'source-select') {
    return (
      <div className="h-full flex flex-col px-6 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView('dashboard')}
            className="titlebar-no-drag p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold">Record Screen</h2>
        </div>

        {/* Mic toggle */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setWithMic(!withMic)}
            className={`titlebar-no-drag flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              withMic ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            {withMic ? 'Mic On' : 'Mic Off'}
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading sources...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Choose screen to record</h3>
            <div className="grid grid-cols-2 gap-3">
              {sources.filter(s => s.id.startsWith('screen:')).map(source => (
                <motion.button
                  key={source.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startRecording(source)}
                  className="text-left rounded-xl overflow-hidden bg-card border border-border hover:border-destructive/50 transition-all"
                >
                  <div className="aspect-video bg-secondary overflow-hidden">
                    <img src={source.thumbnailDataUrl} alt={source.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2.5">
                    <span className="text-xs text-foreground">{source.name}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Recording phase
  if (phase === 'recording') {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Recording indicator */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ opacity: [1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
              className="w-3 h-3 rounded-full bg-destructive"
            />
            <span className="text-2xl font-mono font-semibold text-foreground">
              {formatDuration(duration)}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            {isPaused ? 'Recording paused' : 'Recording your screen...'}
          </p>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {isPaused ? (
              <button
                onClick={resumeRecording}
                className="titlebar-no-drag px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className="titlebar-no-drag px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80"
              >
                Pause
              </button>
            )}

            <button
              onClick={stopRecording}
              className="titlebar-no-drag px-6 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90"
            >
              Stop
            </button>

            <button
              onClick={cancelRecording}
              className="titlebar-no-drag px-4 py-2 rounded-xl text-muted-foreground text-sm hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Preview phase
  return (
    <div className="h-full flex flex-col px-6 pb-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => { setView('dashboard') }}
          className="titlebar-no-drag p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold">Recording Preview</h2>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">{formatDuration(duration)}</span>
        <button
          onClick={() => { showToast('Saved!'); setView('dashboard') }}
          className="titlebar-no-drag px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Done
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center bg-neutral-900 rounded-xl overflow-hidden">
        {previewUrl && (
          <video
            src={previewUrl}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg"
          />
        )}
      </div>
    </div>
  )
}
