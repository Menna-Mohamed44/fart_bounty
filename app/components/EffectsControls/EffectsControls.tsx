'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { usePremium } from '@/app/context/PremiumContext'
import { Play, Square, Loader2 } from 'lucide-react'
import { FACE_FILTERS, type FaceFilter } from '@/app/lib/faceFilterProcessor'
import styles from './EffectsControls.module.css'

export interface VoiceEffect {
  type: 'none' | 'whisper' | 'breathy' | 'robot' | 'chipmunk' | 'deep' | 'echo'
  intensity: number // 1-10
}

interface EffectsControlsProps {
  selectedFaceFilter: FaceFilter
  onFaceFilterChange: (filter: FaceFilter) => void
  selectedEffect: VoiceEffect
  onEffectChange: (effect: VoiceEffect) => void
  isProcessing?: boolean
  isPreviewPlaying?: boolean
  onPreview?: () => void
  onStopPreview?: () => void
  disabled?: boolean
}

const VOICE_EFFECTS = [
  { type: 'none' as const, label: 'None', icon: '🎤', description: 'Natural voice - no filter applied', free: true, tier: 'free' as const },
  { type: 'whisper' as const, label: 'Whisper', icon: '💨', description: 'Soft, quiet voice with reduced bass', free: true, tier: 'free' as const },
  { type: 'breathy' as const, label: 'Breathy', icon: '🌬️', description: 'Airy, wind-like quality', free: true, tier: 'free' as const },
  { type: 'robot' as const, label: 'Robot', icon: '🤖', description: 'Metallic, mechanical distortion', free: false, tier: 'premium' as const },
  { type: 'chipmunk' as const, label: 'Chipmunk', icon: '🐿️', description: 'High-pitched, squeaky cartoon voice', free: false, tier: 'premium' as const },
  { type: 'deep' as const, label: 'Deep Voice', icon: '🗣️', description: 'Low-pitched, booming rumble', free: false, tier: 'extra' as const },
  { type: 'echo' as const, label: 'Echo', icon: '🏛️', description: 'Spacious reverb / echo effect', free: false, tier: 'extra' as const },
]

