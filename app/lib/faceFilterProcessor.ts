/**
 * Face Filter Processor - Canvas-based visual face filters
 * Each filter manipulates pixel data on a canvas context for anonymity effects.
 */

export type FaceFilterType =
  | 'none'
  | 'blur'
  | 'pixelate'
  | 'silhouette'
  | 'thermal'
  | 'glitch'
  | 'nightvision'
  | 'invert'
  | 'darken'

export interface FaceFilter {
  type: FaceFilterType
  intensity: number // 1-10
}

export const FACE_FILTERS: {
  type: FaceFilterType
  label: string
  icon: string
  description: string
  free: boolean
  tier: 'free' | 'premium' | 'extra'
}[] = [
  { type: 'none', label: 'None', icon: '👤', description: 'No visual filter', free: true, tier: 'free' },
  { type: 'blur', label: 'Blur', icon: '🌫️', description: 'Gaussian blur to hide features', free: true, tier: 'free' },
  { type: 'pixelate', label: 'Pixelate', icon: '🟩', description: 'Mosaic pixel blocks for anonymity', free: true, tier: 'free' },
  { type: 'silhouette', label: 'Silhouette', icon: '🖤', description: 'Dark shadow outline effect', free: true, tier: 'free' },
  { type: 'thermal', label: 'Thermal', icon: '🌡️', description: 'Heat-map infrared camera look', free: false, tier: 'premium' },
  { type: 'glitch', label: 'Glitch', icon: '📺', description: 'RGB shift + scan lines distortion', free: false, tier: 'premium' },
  { type: 'nightvision', label: 'Night Vision', icon: '🔫', description: 'Green-tinted military night vision', free: false, tier: 'extra' },
  { type: 'invert', label: 'Invert', icon: '🔄', description: 'Negative / inverted color film', free: false, tier: 'extra' },
  { type: 'darken', label: 'Darken', icon: '🌑', description: 'Heavy shadow to obscure identity', free: false, tier: 'extra' },
]

/**
 * Draw a video frame onto a canvas with the selected face filter applied.
 * Call this on every animation frame during preview or re-encoding.
 */
