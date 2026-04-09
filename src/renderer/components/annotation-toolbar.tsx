import { useAnnotationStore, PRESET_COLORS, type AnnotationToolType } from '../stores/annotation-store'

const TOOLS: { type: AnnotationToolType; label: string; icon: string }[] = [
  { type: 'select', label: 'Select', icon: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z' },
  { type: 'pen', label: 'Pen', icon: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' },
  { type: 'arrow', label: 'Arrow', icon: 'M5 12h14M12 5l7 7-7 7' },
  { type: 'rectangle', label: 'Rectangle', icon: 'M3 3h18v18H3z' },
  { type: 'ellipse', label: 'Circle', icon: 'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0' },
  { type: 'text', label: 'Text', icon: 'M4 7V4h16v3M9 20h6M12 4v16' },
  { type: 'highlight', label: 'Highlight', icon: 'M9 11l-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4' },
]

export default function AnnotationToolbar() {
  const { activeTool, setActiveTool, activeColor, setActiveColor, strokeWidth, setStrokeWidth } = useAnnotationStore()

  return (
    <div className="w-14 border-r border-border flex flex-col items-center py-3 gap-1 bg-card">
      {/* Tools */}
      {TOOLS.map(tool => (
        <button
          key={tool.type}
          onClick={() => setActiveTool(tool.type)}
          className={`
            titlebar-no-drag w-10 h-10 rounded-lg flex items-center justify-center transition-colors
            ${activeTool === tool.type
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }
          `}
          title={tool.label}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={tool.icon} />
          </svg>
        </button>
      ))}

      <div className="w-8 h-px bg-border my-2" />

      {/* Color swatches */}
      <div className="flex flex-col gap-1">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`
              titlebar-no-drag w-6 h-6 rounded-full border-2 mx-auto
              ${activeColor === color ? 'border-white scale-110' : 'border-transparent'}
            `}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="w-8 h-px bg-border my-2" />

      {/* Stroke width */}
      <div className="flex flex-col items-center gap-1">
        {[2, 4, 8].map(w => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            className={`
              titlebar-no-drag w-8 h-8 rounded-lg flex items-center justify-center
              ${strokeWidth === w ? 'bg-secondary' : 'hover:bg-secondary/50'}
            `}
            title={`${w}px`}
          >
            <div
              className="rounded-full bg-foreground"
              style={{ width: w + 2, height: w + 2 }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
