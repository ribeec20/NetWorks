import type Graph from 'graphology'

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export interface AnimateOptions {
  duration?: number
  easing?: (t: number) => number
  onFrame?: () => void
  onComplete?: () => void
}

export function animateNodePositions(
  graph: Graph,
  targets: Map<string, { x: number; y: number }>,
  options?: AnimateOptions,
): { cancel: () => void } {
  const duration = options?.duration ?? 600
  const easing = options?.easing ?? easeInOutCubic
  const onFrame = options?.onFrame
  const onComplete = options?.onComplete

  // Snapshot origins
  const origins = new Map<string, { x: number; y: number }>()
  for (const [id] of targets) {
    if (!graph.hasNode(id)) continue
    origins.set(id, {
      x: (graph.getNodeAttribute(id, 'x') as number) ?? 0,
      y: (graph.getNodeAttribute(id, 'y') as number) ?? 0,
    })
  }

  let cancelled = false
  let rafId = 0
  const startTime = performance.now()

  function tick(now: number) {
    if (cancelled) return

    const elapsed = now - startTime
    const rawT = Math.min(elapsed / duration, 1)
    const t = easing(rawT)

    for (const [id, target] of targets) {
      const origin = origins.get(id)
      if (!origin) continue
      graph.setNodeAttribute(id, 'x', lerp(origin.x, target.x, t))
      graph.setNodeAttribute(id, 'y', lerp(origin.y, target.y, t))
    }

    onFrame?.()

    if (rawT < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      onComplete?.()
    }
  }

  rafId = requestAnimationFrame(tick)

  return {
    cancel() {
      cancelled = true
      cancelAnimationFrame(rafId)
    },
  }
}
