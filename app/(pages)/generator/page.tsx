'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { usePremium } from '@/app/context/PremiumContext'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { Upload, Music, Download, Share2, Play, Square, Plus, Gift, Copy, Check, Zap } from 'lucide-react'
import { createClient } from '@/app/lib/supabaseClient'
import styles from './generator.module.css'

interface AudioEffects {
  bass: number
  mid: number
  treble: number
  speed: number
  attack: number
  decay: number
  intensity: number
  noise: number
  echo: number
  wetness: number
  pitch: number
  duration: number
  richness: number
  texture: number
  tailDuration: number
  tailGap: number
  bodyType: number
}

const EDITING_TIERS: Record<string, string[]> = {
  none:     ['pitch', 'duration', 'bodyType'],
  basic:    ['pitch', 'duration', 'bodyType', 'richness', 'texture', 'intensity', 'speed'],
  advanced: ['pitch', 'duration', 'bodyType', 'richness', 'texture', 'intensity', 'speed', 'tailDuration', 'tailGap', 'noise', 'echo', 'bass', 'treble'],
  full:     ['pitch', 'duration', 'bodyType', 'richness', 'texture', 'intensity', 'speed', 'tailDuration', 'tailGap', 'noise', 'echo', 'bass', 'treble', 'mid', 'attack', 'decay', 'wetness'],
}

const BODY_TYPE_NAMES = ['Rumble', 'Buzz', 'Squeak', 'Blast', 'Wet']

const DEFAULT_EFFECTS: AudioEffects = {
  bass: 10,
  mid: 3,
  treble: -5,
  speed: 1.0,
  attack: 8,
  decay: 35,
  intensity: 80,
  noise: 55,
  echo: 12,
  wetness: 30,
  pitch: -3,
  duration: 90,
  richness: 50,
  texture: 50,
  tailDuration: 30,
  tailGap: 10,
  bodyType: 1,
}

interface FartPreset {
  name: string
  effects: AudioEffects
}

const FART_PRESETS: FartPreset[] = [
  {
    name: 'Quick Toot',
    effects: {
      bass: -5, mid: 0, treble: 5, speed: 1.2, attack: 5, decay: 15,
      intensity: 70, noise: 30, echo: 5, wetness: 10, pitch: 4, duration: 30,
      richness: 25, texture: 20, tailDuration: 5, tailGap: 0, bodyType: 2,
    },
  },
  {
    name: 'The Rumbler',
    effects: {
      bass: 18, mid: 5, treble: -10, speed: 0.7, attack: 20, decay: 60,
      intensity: 90, noise: 45, echo: 25, wetness: 20, pitch: -10, duration: 160,
      richness: 80, texture: 60, tailDuration: 40, tailGap: 15, bodyType: 0,
    },
  },
  {
    name: 'Squeaky Clean',
    effects: {
      bass: -15, mid: -5, treble: 10, speed: 1.5, attack: 3, decay: 20,
      intensity: 60, noise: 15, echo: 10, wetness: 5, pitch: 8, duration: 50,
      richness: 15, texture: 15, tailDuration: 10, tailGap: 5, bodyType: 2,
    },
  },
  {
    name: 'Thunder Blast',
    effects: {
      bass: 15, mid: 10, treble: 5, speed: 1.0, attack: 2, decay: 45,
      intensity: 100, noise: 60, echo: 40, wetness: 25, pitch: 2, duration: 100,
      richness: 75, texture: 70, tailDuration: 25, tailGap: 10, bodyType: 3,
    },
  },
  {
    name: 'Wet Willie',
    effects: {
      bass: 8, mid: 3, treble: -3, speed: 0.9, attack: 10, decay: 40,
      intensity: 75, noise: 50, echo: 15, wetness: 90, pitch: -2, duration: 110,
      richness: 55, texture: 45, tailDuration: 35, tailGap: 20, bodyType: 4,
    },
  },
  {
    name: 'Silent But Deadly',
    effects: {
      bass: -5, mid: -10, treble: -5, speed: 0.6, attack: 40, decay: 70,
      intensity: 25, noise: 70, echo: 30, wetness: 15, pitch: 0, duration: 180,
      richness: 20, texture: 10, tailDuration: 50, tailGap: 30, bodyType: 1,
    },
  },
  {
    name: 'Machine Gun',
    effects: {
      bass: 5, mid: 5, treble: 3, speed: 2.0, attack: 2, decay: 10,
      intensity: 85, noise: 40, echo: 5, wetness: 15, pitch: 1, duration: 25,
      richness: 40, texture: 80, tailDuration: 60, tailGap: 5, bodyType: 1,
    },
  },
  {
    name: 'The Grand Finale',
    effects: {
      bass: 12, mid: 8, treble: 3, speed: 0.8, attack: 15, decay: 55,
      intensity: 95, noise: 55, echo: 65, wetness: 45, pitch: -4, duration: 190,
      richness: 90, texture: 65, tailDuration: 80, tailGap: 15, bodyType: 0,
    },
  },
]

