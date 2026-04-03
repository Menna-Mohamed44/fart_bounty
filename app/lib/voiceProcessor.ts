/**
 * Voice Processor - Web Audio API based voice filter processing
 * Extracts audio from video, applies effects, and re-encodes with processed audio.
 */

import { drawFilteredFrame, type FaceFilter } from './faceFilterProcessor'

export interface VoiceEffect {
  type: 'none' | 'whisper' | 'breathy' | 'robot' | 'chipmunk' | 'deep' | 'echo'
  intensity: number // 1-10
}

/**
 * Extract audio from a video Blob and decode into an AudioBuffer
 */
export async function extractAudioBuffer(videoBlob: Blob): Promise<AudioBuffer> {
  const audioContext = new AudioContext()
  try {
    const arrayBuffer = await videoBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    return audioBuffer
  } finally {
    await audioContext.close()
  }
}

/**
 * Apply a voice effect to an AudioBuffer using OfflineAudioContext
 */
export async function applyVoiceEffect(
  audioBuffer: AudioBuffer,
  effect: VoiceEffect
): Promise<AudioBuffer> {
  if (effect.type === 'none') return audioBuffer

  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration
  const channels = audioBuffer.numberOfChannels
  const intensityFactor = effect.intensity / 10 // 0.1 to 1.0

  // Pitch effects change playback rate
  let playbackRate = 1.0
  if (effect.type === 'chipmunk') {
    playbackRate = 1.0 + intensityFactor * 0.8 // 1.08 to 1.8
  } else if (effect.type === 'deep') {
    playbackRate = 1.0 - intensityFactor * 0.4 // 0.96 to 0.6
  }

  // Output length always matches original duration (for video sync)
  const outputLength = Math.ceil(duration * sampleRate)

  const offlineCtx = new OfflineAudioContext(channels, outputLength, sampleRate)
  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.playbackRate.value = playbackRate

  let currentNode: AudioNode = source

  switch (effect.type) {
    case 'whisper': {
      // High-pass filter removes low frequencies for a whispery quality
      const highPass = offlineCtx.createBiquadFilter()
      highPass.type = 'highpass'
      highPass.frequency.value = 400 + intensityFactor * 800
      highPass.Q.value = 0.7
      currentNode.connect(highPass)
      currentNode = highPass

      // Reduce gain for softer sound
      const gain = offlineCtx.createGain()
      gain.gain.value = 0.5 - intensityFactor * 0.25
      currentNode.connect(gain)
      currentNode = gain
      break
    }

    case 'breathy': {
      // Bandpass filter for airy quality
      const bandpass = offlineCtx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = 900 + intensityFactor * 500
      bandpass.Q.value = 0.4 + intensityFactor * 0.4
      currentNode.connect(bandpass)
      currentNode = bandpass

      // Dynamic compression for even volume
      const compressor = offlineCtx.createDynamicsCompressor()
      compressor.threshold.value = -24
      compressor.ratio.value = 4 + intensityFactor * 8
      compressor.attack.value = 0.003
      compressor.release.value = 0.25
      currentNode.connect(compressor)
      currentNode = compressor
      break
    }

    case 'robot': {
      // Waveshaper for metallic distortion
      const waveshaper = offlineCtx.createWaveShaper()
      const samples = 256
      const curve = new Float32Array(samples)
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1
        curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 1 - intensityFactor * 0.6)
      }
      waveshaper.curve = curve
      waveshaper.oversample = '4x'
      currentNode.connect(waveshaper)
      currentNode = waveshaper

      // Amplitude modulation via LFO for robotic ring
      const modGain = offlineCtx.createGain()
      modGain.gain.value = 0.5
      const lfo = offlineCtx.createOscillator()
      lfo.type = 'square'
      lfo.frequency.value = 30 + intensityFactor * 70
      const lfoGain = offlineCtx.createGain()
      lfoGain.gain.value = 0.5 + intensityFactor * 0.4
      lfo.connect(lfoGain)
      lfoGain.connect(modGain.gain)
      lfo.start()
      currentNode.connect(modGain)
      currentNode = modGain
      break
    }

    case 'chipmunk': {
      // Playback rate handled above; add formant emphasis for cartoonish quality
      const peaking = offlineCtx.createBiquadFilter()
      peaking.type = 'peaking'
      peaking.frequency.value = 2500 + intensityFactor * 2000
      peaking.gain.value = intensityFactor * 8
      peaking.Q.value = 1.5
      currentNode.connect(peaking)
      currentNode = peaking
      break
    }

    case 'deep': {
      // Playback rate handled above; add low-end boost for rumbling quality
      const lowShelf = offlineCtx.createBiquadFilter()
      lowShelf.type = 'lowshelf'
      lowShelf.frequency.value = 300
      lowShelf.gain.value = intensityFactor * 10
      currentNode.connect(lowShelf)
      currentNode = lowShelf

      // Slight compression to tame boomy peaks
      const compressor = offlineCtx.createDynamicsCompressor()
      compressor.threshold.value = -18
      compressor.ratio.value = 3
      currentNode.connect(compressor)
      currentNode = compressor
      break
    }

    case 'echo': {
      // Dry/wet split with delay feedback
      const dryGain = offlineCtx.createGain()
      dryGain.gain.value = 0.7

      const wetGain = offlineCtx.createGain()
      wetGain.gain.value = 0.3 + intensityFactor * 0.5

      const delay = offlineCtx.createDelay(2.0)
      delay.delayTime.value = 0.12 + intensityFactor * 0.35

      const feedback = offlineCtx.createGain()
      feedback.gain.value = 0.2 + intensityFactor * 0.45

      // Dry path
      currentNode.connect(dryGain)

      // Wet path with feedback loop
      currentNode.connect(delay)
      delay.connect(feedback)
      feedback.connect(delay)
      delay.connect(wetGain)

      // Mix into a single gain node
      const mixer = offlineCtx.createGain()
      mixer.gain.value = 1.0
      dryGain.connect(mixer)
      wetGain.connect(mixer)

      currentNode = mixer
      break
    }
  }

  currentNode.connect(offlineCtx.destination)
  source.start()

  return await offlineCtx.startRendering()
}

