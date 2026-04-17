'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'

const W = 480
const H = 600
const BASKET_W = 70
const BASKET_H = 40
const ITEM_SIZE = 28
const SPAWN_INTERVAL_BASE = 900
const SPAWN_INTERVAL_MIN = 350
const FALL_SPEED_BASE = 2
const FALL_SPEED_MAX = 5.5
const LIVES_MAX = 3

type ItemType = 'bean' | 'cloud' | 'golden' | 'bomb' | 'pepper'

interface FallingItem {
  x: number
  y: number
  type: ItemType
  speed: number
  wobble: number
  wobbleSpeed: number
}

interface CatchFx {
  x: number
  y: number
  text: string
  color: string
  alpha: number
  vy: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  size: number
  color: string
}

const ITEM_CONFIG: Record<ItemType, { emoji: string; points: number; color: string }> = {
  bean: { emoji: '🫘', points: 10, color: '#8B4513' },
  cloud: { emoji: '💨', points: 15, color: '#7ec850' },
  golden: { emoji: '⭐', points: 50, color: '#FFD700' },
  bomb: { emoji: '💣', points: -1, color: '#ef4444' },
  pepper: { emoji: '🌶️', points: 25, color: '#dc2626' },
}

export default function TootCatcher({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'menu' | 'playing' | 'over'>('menu')
  const phaseRef = useRef<'menu' | 'playing' | 'over'>('menu')
  const { user } = useAuth()

  const gRef = useRef({
    basketX: W / 2 - BASKET_W / 2,
    items: [] as FallingItem[],
    effects: [] as CatchFx[],
    particles: [] as Particle[],
    score: 0,
    highScore: 0,
    lives: LIVES_MAX,
    combo: 0,
    maxCombo: 0,
    level: 1,
    itemsCaught: 0,
    lastSpawn: 0,
    spawnInterval: SPAWN_INTERVAL_BASE,
    fallSpeed: FALL_SPEED_BASE,
    mouseX: W / 2,
    shakeTimer: 0,
    feverMode: false,
    feverTimer: 0,
  })

  const startGame = useCallback(() => {
    const g = gRef.current
    g.basketX = W / 2 - BASKET_W / 2
    g.items = []
    g.effects = []
    g.particles = []
    g.score = 0
    g.lives = LIVES_MAX
    g.combo = 0
    g.maxCombo = 0
    g.level = 1
    g.itemsCaught = 0
    g.lastSpawn = 0
    g.spawnInterval = SPAWN_INTERVAL_BASE
    g.fallSpeed = FALL_SPEED_BASE
    g.shakeTimer = 0
    g.feverMode = false
    g.feverTimer = 0
    phaseRef.current = 'playing'
    setPhase('playing')
  }, [])

  // Keyboard + mouse + touch controls
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') {
        if (e.key === ' ' || e.key === 'Enter') { startGame(); e.preventDefault() }
        return
      }
      const g = gRef.current
      const step = 20
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        g.basketX = Math.max(0, g.basketX - step); e.preventDefault()
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        g.basketX = Math.min(W - BASKET_W, g.basketX + step); e.preventDefault()
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (phaseRef.current !== 'playing') return
      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      const mx = (e.clientX - rect.left) * scaleX
      gRef.current.basketX = Math.max(0, Math.min(W - BASKET_W, mx - BASKET_W / 2))
    }

    const onTouchMove = (e: TouchEvent) => {
      if (phaseRef.current !== 'playing') return
      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      const mx = (e.touches[0].clientX - rect.left) * scaleX
      gRef.current.basketX = Math.max(0, Math.min(W - BASKET_W, mx - BASKET_W / 2))
      e.preventDefault()
    }

    const onTouchStart = (e: TouchEvent) => {
      if (phaseRef.current !== 'playing') {
        startGame(); e.preventDefault(); return
      }
      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      const mx = (e.touches[0].clientX - rect.left) * scaleX
      gRef.current.basketX = Math.max(0, Math.min(W - BASKET_W, mx - BASKET_W / 2))
      e.preventDefault()
    }

    const onClick = () => {
      if (phaseRef.current !== 'playing') startGame()
    }

    window.addEventListener('keydown', onKey)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('click', onClick)
    }
  }, [startGame])

  // Submit score
  const submitScore = useCallback(async (score: number) => {
    if (!user || score === 0) return
    try {
      const supabase = createClient()
      await (supabase as any).rpc('submit_game_score', {
        p_user_id: user.id,
        p_game_id: 'toot-catcher',
        p_score: score,
      })
    } catch {}
  }, [user])

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let prevTs = 0

    const spawnItem = () => {
      const g = gRef.current
      const roll = Math.random()
      let type: ItemType = 'bean'
      const bombChance = 0.12 + g.level * 0.02

      if (roll < bombChance) type = 'bomb'
      else if (roll < bombChance + 0.08) type = 'golden'
      else if (roll < bombChance + 0.08 + 0.15) type = 'cloud'
      else if (roll < bombChance + 0.08 + 0.15 + 0.1) type = 'pepper'

      g.items.push({
        x: ITEM_SIZE / 2 + Math.random() * (W - ITEM_SIZE),
        y: -ITEM_SIZE,
        type,
        speed: g.fallSpeed + Math.random() * 1.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
      })
    }

    const addCatchFx = (x: number, y: number, text: string, color: string) => {
      gRef.current.effects.push({ x, y, text, color, alpha: 1, vy: -2 })
    }

    const addParticles = (x: number, y: number, color: string, count: number) => {
      const g = gRef.current
      for (let i = 0; i < count; i++) {
        g.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 4 - 1,
          alpha: 1,
          size: 2 + Math.random() * 4,
          color,
        })
      }
    }

    const loop = (ts: number) => {
      const dt = Math.min(ts - (prevTs || ts), 33)
      prevTs = ts
      const g = gRef.current

      // Shake offset
      let shakeX = 0, shakeY = 0
      if (g.shakeTimer > 0) {
        g.shakeTimer -= dt
        shakeX = (Math.random() - 0.5) * 6
        shakeY = (Math.random() - 0.5) * 6
      }

      ctx.save()
      ctx.translate(shakeX, shakeY)
      ctx.clearRect(-10, -10, W + 20, H + 20)

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#010d04')
      grad.addColorStop(1, '#0a1410')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Fever mode background glow
      if (g.feverMode) {
        ctx.fillStyle = `rgba(34,197,94,${0.05 + Math.sin(ts / 200) * 0.03})`
        ctx.fillRect(0, 0, W, H)
      }

      // Particles
      g.particles = g.particles.filter(p => p.alpha > 0.01)
      g.particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1
        p.alpha -= 0.02
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Effects
      g.effects = g.effects.filter(e => e.alpha > 0.01)
      g.effects.forEach(e => {
        e.y += e.vy
        e.alpha -= 0.015
        ctx.save()
        ctx.globalAlpha = e.alpha
        ctx.fillStyle = e.color
        ctx.font = 'bold 18px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(e.text, e.x, e.y)
        ctx.restore()
      })

      if (phaseRef.current === 'menu') {
        ctx.fillStyle = '#22c55e'
        ctx.font = 'bold 34px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('🧺 Toot Catcher', W / 2, H / 2 - 80)
        ctx.fillStyle = '#d0e6d9'
        ctx.font = '15px monospace'
        ctx.fillText('Catch beans 🫘, clouds 💨 & peppers 🌶️', W / 2, H / 2 - 35)
        ctx.fillText('Avoid bombs 💣 — they cost a life!', W / 2, H / 2 - 10)
        ctx.fillText('Catch golden stars ⭐ for 50pts!', W / 2, H / 2 + 15)
        ctx.fillText('Build combos for FEVER MODE!', W / 2, H / 2 + 40)
        ctx.fillStyle = '#4ade80'
        ctx.font = 'bold 20px monospace'
        ctx.fillText('Click / Tap to Start', W / 2, H / 2 + 90)
        ctx.fillStyle = '#9bb0a3'
        ctx.font = '13px monospace'
        ctx.fillText('Move: Mouse / Touch / Arrow keys', W / 2, H / 2 + 125)
        ctx.restore()
        raf = requestAnimationFrame(loop)
        return
      }

      if (phaseRef.current === 'playing') {
        // Fever mode
        if (g.feverMode) {
          g.feverTimer -= dt
          if (g.feverTimer <= 0) {
            g.feverMode = false
          }
        }

        // Spawn items
        if (ts - g.lastSpawn > g.spawnInterval) {
          g.lastSpawn = ts
          spawnItem()
          if (g.feverMode) spawnItem() // Double spawn in fever
        }

        // Level progression
        const newLevel = Math.floor(g.itemsCaught / 10) + 1
        if (newLevel !== g.level) {
          g.level = newLevel
          g.spawnInterval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_BASE - newLevel * 50)
          g.fallSpeed = Math.min(FALL_SPEED_MAX, FALL_SPEED_BASE + newLevel * 0.3)
        }

        // Update & draw items
        const basketLeft = g.basketX
        const basketRight = g.basketX + BASKET_W
        const basketTop = H - BASKET_H - 20

        g.items = g.items.filter(item => {
          item.y += item.speed
          item.wobble += item.wobbleSpeed
          const drawX = item.x + Math.sin(item.wobble) * 15

          // Check catch
          if (item.y + ITEM_SIZE / 2 >= basketTop && item.y - ITEM_SIZE / 2 <= basketTop + BASKET_H) {
            if (drawX >= basketLeft && drawX <= basketRight) {
              const conf = ITEM_CONFIG[item.type]
              if (item.type === 'bomb') {
                g.lives--
                g.combo = 0
                g.shakeTimer = 300
                addCatchFx(drawX, basketTop - 10, '💥 -1 Life!', '#ef4444')
                addParticles(drawX, basketTop, '#ef4444', 12)
                if (g.lives <= 0) {
                  phaseRef.current = 'over'
                  setPhase('over')
                  if (g.score > g.highScore) g.highScore = g.score
                  submitScore(g.score)
                }
              } else {
                const multiplier = g.feverMode ? 2 : 1
                const pts = conf.points * multiplier
                g.score += pts
                g.itemsCaught++
                g.combo++
                if (g.combo > g.maxCombo) g.maxCombo = g.combo
                const comboText = g.combo > 3 ? ` x${g.combo}` : ''
                addCatchFx(drawX, basketTop - 10, `+${pts}${comboText}`, conf.color)
                addParticles(drawX, basketTop, conf.color, 6)
                // Activate fever at combo 10
                if (g.combo >= 10 && !g.feverMode) {
                  g.feverMode = true
                  g.feverTimer = 5000
                  addCatchFx(W / 2, H / 2, '🔥 FEVER MODE! 2x Points!', '#FFD700')
                }
              }
              return false // Remove caught item
            }
          }

          // Missed item (fell off screen)
          if (item.y > H + ITEM_SIZE) {
            if (item.type !== 'bomb') {
              g.combo = 0 // Break combo for missed good items
            }
            return false
          }

          // Draw item
          ctx.save()
          ctx.font = `${ITEM_SIZE}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          // Glow for golden
          if (item.type === 'golden') {
            ctx.shadowColor = '#FFD700'
            ctx.shadowBlur = 12
          }
          ctx.fillText(ITEM_CONFIG[item.type].emoji, drawX, item.y)
          ctx.restore()
          return true
        })

        // Draw basket
        const bx = g.basketX
        const by = basketTop
        ctx.save()
        // Basket body
        const basketGrad = ctx.createLinearGradient(bx, by, bx, by + BASKET_H)
        basketGrad.addColorStop(0, g.feverMode ? '#FFD700' : '#8B6914')
        basketGrad.addColorStop(1, g.feverMode ? '#FFA500' : '#654A0E')
        ctx.fillStyle = basketGrad
        ctx.beginPath()
        ctx.moveTo(bx + 5, by)
        ctx.lineTo(bx + BASKET_W - 5, by)
        ctx.lineTo(bx + BASKET_W - 12, by + BASKET_H)
        ctx.lineTo(bx + 12, by + BASKET_H)
        ctx.closePath()
        ctx.fill()
        // Rim
        ctx.strokeStyle = g.feverMode ? '#FFD700' : '#A0822A'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + BASKET_W, by)
        ctx.stroke()
        // Weave pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1
        for (let i = 0; i < 4; i++) {
          const ly = by + 8 + i * 8
          ctx.beginPath()
          ctx.moveTo(bx + 8, ly)
          ctx.lineTo(bx + BASKET_W - 8, ly)
          ctx.stroke()
        }
        ctx.restore()

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.fillRect(0, 0, W, 50)

        ctx.fillStyle = '#4ade80'
        ctx.font = 'bold 16px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`Score: ${g.score}`, 10, 22)

        ctx.textAlign = 'center'
        ctx.fillStyle = '#d0e6d9'
        ctx.font = '14px monospace'
        ctx.fillText(`Level ${g.level}`, W / 2, 22)

        // Lives
        ctx.textAlign = 'right'
        ctx.font = '16px monospace'
        let livesStr = ''
        for (let i = 0; i < LIVES_MAX; i++) {
          livesStr += i < g.lives ? '❤️' : '🖤'
        }
        ctx.fillText(livesStr, W - 10, 22)

        // Combo
        if (g.combo > 2) {
          ctx.textAlign = 'left'
          ctx.fillStyle = g.feverMode ? '#FFD700' : '#f59e0b'
          ctx.font = 'bold 13px monospace'
          ctx.fillText(`🔥 Combo: ${g.combo}`, 10, 44)
        }

        // Fever bar
        if (g.feverMode) {
          const barW = 150
          const barH = 6
          const barX = W / 2 - barW / 2
          const barY = 38
          const fill = g.feverTimer / 5000
          ctx.fillStyle = 'rgba(0,0,0,0.4)'
          ctx.fillRect(barX, barY, barW, barH)
          ctx.fillStyle = '#FFD700'
          ctx.fillRect(barX, barY, barW * fill, barH)
          ctx.fillStyle = '#FFD700'
          ctx.font = 'bold 11px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('FEVER!', W / 2, barY + barH + 12)
        }

        ctx.textAlign = 'right'
        ctx.fillStyle = '#9bb0a3'
        ctx.font = '12px monospace'
        ctx.fillText(`Best: ${g.highScore}`, W - 10, 44)
      }

      if (phaseRef.current === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.fillRect(0, 0, W, H)

        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 32px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('💥 Game Over!', W / 2, H / 2 - 70)

        ctx.fillStyle = '#f8fef9'
        ctx.font = '20px monospace'
        ctx.fillText(`Score: ${g.score}`, W / 2, H / 2 - 25)
        ctx.fillText(`Items Caught: ${g.itemsCaught}`, W / 2, H / 2 + 5)
        ctx.fillText(`Max Combo: ${g.maxCombo}`, W / 2, H / 2 + 35)
        ctx.fillText(`Level: ${g.level}`, W / 2, H / 2 + 65)

        if (g.score >= g.highScore && g.score > 0) {
          ctx.fillStyle = '#FFD700'
          ctx.font = 'bold 18px monospace'
          ctx.fillText('🏆 New High Score!', W / 2, H / 2 + 100)
        }

        ctx.fillStyle = '#4ade80'
        ctx.font = 'bold 16px monospace'
        ctx.fillText('Click / Tap to Retry', W / 2, H / 2 + 140)
      }

      ctx.restore()
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [submitScore])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', background: '#010d04',
      padding: '1rem', gap: '1rem',
    }}>
      <button onClick={onBack} style={{
        background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
        color: '#4ade80', padding: '0.5rem 1.2rem', borderRadius: 8, cursor: 'pointer',
        fontSize: '0.95rem', fontWeight: 600,
      }}>← Back to Games</button>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 12, border: '2px solid rgba(34,197,94,0.3)',
          maxWidth: '100%', touchAction: 'none',
        }}
      />
    </div>
  )
}
