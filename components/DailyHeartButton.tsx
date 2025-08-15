"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Heart } from "lucide-react"
import { Button } from "./ui/button"

export default function DailyHeartButton() {
  const [hasLikedToday, setHasLikedToday] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [totalLikes, setTotalLikes] = useState(0)

  useEffect(() => {
    // Check if user has already liked today
    const today = new Date().toDateString()
    const lastLikeDate = localStorage.getItem("daily-like-date")
    setHasLikedToday(lastLikeDate === today)

    const storedLikes = localStorage.getItem("total-daily-likes")
    setTotalLikes(storedLikes ? Number.parseInt(storedLikes) : 0)
  }, [])

  const playPopSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }

  const handleLike = async () => {
    if (hasLikedToday || isLoading) return

    setIsLoading(true)

    try {
      // Store today's date in localStorage
      const today = new Date().toDateString()
      localStorage.setItem("daily-like-date", today)
      setHasLikedToday(true)

      const newTotal = totalLikes + 1
      setTotalLikes(newTotal)
      localStorage.setItem("total-daily-likes", newTotal.toString())

      playPopSound()

      // Here you could also send the like to a backend API if needed
      // await fetch('/api/daily-likes', { method: 'POST' })
    } catch (error) {
      console.error("Error sending daily like:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex items-center gap-2"
    >
      <Button
        onClick={handleLike}
        disabled={hasLikedToday || isLoading}
        variant="ghost"
        size="sm"
        className={`
          p-2 rounded-full transition-all duration-200 border-2
          ${
            hasLikedToday
              ? "text-red-400 bg-red-500/20 border-red-400/50 cursor-not-allowed shadow-lg shadow-red-500/20"
              : "text-gray-400 hover:text-red-400 hover:bg-red-500/20 border-gray-600 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/20"
          }
        `}
      >
        <Heart className={`w-5 h-5 transition-all duration-200 ${hasLikedToday ? "fill-current" : ""}`} />
      </Button>
      <span className="text-sm text-muted-foreground font-medium">{totalLikes}</span>
    </motion.div>
  )
}
