import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/app-store'
import CaptureCard from './capture-card'
import type { CaptureMetadata } from '../../shared/types'
import { motion } from 'framer-motion'

export default function CaptureGrid() {
  const { captures } = useAppStore()

  return (
    <div className="flex-1 overflow-y-auto">
      <motion.div
        className="grid grid-cols-3 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: { staggerChildren: 0.05 }
          }
        }}
      >
        {captures.map((capture) => (
          <motion.div
            key={capture.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <CaptureCard capture={capture} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
