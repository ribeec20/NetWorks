import { useEffect, useRef } from 'react'
import type { ClusterPlan } from './clustering'

interface ClusterLegendProps {
  plan: ClusterPlan | null
  highlightKey?: string | null
}

export default function ClusterLegend({ plan, highlightKey }: ClusterLegendProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !plan || plan.groups.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 120
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const baseRadius = size / 2 - 10
    const highlightRadius = baseRadius + 4
    const highlightOffset = 4

    ctx.clearRect(0, 0, size, size)

    // Separate groups to draw highlighted one last so it's on top
    const normalGroups = plan.groups.filter(g => g.key !== highlightKey)
    const highlightedGroups = plan.groups.filter(g => g.key === highlightKey)

    const drawGroup = (group: typeof plan.groups[0], isHighlighted: boolean) => {
      const radius = isHighlighted ? highlightRadius : baseRadius
      
      ctx.save()
      
      if (isHighlighted) {
        const midAngle = (group.startAngle + group.endAngle) / 2
        const dx = Math.cos(midAngle) * highlightOffset
        const dy = Math.sin(midAngle) * highlightOffset
        ctx.translate(dx, dy)
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 4
      }

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, group.startAngle, group.endAngle)
      ctx.closePath()
      ctx.fillStyle = group.color
      ctx.fill()
      ctx.restore()
    }

    for (const group of normalGroups) {
      drawGroup(group, false)
    }

    for (const group of highlightedGroups) {
      drawGroup(group, true)
    }

    // Center dot
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fill()
  }, [plan, highlightKey])

  if (!plan || plan.groups.length === 0) return null

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-4 z-[4] flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/80 p-3 shadow-xl backdrop-blur-md transition-opacity duration-300"
      style={{ opacity: plan ? 1 : 0 }}
    >
      <canvas
        ref={canvasRef}
        className="self-center transition-transform duration-300"
        style={{ width: 120, height: 120 }}
      />
      <div className="flex flex-col gap-0.5">
        {plan.groups.map((group) => {
          const isHighlighted = highlightKey === group.key
          return (
            <div
              key={group.key}
              className={`flex items-center gap-2 rounded-md px-1.5 py-0.5 text-[11px] transition-all duration-150 ${
                isHighlighted
                  ? 'bg-foreground/10 text-foreground scale-[1.03]'
                  : highlightKey
                    ? 'text-foreground/40'
                    : 'text-foreground/80'
              }`}
            >
              <span
                className={`inline-block shrink-0 rounded-full transition-all duration-150 ${
                  isHighlighted ? 'h-3 w-3' : 'h-2.5 w-2.5'
                }`}
                style={{ backgroundColor: group.color }}
              />
              <span className={`min-w-0 truncate ${isHighlighted ? 'font-semibold' : ''}`}>
                {group.label}
              </span>
              <span className={`ml-auto tabular-nums transition-colors duration-150 ${
                isHighlighted ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {group.contactIds.length}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
