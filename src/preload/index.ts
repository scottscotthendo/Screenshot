import { contextBridge, ipcRenderer } from 'electron'
import type { CaptureAPI, CaptureSource, CaptureMetadata, RecordingOptions } from '../shared/types'

const captureAPI: CaptureAPI = {
  // Screenshot
  getScreenSources: () => ipcRenderer.invoke('capture:getSources'),
  captureScreen: (sourceId: string) => ipcRenderer.invoke('capture:screen', sourceId),
  captureRegion: (sourceId: string, region) => ipcRenderer.invoke('capture:region', sourceId, region),

  // Recording
  startRecording: (options: RecordingOptions) => ipcRenderer.invoke('recording:start', options),
  stopRecording: () => ipcRenderer.invoke('recording:stop'),
  pauseRecording: () => ipcRenderer.invoke('recording:pause'),
  resumeRecording: () => ipcRenderer.invoke('recording:resume'),

  // File operations
  saveAnnotatedImage: (dataUrl: string, originalId: string) =>
    ipcRenderer.invoke('file:saveAnnotated', dataUrl, originalId),
  trimVideo: (filepath: string, startTime: number, endTime: number) =>
    ipcRenderer.invoke('video:trim', filepath, startTime, endTime),

  // Library
  getAllCaptures: () => ipcRenderer.invoke('library:getAll'),
  deleteCapture: (id: string) => ipcRenderer.invoke('library:delete', id),

  // Sharing
  uploadAndShare: (id: string) => ipcRenderer.invoke('share:upload', id),

  // Clipboard
  copyImageToClipboard: (filepath: string) => ipcRenderer.invoke('clipboard:copyImage', filepath),
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:copyText', text),

  // Save recording blob from renderer
  saveRecording: (arrayBuffer: ArrayBuffer, duration: number) =>
    ipcRenderer.invoke('recording:save', arrayBuffer, duration),

  // Events from main process
  onScreenshotRequested: (callback: () => void) => {
    ipcRenderer.on('trigger:screenshot', () => callback())
  },
  onRecordingRequested: (callback: () => void) => {
    ipcRenderer.on('trigger:recording', () => callback())
  },

  // App
  readFileAsDataUrl: (filepath: string) => ipcRenderer.invoke('file:readAsDataUrl', filepath),
  showItemInFolder: (filepath: string) => ipcRenderer.send('file:showInFolder', filepath),
  showWindow: () => ipcRenderer.send('window:show')
}

contextBridge.exposeInMainWorld('captureAPI', captureAPI)
