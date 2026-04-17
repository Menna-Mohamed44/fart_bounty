'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'

const W = 480
const H = 480
const CELL = 20
const COLS = W / CELL
const ROWS = H / CELL
const TICK_BASE = 120
const TICK_MIN = 60

interface Pos { x: number; y: number }
interface FartCloud { x: number; y: number; alpha: number; size: number }

const BEAN_COLORS = ['#8B4513', '#D2691E', '#CD853F', '#A0522D', '#F4A460']
const CLOUD_COLORS = ['#7ec850', '#a3d977', '#5b9e2d', '#c4e89a', '#8fd45e']

export default function StinkySnake({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'menu' | 'playing' | 'over'>('menu')
  const phaseRef = useRef<'menu' | 'playing' | 'over'>('menu')
  const { user } = useAuth()

  const gRef = useRef({
    snake: [{ x: 10, y: 12 }] as Pos[],
    dir: { x: 1, y: 0 } as Pos,
    nextDir: { x: 1, y: 0 } as Pos,
    bean: { x: 15, y: 12 } as Pos,
    goldenBean: null as Pos | null,
    goldenTimer: 0,
    score: 0,
    highScore: 0,
    clouds: [] as FartCloud[],
    lastTick: 0,
    tickSpeed: TICK_BASE,
    beansEaten: 0,
    combo: 0,
  })

  const spawnBean = useCallback(() => {
    const g = gRef.current
    let pos: Pos
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
    } while (g.snake.some(s => s.x === pos.x && s.y === pos.y))
    g.bean = pos
  }, [])

  const spawnGolden = useCallback(() => {
    const g = gRef.current
    if (g.goldenBean) return
    let pos: Pos
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
    } while (
      g.snake.some(s => s.x === pos.x && s.y === pos.y) ||
      (g.bean.x === pos.x && g.bean.y === pos.y)
    )
    g.goldenBean = pos
    g.goldenTimer = 5000
  }, [])

  const startGame = useCallback(() => {
    const g = gRef.current
    g.snake = [{ x: 10, y: 12 }, { x: 9, y: 12 }, { x: 8, y: 12 }]
    g.dir = { x: 1, y: 0 }
    g.nextDir = { x: 1, y: 0 }
    g.score = 0
    g.clouds = []
    g.lastTick = 0
    g.tickSpeed = TICK_BASE
    g.beansEaten = 0
    g.combo = 0
    g.goldenBean = null
    g.goldenTimer = 0
    spawnBean()
    phaseRef.current = 'playing'
    setPhase('playing')
  }, [spawnBean])

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current === 'menu') {
        if (e.key === ' ' || e.key === 'Enter') { startGame(); e.preventDefault() }
        return
      }
      if (phaseRef.current === 'over') {
        if (e.key === ' ' || e.key === 'Enter') { startGame(); e.preventDefault() }
        return
      }
      const g = gRef.current
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (g.dir.y !== 1) g.nextDir = { x: 0, y: -1 }; e.preventDefault(); break
        case 'ArrowDown': case 's': case 'S':
          if (g.dir.y !== -1) g.nextDir = { x: 0, y: 1 }; e.preventDefault(); break
        case 'ArrowLeft': case 'a': case 'A':
          if (g.dir.x !== 1) g.nextDir = { x: -1, y: 0 }; e.preventDefault(); break
        case 'ArrowRight': case 'd': case 'D':
          if (g.dir.x !== -1) g.nextDir = { x: 1, y: 0 }; e.preventDefault(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [startGame])

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let touchStart: { x: number; y: number } | null = null

    const onTouchStart = (e: TouchEvent) => {
      if (phaseRef.current !== 'playing') {
        startGame()
        e.preventDefault()
        return
      }
      const t = e.touches[0]
      touchStart = { x: t.clientX, y: t.clientY }
      e.preventDefault()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart || phaseRef.current !== 'playing') return
      const t = e.changedTouches[0]
      const dx = t.clientX - touchStart.x
      const dy = t.clientY - touchStart.y
      const g = gRef.current
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20 && g.dir.x !== -1) g.nextDir = { x: 1, y: 0 }
        else if (dx < -20 && g.dir.x !== 1) g.nextDir = { x: -1, y: 0 }
      } else {
        if (dy > 20 && g.dir.y !== -1) g.nextDir = { x: 0, y: 1 }
        else if (dy < -20 && g.dir.y !== 1) g.nextDir = { x: 0, y: -1 }
      }
      touchStart = null
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [startGame])

  // Submit score
  const submitScore = useCallback(async (score: number) => {
    if (!user || score === 0) return
    try {
      const supabase = createClient()
      await (supabase as any).rpc('submit_game_score', {
        p_user_id: user.id,
        p_game_id: 'stinky-snake',
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

    const drawCloud = (cloud: FartCloud) => {
      ctx.save()
      ctx.globalAlpha = cloud.alpha
      ctx.fillStyle = CLOUD_COLORS[Math.floor(Math.random() * CLOUD_COLORS.length)]
      ctx.beginPath()
      ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawBean = (pos: Pos, golden: boolean) => {
      const cx = pos.x * CELL + CELL / 2
      const cy = pos.y * CELL + CELL / 2
      ctx.save()
      if (golden) {
        ctx.fillStyle = '#FFD700'
        ctx.shadowColor = '#FFD700'
        ctx.shadowBlur = 10
      } else {
        ctx.fillStyle = BEAN_COLORS[Math.floor(Math.random() * BEAN_COLORS.length)]
      }
      // Bean shape (oval)
      ctx.beginPath()
      ctx.ellipse(cx, cy, CELL * 0.35, CELL * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      // Tiny highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.beginPath()
      ctx.ellipse(cx - 2, cy - 3, 3, 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const loop = (ts: number) => {
      const g = gRef.current
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = '#0a1410'
      ctx.fillRect(0, 0, W, H)
      // Grid
      ctx.strokeStyle = 'rgba(34,197,94,0.08)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y <= H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Clouds (background)
      g.clouds = g.clouds.filter(c => c.alpha > 0.01)
      g.clouds.forEach(c => {
        c.alpha -= 0.003
        c.size += 0.15
        drawCloud(c)
      })

      if (phaseRef.current === 'menu') {
        ctx.fillStyle = '#22c55e'
        ctx.font = 'bold 36px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('🐍 Stinky Snake', W / 2, H / 2 - 60)
        ctx.fillStyle = '#d0e6d9'
        ctx.font = '16px monospace'
        ctx.fillText('Eat beans, grow longer, leave fart trails!', W / 2, H / 2 - 20)
        ctx.fillText('Golden beans = 5x points (limited time)', W / 2, H / 2 + 10)
        ctx.fillStyle = '#4ade80'
        ctx.font = 'bold 20px monospace'
        ctx.fillText('Press ENTER or Tap to Start', W / 2, H / 2 + 60)
        ctx.fillStyle = '#9bb0a3'
        ctx.font = '13px monospace'
        ctx.fillText('Arrow keys / WASD / Swipe to move', W / 2, H / 2 + 100)
        raf = requestAnimationFrame(loop)
        return
      }

      if (phaseRef.current === 'playing') {
        // Golden bean timer
        if (g.goldenBean) {
          g.goldenTimer -= 16
          if (g.goldenTimer <= 0) {
            g.goldenBean = null
          }
        }
        // Random golden bean spawn
        if (!g.goldenBean && g.beansEaten > 0 && g.beansEaten % 7 === 0 && Math.random() < 0.02) {
          spawnGolden()
        }

        // Tick (move snake)
        if (ts - g.lastTick >= g.tickSpeed) {
          g.lastTick = ts
          g.dir = { ...g.nextDir }

          const head = g.snake[0]
          const newHead: Pos = {
            x: head.x + g.dir.x,
            y: head.y + g.dir.y,
          }

          // Wall collision
          if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
            phaseRef.current = 'over'
            setPhase('over')
            if (g.score > g.highScore) g.highScore = g.score
            submitScore(g.score)
            raf = requestAnimationFrame(loop)
            return
          }

          // Self collision
          if (g.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            phaseRef.current = 'over'
            setPhase('over')
            if (g.score > g.highScore) g.highScore = g.score
            submitScore(g.score)
            raf = requestAnimationFrame(loop)
            return
          }

          g.snake.unshift(newHead)

          // Eat regular bean
          let ate = false
          if (newHead.x === g.bean.x && newHead.y === g.bean.y) {
            g.score += 10
            g.beansEaten++
            g.combo++
            if (g.combo > 1) g.score += g.combo * 2
            spawnBean()
            ate = true
            g.tickSpeed = Math.max(TICK_MIN, TICK_BASE - g.beansEaten * 2)
          }
          // Eat golden bean
          if (g.goldenBean && newHead.x === g.goldenBean.x && newHead.y === g.goldenBean.y) {
            g.score += 50
            g.beansEaten++
            g.goldenBean = null
            ate = true
          }

          if (!ate) {
            const tail = g.snake.pop()!
            // Leave fart cloud at tail
            g.clouds.push({
              x: tail.x * CELL + CELL / 2,
              y: tail.y * CELL + CELL / 2,
              alpha: 0.5,
              size: CELL * 0.6,
            })
          } else {
            // Burst of clouds when eating
            for (let i = 0; i < 4; i++) {
              g.clouds.push({
                x: newHead.x * CELL + CELL / 2 + (Math.random() - 0.5) * CELL * 2,
                y: newHead.y * CELL + CELL / 2 + (Math.random() - 0.5) * CELL * 2,
                alpha: 0.7,
                size: CELL * 0.4 + Math.random() * CELL * 0.5,
              })
            }
          }
        }

        // Draw beans
        drawBean(g.bean, false)
        if (g.goldenBean) drawBean(g.goldenBean, true)

        // Draw snake
        g.snake.forEach((seg, i) => {
          const cx = seg.x * CELL + CELL / 2
          const cy = seg.y * CELL + CELL / 2
          const isHead = i === 0

          if (isHead) {
            // Head
            ctx.fillStyle = '#22c55e'
            ctx.shadowColor = '#22c55e'
            ctx.shadowBlur = 8
            ctx.beginPath()
            ctx.arc(cx, cy, CELL * 0.5, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0
            // Eyes
            const eyeOffX = g.dir.x * 4
            const eyeOffY = g.dir.y * 4
            ctx.fillStyle = '#fff'
            ctx.beginPath()
            ctx.arc(cx + eyeOffX - 3, cy + eyeOffY - 2, 3, 0, Math.PI * 2)
            ctx.arc(cx + eyeOffX + 3, cy + eyeOffY - 2, 3, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#111'
            ctx.beginPath()
            ctx.arc(cx + eyeOffX - 3, cy + eyeOffY - 2, 1.5, 0, Math.PI * 2)
            ctx.arc(cx + eyeOffX + 3, cy + eyeOffY - 2, 1.5, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // Body - gradient from green to brown
            const pct = i / g.snake.length
            const r = Math.floor(34 + pct * 100)
            const gr = Math.floor(197 - pct * 100)
            const b = Math.floor(94 - pct * 50)
            ctx.fillStyle = `rgb(${r},${gr},${b})`
            ctx.beginPath()
            ctx.arc(cx, cy, CELL * 0.45 - pct * 2, 0, Math.PI * 2)
            ctx.fill()
          }
        })

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, 0, W, 28)
        ctx.fillStyle = '#4ade80'
        ctx.font = 'bold 14px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`Score: ${g.score}`, 10, 19)
        ctx.textAlign = 'center'
        ctx.fillText(`Length: ${g.snake.length}`, W / 2, 19)
        ctx.textAlign = 'right'
        ctx.fillText(`Best: ${g.highScore}`, W - 10, 19)
        if (g.goldenBean && g.goldenTimer > 0) {
          ctx.textAlign = 'center'
          ctx.fillStyle = '#FFD700'
          ctx.font = 'bold 12px monospace'
          ctx.fillText(`⭐ Golden: ${(g.goldenTimer / 1000).toFixed(1)}s`, W / 2, 44)
        }
      }

      if (phaseRef.current === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 32px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('💀 Game Over!', W / 2, H / 2 - 50)
        ctx.fillStyle = '#f8fef9'
        ctx.font = '20px monospace'
        ctx.fillText(`Score: ${g.score}`, W / 2, H / 2)
        ctx.fillText(`Length: ${g.snake.length}`, W / 2, H / 2 + 30)
        if (g.score >= g.highScore && g.score > 0) {
          ctx.fillStyle = '#FFD700'
          ctx.font = 'bold 18px monospace'
          ctx.fillText('🏆 New High Score!', W / 2, H / 2 + 65)
        }
        ctx.fillStyle = '#4ade80'
        ctx.font = 'bold 16px monospace'
        ctx.fillText('Press ENTER or Tap to Retry', W / 2, H / 2 + 105)
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [spawnBean, spawnGolden, submitScore])

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