export default function EffectsControls({
  selectedFaceFilter,
  onFaceFilterChange,
  selectedEffect,
  onEffectChange,
  isProcessing = false,
  isPreviewPlaying = false,
  onPreview,
  onStopPreview,
  disabled = false
}: EffectsControlsProps) {
  const { user } = useAuth()
  const { canUsePremiumEffects, canUseExtraEffects } = usePremium()

  // Helper: check if an effect tier is accessible
  const canAccessTier = (tier: 'free' | 'premium' | 'extra') => {
    if (tier === 'free') return true
    if (tier === 'premium') return canUsePremiumEffects
    if (tier === 'extra') return canUseExtraEffects
    return false
  }

  const [activeTab, setActiveTab] = useState<'face' | 'voice'>('face')

  // Face filter handlers
  const handleSelectFaceFilter = (type: FaceFilter['type']) => {
    if (disabled) return
    const def = FACE_FILTERS.find(f => f.type === type)
    if (def && !canAccessTier(def.tier)) return
    onFaceFilterChange({ type, intensity: selectedFaceFilter.intensity })
  }

  const handleFaceIntensityChange = (intensity: number) => {
    if (disabled) return
    onFaceFilterChange({ ...selectedFaceFilter, intensity })
  }

  // Voice filter handlers
  const handleSelectEffect = (effectType: VoiceEffect['type']) => {
    if (disabled || isProcessing) return
    const voiceEffect = VOICE_EFFECTS.find(e => e.type === effectType)
    if (voiceEffect && !canAccessTier(voiceEffect.tier)) return
    onEffectChange({ type: effectType, intensity: selectedEffect.intensity })
  }

  const handleIntensityChange = (intensity: number) => {
    if (disabled || isProcessing) return
    onEffectChange({ ...selectedEffect, intensity })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Adjust Your Confessional</h3>
        <p>Make your video more anonymous with these effects</p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'face' ? styles.active : ''}`}
          onClick={() => setActiveTab('face')}
          disabled={disabled}
        >
          Face Filters
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'voice' ? styles.active : ''}`}
          onClick={() => setActiveTab('voice')}
          disabled={disabled}
        >
          Voice Filters
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'face' && (
          <div className={styles.faceSection}>
            {!canUsePremiumEffects && (
              <div className={styles.premiumNotice}>
                <p>🔒 Thermal &amp; Glitch require Premium</p>
                <button className={styles.upgradeButton}>Upgrade to Premium</button>
              </div>
            )}
            {canUsePremiumEffects && !canUseExtraEffects && (
              <div className={styles.premiumNotice}>
                <p>🔒 Night Vision, Invert &amp; Darken require Premium Pro</p>
                <button className={styles.upgradeButton}>Upgrade to Pro</button>
              </div>
            )}

            <div className={styles.faceFilterGrid}>
              {FACE_FILTERS.map((option) => {
                const isSelected = selectedFaceFilter.type === option.type
                const isLocked = !canAccessTier(option.tier)

                return (
                  <div
                    key={option.type}
                    className={`${styles.faceFilterCard} ${isSelected ? styles.active : ''} ${isLocked ? styles.locked : ''}`}
                    onClick={() => !isLocked && handleSelectFaceFilter(option.type)}
                  >
                    <span className={styles.faceFilterIcon}>{option.icon}</span>
                    <span className={styles.faceFilterLabel}>{option.label}</span>
                    {isLocked && <span className={styles.lockBadge}>🔒</span>}
                    {isSelected && <span className={styles.selectedCheck}>&#10003;</span>}
                  </div>
                )
              })}
            </div>

            {selectedFaceFilter.type !== 'none' && (
              <div className={styles.faceIntensityControl}>
                <label className={styles.intensityLabel}>
                  Intensity: <span className={styles.intensityValue}>{selectedFaceFilter.intensity}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={selectedFaceFilter.intensity}
                  onChange={(e) => handleFaceIntensityChange(parseInt(e.target.value))}
                  disabled={disabled}
                  className={styles.intensitySlider}
                />
                <p className={styles.faceFilterDesc}>
                  {FACE_FILTERS.find(f => f.type === selectedFaceFilter.type)?.description}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'voice' && (
          <div className={styles.voiceSection}>
            {selectedEffect.type !== 'none' && (
              <div className={styles.previewBar}>
                {isProcessing ? (
                  <div className={styles.processingIndicator}>
                    <Loader2 size={18} className={styles.spinner} />
                    <span>Applying filter...</span>
                  </div>
                ) : (
                  <>
                    {isPreviewPlaying ? (
                      <button
                        className={styles.previewStopButton}
                        onClick={onStopPreview}
                        disabled={disabled}
                      >
                        <Square size={16} />
                        Stop Preview
                      </button>
                    ) : (
                      <button
                        className={styles.previewPlayButton}
                        onClick={onPreview}
                        disabled={disabled || isProcessing}
                      >
                        <Play size={16} />
                        Preview Filter
                      </button>
                    )}
                    <span className={styles.previewHint}>
                      Hear how &quot;{VOICE_EFFECTS.find(e => e.type === selectedEffect.type)?.label}&quot; sounds
                    </span>
                  </>
                )}
              </div>
            )}

            {!canUsePremiumEffects && (
              <div className={styles.premiumNotice}>
                <p>🔒 Robot &amp; Chipmunk require Premium</p>
                <button className={styles.upgradeButton}>Upgrade to Premium</button>
              </div>
            )}
            {canUsePremiumEffects && !canUseExtraEffects && (
              <div className={styles.premiumNotice}>
                <p>🔒 Deep Voice &amp; Echo require Premium Pro</p>
                <button className={styles.upgradeButton}>Upgrade to Pro</button>
              </div>
            )}

            <div className={styles.voiceEffects}>
              {VOICE_EFFECTS.map((option) => {
                const isSelected = selectedEffect.type === option.type
                const isLocked = !canAccessTier(option.tier)

                return (
                  <div
                    key={option.type}
                    className={`${styles.voiceEffect} ${isSelected ? styles.active : ''} ${isLocked ? styles.locked : ''}`}
                    onClick={() => !isLocked && handleSelectEffect(option.type)}
                  >
                    <div className={styles.effectHeader}>
                      <div className={styles.effectToggle}>
                        <span className={styles.radioCircle}>
                          {isSelected && <span className={styles.radioDot} />}
                        </span>
                        <span className={styles.effectIcon}>{option.icon}</span>
                        <span className={styles.effectLabel}>{option.label}</span>
                      </div>

                      {isLocked && <span className={styles.premiumLock}>🔒</span>}
                    </div>

                    <p className={styles.effectDescription}>{option.description}</p>

                    {isSelected && option.type !== 'none' && (
                      <div className={styles.intensityControl}>
                        <label className={styles.intensityLabel}>
                          Intensity: <span className={styles.intensityValue}>{selectedEffect.intensity}/10</span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={selectedEffect.intensity}
                          onChange={(e) => handleIntensityChange(parseInt(e.target.value))}
                          disabled={disabled || isProcessing}
                          className={styles.intensitySlider}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
