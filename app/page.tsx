"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Header from "@/components/Header"
import NowCard from "@/components/NowCard"
import PlayerControls from "@/components/PlayerControls"
import Footer from "@/components/Footer"
import { fetchRadioStatus, fetchHabboAvatar } from "@/lib/api"
import type { RadioStatus } from "@/lib/types"

export default function RadioPlayer() {
  const [radioStatus, setRadioStatus] = useState<RadioStatus | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [isLoading, setIsLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Fetch radio status
  const updateRadioStatus = async () => {
    try {
      const status = await fetchRadioStatus()
      setRadioStatus(status)

      // Fetch avatar if there's a DJ
      if (status.locutor && status.locutor !== "Radio Habblive" && status.locutor.trim() !== "") {
        try {
          const avatar = await fetchHabboAvatar(status.locutor)
          setAvatarUrl(avatar.avatar || null)
        } catch (error) {
          setAvatarUrl(null)
        }
      } else {
        setAvatarUrl(null)
      }
    } catch (error) {
      console.error("Failed to fetch radio status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize audio and status
  useEffect(() => {
    updateRadioStatus()
    const interval = setInterval(updateRadioStatus, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Handle audio volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const handlePlayPause = async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error("Audio playback error:", error)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <audio ref={audioRef} src="https://sonicpanel.oficialserver.com/8342/;" preload="none" />

      <motion.div
        className="hidden lg:block fixed inset-0 pointer-events-none z-20"
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.8,
          delay: 0.5,
          type: "spring",
          stiffness: 100,
          damping: 15,
        }}
      >
        <img src="/hliveequipe.png" alt="" className="w-full h-full object-cover object-center" />
      </motion.div>

      <div className="relative z-10">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={radioStatus?.locutor || "loading"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <NowCard radioStatus={radioStatus} avatarUrl={avatarUrl} />
              </motion.div>
            </AnimatePresence>

            <PlayerControls
              isPlaying={isPlaying}
              volume={volume}
              onPlayPause={handlePlayPause}
              onVolumeChange={handleVolumeChange}
            />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
