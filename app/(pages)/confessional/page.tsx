'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import ConfessionalFeed from '@/app/components/ConfessionalFeed/ConfessionalFeed'
import VideoRecorder from '@/app/components/VideoRecorder/VideoRecorder'
import EffectsControls from '@/app/components/EffectsControls/EffectsControls'
import type { VoiceEffect } from '@/app/components/EffectsControls/EffectsControls'
import ConfirmationModal from '@/app/components/ConfirmationModal/ConfirmationModal'
import {
  extractAudioBuffer,
  applyVoiceEffect,
  reencodeVideo
} from '@/app/lib/voiceProcessor'
import { getCSSFilterPreview, type FaceFilter } from '@/app/lib/faceFilterProcessor'
import { Video, Sparkles, Shield, Camera, Loader2 } from 'lucide-react'
import styles from './confessional.module.css'

function ConfessionalPage() {
  const { user } = useAuth()

  // Recording state
  const [currentStep, setCurrentStep] = useState<'feed' | 'effects' | 'preview'>('feed')
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null)
  const [recordedThumbnail, setRecordedThumbnail] = useState<Blob | null>(null)
  const [showRecorder, setShowRecorder] = useState(false)

  // Effects state
  const [selectedFaceFilter, setSelectedFaceFilter] = useState<FaceFilter>({ type: 'none', intensity: 5 })
  const [selectedEffect, setSelectedEffect] = useState<VoiceEffect>({ type: 'none', intensity: 5 })

  // Audio processing state
  const [rawAudioBuffer, setRawAudioBuffer] = useState<AudioBuffer | null>(null)
  const [processedAudioBuffer, setProcessedAudioBuffer] = useState<AudioBuffer | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [isEncoding, setIsEncoding] = useState(false)
  const [processedVideo, setProcessedVideo] = useState<Blob | null>(null)

  // Preview playback refs
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const previewAudioCtxRef = useRef<AudioContext | null>(null)
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // Modal state
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Memoize object URLs so they don't change on every render (prevents AbortError)
  const videoPreviewUrl = useMemo(() => {
    if (recordedVideo) return URL.createObjectURL(recordedVideo)
    return null
  }, [recordedVideo])

  const thumbnailPreviewUrl = useMemo(() => {
    if (recordedThumbnail) return URL.createObjectURL(recordedThumbnail)
    return null
  }, [recordedThumbnail])

  // Cleanup object URLs when blobs change
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    }
  }, [videoPreviewUrl])

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl)
    }
  }, [thumbnailPreviewUrl])

  // Extract audio when recording completes
  const handleRecordingComplete = useCallback(async (videoBlob: Blob, thumbnailBlob: Blob) => {
    setRecordedVideo(videoBlob)
    setRecordedThumbnail(thumbnailBlob)
    setCurrentStep('effects')

    // Extract audio buffer from the recorded video in background
    try {
      const buffer = await extractAudioBuffer(videoBlob)
      setRawAudioBuffer(buffer)
    } catch (err) {
      console.error('Failed to extract audio:', err)
    }
  }, [])

  // Process audio when voice effect or intensity changes
  useEffect(() => {
    if (!rawAudioBuffer || selectedEffect.type === 'none') {
      setProcessedAudioBuffer(null)
      setProcessedVideo(null)
      return
    }

    let cancelled = false
    const processAudio = async () => {
      setIsProcessing(true)
      try {
        const processed = await applyVoiceEffect(rawAudioBuffer, selectedEffect)
        if (!cancelled) {
          setProcessedAudioBuffer(processed)
          setProcessedVideo(null) // invalidate any previously encoded video
        }
      } catch (err) {
        console.error('Voice processing failed:', err)
      } finally {
        if (!cancelled) setIsProcessing(false)
      }
    }

    processAudio()
    return () => { cancelled = true }
  }, [rawAudioBuffer, selectedEffect])

  // Cleanup preview audio on unmount or step change
  useEffect(() => {
    return () => stopPreview()
  }, [currentStep])

  const stopPreview = useCallback(() => {
    if (previewSourceRef.current) {
      try { previewSourceRef.current.stop() } catch (e) { /* ignore */ }
      previewSourceRef.current = null
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.pause()
      previewVideoRef.current.currentTime = 0
    }
    setIsPreviewPlaying(false)
  }, [])

  const handlePreview = useCallback(() => {
    if (!processedAudioBuffer || !previewVideoRef.current) return

    stopPreview()

    // Create audio context and source for processed audio
    const audioCtx = new AudioContext()
    previewAudioCtxRef.current = audioCtx

    const source = audioCtx.createBufferSource()
    source.buffer = processedAudioBuffer
    source.connect(audioCtx.destination)
    previewSourceRef.current = source

    // Play video muted + processed audio in sync
    const video = previewVideoRef.current
    video.muted = true
    video.currentTime = 0
    video.play().catch(() => { /* interrupted by new load, ignore */ })
    source.start()

    setIsPreviewPlaying(true)

    // Stop when audio ends
    source.onended = () => {
      setIsPreviewPlaying(false)
      video.pause()
      video.currentTime = 0
    }

    // Stop when video ends (whichever is shorter)
    video.onended = () => {
      try { source.stop() } catch (e) { /* ignore */ }
      setIsPreviewPlaying(false)
    }
  }, [processedAudioBuffer, stopPreview])

  const handleEffectsComplete = useCallback(async () => {
    if (!recordedVideo) return

    const hasVoiceFilter = selectedEffect.type !== 'none' && processedAudioBuffer
    const hasFaceFilter = selectedFaceFilter.type !== 'none'

    // If no effects applied at all, go straight to confirmation
    if (!hasVoiceFilter && !hasFaceFilter) {
      setProcessedVideo(null)
      setShowConfirmation(true)
      return
    }

    // Re-encode video with face filter and/or processed audio baked in
    stopPreview()
    setIsEncoding(true)
    try {
      const encoded = await reencodeVideo(recordedVideo, {
        processedAudioBuffer: hasVoiceFilter ? processedAudioBuffer : null,
        faceFilter: hasFaceFilter ? selectedFaceFilter : null
      })
      setProcessedVideo(encoded)
      setShowConfirmation(true)
    } catch (err) {
      console.error('Re-encoding failed:', err)
      alert('Failed to apply effects to video. Posting with original.')
      setProcessedVideo(null)
      setShowConfirmation(true)
    } finally {
      setIsEncoding(false)
    }
  }, [recordedVideo, selectedEffect, processedAudioBuffer, selectedFaceFilter, stopPreview])

  const handlePostComplete = () => {
    setShowConfirmation(false)
    setCurrentStep('feed')
    setRecordedVideo(null)
    setRecordedThumbnail(null)
    setProcessedVideo(null)
    setRawAudioBuffer(null)
    setProcessedAudioBuffer(null)
    setSelectedFaceFilter({ type: 'none', intensity: 5 })
    setSelectedEffect({ type: 'none', intensity: 5 })
    setShowRecorder(false)
  }

  const handleBackToFeed = () => {
    stopPreview()
    setCurrentStep('feed')
    setRecordedVideo(null)
    setRecordedThumbnail(null)
    setProcessedVideo(null)
    setRawAudioBuffer(null)
    setProcessedAudioBuffer(null)
    setSelectedFaceFilter({ type: 'none', intensity: 5 })
    setSelectedEffect({ type: 'none', intensity: 5 })
    setShowRecorder(false)
  }

  const handleStartRecording = () => {
    setShowRecorder(true)
  }

  // Use processed video if available, otherwise original
  const finalVideoBlob = processedVideo || recordedVideo

  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to create and view confessionals">
      <div className={styles.container}>
        {currentStep === 'feed' && (
          <>
            <div className={styles.header}>
              <h1>Confessionals</h1>
              <p>Anonymous video confessions from the community</p>
            </div>

            <div className={styles.content}>
              {user && (
                <section className={styles.heroSection}>
                  <div className={styles.createSection}>
                    <div className={styles.recordingFrame}>
                      {showRecorder ? (
                        <div className={styles.recorderWrapper}>
                          <VideoRecorder
                            onRecordingComplete={handleRecordingComplete}
                            maxDuration={60}
                          />
                        </div>
                      ) : (
                        <img src="/FBmask.jpg" alt="Confessional Mask" className={styles.recordingImage} />
                      )}
                    </div>
                    {!showRecorder && (
                      <button onClick={handleStartRecording} className={styles.startRecordingButton}>
                        <Camera size={20} />
                        Start Recording
                      </button>
                    )}
                  </div>

                  <div className={styles.infoPanel}>
                    <span className={styles.heroBadge}>No face · No judgment</span>
                    <h2>Confess without being exposed.</h2>
                    <ul className={styles.heroHighlights}>
                      <li>
                        <Shield size={18} />
                        <span>Blur + mask auto-apply on every frame.</span>
                      </li>
                      <li>
                        <Video size={18} />
                        <span>60-second secure capsule with encryption.</span>
                      </li>
                      <li>
                        <Sparkles size={18} />
                        <span>Real voice filters to disguise your tone.</span>
                      </li>
                    </ul>
                  </div>
                </section>
              )}
              <ConfessionalFeed />
            </div>
          </>
        )}

        {currentStep === 'effects' && recordedVideo && recordedThumbnail && (
          <div className={styles.effectsSection}>
            <div className={styles.header}>
              <button onClick={handleBackToFeed} className={styles.backButton}>
                ← Back to Feed
              </button>
              <h1>Adjust Your Confessional</h1>
              <p>Add blur and voice filters, then preview before posting</p>
            </div>

            <div className={styles.effectsLayout}>
              <div className={styles.videoPreview}>
                <video
                  ref={previewVideoRef}
                  src={videoPreviewUrl || undefined}
                  poster={thumbnailPreviewUrl || undefined}
                  controls={selectedEffect.type === 'none'}
                  muted={selectedEffect.type !== 'none'}
                  className={styles.previewVideo}
                  style={{ filter: getCSSFilterPreview(selectedFaceFilter) }}
                />
                {selectedEffect.type !== 'none' && !isPreviewPlaying && (
                  <div className={styles.muteOverlay}>
                    🔇 Use &quot;Preview Filter&quot; to hear the effect
                  </div>
                )}
              </div>

              <div className={styles.controlsSection}>
                <EffectsControls
                  selectedFaceFilter={selectedFaceFilter}
                  onFaceFilterChange={setSelectedFaceFilter}
                  selectedEffect={selectedEffect}
                  onEffectChange={(effect) => {
                    stopPreview()
                    setSelectedEffect(effect)
                  }}
                  isProcessing={isProcessing}
                  isPreviewPlaying={isPreviewPlaying}
                  onPreview={handlePreview}
                  onStopPreview={stopPreview}
                />

                <div className={styles.actions}>
                  <button onClick={handleBackToFeed} className={styles.cancelButton}>
                    Cancel
                  </button>
                  <button
                    onClick={handleEffectsComplete}
                    className={styles.continueButton}
                    disabled={isProcessing || isEncoding}
                  >
                    {isEncoding ? (
                      <>
                        <Loader2 size={16} className={styles.btnSpinner} />
                        Applying Filter...
                      </>
                    ) : (
                      'Continue to Post'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handlePostComplete}
          videoBlob={finalVideoBlob}
          thumbnailBlob={recordedThumbnail}
          faceFilter={selectedFaceFilter}
          voiceEffects={selectedEffect.type !== 'none' ? [selectedEffect] : []}
        />
      </div>
    </AuthGate>
  )
}

export default ConfessionalPage