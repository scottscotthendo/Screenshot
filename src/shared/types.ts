export interface CaptureMetadata {
  id: string
  type: 'screenshot' | 'recording'
  filename: string
  filepath: string
  thumbnailPath?: string
  width: number
  height: number
  duration?: number // seconds, for recordings
  fileSize: number
  shareUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CaptureSource {
  id: string
  name: string
  thumbnailDataUrl: string
  displayId: string
  appIcon?: string
}

export interface RecordingOptions {
  sourceId: string
  withAudio: boolean
  withMic: boolean
  withWebcam: boolean
}

export interface AnnotationTool {
  type: 'pen' | 'arrow' | 'rectangle' | 'ellipse' | 'text' | 'highlight' | 'blur'
}

export interface CaptureAPI {
  // Screenshot
  getScreenSources: () => Promise<CaptureSource[]>
  captureScreen: (sourceId: string) => Promise<{ filepath: string; width: number; height: number }>
  captureRegion: (sourceId: string, region: { x: number; y: number; width: number; height: number }) => Promise<{ filepath: string; width: number; height: number }>

  // Recording
  startRecording: (options: RecordingOptions) => Promise<void>
  stopRecording: () => Promise<{ filepath: string; duration: number }>
  pauseRecording: () => Promise<void>
  resumeRecording: () => Promise<void>

  // File operations
  saveAnnotatedImage: (dataUrl: string, originalId: string) => Promise<CaptureMetadata>
  trimVideo: (filepath: string, startTime: number, endTime: number) => Promise<string>

  // Library
  getAllCaptures: () => Promise<CaptureMetadata[]>
  deleteCapture: (id: string) => Promise<void>

  // Sharing
  uploadAndShare: (id: string) => Promise<string> // returns share URL

  // Clipboard
  copyImageToClipboard: (filepath: string) => Promise<void>
  copyToClipboard: (text: string) => Promise<void>

  // Events
  onScreenshotRequested: (callback: () => void) => void
  onRecordingRequested: (callback: () => void) => void

  // App
  readFileAsDataUrl: (filepath: string) => Promise<string>
  showItemInFolder: (filepath: string) => void
  showWindow: () => void

  // Save recording
  saveRecording: (arrayBuffer: ArrayBuffer, duration: number) => Promise<CaptureMetadata>
}
