import { create } from 'zustand'

export type AnnotationToolType = 'select' | 'pen' | 'arrow' | 'rectangle' | 'ellipse' | 'text' | 'highlight' | 'blur'

interface AnnotationState {
  activeTool: AnnotationToolType
  setActiveTool: (tool: AnnotationToolType) => void

  activeColor: string
  setActiveColor: (color: string) => void

  strokeWidth: number
  setStrokeWidth: (width: number) => void

  fontSize: number
  setFontSize: (size: number) => void

  // Canvas state snapshots for undo/redo
  undoStack: string[]
  redoStack: string[]
  pushUndo: (canvasJson: string) => void
  undo: () => string | null
  redo: () => string | null
  clearHistory: () => void
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000']

export const PRESET_COLORS = COLORS

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  activeTool: 'pen',
  setActiveTool: (tool) => set({ activeTool: tool }),

  activeColor: '#ef4444',
  setActiveColor: (color) => set({ activeColor: color }),

  strokeWidth: 3,
  setStrokeWidth: (width) => set({ strokeWidth: width }),

  fontSize: 24,
  setFontSize: (size) => set({ fontSize: size }),

  undoStack: [],
  redoStack: [],

  pushUndo: (canvasJson: string) => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-50), canvasJson], // Keep last 50 states
      redoStack: []
    }))
  },

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return null
    const previous = state.undoStack[state.undoStack.length - 1]
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, previous]
    })
    return state.undoStack.length >= 2 ? state.undoStack[state.undoStack.length - 2] : null
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return null
    const next = state.redoStack[state.redoStack.length - 1]
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, next]
    })
    return next
  },

  clearHistory: () => set({ undoStack: [], redoStack: [] })
}))
