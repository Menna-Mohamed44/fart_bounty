'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'

const W = 480
const H = 520
const ROWS = 4
const COLS = 5
const CELL_W = W / COLS
const CELL_H = (H - 80) / ROWS
const ROUND_TIME = 30
const MOLE_SHOW_MIN = 600
const MOLE_SHOW_MAX = 1400

interface Mole {
  row: number
  col: number
  appear: number
  duration: number
  hit: boolean
  type: 'normal' | 'golden' | 'stinky'
}

interface CloudFx {
  x: number
  y: number
  size: number
  alpha: number
  color: string
}

const CLOUD_COLORS = ['#7ec850', '#a3d977', '#5b9e2d', '#c4e89a']

export default function GasBlaster({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'menu' | 'playing' | 'over'>('menu')
  const phaseRef = useRef<'menu' | 'playing' | 'over'>('menu')
  const { user } = useAuth()

  const gRef = useRef({
    score: 0,
    highScore: 0,
    timeLeft: ROUND_TIME,
    combo: 0,
    maxCombo: 0,
    moles: [] as Mole[],
    clouds: [] as CloudFx[],
    lastSpawn: 0,
    spawnInterval: 900,
    misses: 0,
  })

  const playPop = useCallback(() => {
    try {
      const ac = new AudioContext()
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = 'square'
      o.frequency.setValueAtTime(200 + Math.random() * 100, ac.currentTime)
      o.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.15)
      g.gain.setValueAtTime(0.1, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15)
      o.connect(g).connect(ac.destination)
      o.start()
      o.stop(ac.currentTime + 0.15)
    } catch { /* */ }
  }, [])

  const startGame = useCallback(() => {
    const g = gRef.current
    g.score = 0
    g.timeLeft = ROUND_TIME
    g.combo = 0
    g.maxCombo = 0
    g.moles = []
    g.clouds = []
    g.lastSpawn = Date.now()
    g.spawnInterval = 900
    g.misses = 0
    phaseRef.current = 'playing'
    setPhase('playing')
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('gasblaster-high')
    if (saved) gRef.current.highScore = parseInt(saved, 10) || 0
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (phaseRef.current === 'menu' || phaseRef.current === 'over') startGame()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [startGame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let lastTime = Date.now()
    let timerAccum = 0

    const handleClick = (e: MouseEvent) => {
      if (phaseRef.current === 'menu') { startGame(); return }
      if (phaseRef.current === 'over') { startGame(); return }
      if (phaseRef.current !== 'playing') return

      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      const scaleY = H / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top) * scaleY

      const g = gRef.current
      let gotHit = false

      for (const mole of g.moles) {
        if (mole.hit) continue
        const cx = mole.col * CELL_W + CELL_W / 2
        const cy = 80 + mole.row * CELL_H + CELL_H / 2
        const dist = Math.hypot(mx - cx, my - cy)
        if (dist < CELL_W * 0.38) {
          mole.hit = true
          gotHit = true
          g.combo++
          if (g.combo > g.maxCombo) g.maxCombo = g.combo

          let pts = 10
          if (mole.type === 'golden') pts = 30
          else if (mole.type === 'stinky') pts = -15
          pts += Math.min(g.combo, 10) * 2

          g.score = Math.max(0, g.score + pts)

          const color = mole.type === 'stinky' ? '#a855f7' : mole.type === 'golden' ? '#fbbf24' : '#16a34a'
          for (let i = 0; i < 8; i++) {
            g.clouds.push({
              x: cx + (Math.random() - 0.5) * 20,
              y: cy + (Math.random() - 0.5) * 20,
              size: 8 + Math.random() * 16,
              alpha: 1,
              color: mole.type === 'stinky' ? '#a855f7' : CLOUD_COLORS[Math.floor(Math.random() * CLOUD_COLORS.length)],
            })
          }
          playPop()
          break
        }
      }
      if (!gotHit) {
        g.combo = 0
        g.misses++
      }
    }

    canvas.addEventListener('click', handleClick)

    const loop = () => {
      const now = Date.now()
      const dt = now - lastTime
      lastTime = now
      const g = gRef.current

      if (phaseRef.current === 'playing') {
        timerAccum += dt
        while (timerAccum >= 1000) {
          timerAccum -= 1000
          g.timeLeft--
          if (g.timeLeft <= 0) {
            g.timeLeft = 0
            if (g.score > g.highScore) {
              g.highScore = g.score
              localStorage.setItem('gasblaster-high', String(g.score))
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
            phaseRef.current = 'over'
            setPhase('over')
          }
        }

        if (now - g.lastSpawn > g.spawnInterval && phaseRef.current === 'playing') {
          g.lastSpawn = now
          g.spawnInterval = Math.max(400, 900 - g.score * 2)

          let row: number, col: number
          let attempts = 0
          do {
            row = Math.floor(Math.random() * ROWS)
            col = Math.floor(Math.random() * COLS)
            attempts++
          } while (g.moles.some((m) => !m.hit && m.row === row && m.col === col) && attempts < 20)

          const typeRoll = Math.random()
          let type: Mole['type'] = 'normal'
          if (typeRoll < 0.1) type = 'golden'
          else if (typeRoll < 0.22) type = 'stinky'

          g.moles.push({
            row, col, appear: now,
            duration: MOLE_SHOW_MIN + Math.random() * (MOLE_SHOW_MAX - MOLE_SHOW_MIN),
            hit: false, type,
          })
        }

        g.moles = g.moles.filter((m) => {
          if (m.hit) return now - m.appear < m.duration + 200
          if (now - m.appear > m.duration) {
            if (m.type !== 'stinky') {
              g.combo = 0
            }
            return false
          }
          return true
        })
      }

      g.clouds = g.clouds.filter((c) => {
        c.alpha -= 0.025
        c.size += 0.5
        c.y -= 0.6
        return c.alpha > 0
      })

      ctx.fillStyle = '#0a0e14'
      ctx.fillRect(0, 0, W, H)

      ctx.fillStyle = '#16a34a'
      ctx.font = 'bold 18px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`Score: ${g.score}`, 12, 30)
      ctx.textAlign = 'center'
      if (g.combo > 1) {
        ctx.fillStyle = '#fbbf24'
        ctx.fillText(`Combo x${g.combo}`, W / 2, 30)
      }
      ctx.textAlign = 'right'
      ctx.fillStyle = g.timeLeft <= 5 ? '#ef4444' : '#fff'
      ctx.fillText(`Time: ${g.timeLeft}s`, W - 12, 30)
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '13px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`Best: ${g.highScore}`, W - 12, 52)
      ctx.textAlign = 'left'

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cx = c * CELL_W + CELL_W / 2
          const cy = 80 + r * CELL_H + CELL_H / 2
          ctx.strokeStyle = 'rgba(22,163,74,0.15)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(cx, cy, CELL_W * 0.32, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      const now2 = Date.now()
      for (const m of g.moles) {
        const cx = m.col * CELL_W + CELL_W / 2
        const cy = 80 + m.row * CELL_H + CELL_H / 2
        const elapsed = now2 - m.appear
        const lifeRatio = Math.min(elapsed / m.duration, 1)
        let scale = 1

        if (elapsed < 100) scale = elapsed / 100
        if (m.hit) {
          scale = Math.max(0, 1 - (elapsed - m.appear) / 200) * 1.3
        } else if (lifeRatio > 0.75) {
          scale = 1 - (lifeRatio - 0.75) * 2
        }

        if (scale <= 0) continue

        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(scale, scale)

        const baseColor = m.type === 'golden' ? '#fbbf24' : m.type === 'stinky' ? '#a855f7' : '#16a34a'
        const darkColor = m.type === 'golden' ? '#b8860b' : m.type === 'stinky' ? '#7c3aed' : '#0f7a2e'

        ctx.fillStyle = darkColor
        ctx.beginPath()
        ctx.ellipse(0, 4, 22, 18, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = baseColor
        ctx.shadowColor = baseColor
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.ellipse(0, -2, 20, 22, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.ellipse(-7, -8, 5, 6, 0, 0, Math.PI * 2)
        ctx.ellipse(7, -8, 5, 6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#111'
        ctx.beginPath()
        ctx.arc(-7, -7, 2.5, 0, Math.PI * 2)
        ctx.arc(7, -7, 2.5, 0, Math.PI * 2)
        ctx.fill()

        if (m.type === 'stinky') {
          ctx.strokeStyle = '#a855f7'
          ctx.lineWidth = 2
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath()
            ctx.moveTo(i * 8, -26)
            ctx.quadraticCurveTo(i * 8 + 4, -33, i * 8, -38)
            ctx.stroke()
          }
          ctx.fillStyle = '#111'
          ctx.beginPath()
          ctx.arc(0, 6, 5, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.strokeStyle = '#111'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(0, 4, 6, 0.2, Math.PI - 0.2)
          ctx.stroke()
        }

        if (m.type === 'golden') {
          ctx.fillStyle = '#fbbf24'
          ctx.font = 'bold 10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('x3', 0, 18)
          ctx.textAlign = 'left'
        }

        if (m.hit) {
          ctx.fillStyle = `rgba(255,255,255,${scale * 0.5})`
          ctx.beginPath()
          ctx.arc(0, 0, 30, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      }

      for (const c of g.clouds) {
        ctx.globalAlpha = c.alpha * 0.6
        ctx.fillStyle = c.color
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (phaseRef.current === 'menu') {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.fillRect(0, 0, W, H)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#16a34a'
        ctx.font = 'bold 36px sans-serif'
        ctx.fillText('GAS BLASTER', W / 2, H / 2 - 70)
        ctx.fillStyle = '#fbbf24'
        ctx.font = '16px monospace'
        ctx.fillText('Click the fart clouds to score!', W / 2, H / 2 - 20)
        ctx.fillStyle = '#a855f7'
        ctx.fillText('Avoid stinky purple ones (-15pts)', W / 2, H / 2 + 10)
        ctx.fillStyle = '#fbbf24'
        ctx.fillText('Golden ones are worth x3!', W / 2, H / 2 + 40)
        ctx.fillStyle = '#16a34a'
        ctx.font = 'bold 20px sans-serif'
        ctx.fillText('Click or press ENTER to start', W / 2, H / 2 + 90)
        ctx.textAlign = 'left'
      }

      if (phaseRef.current === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'
        ctx.fillRect(0, 0, W, H)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 34px sans-serif'
        ctx.fillText("TIME'S UP!", W / 2, H / 2 - 70)
        ctx.fillStyle = '#fff'
        ctx.font = '22px monospace'
        ctx.fillText(`Score: ${g.score}`, W / 2, H / 2 - 25)
        ctx.fillStyle = '#fbbf24'
        ctx.font = '16px monospace'
        ctx.fillText(`Max Combo: x${g.maxCombo}`, W / 2, H / 2 + 5)
        if (g.score >= g.highScore && g.score > 0) {
          ctx.fillStyle = '#fbbf24'
          ctx.font = 'bold 18px sans-serif'
          ctx.fillText('NEW HIGH SCORE!', W / 2, H / 2 + 40)
        }
        ctx.fillStyle = '#16a34a'
        ctx.font = 'bold 18px sans-serif'
        ctx.fillText('Click or press ENTER to retry', W / 2, H / 2 + 80)
        ctx.textAlign = 'left'
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('click', handleClick)
    }
  }, [playPop, startGame])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: W }}>
        <button
          onClick={onBack}
          style={{
            background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
            padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, color: '#fff', flex: 1, textAlign: 'center' }}>Gas Blaster</h2>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ borderRadius: 12, border: '2px solid rgba(22,163,74,0.4)', maxWidth: '100%', height: 'auto', cursor: 'crosshair' }}
        tabIndex={0}
      />
    </div>
  )
}
