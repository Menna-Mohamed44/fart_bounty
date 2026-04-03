'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Download,
  Share2,
  PlayCircle
} from 'lucide-react'
import styles from './VideoPlayer.module.css'

interface VideoPlayerProps {
  src: string
  poster?: string
  blurLevel?: number
  className?: string
  autoPlay?: boolean
  muted?: boolean
}

export default function VideoPlayer({
  src,
  poster,
  blurLevel = 0,
  className = '',
  autoPlay = false,
  muted = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(muted)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isReady, setIsReady] = useState(false)
  const [isBuffering, setIsBuffering] = useState(true)
  const [isSharing, setIsSharing] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const handleLoadedData = () => {
      setDuration(video.duration)
      setIsReady(true)
      setIsBuffering(false)
    }
    const handleCanPlay = () => {
      setIsReady(true)
      setIsBuffering(false)
    }
    const handleWaiting = () => setIsBuffering(true)
    const handlePlaying = () => setIsBuffering(false)

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('ended', () => setIsPlaying(false))
    video.addEventListener('play', () => setIsPlaying(true))
    video.addEventListener('pause', () => setIsPlaying(false))
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('canplaythrough', handleCanPlay)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('seeking', handleWaiting)
    video.addEventListener('seeked', handlePlaying)

    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('ended', () => setIsPlaying(false))
      video.removeEventListener('play', () => setIsPlaying(true))
      video.removeEventListener('pause', () => setIsPlaying(false))
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('canplaythrough', handleCanPlay)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('seeking', handleWaiting)
      video.removeEventListener('seeked', handlePlaying)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (isPlaying) {
        await video.pause()
      } else {
        await video.play()
      }
    } catch (error) {
      console.error('Error toggling play:', error)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * duration

    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = rate
    setPlaybackRate(rate)
    setShowSettings(false)
  }

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await container.requestFullscreen()
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0

  const handleShare = async () => {
    if (isSharing) return
    setIsSharing(true)

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Anonymous Confessional',
          url: window.location.href
        })
      } catch (error) {
        if ((error as DOMException)?.name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      } finally {
        setIsSharing(false)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        // You could show a toast notification here
      } catch (error) {
        console.error('Error copying to clipboard:', error)
      } finally {
        setIsSharing(false)
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.videoPlayer} ${className} ${isFullscreen ? styles.fullscreen : ''}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={styles.video}
        style={{
          filter: blurLevel > 0 ? `blur(${blurLevel}px)` : 'none'
        }}
        autoPlay={autoPlay}
        muted={isMuted}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading spinner */}
      {(!isReady || isBuffering) && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* Play icon overlay for non-playing videos */}
      {!isPlaying && isReady && !isBuffering && (
        <div className={styles.playOverlay} onClick={togglePlay}>
          <PlayCircle size={64} className={styles.playIcon} />
        </div>
      )}

      {/* Controls overlay */}
      <div className={`${styles.controls} ${showControls ? styles.visible : ''}`}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.leftControls}>
            <button
              className={styles.controlButton}
              onClick={handleShare}
              title="Share"
              disabled={isSharing}
            >
              <Share2 size={18} />
            </button>
          </div>
          <div className={styles.rightControls}>
            <button
              className={styles.controlButton}
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar} onClick={handleSeek}>
          <div
            className={styles.progress}
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className={styles.progressHandle}
            style={{ left: `${progressPercentage}%` }}
          />
        </div>

        {/* Bottom controls */}
        <div className={styles.bottomBar}>
          <div className={styles.leftControls}>
            <button className={styles.controlButton} onClick={togglePlay}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button className={styles.controlButton} onClick={toggleMute}>
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <div className={styles.volumeControl}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
              />
            </div>

            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className={styles.rightControls}>
            <select
              value={playbackRate}
              onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
              className={styles.speedControl}
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>Normal</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            <button className={styles.controlButton} onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingsContent}>
            <h4>Playback Speed</h4>
            <div className={styles.speedOptions}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  className={`${styles.speedButton} ${playbackRate === rate ? styles.active : ''}`}
                  onClick={() => handlePlaybackRateChange(rate)}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