/**
 * Convert AudioBuffer to a WAV Blob for standalone playback
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  const dataLength = buffer.length * blockAlign
  const headerLength = 44
  const totalLength = headerLength + dataLength

  const arrayBuffer = new ArrayBuffer(totalLength)
  const view = new DataView(arrayBuffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalLength - 8, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  // Interleave channels and write PCM samples
  const channels: Float32Array[] = []
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

/**
 * Re-encode a video blob with optional processed audio and/or face filter.
 * Draws video frames to canvas (with face filter applied) + processed audio → MediaRecorder → new blob.
 */
export interface ReencodeOptions {
  processedAudioBuffer?: AudioBuffer | null
  blurLevel?: number // 0-10 (legacy, used if no faceFilter)
  faceFilter?: FaceFilter | null
}

export async function reencodeVideo(
  videoBlob: Blob,
  options: ReencodeOptions
): Promise<Blob> {
  const { processedAudioBuffer, blurLevel = 0, faceFilter } = options

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    video.muted = true
    video.playsInline = true
    const videoUrl = URL.createObjectURL(videoBlob)
    video.src = videoUrl

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Build the stream tracks
      const tracks: MediaStreamTrack[] = []

      // Canvas stream for video (with blur baked in)
      const canvasStream = canvas.captureStream(30)
      tracks.push(...canvasStream.getVideoTracks())

      // Audio: use processed audio if provided, otherwise keep original audio
      let audioCtx: AudioContext | null = null
      let audioSource: AudioBufferSourceNode | null = null

      if (processedAudioBuffer) {
        audioCtx = new AudioContext()
        audioSource = audioCtx.createBufferSource()
        audioSource.buffer = processedAudioBuffer
        const audioDestination = audioCtx.createMediaStreamDestination()
        audioSource.connect(audioDestination)
        tracks.push(...audioDestination.stream.getAudioTracks())
      } else {
        // Extract original audio from video by creating a new MediaStream from video element
        // We'll capture via AudioContext from the video element
        audioCtx = new AudioContext()
        const mediaSource = audioCtx.createMediaElementSource(video)
        const audioDestination = audioCtx.createMediaStreamDestination()
        mediaSource.connect(audioDestination)
        // Also connect to speakers so the video plays correctly (muted visually, but audio captured)
        mediaSource.connect(audioCtx.destination)
        tracks.push(...audioDestination.stream.getAudioTracks())
      }

      const combinedStream = new MediaStream(tracks)

      // Determine a supported mimeType
      let mimeType = 'video/webm;codecs=vp9,opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm'
        }
      }

      const recorder = new MediaRecorder(combinedStream, { mimeType })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: 'video/webm' })
        URL.revokeObjectURL(videoUrl)
        if (audioCtx) audioCtx.close()
        resolve(finalBlob)
      }

      recorder.onerror = () => {
        URL.revokeObjectURL(videoUrl)
        if (audioCtx) audioCtx.close()
        reject(new Error('MediaRecorder error during re-encoding'))
      }

      recorder.start(100)
      if (audioSource) audioSource.start()
      video.play()

      // Resolve which face filter to use (new faceFilter or legacy blurLevel)
      const activeFilter: FaceFilter | null = faceFilter && faceFilter.type !== 'none'
        ? faceFilter
        : blurLevel > 0
          ? { type: 'blur', intensity: blurLevel }
          : null

      const drawFrame = () => {
        if (video.ended || video.paused) {
          setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop()
          }, 200)
          return
        }
        if (activeFilter) {
          drawFilteredFrame(ctx, video, canvas.width, canvas.height, activeFilter)
        } else {
          ctx.filter = 'none'
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        }
        requestAnimationFrame(drawFrame)
      }

      video.onplay = drawFrame

      video.onended = () => {
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop()
          }
        }, 300)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl)
      reject(new Error('Failed to load video for re-encoding'))
    }
  })
}
