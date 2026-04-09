import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../stores/app-store'
import { useAnnotationStore, type AnnotationToolType } from '../stores/annotation-store'
import AnnotationToolbar from './annotation-toolbar'
import * as fabric from 'fabric'

export default function AnnotationEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { currentImageDataUrl, setView, showToast, setCurrentImageDataUrl, addCapture } = useAppStore()
  const { activeTool, activeColor, strokeWidth, fontSize, pushUndo } = useAnnotationStore()
  const [saving, setSaving] = useState(false)
  const isDrawingShape = useRef(false)
  const shapeStartPoint = useRef<{ x: number; y: number } | null>(null)
  const currentShape = useRef<fabric.Object | null>(null)

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !currentImageDataUrl) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      selection: activeTool === 'select',
      backgroundColor: '#000000'
    })
    fabricRef.current = canvas

    // Load background image
    const img = new Image()
    img.onload = () => {
      const container = containerRef.current
      if (!container) return

      const maxW = container.clientWidth - 40
      const maxH = container.clientHeight - 40
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)

      canvas.setDimensions({
        width: img.width * scale,
        height: img.height * scale
      })

      const fabricImg = new fabric.FabricImage(img, {
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false
      })
      canvas.backgroundImage = fabricImg
      canvas.renderAll()

      // Save initial state
      pushUndo(JSON.stringify(canvas.toJSON()))
    }
    img.src = currentImageDataUrl

    return () => {
      canvas.dispose()
    }
  }, [currentImageDataUrl])

  // Update tool settings
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.isDrawingMode = activeTool === 'pen'
    canvas.selection = activeTool === 'select'

    if (activeTool === 'pen') {
      const brush = new fabric.PencilBrush(canvas)
      brush.color = activeColor
      brush.width = strokeWidth
      canvas.freeDrawingBrush = brush
    }
  }, [activeTool, activeColor, strokeWidth])

  // Shape drawing handlers
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (['select', 'pen'].includes(activeTool)) return

    const handleMouseDown = (opt: fabric.TEvent<MouseEvent>) => {
      if (activeTool === 'text') {
        const pointer = canvas.getScenePoint(opt.e)
        const text = new fabric.IText('Type here', {
          left: pointer.x,
          top: pointer.y,
          fontSize: fontSize,
          fill: activeColor,
          fontFamily: 'Inter, sans-serif',
          editable: true
        })
        canvas.add(text)
        canvas.setActiveObject(text)
        text.enterEditing()
        pushUndo(JSON.stringify(canvas.toJSON()))
        return
      }

      isDrawingShape.current = true
      const pointer = canvas.getScenePoint(opt.e)
      shapeStartPoint.current = { x: pointer.x, y: pointer.y }

      let shape: fabric.Object | null = null

      if (activeTool === 'rectangle') {
        shape = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: strokeWidth,
          strokeUniform: true
        })
      } else if (activeTool === 'ellipse') {
        shape = new fabric.Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 0,
          ry: 0,
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: strokeWidth,
          strokeUniform: true
        })
      } else if (activeTool === 'arrow') {
        shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: activeColor,
          strokeWidth: strokeWidth,
          strokeLineCap: 'round'
        })
      } else if (activeTool === 'highlight') {
        shape = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: activeColor + '40',
          stroke: 'transparent',
          strokeWidth: 0
        })
      }

      if (shape) {
        canvas.add(shape)
        currentShape.current = shape
      }
    }

    const handleMouseMove = (opt: fabric.TEvent<MouseEvent>) => {
      if (!isDrawingShape.current || !shapeStartPoint.current || !currentShape.current) return
      const pointer = canvas.getScenePoint(opt.e)
      const start = shapeStartPoint.current
      const shape = currentShape.current

      if (activeTool === 'rectangle' || activeTool === 'highlight') {
        const rect = shape as fabric.Rect
        const width = Math.abs(pointer.x - start.x)
        const height = Math.abs(pointer.y - start.y)
        rect.set({
          left: Math.min(start.x, pointer.x),
          top: Math.min(start.y, pointer.y),
          width,
          height
        })
      } else if (activeTool === 'ellipse') {
        const ellipse = shape as fabric.Ellipse
        ellipse.set({
          left: Math.min(start.x, pointer.x),
          top: Math.min(start.y, pointer.y),
          rx: Math.abs(pointer.x - start.x) / 2,
          ry: Math.abs(pointer.y - start.y) / 2
        })
      } else if (activeTool === 'arrow') {
        const line = shape as fabric.Line
        line.set({ x2: pointer.x, y2: pointer.y })
      }

      canvas.renderAll()
    }

    const handleMouseUp = () => {
      if (isDrawingShape.current && currentShape.current) {
        // Add arrowhead for arrow tool
        if (activeTool === 'arrow' && currentShape.current instanceof fabric.Line) {
          const line = currentShape.current
          const x1 = line.x1!, y1 = line.y1!, x2 = line.x2!, y2 = line.y2!
          const angle = Math.atan2(y2 - y1, x2 - x1)
          const headLen = 15

          const triangle = new fabric.Triangle({
            left: x2,
            top: y2,
            width: headLen,
            height: headLen,
            fill: activeColor,
            angle: (angle * 180 / Math.PI) + 90,
            originX: 'center',
            originY: 'center'
          })

          const group = new fabric.Group([line, triangle])
          canvas.remove(line)
          canvas.add(group)
        }

        pushUndo(JSON.stringify(canvas.toJSON()))
      }
      isDrawingShape.current = false
      shapeStartPoint.current = null
      currentShape.current = null
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
    }
  }, [activeTool, activeColor, strokeWidth, fontSize])

  // Save on pen path created
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const handler = () => pushUndo(JSON.stringify(canvas.toJSON()))
    canvas.on('path:created', handler)
    return () => { canvas.off('path:created', handler) }
  }, [])

  const handleSave = async () => {
    const canvas = fabricRef.current
    if (!canvas) return

    setSaving(true)
    try {
      // Export canvas as data URL
      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1 / (canvas.getZoom() || 1)
      })

      if (window.captureAPI) {
        const record = await window.captureAPI.saveAnnotatedImage(dataUrl, '')
        addCapture(record)
        showToast('Screenshot saved!')
      }

      setCurrentImageDataUrl(null)
      setView('dashboard')
    } catch (err) {
      console.error('Save failed:', err)
      showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyToClipboard = async () => {
    const canvas = fabricRef.current
    if (!canvas) return

    try {
      const dataUrl = canvas.toDataURL({ format: 'png', quality: 1 })
      // Save temporarily then copy
      if (window.captureAPI) {
        const record = await window.captureAPI.saveAnnotatedImage(dataUrl, '')
        await window.captureAPI.copyImageToClipboard(record.filepath)
        addCapture(record)
        showToast('Copied to clipboard!')
      }
    } catch (err) {
      showToast('Failed to copy', 'error')
    }
  }

  const handleUndo = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const state = useAnnotationStore.getState()
    const prev = state.undo()
    if (prev) {
      canvas.loadFromJSON(JSON.parse(prev)).then(() => canvas.renderAll())
    }
  }

  const handleRedo = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const state = useAnnotationStore.getState()
    const next = state.redo()
    if (next) {
      canvas.loadFromJSON(JSON.parse(next)).then(() => canvas.renderAll())
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCurrentImageDataUrl(null); setView('dashboard') }}
            className="titlebar-no-drag p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="text-sm text-muted-foreground">Annotate</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            className="titlebar-no-drag p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Undo (⌘Z)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            className="titlebar-no-drag p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Redo (⌘⇧Z)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
            </svg>
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          <button
            onClick={handleCopyToClipboard}
            className="titlebar-no-drag px-3 py-1.5 rounded-lg hover:bg-secondary text-sm text-muted-foreground hover:text-foreground"
          >
            Copy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="titlebar-no-drag px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Canvas + Toolbar */}
      <div className="flex-1 flex overflow-hidden">
        <AnnotationToolbar />

        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center bg-neutral-900 overflow-auto p-5"
        >
          <canvas ref={canvasRef} className="shadow-2xl rounded-lg" />
        </div>
      </div>
    </div>
  )
}