export function drawFilteredFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  filter: FaceFilter
): void {
  const intensity = filter.intensity / 10 // 0.1 – 1.0

  switch (filter.type) {
    case 'none':
      ctx.filter = 'none'
      ctx.drawImage(video, 0, 0, width, height)
      break

    case 'blur': {
      const px = Math.round(1 + intensity * 20) // 1-21px
      ctx.filter = `blur(${px}px)`
      ctx.drawImage(video, 0, 0, width, height)
      ctx.filter = 'none'
      break
    }

    case 'pixelate': {
      const blockSize = Math.max(2, Math.round(2 + intensity * 28)) // 2-30px blocks
      // Draw small then scale up for pixelation effect
      const smallW = Math.max(1, Math.ceil(width / blockSize))
      const smallH = Math.max(1, Math.ceil(height / blockSize))
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(video, 0, 0, smallW, smallH)
      ctx.drawImage(ctx.canvas, 0, 0, smallW, smallH, 0, 0, width, height)
      ctx.imageSmoothingEnabled = true
      break
    }

    case 'silhouette': {
      ctx.filter = 'none'
      ctx.drawImage(video, 0, 0, width, height)
      const silData = ctx.getImageData(0, 0, width, height)
      const sd = silData.data
      const threshold = 40 + (1 - intensity) * 120 // darker at higher intensity
      for (let i = 0; i < sd.length; i += 4) {
        const lum = sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114
        if (lum < threshold) {
          sd[i] = 0; sd[i + 1] = 0; sd[i + 2] = 0
        } else {
          const blend = intensity * 0.85
          sd[i] = Math.round(sd[i] * (1 - blend) + 30 * blend)
          sd[i + 1] = Math.round(sd[i + 1] * (1 - blend) + 30 * blend)
          sd[i + 2] = Math.round(sd[i + 2] * (1 - blend) + 40 * blend)
        }
        sd[i + 3] = 255
      }
      ctx.putImageData(silData, 0, 0)
      break
    }

    case 'thermal': {
      ctx.filter = 'none'
      ctx.drawImage(video, 0, 0, width, height)
      const thermData = ctx.getImageData(0, 0, width, height)
      const td = thermData.data
      for (let i = 0; i < td.length; i += 4) {
        const lum = (td[i] * 0.299 + td[i + 1] * 0.587 + td[i + 2] * 0.114) / 255
        const boosted = Math.min(1, lum * (1 + intensity * 0.5))
        // Thermal: cold=blue → warm=red → hot=yellow
        let r: number, g: number, b: number
        if (boosted < 0.33) {
          const t = boosted / 0.33
          r = 0; g = 0; b = Math.round(80 + t * 175)
        } else if (boosted < 0.66) {
          const t = (boosted - 0.33) / 0.33
          r = Math.round(t * 255); g = Math.round(t * 60); b = Math.round(255 * (1 - t))
        } else {
          const t = (boosted - 0.66) / 0.34
          r = 255; g = Math.round(60 + t * 195); b = Math.round(t * 50)
        }
        const mix = 0.3 + intensity * 0.7
        td[i] = Math.round(td[i] * (1 - mix) + r * mix)
        td[i + 1] = Math.round(td[i + 1] * (1 - mix) + g * mix)
        td[i + 2] = Math.round(td[i + 2] * (1 - mix) + b * mix)
      }
      ctx.putImageData(thermData, 0, 0)
      break
    }

    case 'glitch': {
      ctx.filter = 'none'
      ctx.drawImage(video, 0, 0, width, height)
      const shift = Math.round(3 + intensity * 20) // pixel shift 3-23px
      const imageData = ctx.getImageData(0, 0, width, height)
      const gd = imageData.data
      const copy = new Uint8ClampedArray(gd)

      // RGB channel shift
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4
          // Shift red channel right
          const srcR = (y * width + Math.min(width - 1, x + shift)) * 4
          gd[idx] = copy[srcR]
          // Shift blue channel left
          const srcB = (y * width + Math.max(0, x - shift)) * 4
          gd[idx + 2] = copy[srcB + 2]
        }
      }

      // Scan lines
      const lineSpacing = Math.max(2, Math.round(8 - intensity * 5))
      for (let y = 0; y < height; y += lineSpacing) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4
          gd[idx] = Math.round(gd[idx] * 0.5)
          gd[idx + 1] = Math.round(gd[idx + 1] * 0.5)
          gd[idx + 2] = Math.round(gd[idx + 2] * 0.5)
        }
      }

      // Random horizontal glitch bands
      const numBands = Math.round(1 + intensity * 4)
      for (let b = 0; b < numBands; b++) {
        const bandY = Math.floor(Math.random() * height)
        const bandH = Math.floor(2 + Math.random() * (5 + intensity * 10))
        const bandShift = Math.floor((Math.random() - 0.5) * shift * 2)
        for (let y = bandY; y < Math.min(height, bandY + bandH); y++) {
          for (let x = 0; x < width; x++) {
            const dstIdx = (y * width + x) * 4
            const srcX = Math.max(0, Math.min(width - 1, x + bandShift))
            const srcIdx = (y * width + srcX) * 4
            gd[dstIdx] = copy[srcIdx]
            gd[dstIdx + 1] = copy[srcIdx + 1]
            gd[dstIdx + 2] = copy[srcIdx + 2]
          }
        }
      }

      ctx.putImageData(imageData, 0, 0)
      break
    }

    case 'nightvision': {
      ctx.filter = 'none'
      ctx.drawImage(video, 0, 0, width, height)
      const nvData = ctx.getImageData(0, 0, width, height)
      const nd = nvData.data
      const greenBoost = 0.4 + intensity * 0.6
      for (let i = 0; i < nd.length; i += 4) {
        const lum = nd[i] * 0.299 + nd[i + 1] * 0.587 + nd[i + 2] * 0.114
        // Amplify brightness (night vision is bright)
        const amplified = Math.min(255, lum * (1.2 + intensity * 0.8))
        // Green-tinted monochrome
        nd[i] = Math.round(amplified * (1 - greenBoost) * 0.6)         // R: dim
        nd[i + 1] = Math.round(Math.min(255, amplified * (0.8 + greenBoost * 0.5))) // G: bright
        nd[i + 2] = Math.round(amplified * (1 - greenBoost) * 0.4)     // B: very dim
        // Add slight noise for realism
        const noise = (Math.random() - 0.5) * intensity * 30
        nd[i] = Math.max(0, Math.min(255, nd[i] + noise))
        nd[i + 1] = Math.max(0, Math.min(255, nd[i + 1] + noise))
        nd[i + 2] = Math.max(0, Math.min(255, nd[i + 2] + noise))
      }
      ctx.putImageData(nvData, 0, 0)
      break
    }

    case 'invert': {
      ctx.filter = 'none'
      ctx.drawImage(video, 0, 0, width, height)
      const invData = ctx.getImageData(0, 0, width, height)
      const id = invData.data
      for (let i = 0; i < id.length; i += 4) {
        const mix = 0.3 + intensity * 0.7 // partial to full inversion
        id[i] = Math.round(id[i] * (1 - mix) + (255 - id[i]) * mix)
        id[i + 1] = Math.round(id[i + 1] * (1 - mix) + (255 - id[i + 1]) * mix)
        id[i + 2] = Math.round(id[i + 2] * (1 - mix) + (255 - id[i + 2]) * mix)
      }
      ctx.putImageData(invData, 0, 0)
      break
    }

    case 'darken': {
      ctx.filter = 'none'
      ctx.drawImage(video, 0, 0, width, height)
      // Overlay with dark fill at variable opacity
      const darkness = 0.3 + intensity * 0.6 // 0.3-0.9 opacity
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`
      ctx.fillRect(0, 0, width, height)
      break
    }

    default:
      ctx.filter = 'none'
      ctx.drawImage(video, 0, 0, width, height)
  }
}

/**
 * Get the CSS filter string for live preview on the <video> element.
 * Only some filters can be previewed via CSS; others need canvas.
 */
export function getCSSFilterPreview(filter: FaceFilter): string {
  const intensity = filter.intensity / 10

  switch (filter.type) {
    case 'blur':
      return `blur(${Math.round(1 + intensity * 20)}px)`
    case 'darken':
      return `brightness(${1 - (0.3 + intensity * 0.6)})`
    case 'invert':
      return `invert(${0.3 + intensity * 0.7})`
    case 'silhouette':
      return `contrast(${1 + intensity * 3}) brightness(${0.4 - intensity * 0.25})`
    case 'nightvision':
      return `saturate(0) brightness(${1.2 + intensity * 0.5}) sepia(0.8) hue-rotate(70deg)`
    default:
      return 'none'
  }
}

/**
 * Returns true if this filter requires canvas pixel manipulation for accurate preview.
 * If false, CSS filter approximation is good enough for live preview.
 */
export function needsCanvasPreview(type: FaceFilterType): boolean {
  return type === 'pixelate' || type === 'thermal' || type === 'glitch'
}
