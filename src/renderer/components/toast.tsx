import { useAppStore } from '../stores/app-store'
import { motion, AnimatePresence } from 'framer-motion'

export default function Toast() {
  const { toast } = useAppStore()

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={`
            px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg backdrop-blur-sm
            ${toast.type === 'success' ? 'bg-success/90 text-white' : ''}
            ${toast.type === 'error' ? 'bg-destructive/90 text-white' : ''}
            ${toast.type === 'info' ? 'bg-secondary text-foreground' : ''}
          `}>
            {toast.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
