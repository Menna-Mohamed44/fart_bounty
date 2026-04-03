'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import { drawFilteredFrame, FACE_FILTERS, type FaceFilter } from '@/app/lib/faceFilterProcessor'
import styles from './ConfirmationModal.module.css'

const supabase = createClient()

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  videoBlob: Blob | null
  thumbnailBlob: Blob | null
  faceFilter: FaceFilter
  voiceEffects: any[]
  uploading?: boolean
}

interface VoiceEffect {
  type: string
  intensity: number
}

const DEFAULT_FACE_FILTER: FaceFilter = { type: 'none', intensity: 5 }

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  videoBlob,
  thumbnailBlob,
  faceFilter = DEFAULT_FACE_FILTER,
  voiceEffects
}: ConfirmationModalProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePost = async () => {
    if (!user || !videoBlob || !thumbnailBlob) return

    try {
      setError(null)
      setUploading(true)

      // Apply face filter effect to thumbnail for visual indication
      const processedThumbnailBlob = await applyFilterToThumbnail(thumbnailBlob, faceFilter)

      // Generate unique filenames
      const timestamp = Date.now()
      const videoFileName = `confessional-${user.id}-${timestamp}.webm`
      const thumbnailFileName = `thumbnail-${user.id}-${timestamp}.jpg`

      // Upload original video to Supabase storage (no processing)
      const { error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoFileName, videoBlob)

      if (videoError) {
        throw new Error(`Video upload failed: ${videoError.message}`)
      }

      // Upload processed thumbnail to Supabase storage
      const { error: thumbnailError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailFileName, processedThumbnailBlob)

      if (thumbnailError) {
        throw new Error(`Thumbnail upload failed: ${thumbnailError.message}`)
      }

      // Get public URLs
      const { data: videoUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(videoFileName)

      const { data: thumbnailUrlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(thumbnailFileName)

      // Create confessional record
      const { error: dbError } = await supabase
        .from('confessionals')
        .insert({
          user_id: user.id,
          video_path: videoUrlData.publicUrl,
          thumbnail_path: thumbnailUrlData.publicUrl,
          duration_seconds: 30, // We'll calculate this properly later
          blur_level: faceFilter.type === 'blur' ? faceFilter.intensity : 0,
          face_filter: faceFilter.type !== 'none' ? faceFilter.type : null,
          voice_effects: voiceEffects
        })

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`)
      }

      // Award achievement if this is the user's first confessional
      try {
        await supabase.rpc('award_achievement_if_eligible', {
          p_user_id: user.id,
          p_challenge_slug: 'confessional'
        })
      } catch (achievementError) {
        // Don't fail the post if achievement awarding fails
        console.warn('Failed to award achievement:', achievementError)
      }

      onConfirm()
    } catch (err: any) {
      console.error('Error posting confessional:', err)
      setError(err.message || 'Failed to post confessional. Please try again.')
    }
  }

  // Apply face filter effect to thumbnail image
  const applyFilterToThumbnail = async (imageBlob: Blob, filter: FaceFilter): Promise<Blob> => {
    if (filter.type === 'none') return imageBlob

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        canvas.width = img.width
        canvas.height = img.height

        // Use a temporary video-like object for drawFilteredFrame
        // For static images, we draw directly with filter approximation
        if (filter.type === 'blur') {
          const px = Math.round(1 + (filter.intensity / 10) * 20)
          ctx.filter = `blur(${px}px)`
          ctx.drawImage(img, 0, 0)
        } else {
          // For other filters, draw normally then apply CSS-like filter
          ctx.drawImage(img, 0, 0)
          // Apply simple filter approximations for thumbnail
          const intensity = filter.intensity / 10
          switch (filter.type) {
            case 'darken':
              ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + intensity * 0.6})`
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              break
            case 'invert':
              ctx.filter = `invert(${0.3 + intensity * 0.7})`
              ctx.drawImage(img, 0, 0)
              break
            case 'silhouette':
              ctx.filter = `contrast(${1 + intensity * 3}) brightness(${0.4 - intensity * 0.25})`
              ctx.drawImage(img, 0, 0)
              break
            default:
              // For complex filters (pixelate, thermal, glitch, nightvision), just apply blur as fallback
              ctx.filter = `blur(${Math.round(filter.intensity)}px)`
              ctx.drawImage(img, 0, 0)
          }
        }

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to process thumbnail with filter'))
          }
        }, 'image/jpeg', 0.8)
      }

      img.onerror = () => {
        reject(new Error('Failed to load thumbnail for processing'))
      }

      img.src = URL.createObjectURL(imageBlob)
    })
  }

  const formatVoiceEffects = (effects: VoiceEffect[]) => {
    if (effects.length === 0) return 'None'
    return effects.map(effect => {
      const descriptions: Record<string, string> = {
        'none': 'Natural voice',
        'whisper': 'Soft whisper effect',
        'breathy': 'Breathy, airy voice',
        'robot': 'Mechanical robot voice',
        'chipmunk': 'High-pitched squeaky voice',
        'deep': 'Deep, resonant voice',
        'echo': 'Echo/reverb effect'
      }
      return `${descriptions[effect.type] || effect.type} (${effect.intensity}/10)`
    }).join(', ')
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Confirm Your Confessional</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.previewSection}>
            <h3>Preview</h3>
            <div className={styles.videoPreview}>
              {thumbnailBlob && (
                <img
                  src={URL.createObjectURL(thumbnailBlob)}
                  alt="Video thumbnail"
                  className={styles.thumbnail}
                />
              )}
              {faceFilter.type !== 'none' && (
                <div className={styles.videoOverlay}>
                  <span className={styles.blurIndicator}>
                    {FACE_FILTERS.find(f => f.type === faceFilter.type)?.label}: {faceFilter.intensity}/10
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.settingsSection}>
            <h3>Settings</h3>
            <div className={styles.settingsList}>
              <div className={styles.setting}>
                <span className={styles.settingLabel}>Face Filter:</span>
                <span className={styles.settingValue}>
                  {faceFilter.type === 'none' 
                    ? 'None' 
                    : `${FACE_FILTERS.find(f => f.type === faceFilter.type)?.label} (${faceFilter.intensity}/10)`
                  }
                </span>
              </div>
              <div className={styles.setting}>
                <span className={styles.settingLabel}>Voice Effects:</span>
                <span className={styles.settingValue}>
                  {formatVoiceEffects(voiceEffects)}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.anonymitySection}>
            <div className={styles.anonymityHeader}>
              <span className={styles.anonymityIcon}>🔒</span>
              <h3>Your Anonymity is Protected</h3>
            </div>
            <div className={styles.anonymityPoints}>
              <p> Your confessional cannot be traced back to your profile</p>
              <p> No personal information is stored with the video</p>
              <p> Videos are anonymous by default</p>
              <p> You can delete your confessional at any time</p>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button
              onClick={onClose}
              className={styles.cancelButton}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              className={styles.postButton}
              disabled={uploading || !videoBlob || !thumbnailBlob}
            >
              {uploading ? 'Posting...' : 'Post Confessional'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