function getISOWeekKey(): string {
  const now = new Date()
  const jan4 = new Date(now.getFullYear(), 0, 4)
  const start = jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000
  const week = Math.ceil(((now.getTime() - start) / 86400000 + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function GeneratorPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { canCreate, incrementUsage, tierConfig } = usePremium()
  const supabase = createClient()

  const trackChallenge = (challengeId: string, periodKey: string | null, amount = 1) => {
    if (!user) return
    ;(supabase as any).rpc('increment_challenge_progress', {
      p_user_id: user.id,
      p_challenge_id: challengeId,
      p_period_key: periodKey,
      p_amount: amount,
    }).then(() => {}).catch(() => {})
  }

  const allowedControls = EDITING_TIERS[tierConfig.editingTools] || EDITING_TIERS.none

  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [generationMode, setGenerationMode] = useState<'upload' | 'generate' | 'remix'>('upload')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isSavingToFeed, setIsSavingToFeed] = useState(false)
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false)
  const [showGreetingModal, setShowGreetingModal] = useState(false)
  const [greetingRecipient, setGreetingRecipient] = useState('')
  const [greetingMessage, setGreetingMessage] = useState('')
  const [activePreset, setActivePreset] = useState<number | null>(null)
  const [splicerA, setSplicerA] = useState(0)
  const [splicerB, setSplicerB] = useState(1)
  const [splicerMix, setSplicerMix] = useState(50)

  const [effects, setEffects] = useState<AudioEffects>({ ...DEFAULT_EFFECTS })
  const effectsRef = useRef<AudioEffects>(effects)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | OscillatorNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const bassFilterRef = useRef<BiquadFilterNode | null>(null)
  const midFilterRef = useRef<BiquadFilterNode | null>(null)
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null)
  const delayNodeRef = useRef<DelayNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const noiseBufferRef = useRef<AudioBufferSourceNode | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const isPlayingRef = useRef(false)
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null)
  const envelopeGainRef = useRef<GainNode | null>(null)
  const lfoNodesRef = useRef<OscillatorNode[]>([])

  const initAudioContext = (audioFile: File) => {
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }

    const audioContext = new AudioContext()
    audioContextRef.current = audioContext

    const audio = new Audio()
    audioElementRef.current = audio
    audio.src = URL.createObjectURL(audioFile)
    audio.loop = true

    const source = audioContext.createMediaElementSource(audio)
    sourceNodeRef.current = source

    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser

    const bassFilter = audioContext.createBiquadFilter()
    bassFilter.type = 'lowshelf'
    bassFilter.frequency.value = 200
    bassFilterRef.current = bassFilter

    const midFilter = audioContext.createBiquadFilter()
    midFilter.type = 'peaking'
    midFilter.frequency.value = 1000
    midFilter.Q.value = 0.5
    midFilterRef.current = midFilter

    const trebleFilter = audioContext.createBiquadFilter()
    trebleFilter.type = 'highshelf'
    trebleFilter.frequency.value = 3000
    trebleFilterRef.current = trebleFilter

    const delay = audioContext.createDelay(5.0)
    delayNodeRef.current = delay

    const gain = audioContext.createGain()
    gainNodeRef.current = gain

    source.connect(bassFilter)
    bassFilter.connect(midFilter)
    midFilter.connect(trebleFilter)
    trebleFilter.connect(delay)
    delay.connect(gain)
    gain.connect(analyser)
    analyser.connect(audioContext.destination)

    setUploadedAudio(audioFile)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedAudio(file)
      setGenerationMode('upload')
      initAudioContext(file)
    }
  }

  const generateSound = (currentEffects: AudioEffects = effectsRef.current) => {
    const fx = currentEffects
    const freq = 50 * Math.pow(2, (fx.pitch + 12) / 6)
    const duration = 0.8 + (fx.duration / 200) * 2.0
    const volume = 0.4

    let ctx = audioContextRef.current
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext()
      audioContextRef.current = ctx
    }

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    oscillatorsRef.current.forEach(osc => {
      try { osc.stop() } catch (e) { /* already stopped */ }
    })
    oscillatorsRef.current = []

    if (generationMode !== 'remix') setGenerationMode('generate')
    setIsGenerating(true)

    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02)
    gain.gain.setValueAtTime(volume, ctx.currentTime + duration - 0.1)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser

    osc.connect(gain)
    gain.connect(analyser)
    analyser.connect(ctx.destination)

    oscillatorRef.current = osc
    oscillatorsRef.current = [osc]
    gainNodeRef.current = gain
    noiseBufferRef.current = null
    lfoNodesRef.current = []

    const startTime = ctx.currentTime
    osc.start(startTime)
    osc.stop(startTime + duration)

    osc.onended = () => {
      setIsPlaying(false)
      isPlayingRef.current = false
    }

    envelopeGainRef.current = null
    sourceNodeRef.current = null
    setUploadedAudio(null)
  }

  const handleRemix = () => {
    setGenerationMode('remix')
    setActivePreset(null)

    const randomizedEffects: AudioEffects = {
      bass: Math.floor(Math.random() * 40) - 20,
      mid: Math.floor(Math.random() * 40) - 20,
      treble: Math.floor(Math.random() * 40) - 20,
      speed: parseFloat((Math.random() * 1.5 + 0.5).toFixed(1)),
      attack: Math.floor(Math.random() * 100),
      decay: Math.floor(Math.random() * 100),
      intensity: Math.floor(Math.random() * 60) + 40,
      noise: Math.floor(Math.random() * 80) + 20,
      echo: Math.floor(Math.random() * 80),
      wetness: Math.floor(Math.random() * 100),
      pitch: Math.floor(Math.random() * 24) - 12,
      duration: Math.floor(Math.random() * 150) + 50,
      richness: Math.floor(Math.random() * 100),
      texture: Math.floor(Math.random() * 100),
      tailDuration: Math.floor(Math.random() * 100),
      tailGap: Math.floor(Math.random() * 60),
      bodyType: Math.floor(Math.random() * 5),
    }

    effectsRef.current = randomizedEffects
    setEffects(randomizedEffects)
    setHasChanges(false)

    handlePlay(randomizedEffects)
  }

  const updateEffect = (key: keyof AudioEffects, value: number) => {
    setEffects(prev => {
      const nextEffects = { ...prev, [key]: value }
      effectsRef.current = nextEffects
      return nextEffects
    })
    setHasChanges(true)
    setActivePreset(null)
  }

  const loadPreset = (index: number) => {
    const preset = FART_PRESETS[index]
    setActivePreset(index)
    effectsRef.current = { ...preset.effects }
    setEffects({ ...preset.effects })
    setHasChanges(false)
    handlePlay({ ...preset.effects })
  }

  const handleSplice = () => {
    const a = FART_PRESETS[splicerA].effects
    const b = FART_PRESETS[splicerB].effects
    const t = splicerMix / 100

    const lerp = (v1: number, v2: number) => v1 + (v2 - v1) * t
    const spliced: AudioEffects = {
      bass: Math.round(lerp(a.bass, b.bass)),
      mid: Math.round(lerp(a.mid, b.mid)),
      treble: Math.round(lerp(a.treble, b.treble)),
      speed: parseFloat(lerp(a.speed, b.speed).toFixed(1)),
      attack: Math.round(lerp(a.attack, b.attack)),
      decay: Math.round(lerp(a.decay, b.decay)),
      intensity: Math.round(lerp(a.intensity, b.intensity)),
      noise: Math.round(lerp(a.noise, b.noise)),
      echo: Math.round(lerp(a.echo, b.echo)),
      wetness: Math.round(lerp(a.wetness, b.wetness)),
      pitch: Math.round(lerp(a.pitch, b.pitch)),
      duration: Math.round(lerp(a.duration, b.duration)),
      richness: Math.round(lerp(a.richness, b.richness)),
      texture: Math.round(lerp(a.texture, b.texture)),
      tailDuration: Math.round(lerp(a.tailDuration, b.tailDuration)),
      tailGap: Math.round(lerp(a.tailGap, b.tailGap)),
      bodyType: Math.round(lerp(a.bodyType, b.bodyType)),
    }

    setActivePreset(null)
    effectsRef.current = spliced
    setEffects(spliced)
    setHasChanges(false)
    trackChallenge('l6', null)
    handlePlay(spliced)
  }

  useEffect(() => {
    effectsRef.current = effects
    if (generationMode === 'upload' && audioElementRef.current) {
      audioElementRef.current.playbackRate = effects.speed
    }

    if (generationMode === 'upload') {
      if (bassFilterRef.current) bassFilterRef.current.gain.value = effects.bass
      if (midFilterRef.current) midFilterRef.current.gain.value = effects.mid
      if (trebleFilterRef.current) trebleFilterRef.current.gain.value = effects.treble
      if (delayNodeRef.current) delayNodeRef.current.delayTime.value = effects.echo / 100
    }

    if (generationMode === 'generate' || generationMode === 'remix') {
      setHasChanges(true)
    }
  }, [effects])

  useEffect(() => {
    if (!analyserRef.current || !canvasRef.current || !isPlaying) return

    const analyser = analyserRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isPlaying) return

      animationFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 2
      ctx.strokeStyle = '#0bda51'
      ctx.beginPath()

      const sliceWidth = canvas.width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying])

  // ====================================================================
  // FLATOLOGY FART SYNTHESIZER — multi-phase physical modeling
  // ====================================================================
  const handlePlay = (overrideEffects?: AudioEffects) => {
    const fx = overrideEffects || effects
    const SR = 44100

    // ── BODY TYPE base frequencies and waveform config ────────────────
    const bodyConfigs = [
      { freqLo: 30,  freqHi: 80,  wave: 'rumble'  as const },
      { freqLo: 80,  freqHi: 200, wave: 'buzz'    as const },
      { freqLo: 300, freqHi: 800, wave: 'squeak'  as const },
      { freqLo: 400, freqHi: 120, wave: 'blast'   as const },
      { freqLo: 60,  freqHi: 180, wave: 'wet'     as const },
    ]
    const body = bodyConfigs[Math.min(Math.max(fx.bodyType, 0), 4)]

    // ── MAP CONTROLS ─────────────────────────────────────────────────
    const pitchShift   = Math.pow(2, fx.pitch / 12)
    const baseFreqLo   = body.freqLo * pitchShift
    const baseFreqHi   = body.freqHi * pitchShift
    const richnessN    = fx.richness / 100
    const textureN     = fx.texture / 100
    const bassN        = (fx.bass + 20) / 40
    const midN         = (fx.mid + 20) / 40
    const trebleN      = (fx.treble + 20) / 40
    const speedN       = fx.speed
    const atkTime      = 0.003 + (fx.attack / 100) * 0.25
    const decTime      = 0.03 + (fx.decay / 100) * 0.8
    const volume       = 0.4 + (fx.intensity / 100) * 0.6
    const noiseAmt     = fx.noise / 100
    const echoAmt      = fx.echo / 100
    const wetN         = fx.wetness / 100
    const bodyDuration = 0.1 + (fx.duration / 200) * 3.0

    const gapDuration  = (fx.tailGap / 100) * 0.5
    const tailTotalDur = (fx.tailDuration / 100) * 2.0

    const totalBodyTime = atkTime + bodyDuration + decTime
    const totalTime     = totalBodyTime + gapDuration + tailTotalDur
    const echoTailTime  = echoAmt > 0.02 ? 0.5 : 0
    const totalWithEcho = totalTime + echoTailTime

    const numSamples = Math.ceil(SR * totalWithEcho)
    const out = new Float32Array(numSamples)

    // ── BODY PHASE: the main fart ────────────────────────────────────
    const bodySamples = Math.ceil(SR * totalBodyTime)

    // Harmonic count based on richness
    const numHarmonics = 1 + Math.floor(richnessN * 10)

    // Pre-generate flutter pattern for lip vibration
    const flutterRate = 20 + speedN * 80
    const flutterLen = Math.max(8, Math.ceil(totalBodyTime * flutterRate))
    const flutter = new Float32Array(flutterLen)
    let fv = 0.8
    for (let k = 0; k < flutterLen; k++) {
      fv += (Math.random() - 0.5) * (0.15 + textureN * 0.55)
      fv = Math.max(0.15, Math.min(1.0, fv))
      flutter[k] = fv
    }

    // Pre-generate pressure variation
    const pressLen = Math.max(8, Math.ceil(totalBodyTime * 30))
    const pressure = new Float32Array(pressLen)
    let pv = 0.9
    for (let k = 0; k < pressLen; k++) {
      pv += (Math.random() - 0.505) * (0.08 + textureN * 0.18)
      pv = Math.max(0.4, Math.min(1.0, pv))
      pressure[k] = pv
    }

    // Pre-generate bubble events for wetness
    const bubbleCount = Math.floor(wetN * 40 * totalBodyTime)
    const bubbles: { pos: number; size: number; freq: number; amp: number }[] = []
    for (let k = 0; k < bubbleCount; k++) {
      bubbles.push({
        pos: Math.random() * bodySamples,
        size: 0.001 + Math.random() * 0.012,
        freq: 150 + Math.random() * 1200,
        amp: 0.2 + Math.random() * 0.5,
      })
    }
    bubbles.sort((a, b) => a.pos - b.pos)

    // Harmonic phases
    const phases = new Float64Array(numHarmonics + 2)
    let brownNoise = 0
    let pinkB0 = 0, pinkB1 = 0, pinkB2 = 0, pinkB3 = 0, pinkB4 = 0, pinkB5 = 0, pinkB6 = 0
    let bubIdx = 0

    for (let i = 0; i < bodySamples; i++) {
      const t = i / SR
      const tN = t / totalBodyTime

      // Envelope: attack → sustain → decay
      let env: number
      if (t < atkTime) {
        const a = t / atkTime
        env = body.wave === 'blast' ? a * a * a : Math.sqrt(a)
      } else if (t < atkTime + bodyDuration) {
        const s = (t - atkTime) / bodyDuration
        env = 1.0 - s * 0.08
      } else {
        const d = (t - atkTime - bodyDuration) / decTime
        env = Math.max(0, (1 - d) * (1 - d))
      }

      // Pressure modulation
      const pIdx = Math.min(Math.floor(t * 30), pressLen - 1)
      const pressureVal = pressure[pIdx]

      // Frequency: body-type-specific behavior
      let freq: number
      if (body.wave === 'blast') {
        const sweep = 1.0 - tN * 0.7
        freq = baseFreqHi + (baseFreqLo - baseFreqHi) * (1 - sweep)
      } else {
        const drift = 1.0 - tN * (0.05 + bassN * 0.25)
        freq = baseFreqLo + (baseFreqHi - baseFreqLo) * 0.5
        freq *= drift
      }

      // Pitch wobble from texture
      freq *= 1.0 + (Math.random() - 0.5) * textureN * 0.06

      // Waveform synthesis per body type
      let signal = 0

      if (body.wave === 'rumble') {
        // Sub-bass heavy: sine + triangle blend with slow flutter
        for (let h = 0; h < numHarmonics; h++) {
          const hFreq = freq * (h + 1) * (h === 0 ? 1 : 0.5 + h * 0.5)
          phases[h] += hFreq / SR
          const p = phases[h] % 1
          const harmAmp = 1.0 / (1 + h * (1.2 - richnessN * 0.5))
          const tri = 4 * Math.abs(p - 0.5) - 1
          const sine = Math.sin(2 * Math.PI * p)
          signal += (sine * 0.6 + tri * 0.4) * harmAmp
        }
      } else if (body.wave === 'buzz') {
        // Classic lip-buzz: pulse + sawtooth
        for (let h = 0; h < numHarmonics; h++) {
          const hFreq = freq * (h + 1)
          phases[h] += hFreq / SR
          const p = phases[h] % 1
          const pw = 0.15 + midN * 0.35
          const harmAmp = 1.0 / (1 + h * (1.5 - richnessN * 0.8))
          if (h === 0) {
            const pulse = p < pw ? 1.0 : -1.0
            const saw = 2.0 * p - 1.0
            signal += (pulse * 0.5 + saw * 0.5) * harmAmp
          } else {
            signal += (2.0 * p - 1.0) * harmAmp
          }
        }
      } else if (body.wave === 'squeak') {
        // Tight narrow pulse, high-pitched
        for (let h = 0; h < Math.min(numHarmonics, 6); h++) {
          const hFreq = freq * (h + 1)
          phases[h] += hFreq / SR
          const p = phases[h] % 1
          const pw = 0.05 + richnessN * 0.15
          const harmAmp = 1.0 / (1 + h * 2.0)
          signal += (p < pw ? 1.0 : -0.3) * harmAmp
        }
      } else if (body.wave === 'blast') {
        // Explosive wide-spectrum
        for (let h = 0; h < numHarmonics; h++) {
          const hFreq = freq * (h + 1) * (1.0 + h * 0.05)
          phases[h] += hFreq / SR
          const p = phases[h] % 1
          const harmAmp = 1.0 / (1 + h * (0.8 - richnessN * 0.3))
          const wave = 2.0 * p - 1.0
          signal += wave * harmAmp * (1.0 + textureN * 0.3 * (Math.random() - 0.5))
        }
      } else {
        // Wet: irregular bubble-laden buzz
        for (let h = 0; h < numHarmonics; h++) {
          const hFreq = freq * (h + 1) * (1.0 + Math.random() * 0.02)
          phases[h] += hFreq / SR
          const p = phases[h] % 1
          const harmAmp = 1.0 / (1 + h * 1.0)
          const sine = Math.sin(2 * Math.PI * p)
          const saw = 2.0 * p - 1.0
          signal += (sine * 0.4 + saw * 0.6) * harmAmp
        }
        // Extra bubble modulation
        const bubbleMod = Math.sin(2 * Math.PI * t * (8 + wetN * 25)) * wetN * 0.3
        signal *= (1.0 + bubbleMod)
      }

      // Normalize harmonic stack
      signal /= Math.max(1, Math.sqrt(numHarmonics) * 0.7)

      // Lip flutter
      const fIdx = Math.min(Math.floor(t * flutterRate), flutterLen - 1)
      signal *= flutter[fIdx]

      // Speed stutter
      const stutterHz = 3 + speedN * 20
      const stutterDepth = 0.03 + textureN * 0.25
      const stutter = 1.0 - stutterDepth * Math.max(0,
        Math.sin(2 * Math.PI * stutterHz * t + Math.sin(t * 3) * 0.4))
      signal *= stutter

      // Noise layer
      const white = Math.random() * 2 - 1
      brownNoise = (brownNoise + 0.02 * white) / 1.02

      // Pink noise approximation
      pinkB0 = 0.99886 * pinkB0 + white * 0.0555179
      pinkB1 = 0.99332 * pinkB1 + white * 0.0750759
      pinkB2 = 0.96900 * pinkB2 + white * 0.1538520
      pinkB3 = 0.86650 * pinkB3 + white * 0.3104856
      pinkB4 = 0.55000 * pinkB4 + white * 0.5329522
      pinkB5 = -0.7616 * pinkB5 - white * 0.0168980
      const pinkNoise = pinkB0 + pinkB1 + pinkB2 + pinkB3 + pinkB4 + pinkB5 + pinkB6 + white * 0.5362
      pinkB6 = white * 0.115926

      const noiseSignal = brownNoise * 1.2 * bassN + (pinkNoise * 0.06) * (0.3 + trebleN * 0.5)
      signal = signal * (1 - noiseAmt * 0.4) + noiseSignal * noiseAmt

      // Bubble pops (wetness)
      while (bubIdx < bubbles.length && bubbles[bubIdx].pos < i - SR * 0.02) bubIdx++
      for (let b = bubIdx; b < Math.min(bubIdx + 5, bubbles.length); b++) {
        const bub = bubbles[b]
        const dist = (i - bub.pos) / SR
        if (dist > -0.001 && dist < bub.size) {
          const bEnv = Math.sin(Math.PI * Math.max(0, dist) / bub.size)
          signal += bEnv * Math.sin(2 * Math.PI * bub.freq * dist) * bub.amp * wetN
        }
      }

      out[i] = signal * env * pressureVal * volume
    }

    // ── GAP PHASE ────────────────────────────────────────────────────
    const gapStart = bodySamples
    const gapSamples = Math.ceil(SR * gapDuration)
    for (let i = 0; i < gapSamples; i++) {
      if (gapStart + i >= numSamples) break
      out[gapStart + i] = (Math.random() - 0.5) * 0.005 * volume
    }

    // ── TAIL PHASE: trailing sputters ────────────────────────────────
    if (tailTotalDur > 0.01) {
      const tailStart = gapStart + gapSamples
      const tailSamples = Math.ceil(SR * tailTotalDur)

      const sputterCount = 2 + Math.floor((fx.tailDuration / 100) * 10)
      const sputters: { start: number; dur: number; freq: number; amp: number }[] = []
      let cursor = 0

      for (let s = 0; s < sputterCount; s++) {
        const decayFactor = 1.0 - (s / sputterCount) * 0.8
        const sputDur = (0.01 + Math.random() * 0.06) * decayFactor
        const gap = Math.random() * 0.04
        const sputFreq = (baseFreqLo + baseFreqHi) * 0.5 * pitchShift * (0.6 + Math.random() * 0.8)
        sputters.push({
          start: cursor,
          dur: sputDur,
          freq: sputFreq,
          amp: decayFactor * (0.3 + Math.random() * 0.4) * volume,
        })
        cursor += sputDur + gap
      }

      const sputterTotalDur = cursor || 0.01
      const sputterScale = tailTotalDur / sputterTotalDur

      let tailPhase = 0
      for (let i = 0; i < tailSamples; i++) {
        if (tailStart + i >= numSamples) break
        const t = i / SR

        let sample = 0
        for (const sp of sputters) {
          const spStart = sp.start * sputterScale
          const spDur = sp.dur * sputterScale
          const rel = t - spStart
          if (rel >= 0 && rel < spDur) {
            const spEnv = Math.sin(Math.PI * rel / spDur)
            tailPhase += sp.freq / SR
            const p = tailPhase % 1

            let wave: number
            if (wetN > 0.4) {
              wave = Math.sin(2 * Math.PI * p) * 0.5 + (p < 0.3 ? 0.5 : -0.3) * 0.5
            } else {
              wave = 2.0 * p - 1.0
            }

            wave += (Math.random() - 0.5) * textureN * 0.4

            sample += wave * spEnv * sp.amp
          }
        }

        out[tailStart + i] = sample
      }
    }

    // ── POST: HIGH-PASS FILTER (remove sub-20Hz) ─────────────────────
    const mainLen = Math.ceil(SR * totalTime)
    let hpPrev = 0
    let hpOut = 0
    const hpAlpha = 0.995
    for (let i = 0; i < mainLen && i < numSamples; i++) {
      const x = out[i]
      hpOut = hpAlpha * (hpOut + x - hpPrev)
      hpPrev = x
      out[i] = hpOut
    }

    // ── POST: 3-BAND EQ ──────────────────────────────────────────────
    // Low shelf at 200Hz
    {
      const f0 = 200 / SR
      const w0 = 2 * Math.PI * f0
      const A = Math.pow(10, ((bassN - 0.5) * 12) / 40)
      const sn = Math.sin(w0), cs = Math.cos(w0)
      const alpha = sn / 2 * Math.sqrt(2)
      const sqA = 2 * Math.sqrt(A) * alpha
      const b0 = A * ((A + 1) - (A - 1) * cs + sqA)
      const b1 = 2 * A * ((A - 1) - (A + 1) * cs)
      const b2 = A * ((A + 1) - (A - 1) * cs - sqA)
      const a0 = (A + 1) + (A - 1) * cs + sqA
      const a1 = -2 * ((A - 1) + (A + 1) * cs)
      const a2 = (A + 1) + (A - 1) * cs - sqA
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0
      for (let i = 0; i < mainLen && i < numSamples; i++) {
        const x0 = out[i]
        const y0 = (b0/a0)*x0 + (b1/a0)*x1 + (b2/a0)*x2 - (a1/a0)*y1 - (a2/a0)*y2
        x2 = x1; x1 = x0; y2 = y1; y1 = y0
        out[i] = y0
      }
    }

    // Mid peak at 1000Hz
    {
      const f0 = 1000 / SR
      const w0 = 2 * Math.PI * f0
      const dBGain = (midN - 0.5) * 12
      const A = Math.pow(10, dBGain / 40)
      const sn = Math.sin(w0)
      const alpha = sn / (2 * 1.2)
      const b0 = 1 + alpha * A
      const b1 = -2 * Math.cos(w0)
      const b2 = 1 - alpha * A
      const a0 = 1 + alpha / A
      const a1 = -2 * Math.cos(w0)
      const a2 = 1 - alpha / A
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0
      for (let i = 0; i < mainLen && i < numSamples; i++) {
        const x0 = out[i]
        const y0 = (b0/a0)*x0 + (b1/a0)*x1 + (b2/a0)*x2 - (a1/a0)*y1 - (a2/a0)*y2
        x2 = x1; x1 = x0; y2 = y1; y1 = y0
        out[i] = y0
      }
    }

    // High shelf at 3000Hz
    {
      const f0 = 3000 / SR
      const w0 = 2 * Math.PI * f0
      const A = Math.pow(10, ((trebleN - 0.5) * 12) / 40)
      const sn = Math.sin(w0), cs = Math.cos(w0)
      const alpha = sn / 2 * Math.sqrt(2)
      const sqA = 2 * Math.sqrt(A) * alpha
      const b0 = A * ((A + 1) + (A - 1) * cs + sqA)
      const b1 = -2 * A * ((A - 1) + (A + 1) * cs)
      const b2 = A * ((A + 1) + (A - 1) * cs - sqA)
      const a0 = (A + 1) - (A - 1) * cs + sqA
      const a1 = 2 * ((A - 1) - (A + 1) * cs)
      const a2 = (A + 1) - (A - 1) * cs - sqA
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0
      for (let i = 0; i < mainLen && i < numSamples; i++) {
        const x0 = out[i]
        const y0 = (b0/a0)*x0 + (b1/a0)*x1 + (b2/a0)*x2 - (a1/a0)*y1 - (a2/a0)*y2
        x2 = x1; x1 = x0; y2 = y1; y1 = y0
        out[i] = y0
      }
    }

    // ── POST: ECHO ───────────────────────────────────────────────────
    if (echoAmt > 0.02) {
      const delays = [
        { ms: 40 + echoAmt * 120, gain: 0.2 + echoAmt * 0.35 },
        { ms: 80 + echoAmt * 80,  gain: 0.12 + echoAmt * 0.2  },
        { ms: 140 + echoAmt * 60, gain: 0.06 + echoAmt * 0.1  },
      ]
      for (const d of delays) {
        const delaySamps = Math.floor(SR * d.ms / 1000)
        for (let i = delaySamps; i < numSamples; i++) {
          out[i] += out[i - delaySamps] * d.gain
        }
      }
    }

    // ── SATURATION + LIMITER + NORMALIZE ─────────────────────────────
    // Light soft-clip saturation
    for (let i = 0; i < numSamples; i++) {
      const x = out[i]
      out[i] = Math.tanh(x * 1.3) * 0.85
    }

    // Normalize to consistent volume
    let peak = 0
    for (let i = 0; i < numSamples; i++) {
      const a = Math.abs(out[i])
      if (a > peak) peak = a
    }
    if (peak > 0.01) {
      const gain = 0.92 / peak
      for (let i = 0; i < numSamples; i++) {
        out[i] *= gain
      }
    }

    // ── ENCODE WAV ───────────────────────────────────────────────────
    const wavBuf = new ArrayBuffer(44 + numSamples * 2)
    const dv = new DataView(wavBuf)
    const ws = (off: number, s: string) => {
      for (let c = 0; c < s.length; c++) dv.setUint8(off + c, s.charCodeAt(c))
    }
    ws(0, 'RIFF')
    dv.setUint32(4, 36 + numSamples * 2, true)
    ws(8, 'WAVE')
    ws(12, 'fmt ')
    dv.setUint32(16, 16, true)
    dv.setUint16(20, 1, true)
    dv.setUint16(22, 1, true)
    dv.setUint32(24, SR, true)
    dv.setUint32(28, SR * 2, true)
    dv.setUint16(32, 2, true)
    dv.setUint16(34, 16, true)
    ws(36, 'data')
    dv.setUint32(40, numSamples * 2, true)
    for (let i = 0; i < numSamples; i++) {
      dv.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, out[i] * 32767)), true)
    }

    // ── PLAY ─────────────────────────────────────────────────────────
    const blob = new Blob([wavBuf], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)

    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }

    const audio = new Audio(url)
    audioElementRef.current = audio
    audio.onended = () => {
      URL.revokeObjectURL(url)
      setIsPlaying(false)
      isPlayingRef.current = false
    }

    audio.play().then(() => {
      const today = new Date().toISOString().slice(0, 10)
      trackChallenge('d1', today)
    }).catch(err => console.error('[FART] Play failed:', err))

    setIsPlaying(true)
    isPlayingRef.current = true
    setIsGenerating(true)
    if (generationMode !== 'remix') setGenerationMode('generate')
    setRecordedBlob(blob)
    setHasChanges(false)
  }

  const handleStop = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
    }

    oscillatorsRef.current.forEach((osc) => {
      try { osc.stop() } catch (e) { /* already stopped */ }
    })
    if (noiseBufferRef.current) {
      try { noiseBufferRef.current.stop() } catch (e) { /* already stopped */ }
    }
    lfoNodesRef.current.forEach((lfo) => {
      try { lfo.stop() } catch (e) { /* already stopped */ }
    })
    oscillatorsRef.current = []
    noiseBufferRef.current = null
    lfoNodesRef.current = []
    envelopeGainRef.current = null

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop() } catch (e) { /* ignore */ }
    }

    setIsPlaying(false)
    isPlayingRef.current = false
    setIsRecording(false)
  }

  const startRecording = async () => {
    if (generationMode === 'upload' && audioContextRef.current && analyserRef.current) {
      try {
        const dest = audioContextRef.current.createMediaStreamDestination()
        analyserRef.current.connect(dest)
        const recorder = new MediaRecorder(dest.stream)
        mediaRecorderRef.current = recorder
        recordedChunksRef.current = []
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data)
        }
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
          setRecordedBlob(blob)
        }
        recorder.start()
      } catch (error) {
        console.error('Error starting recording:', error)
        return
      }
    }
    setIsRecording(true)
    handlePlay()
  }

  const stopRecording = () => {
    handleStop()
  }

  const downloadMix = () => {
    if (!recordedBlob) return

    const url = URL.createObjectURL(recordedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bounty-blaster-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (!recordedBlob && !uploadedAudio && !isGenerating) {
      alert('Please generate or record some audio first!')
      return
    }

    const effectsParam = btoa(JSON.stringify(effects))
    const url = `${window.location.origin}/generator?effects=${effectsParam}`
    setShareUrl(url)
    setShowShareModal(true)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareToSocial = (platform: string) => {
    const text = encodeURIComponent('Check out my awesome fart sound creation on Fart Bounty!')
    const url = encodeURIComponent(shareUrl)

    let shareUrl_platform = ''
    switch (platform) {
      case 'twitter':
        shareUrl_platform = `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        break
      case 'facebook':
        shareUrl_platform = `https://www.facebook.com/sharer/sharer.php?u=${url}`
        break
      case 'reddit':
        shareUrl_platform = `https://reddit.com/submit?url=${url}&title=${text}`
        break
    }

    if (shareUrl_platform) {
      window.open(shareUrl_platform, '_blank', 'width=600,height=400')
    }
  }

  const saveToFeed = async () => {
    if (!user || !recordedBlob) {
      alert('Please sign in and record audio first!')
      return
    }

    if (!canCreate) {
      alert(`You've reached your daily creation limit. Upgrade your plan for more!`)
      return
    }

    setIsSavingToFeed(true)

    try {
      const isWebm = recordedBlob.type === 'audio/webm'
      const fileExt = isWebm ? 'webm' : 'wav'
      const contentType = isWebm ? 'audio/webm' : 'audio/wav'

      const fileName = `fart-${user.id}-${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, recordedBlob, {
          contentType,
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName)

      const { error: postError } = await (supabase as any)
        .from('posts')
        .insert({
          user_id: user.id,
          content: `Created a new fart sound with the Bounty Blaster Pro!`,
          audio_url: urlData.publicUrl,
          metadata: { effects, generationMode }
        })

      if (postError) throw postError

      incrementUsage()
      alert('Successfully saved to your feed!')
      setShowShareModal(false)
    } catch (error) {
      console.error('Error saving to feed:', error)
      alert('Failed to save to feed. Please try again.')
    } finally {
      setIsSavingToFeed(false)
    }
  }

  const saveToLibrary = async () => {
    if (!user || !recordedBlob) {
      alert('Please generate and play a sound first!')
      return
    }

    if (!canCreate) {
      alert(`You've reached your daily creation limit. Upgrade your plan for more!`)
      return
    }

    setIsSavingToLibrary(true)

    try {
      const isWebm = recordedBlob.type === 'audio/webm'
      const fileExt = isWebm ? 'webm' : 'wav'
      const contentType = isWebm ? 'audio/webm' : 'audio/wav'

      const storagePath = `${user.id}/generated-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('sounds')
        .upload(storagePath, recordedBlob, {
          contentType,
          upsert: false
        })

      if (uploadError) throw uploadError

      const atkTime = 0.003 + (effects.attack / 100) * 0.25
      const susTime = 0.1 + (effects.duration / 200) * 3.0
      const decTime = 0.03 + (effects.decay / 100) * 0.8
      const durationSecs = Math.max(1, Math.ceil(atkTime + susTime + decTime))

      const { error: insertError } = await (supabase as any)
        .from('sounds')
        .insert({
          user_id: user.id,
          name: `Fart Sound ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
          storage_path: storagePath,
          duration_seconds: durationSecs,
          parameters: effects,
          deleted: false
        })

      if (insertError) throw insertError

      incrementUsage()
      trackChallenge('w1', getISOWeekKey())
      trackChallenge('l1', null)
      alert('Sound saved to your Media Library!')
    } catch (error) {
      console.error('Error saving to library:', error)
      alert('Failed to save to library. Please try again.')
    } finally {
      setIsSavingToLibrary(false)
    }
  }

  const sendGreeting = async () => {
    if (!user || !recordedBlob) {
      alert('Please generate a sound first!')
      return
    }
    if (!greetingRecipient.trim()) {
      alert('Please enter a recipient username!')
      return
    }

    try {
      const { data: recipient, error: lookupError } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', greetingRecipient.trim())
        .single()

      if (lookupError || !recipient) {
        alert('User not found! Please check the username.')
        return
      }

      const fileName = `greeting-${user.id}-${Date.now()}.webm`
      const { error: uploadError } = await supabase.storage
        .from('sounds')
        .upload(fileName, recordedBlob, {
          contentType: 'audio/webm',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('sounds')
        .getPublicUrl(fileName)

      await (supabase as any).from('notifications').insert({
        user_id: (recipient as any).id,
        type: 'greeting',
        content: greetingMessage.trim() || `${user.username} sent you a fart greeting!`,
        metadata: {
          from_user_id: user.id,
          from_username: user.username,
          audio_url: urlData.publicUrl,
          message: greetingMessage.trim()
        }
      })

      const today = new Date().toISOString().slice(0, 10)
      trackChallenge('d3', today)
      trackChallenge('l4', null)
      alert(`Greeting sent to @${greetingRecipient}!`)
      setShowGreetingModal(false)
      setGreetingRecipient('')
      setGreetingMessage('')
    } catch (error) {
      console.error('Error sending greeting:', error)
      alert('Failed to send greeting. Please try again.')
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const effectsParam = params.get('effects')
    if (effectsParam) {
      try {
        const decodedEffects = JSON.parse(atob(effectsParam))
        const merged = { ...DEFAULT_EFFECTS, ...decodedEffects }
        setEffects(merged)
      } catch (e) {
        console.error('Failed to parse effects from URL:', e)
      }
    }
  }, [])


  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to access the sound generator">
      <div className={styles.container}>
        {/* BOUNTY BLASTER PRO Title */}
        <div className={styles.blasterTitle}>
          <h1>BOUNTY BLASTER PRO</h1>
          <div className={styles.titleUnderline}></div>
        </div>

        {/* Presets Bar */}
        <div className={styles.presetsBar}>
          {FART_PRESETS.map((preset, idx) => (
            <button
              key={preset.name}
              className={`${styles.presetBtn} ${activePreset === idx ? styles.presetBtnActive : ''}`}
              onClick={() => loadPreset(idx)}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Radar Control Center */}
        <div className={styles.radarSection}>
          <div className={styles.radarControls}>
            {/* Left Side: Play Button and Knobs */}
            <div className={styles.leftKnobs}>
              <button onClick={() => handlePlay()} className={styles.playBtn}>
                <Play size={24} /> Play
              </button>
              <div className={styles.knob}>
                <div className={styles.knobCircle}>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={effects.pitch}
                    onChange={(e) => updateEffect('pitch', parseFloat(e.target.value))}
                    className={styles.knobInput}
                  />
                  <div className={styles.knobMarker} style={{ transform: `rotate(${(effects.pitch + 12) * 15}deg)` }}></div>
                </div>
                <span>Pitch</span>
              </div>
              <div className={styles.knob}>
                <div className={styles.knobCircle}>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={effects.duration}
                    onChange={(e) => updateEffect('duration', parseFloat(e.target.value))}
                    className={styles.knobInput}
                  />
                  <div className={styles.knobMarker} style={{ transform: `rotate(${(effects.duration / 200) * 270 - 135}deg)` }}></div>
                </div>
                <span>Duration</span>
              </div>
            </div>

            {/* Center Disk */}
            <div className={styles.radarCenter}>
              <div className={`${styles.diskContainer} ${isPlaying ? styles.spinning : ''}`}>
                <img src="/assets/disk.png" alt="Disk" className={styles.diskImage} />
              </div>
            </div>

            {/* Right Side: Stop Button and Knobs */}
            <div className={styles.rightKnobs}>
              <button onClick={handleStop} className={styles.stopBtn} disabled={!uploadedAudio && !isGenerating}>
                <Square size={24} /> Stop
              </button>
              <div className={`${styles.knob} ${!allowedControls.includes('echo') ? styles.lockedKnob : ''}`}>
                <div className={styles.knobCircle}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={effects.echo}
                    onChange={(e) => updateEffect('echo', parseFloat(e.target.value))}
                    className={styles.knobInput}
                    disabled={!allowedControls.includes('echo')}
                  />
                  <div className={styles.knobMarker} style={{ transform: `rotate(${(effects.echo / 100) * 270 - 135}deg)` }}></div>
                </div>
                <span>Echo {!allowedControls.includes('echo') && '🔒'}</span>
              </div>
              <div className={`${styles.knob} ${!allowedControls.includes('wetness') ? styles.lockedKnob : ''}`}>
                <div className={styles.knobCircle}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={effects.wetness}
                    onChange={(e) => updateEffect('wetness', parseFloat(e.target.value))}
                    className={styles.knobInput}
                    disabled={!allowedControls.includes('wetness')}
                  />
                  <div className={styles.knobMarker} style={{ transform: `rotate(${(effects.wetness / 100) * 270 - 135}deg)` }}></div>
                </div>
                <span>Wetness {!allowedControls.includes('wetness') && '🔒'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body Type Selector */}
        <div className={styles.flatologySection}>
          <h2 className={styles.flatologyTitle}>FART MAKER</h2>
          <div className={styles.bodyTypeSelector}>
            {BODY_TYPE_NAMES.map((name, idx) => {
              const locked = !allowedControls.includes('bodyType')
              return (
                <button
                  key={name}
                  className={`${styles.bodyTypeBtn} ${effects.bodyType === idx ? styles.bodyTypeBtnActive : ''} ${locked ? styles.lockedSlider : ''}`}
                  onClick={() => !locked && updateEffect('bodyType', idx)}
                  disabled={locked}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        {/* DJ Sliders */}
        <div className={styles.slidersSection}>
          {([
            { key: 'bass', label: 'Bass', min: -20, max: 20, step: 1, fmt: (v: number) => String(v) },
            { key: 'mid', label: 'Mid', min: -20, max: 20, step: 1, fmt: (v: number) => String(v) },
            { key: 'treble', label: 'Treble', min: -20, max: 20, step: 1, fmt: (v: number) => String(v) },
            { key: 'speed', label: 'Speed', min: 0.5, max: 2, step: 0.1, fmt: (v: number) => `${v.toFixed(1)}x` },
            { key: 'attack', label: 'Attack', min: 0, max: 100, step: 1, fmt: (v: number) => String(v) },
            { key: 'decay', label: 'Decay', min: 0, max: 100, step: 1, fmt: (v: number) => String(v) },
            { key: 'intensity', label: 'Intensity', min: 0, max: 100, step: 1, fmt: (v: number) => String(v) },
            { key: 'noise', label: 'Noise', min: 0, max: 100, step: 1, fmt: (v: number) => String(v) },
            { key: 'richness', label: 'Richness', min: 0, max: 100, step: 1, fmt: (v: number) => String(v) },
            { key: 'texture', label: 'Texture', min: 0, max: 100, step: 1, fmt: (v: number) => String(v) },
            { key: 'tailDuration', label: 'Tail', min: 0, max: 100, step: 1, fmt: (v: number) => String(v) },
            { key: 'tailGap', label: 'Gap', min: 0, max: 100, step: 1, fmt: (v: number) => String(v) },
          ] as const).map(({ key, label, min, max, step, fmt }) => {
            const locked = !allowedControls.includes(key)
            return (
              <div key={key} className={`${styles.sliderControl} ${locked ? styles.lockedSlider : ''}`}>
                <label>{label} {locked && '🔒'}</label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={effects[key]}
                  onChange={(e) => updateEffect(key, parseFloat(e.target.value))}
                  disabled={locked}
                />
                <span>{fmt(effects[key])}</span>
              </div>
            )
          })}
        </div>

        {/* SPLICER */}
        <div className={styles.splicerSection}>
          <h2 className={styles.flatologyTitle}>SPLICER</h2>
          <div className={styles.splicerRow}>
            <div className={styles.splicerPickerGroup}>
              <label>Preset A</label>
              <select
                className={styles.splicerSelect}
                value={splicerA}
                onChange={(e) => setSplicerA(Number(e.target.value))}
              >
                {FART_PRESETS.map((p, i) => (
                  <option key={i} value={i}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.splicerMixSlider}>
              <label>Mix: {splicerMix}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={splicerMix}
                onChange={(e) => setSplicerMix(Number(e.target.value))}
              />
            </div>
            <div className={styles.splicerPickerGroup}>
              <label>Preset B</label>
              <select
                className={styles.splicerSelect}
                value={splicerB}
                onChange={(e) => setSplicerB(Number(e.target.value))}
              >
                {FART_PRESETS.map((p, i) => (
                  <option key={i} value={i}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button className={styles.spliceBtn} onClick={handleSplice}>
            <Zap size={18} /> Splice &amp; Play
          </button>
        </div>

        {/* Message Box */}
        <div className={styles.messageBox}>
          <p>CREATE, SAVE, AND SHARE NEW FART SOUNDS</p>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button onClick={() => fileInputRef.current?.click()} className={`${styles.actionBtn} ${styles.uploadBtn}`}>
            <Upload size={20} /> Upload
          </button>
          <button onClick={handleRemix} className={`${styles.actionBtn} ${styles.remixBtn}`} disabled={!uploadedAudio && !isGenerating}>
            <Share2 size={20} /> Remix
          </button>
          {!isRecording ? (
            <button onClick={startRecording} className={`${styles.actionBtn} ${styles.recordBtn}`} disabled={!uploadedAudio && !isGenerating}>
              <Music size={20} /> Record
            </button>
          ) : (
            <button onClick={stopRecording} className={styles.actionBtnRecording}>
              <Square size={20} /> Stop Recording
            </button>
          )}
          <button onClick={handleShare} className={`${styles.actionBtn} ${styles.shareBtn}`}>
            <Share2 size={20} /> Share
          </button>
          <button onClick={downloadMix} className={`${styles.actionBtn} ${styles.downloadBtn}`} disabled={!recordedBlob}>
            <Download size={20} /> Download
          </button>
          <button onClick={saveToLibrary} className={`${styles.actionBtn} ${styles.saveLibraryBtn}`} disabled={!recordedBlob || isSavingToLibrary}>
            <Plus size={20} /> {isSavingToLibrary ? 'Saving...' : 'Save to Library'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className={styles.fileInput}
          />
        </div>

        {/* Bottom Section: Greeting Card and Waveform */}
        <div className={styles.bottomSection}>
          <div className={styles.greetingCard} onClick={() => setShowGreetingModal(true)}>
            <div className={styles.greetingIcon}>
              <Gift size={48} />
            </div>
            <p>Send Greetings</p>
          </div>
          <div className={styles.waveformBox}>
            <canvas ref={canvasRef} width={600} height={150} className={styles.waveformCanvas}></canvas>
            {!isPlaying && <div className={styles.waveformPlaceholder}>Waveform displays when playing</div>}
          </div>
        </div>

        {/* Bottom Title */}
        <div className={styles.bottomTitle}>
          <h2>FART BOUNTY</h2>
        </div>

        {/* Greeting Modal */}
        {showGreetingModal && (
          <div className={styles.modalOverlay} onClick={() => setShowGreetingModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>Send a Fart Greeting</h2>
              {!recordedBlob && (
                <p style={{ color: '#ff6b6b', textAlign: 'center', marginBottom: '1rem' }}>
                  Generate and play a sound first to attach it to your greeting!
                </p>
              )}
              <div className={styles.shareSection}>
                <h3>Recipient Username</h3>
                <input
                  type="text"
                  value={greetingRecipient}
                  onChange={(e) => setGreetingRecipient(e.target.value)}
                  placeholder="Enter username..."
                  className={styles.urlInput}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div className={styles.shareSection}>
                <h3>Message (optional)</h3>
                <input
                  type="text"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="Add a message..."
                  className={styles.urlInput}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              {recordedBlob && (
                <p style={{ color: '#0bda51', textAlign: 'center', fontSize: '0.85rem' }}>
                  Sound attached and ready to send!
                </p>
              )}
              <button
                onClick={sendGreeting}
                className={styles.saveFeedBtn}
                disabled={!recordedBlob || !greetingRecipient.trim()}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Send Greeting
              </button>
              <button
                onClick={() => setShowGreetingModal(false)}
                className={styles.closeModalBtn}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>Share Your Creation</h2>

              <div className={styles.shareSection}>
                <h3>Copy Link</h3>
                <div className={styles.urlBox}>
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className={styles.urlInput}
                  />
                  <button
                    onClick={copyToClipboard}
                    className={styles.copyBtn}
                  >
                    {isCopied ? <Check size={20} /> : <Copy size={20} />}
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className={styles.shareSection}>
                <h3>Share to Social Media</h3>
                <div className={styles.socialButtons}>
                  <button
                    onClick={() => shareToSocial('twitter')}
                    className={`${styles.socialBtn} ${styles.twitter}`}
                  >
                    X Twitter
                  </button>
                  <button
                    onClick={() => shareToSocial('facebook')}
                    className={`${styles.socialBtn} ${styles.facebook}`}
                  >
                    f Facebook
                  </button>
                  <button
                    onClick={() => shareToSocial('reddit')}
                    className={`${styles.socialBtn} ${styles.reddit}`}
                  >
                    Reddit
                  </button>
                </div>
              </div>

              {user && recordedBlob && (
                <div className={styles.shareSection}>
                  <h3>Save to Your Feed</h3>
                  <button
                    onClick={saveToFeed}
                    className={styles.saveFeedBtn}
                    disabled={isSavingToFeed}
                  >
                    {isSavingToFeed ? 'Saving...' : 'Save to Feed'}
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowShareModal(false)}
                className={styles.closeModalBtn}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}

export default GeneratorPage
