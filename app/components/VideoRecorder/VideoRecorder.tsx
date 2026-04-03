'use client'

import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import styles from './VideoRecorder.module.css'

interface VideoRecorderProps {
  onRecordingComplete: (videoBlob: Blob, thumbnailBlob: Blob) => void
  maxDuration?: number // in seconds
}

export default function VideoRecorder({ onRecordingComplete, maxDuration = 60 }: VideoRecorderProps) {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // Timer for recording duration
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    if (!user) return

    try {
      setIsInitializing(true)
      setError(null)

      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user' // Use front camera by default
        },
        audio: true
      })

      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true // Prevent echo
      }

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      })

      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' })

        // Generate thumbnail from first frame
        const thumbnailBlob = await generateThumbnail(videoBlob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())

        onRecordingComplete(videoBlob, thumbnailBlob)
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording()
            return maxDuration
          }
          return prev + 1
        })
      }, 1000)

    } catch (err: any) {
      console.error('Error starting recording:', err)
      setError(err.message || 'Failed to start recording. Please check camera and microphone permissions.')
      setHasPermission(false)
    } finally {
      setIsInitializing(false)
    }
  }, [user, maxDuration, onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)

      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording()
            return maxDuration
          }
          return prev + 1
        })
      }, 1000)
    }
  }, [maxDuration, stopRecording])

  const generateThumbnail = async (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = canvasRef.current

      if (!canvas) {
        reject(new Error('Canvas not available'))
        return
      }

      video.onloadedmetadata = () => {
        // Set canvas dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Seek to first frame and draw
        video.currentTime = 0.1 // Small offset to ensure we get a frame
      }

      video.onseeked = () => {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to generate thumbnail'))
            }
          }, 'image/jpeg', 0.8)
        } else {
          reject(new Error('Canvas context not available'))
        }
      }

      video.onerror = () => reject(new Error('Video loading error'))

      video.src = URL.createObjectURL(videoBlob)
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = (recordingTime / maxDuration) * 100

  return (
    <div className={styles.container}>
      <div className={styles.recorderContainer}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={styles.videoPreview}
        />

        <canvas ref={canvasRef} className={styles.hiddenCanvas} />

        {!isRecording && !isInitializing && hasPermission === null && (
          <div className={styles.permissionPrompt}>
            <div className={styles.permissionContent}>
              <h3>Camera & Microphone Access</h3>
              <p>We'll need access to your camera and microphone to record your confessional.</p>
              <button onClick={startRecording} className={styles.startButton}>
                Allow Access & Start Recording
              </button>
            </div>
          </div>
        )}

        {isInitializing && (
          <div className={styles.initializing}>
            <div className={styles.spinner}></div>
            <p>Initializing camera...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={() => setError(null)} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        )}

        {isRecording && (
          <>
            <div className={styles.recordingIndicator}>
              <div className={styles.recordingDot}></div>
              <span>REC</span>
            </div>

            <div className={styles.controls}>
              <div className={styles.timer}>
                {formatTime(recordingTime)} / {formatTime(maxDuration)}
              </div>

              <div className={styles.progressBar}>
                <div
                  className={styles.progress}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className={styles.buttons}>
                {isPaused ? (
                  <button onClick={resumeRecording} className={styles.resumeButton}>
                    Resume
                  </button>
                ) : (
                  <button onClick={pauseRecording} className={styles.pauseButton}>
                    Pause
                  </button>
                )}

                <button onClick={stopRecording} className={styles.stopButton}>
                  Stop Recording
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={styles.instructions}>
        <p>🎥 Record up to {maxDuration} seconds of anonymous video</p>
        <p>📱 Make sure you're in a well-lit area for better quality</p>
        <p>🔒 Your recording stays private until you choose to share it</p>
      </div>
    </div>
  )
}
