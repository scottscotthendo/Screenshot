import { useAppStore } from '../stores/app-store'
import CaptureGrid from '../components/capture-grid'
import { motion } from 'framer-motion'

interface DashboardProps {
  onRefresh: () => void
}

export default function Dashboard({ onRefresh }: DashboardProps) {
  const { captures, setView } = useAppStore()

  return (
    <div className="h-full flex flex-col px-6 pb-6">
      {/* Action buttons */}
      <div className="flex items-center gap-3 mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('screenshot-flow')}
          className="titlebar-no-drag flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 shadow-md shadow-primary/20"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Screenshot
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('recording-flow')}
          className="titlebar-no-drag flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-xl font-medium text-sm hover:bg-destructive/90 shadow-md shadow-destructive/20"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
          Record
        </motion.button>

        <div className="flex-1" />

        <span className="text-xs text-muted-foreground">
          {captures.length} capture{captures.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Capture grid */}
      {captures.length === 0 ? (
        <EmptyState />
      ) : (
        <CaptureGrid />
      )}
    </div>
  )
}

function EmptyState() {
  const { setView } = useAppStore()

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No captures yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Take your first screenshot or start recording. Use <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">⌘⇧5</kbd> for a quick snap.
          </p>
        </div>
        <button
          onClick={() => setView('screenshot-flow')}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          Take a Screenshot
        </button>
      </motion.div>
    </div>
  )
}
