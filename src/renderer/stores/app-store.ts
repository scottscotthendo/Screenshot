import { create } from 'zustand'
import type { CaptureMetadata, CaptureSource } from '../../shared/types'

type View = 'dashboard' | 'screenshot-flow' | 'recording-flow' | 'annotation' | 'video-editor'

interface AppState {
  // Navigation
  view: View
  setView: (view: View) => void

  // Library
  captures: CaptureMetadata[]
  setCaptures: (captures: CaptureMetadata[]) => void
  addCapture: (capture: CaptureMetadata) => void
  removeCapture: (id: string) => void

  // Current capture context
  currentImageDataUrl: string | null
  setCurrentImageDataUrl: (url: string | null) => void

  currentVideoPath: string | null
  setCurrentVideoPath: (path: string | null) => void

  currentCaptureId: string | null
  setCurrentCaptureId: (id: string | null) => void

  // Screen sources
  sources: CaptureSource[]
  setSources: (sources: CaptureSource[]) => void

  // Recording state
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  recordingDuration: number
  setRecordingDuration: (duration: number) => void

  // Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  clearToast: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  view: 'dashboard',
  setView: (view) => set({ view }),

  // Library
  captures: [],
  setCaptures: (captures) => set({ captures }),
  addCapture: (capture) => set((state) => ({ captures: [capture, ...state.captures] })),
  removeCapture: (id) => set((state) => ({ captures: state.captures.filter(c => c.id !== id) })),

  // Current capture context
  currentImageDataUrl: null,
  setCurrentImageDataUrl: (url) => set({ currentImageDataUrl: url }),

  currentVideoPath: null,
  setCurrentVideoPath: (path) => set({ currentVideoPath: path }),

  currentCaptureId: null,
  setCurrentCaptureId: (id) => set({ currentCaptureId: id }),

  // Screen sources
  sources: [],
  setSources: (sources) => set({ sources }),

  // Recording
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
  recordingDuration: 0,
  setRecordingDuration: (duration) => set({ recordingDuration: duration }),

  // Toast
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },
  clearToast: () => set({ toast: null })
}))
