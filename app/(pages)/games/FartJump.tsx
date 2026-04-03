'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'

const CANVAS_W = 480
const CANVAS_H = 640
const GRAVITY = 0.35
const FART_POWER = -9
const PLATFORM_W = 70
const PLATFORM_H = 14
const PLAYER_W = 32
const PLAYER_H = 32
const PLATFORM_COUNT = 8
const SCROLL_THRESHOLD = CANVAS_H * 0.35

interface Platform {
  x: number
  y: number
  w: number
  type: 'normal' | 'breaking' | 'moving'
  dx: number
  broken: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

const FART_COLORS = ['#7ec850', '#a3d977', '#5b9e2d', '#c4e89a', '#8fd45e']

function makePlatform(y: number, score: number): Platform {
  const difficulty = Math.min(score / 3000, 1)
  const typeRoll = Math.random()
  let type: Platform['type'] = 'normal'
  if (typeRoll < difficulty * 0.25) type = 'breaking'
  else if (typeRoll < difficulty * 0.4) type = 'moving'

  return {
    x: Math.random() * (CANVAS_W - PLATFORM_W),
    y,
    w: PLATFORM_W + Math.random() * 20 - 10,
    type,
    dx: type === 'moving' ? (Math.random() > 0.5 ? 1.5 : -1.5) : 0,
    broken: false,
  }
}

export default function FartJump({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'over'>('menu')
  const [finalScore, setFinalScore] = useState(0)
  const stateRef = useRef<'menu' | 'playing' | 'over'>('menu')
  const { user } = useAuth()

  const gameRef = useRef({
    px: CANVAS_W / 2 - PLAYER_W / 2,
    py: CANVAS_H - 100,
    vx: 0,
    vy: 0,
    score: 0,
    highScore: 0,
    platforms: [] as Platform[],
    particles: [] as Particle[],
    keys: { left: false, right: false },
    fartCooldown: 0,
    facingRight: true,
  })

  const spawnParticles = useCallback((x: number, y: number, count: number) => {
    const g = gameRef.current
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 4 + 1,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        size: 4 + Math.random() * 8,
        color: FART_COLORS[Math.floor(Math.random() * FART_COLORS.length)],
      })
    }
  }, [])

  const playFartSound = useCallback(() => {
    try {
      const ac = new AudioContext()
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(80 + Math.random() * 60, ac.currentTime)
      osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.2)
      gain.gain.setValueAtTime(0.12, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25)
      osc.connect(gain).connect(ac.destination)
      osc.start()
      osc.stop(ac.currentTime + 0.25)
    } catch { /* audio not available */ }
  }, [])

  const startGame = useCallback(() => {
    const g = gameRef.current
    g.px = CANVAS_W / 2 - PLAYER_W / 2
    g.py = CANVAS_H - 100
    g.vx = 0
    g.vy = 0
    g.score = 0
    g.platforms = []
    g.particles = []
    g.fartCooldown = 0

    for (let i = 0; i < PLATFORM_COUNT; i++) {
      g.platforms.push(makePlatform(CANVAS_H - 60 - i * (CANVAS_H / PLATFORM_COUNT), 0))
    }
    g.platforms[0].x = g.px - 10
    g.platforms[0].type = 'normal'

    stateRef.current = 'playing'
    setGameState('playing')
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('fartjump-high')
    if (saved) gameRef.current.highScore = parseInt(saved, 10) || 0
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const g = gameRef.current
      if (e.key === 'ArrowLeft' || e.key === 'a') g.keys.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') g.keys.right = true
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && stateRef.current === 'playing') {
        if (g.fartCooldown <= 0) {
          g.vy = FART_POWER
          g.fartCooldown = 18
          spawnParticles(g.px + PLAYER_W / 2, g.py + PLAYER_H, 12)
          playFartSound()
        }
      }
      if (e.key === 'Enter') {
        if (stateRef.current === 'menu') startGame()
        else if (stateRef.current === 'over') startGame()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      const g = gameRef.current
      if (e.key === 'ArrowLeft' || e.key === 'a') g.keys.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') g.keys.right = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [spawnParticles, playFartSound, startGame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number

    const loop = () => {
      const g = gameRef.current

      if (stateRef.current === 'playing') {
        if (g.keys.left) { g.vx = -5; g.facingRight = false }
        else if (g.keys.right) { g.vx = 5; g.facingRight = true }
        else g.vx *= 0.85

        g.vy += GRAVITY
        g.px += g.vx
        g.py += g.vy
        if (g.fartCooldown > 0) g.fartCooldown--

        if (g.px < -PLAYER_W) g.px = CANVAS_W
        if (g.px > CANVAS_W) g.px = -PLAYER_W

        for (const p of g.platforms) {
          if (p.type === 'moving') {
            p.x += p.dx
            if (p.x < 0 || p.x + p.w > CANVAS_W) p.dx *= -1
          }
        }

        if (g.vy > 0) {
          for (const p of g.platforms) {
            if (p.broken) continue
            if (
              g.py + PLAYER_H >= p.y &&
              g.py + PLAYER_H <= p.y + PLATFORM_H + g.vy &&
              g.px + PLAYER_W > p.x &&
              g.px < p.x + p.w
            ) {
              if (p.type === 'breaking') {
                p.broken = true
                spawnParticles(p.x + p.w / 2, p.y, 6)
              } else {
                g.vy = -8.5
                spawnParticles(g.px + PLAYER_W / 2, g.py + PLAYER_H, 5)
                playFartSound()
              }
            }
          }
        }

        if (g.py < SCROLL_THRESHOLD) {
          const shift = SCROLL_THRESHOLD - g.py
          g.py = SCROLL_THRESHOLD
          g.score += Math.floor(shift)

          for (const p of g.platforms) p.y += shift

          g.platforms = g.platforms.filter((p) => p.y < CANVAS_H + 40)
          while (g.platforms.length < PLATFORM_COUNT) {
            const topY = Math.min(...g.platforms.map((p) => p.y))
            g.platforms.push(makePlatform(topY - 70 - Math.random() * 40, g.score))
          }

          for (const pt of g.particles) pt.y += shift
        }

        if (g.py > CANVAS_H + 50) {
          if (g.score > g.highScore) {
            g.highScore = g.score
            localStorage.setItem('fartjump-high', String(g.score))
          }
          if (user && g.score > 0) {
            const sb = createClient()
            ;(sb as any).rpc('increment_challenge_progress', {
              p_user_id: user.id,
              p_challenge_id: 'l5',
              p_period_key: null,
              p_amount: g.score,
            }).then(() => {}).catch(() => {})
          }
          setFinalScore(g.score)
          stateRef.current = 'over'
          setGameState('over')
        }
      }

      g.particles = g.particles.filter((pt) => {
        pt.x += pt.vx
        pt.y += pt.vy
        pt.life--
        return pt.life > 0
      })

      ctx.fillStyle = '#0a0e14'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      for (const pt of g.particles) {
        const alpha = pt.life / pt.maxLife
        ctx.globalAlpha = alpha * 0.7
        ctx.fillStyle = pt.color
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      for (const p of g.platforms) {
        if (p.broken) continue
        const colors: Record<string, string> = { normal: '#16a34a', breaking: '#ef4444', moving: '#3b82f6' }
        ctx.fillStyle = colors[p.type]
        ctx.shadowColor = colors[p.type]
        ctx.shadowBlur = 8
        const r = 6
        ctx.beginPath()
        ctx.moveTo(p.x + r, p.y)
        ctx.lineTo(p.x + p.w - r, p.y)
        ctx.quadraticCurveTo(p.x + p.w, p.y, p.x + p.w, p.y + r)
        ctx.lineTo(p.x + p.w, p.y + PLATFORM_H - r)
        ctx.quadraticCurveTo(p.x + p.w, p.y + PLATFORM_H, p.x + p.w - r, p.y + PLATFORM_H)
        ctx.lineTo(p.x + r, p.y + PLATFORM_H)
        ctx.quadraticCurveTo(p.x, p.y + PLATFORM_H, p.x, p.y + PLATFORM_H - r)
        ctx.lineTo(p.x, p.y + r)
        ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      if (stateRef.current === 'playing' || stateRef.current === 'over') {
        const cx = g.px + PLAYER_W / 2
        const cy = g.py + PLAYER_H / 2

        ctx.fillStyle = '#fbbf24'
        ctx.shadowColor = '#fbbf24'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(cx, cy - 4, 14, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.fillStyle = '#111'
        const eyeOff = g.facingRight ? 4 : -4
        ctx.beginPath()
        ctx.arc(cx + eyeOff - 3, cy - 8, 2.5, 0, Math.PI * 2)
        ctx.arc(cx + eyeOff + 5, cy - 8, 2.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#111'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx + eyeOff + 1, cy - 2, 5, 0.1, Math.PI - 0.1)
        ctx.stroke()
      }

      ctx.fillStyle = '#fff'
      ctx.font = '16px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`Score: ${g.score}`, 12, 28)
      ctx.textAlign = 'right'
      ctx.fillText(`Best: ${g.highScore}`, CANVAS_W - 12, 28)
      ctx.textAlign = 'left'

      if (stateRef.current === 'menu') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#16a34a'
        ctx.font = 'bold 38px sans-serif'
        ctx.fillText('FART JUMP', CANVAS_W / 2, CANVAS_H / 2 - 60)
        ctx.fillStyle = '#fbbf24'
        ctx.font = '18px monospace'
        ctx.fillText('Arrow keys / WASD to move', CANVAS_W / 2, CANVAS_H / 2)
        ctx.fillText('SPACE to fart-boost!', CANVAS_W / 2, CANVAS_H / 2 + 30)
        ctx.fillStyle = '#16a34a'
        ctx.font = 'bold 20px sans-serif'
        ctx.fillText('Press ENTER to start', CANVAS_W / 2, CANVAS_H / 2 + 80)
        ctx.textAlign = 'left'
      }

      if (stateRef.current === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 36px sans-serif'
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 50)
        ctx.fillStyle = '#fff'
        ctx.font = '22px monospace'
        ctx.fillText(`Score: ${g.score}`, CANVAS_W / 2, CANVAS_H / 2)
        if (g.score >= g.highScore && g.score > 0) {
          ctx.fillStyle = '#fbbf24'
          ctx.font = '18px sans-serif'
          ctx.fillText('NEW HIGH SCORE!', CANVAS_W / 2, CANVAS_H / 2 + 30)
        }
        ctx.fillStyle = '#16a34a'
        ctx.font = 'bold 18px sans-serif'
        ctx.fillText('Press ENTER to retry', CANVAS_W / 2, CANVAS_H / 2 + 70)
        ctx.textAlign = 'left'
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [spawnParticles, playFartSound])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: CANVAS_W }}>
        <button
          onClick={onBack}
          style={{
            background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
            padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, color: '#fff', flex: 1, textAlign: 'center' }}>Fart Jump</h2>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ borderRadius: 12, border: '2px solid rgba(22,163,74,0.4)', maxWidth: '100%', height: 'auto' }}
        tabIndex={0}
      />
    </div>
  )
}
