import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import Sigma from 'sigma'
import { EdgeClampedProgram } from 'sigma/rendering'
import EdgeCurveProgram from '@sigma/edge-curve'
import { useContactStore } from '../stores/contact-store'
import { useUIStore } from '../stores/ui-store'
import { buildGraph, YOU_NODE_ID } from './graph-builder'
import { applyRadialLayout } from './layout'
import { strengthToColor } from '../utils/color'
import { computeClusterPlan, computeClusteredPositions } from './clustering'
import type { ClusterPlan } from './clustering'
import { animateNodePositions } from './animate-nodes'
import ClusterLegend from './ClusterLegend'
import type { GraphSceneConfig } from '../themes'

type GraphCosmeticSettings = Pick<GraphSceneConfig, 'labelStyle' | 'edgeStyle'>

interface GraphCanvasProps {
  cosmetics?: GraphCosmeticSettings
}

interface OverlayNode {
  id: string
  initials: string
  x: number
  y: number
  size: number
  color: string
  isRoot: boolean
}

export default function GraphCanvas({ cosmetics }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const [overlayNodes, setOverlayNodes] = useState<OverlayNode[]>([])
  const contacts = useContactStore((s) => s.contacts)
  const connections = useContactStore((s) => s.connections)
  const initialized = useContactStore((s) => s.initialized)
  const loadAll = useContactStore((s) => s.loadAll)
  const updateContact = useContactStore((s) => s.updateContact)
  const openView = useUIStore((s) => s.openView)
  const showWeb = useUIStore((s) => s.showWeb)
  const showNames = useUIStore((s) => s.showNames)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const tagFilter = useUIStore((s) => s.tagFilter)
  const strengthRange = useUIStore((s) => s.strengthRange)
  const clusterBy = useUIStore((s) => s.clusterBy)

  // Refs for values that should NOT trigger a full graph rebuild
  const showWebRef = useRef(showWeb)
  const showNamesRef = useRef(showNames)
  const clusterByRef = useRef(clusterBy)
  const clusterPlanRef = useRef<ClusterPlan | null>(null)
  const originalPositionsRef = useRef<Map<string, { x: number; y: number }> | null>(null)
  const animationRef = useRef<{ cancel: () => void } | null>(null)
  const wedgeCanvasRef = useRef<HTMLCanvasElement>(null)
  const [clusterPlan, setClusterPlan] = useState<ClusterPlan | null>(null)
  const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null)

  // Build a set of visible contact IDs based on filters
  const visibleIds = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const hasFilters = q || tagFilter.length > 0 || strengthRange[0] !== 0 || strengthRange[1] !== 100
    if (!hasFilters) return null // null = show all

    const ids = new Set<string>()
    for (const c of contacts) {
      // Search match
      if (q) {
        const name = `${c.firstName} ${c.lastName}`.toLowerCase()
        const company = c.positions.find((p) => !p.endDate)?.company?.toLowerCase() ?? ''
        const role = c.positions.find((p) => !p.endDate)?.role?.toLowerCase() ?? ''
        const tagMatch = c.tags.some((t) => t.toLowerCase().includes(q))
        if (!name.includes(q) && !company.includes(q) && !role.includes(q) && !tagMatch) continue
      }
      // Tag filter
      if (tagFilter.length > 0 && !tagFilter.some((t) => c.tags.includes(t))) continue
      // Strength filter
      if (c.strength < strengthRange[0] || c.strength > strengthRange[1]) continue
      ids.add(c.id)
    }
    return ids
  }, [contacts, searchQuery, tagFilter, strengthRange])

  const visibleIdsRef = useRef(visibleIds)

  // Keep refs in sync and refresh sigma (no rebuild) when display-only values change
  useEffect(() => {
    showWebRef.current = showWeb
    showNamesRef.current = showNames
    visibleIdsRef.current = visibleIds
    sigmaRef.current?.refresh()
  }, [showWeb, showNames, visibleIds])

  const handleClickNode = useCallback((event: { node: string }) => {
    const nodeId = event.node
    if (nodeId === YOU_NODE_ID) return
    openView(nodeId)
  }, [openView])

  // Load data from storage on mount
  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Rebuild graph whenever data changes
  useEffect(() => {
    if (!containerRef.current || !initialized) return

    // Kill previous instance
    if (sigmaRef.current) {
      sigmaRef.current.kill()
      sigmaRef.current = null
    }

    const graph = buildGraph(contacts, connections)
    applyRadialLayout(graph)

    // Persist positions for any nodes that just got laid out
    graph.forEachNode((id, attrs) => {
      if (id === YOU_NODE_ID) return
      if (attrs.needsLayout) {
        updateContact(id, { x: attrs.x as number, y: attrs.y as number })
      }
    })

    // Read theme colors for sigma (WebGL/Canvas2D can't resolve CSS vars)
    const style = getComputedStyle(document.documentElement)
    const resolveVar = (name: string, fallback: string) =>
      style.getPropertyValue(name).trim() || fallback
    const themeLabel = resolveVar(cosmetics?.labelStyle?.colorVar ?? '--muted-foreground', '#86868b')
    const themeBorder = resolveVar(cosmetics?.edgeStyle?.colorVar ?? '--border', '#d2d2d7')
    const themeMutedEdge = resolveVar(cosmetics?.edgeStyle?.mutedColorVar ?? '--border', '#d2d2d7')
    const themeRootNode = resolveVar('--graph-root-node-color', '#7c3aed')
    const themeDefaultNode = resolveVar('--graph-default-node-color', '#9ca3af')
    const edgeSizeMultiplier = cosmetics?.edgeStyle?.sizeMultiplier ?? 1

    let hoveredNode: string | null = null

    const syncOverlayNodes = () => {
      const nextOverlayNodes: OverlayNode[] = []

      graph.forEachNode((node) => {
        const display = sigma.getNodeDisplayData(node)
        if (!display || display.hidden) return

        const viewport = sigma.framedGraphToViewport(display)
        nextOverlayNodes.push({
          id: node,
          initials: String((display as unknown as Record<string, unknown>).initials ?? '').slice(0, 2) || '?',
          x: viewport.x,
          y: viewport.y,
          size: sigma.scaleSize(display.size),
          color: String(display.color ?? themeDefaultNode),
          isRoot: node === YOU_NODE_ID,
        })
      })

      setOverlayNodes(nextOverlayNodes)
    }

    const sigma = new Sigma(graph, containerRef.current, {
      defaultEdgeType: 'straight',
      edgeProgramClasses: {
        straight: EdgeClampedProgram,
        dashed: EdgeCurveProgram,
      },
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 8,
      labelFont: cosmetics?.labelStyle?.fontFamily ?? "'Inter', system-ui, -apple-system, sans-serif",
      labelSize: cosmetics?.labelStyle?.fontSize ?? 13,
      labelWeight: cosmetics?.labelStyle?.fontWeight ?? '500',
      labelColor: { color: themeLabel },
      defaultNodeColor: themeBorder,
      defaultEdgeColor: themeBorder,
      enableEdgeEvents: false,
      edgeReducer: (edge, data) => {
        // Web toggle hides ALL lines
        if (!showWebRef.current) return { ...data, hidden: true }
        // Hide edges connected to hidden nodes
        const vis = visibleIdsRef.current
        if (vis) {
          const [src, tgt] = graph.extremities(edge)
          const srcVisible = src === YOU_NODE_ID || vis.has(src)
          const tgtVisible = tgt === YOU_NODE_ID || vis.has(tgt)
          if (!srcVisible || !tgtVisible) return { ...data, hidden: true }
        }
        return {
          ...data,
          color: data.isMutual ? themeMutedEdge : themeBorder,
          size: typeof data.size === 'number' ? data.size * edgeSizeMultiplier : data.size,
        }
      },
      nodeReducer: (node, data) => {
        const names = showNamesRef.current
        const vis = visibleIdsRef.current
        if (node === YOU_NODE_ID && hoveredNode !== YOU_NODE_ID) {
          return { ...data, color: themeRootNode, label: '' }
        }
        // Hide nodes that don't match filters
        if (vis && node !== YOU_NODE_ID && !vis.has(node)) {
          return { ...data, hidden: true }
        }
        if (node === YOU_NODE_ID) {
          return { ...data, color: themeRootNode, label: names ? data.label : '' }
        }
        if (!data.tag) {
          return { ...data, color: themeDefaultNode, label: names ? data.label : '' }
        }
        return { ...data, label: names ? data.label : '' }
      },
    })

    // Wedge background rendering
    const drawWedges = () => {
      const canvas = wedgeCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
        ctx.scale(dpr, dpr)
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const plan = clusterPlanRef.current
      if (!plan || plan.groups.length === 0) return

      // Get "You" node viewport position as wedge center
      const center = sigma.graphToViewport({ x: 0, y: 0 })
      const maxR = Math.max(canvas.width, canvas.height) * 2

      for (const group of plan.groups) {
        ctx.beginPath()
        ctx.moveTo(center.x, center.y)
        ctx.arc(center.x, center.y, maxR, group.startAngle, group.endAngle)
        ctx.closePath()
        ctx.fillStyle = group.color + '1a' // ~0.10 alpha via hex
        ctx.fill()

        // Separator line at start of sector
        ctx.beginPath()
        ctx.moveTo(center.x, center.y)
        ctx.lineTo(
          center.x + Math.cos(group.startAngle) * maxR,
          center.y + Math.sin(group.startAngle) * maxR,
        )
        ctx.strokeStyle = group.color + '30' // ~0.19 alpha
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    syncOverlayNodes()
    const onAfterRender = () => {
      syncOverlayNodes()
      drawWedges()
    }
    sigma.on('afterRender', onAfterRender)

    // Hover tooltip
    const tooltipEl = tooltipRef.current
    sigma.on('enterNode', ({ node }) => {
      hoveredNode = node
      if (node === YOU_NODE_ID) sigma.refresh()
      if (!tooltipEl) return
      const attrs = graph.getNodeAttributes(node)
      const strength = attrs.strength as number | undefined

      let html = `<strong>${attrs.label}</strong>`
      if (attrs.role) html += `<br/><span style="color:${themeLabel}">${attrs.role}</span>`
      if (attrs.company) html += ` <span style="color:${themeBorder}">@</span> <span style="color:${themeLabel}">${attrs.company}</span>`
      if (strength != null) {
        const color = strengthToColor(strength)
        html += `<br/><span style="color:${color};font-weight:600">Strength: ${strength}</span>`
      }
      tooltipEl.innerHTML = html
      tooltipEl.style.display = 'block'
    })

    sigma.on('leaveNode', ({ node }) => {
      hoveredNode = null
      if (node === YOU_NODE_ID) sigma.refresh()
      if (!tooltipEl) return
      tooltipEl.style.display = 'none'
    })

    // Track mouse for tooltip + wedge hover
    const container = containerRef.current
    const wedgeLabelEl = wedgeLabelRef.current
    let lastWedgeKey: string | null = null
    let wedgeLabelTimer: ReturnType<typeof setTimeout> | null = null
    let lastMouseX = 0
    let lastMouseY = 0

    const clearWedgeLabel = () => {
      if (wedgeLabelTimer) { clearTimeout(wedgeLabelTimer); wedgeLabelTimer = null }
      if (wedgeLabelEl) wedgeLabelEl.style.display = 'none'
    }

    const findHoveredGroup = (offsetX: number, offsetY: number) => {
      const plan = clusterPlanRef.current
      if (!plan || plan.groups.length === 0) return null
      const center = sigma.graphToViewport({ x: 0, y: 0 })
      const dx = offsetX - center.x
      const dy = offsetY - center.y
      const normalizeAngle = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      const nAngle = normalizeAngle(Math.atan2(dy, dx))
      for (const group of plan.groups) {
        const nStart = normalizeAngle(group.startAngle)
        const nEnd = normalizeAngle(group.endAngle)
        if (nStart <= nEnd) {
          if (nAngle >= nStart && nAngle <= nEnd) return group
        } else {
          if (nAngle >= nStart || nAngle <= nEnd) return group
        }
      }
      return null
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (tooltipEl) {
        tooltipEl.style.left = `${e.offsetX + 12}px`
        tooltipEl.style.top = `${e.offsetY + 12}px`
      }

      lastMouseX = e.offsetX
      lastMouseY = e.offsetY

      // Always clear the floating label on movement
      clearWedgeLabel()

      const plan = clusterPlanRef.current
      if (!plan || plan.groups.length === 0 || hoveredNode) {
        if (lastWedgeKey) { lastWedgeKey = null; setHoveredGroupKey(null) }
        return
      }

      const found = findHoveredGroup(e.offsetX, e.offsetY)
      const newKey = found?.key ?? null

      // Update legend highlight immediately
      if (newKey !== lastWedgeKey) {
        lastWedgeKey = newKey
        setHoveredGroupKey(newKey)
      }

      // Start timer for floating label (1.5s stationary)
      if (found && wedgeLabelEl) {
        wedgeLabelTimer = setTimeout(() => {
          wedgeLabelEl.style.left = `${lastMouseX + 14}px`
          wedgeLabelEl.style.top = `${lastMouseY + 14}px`
          wedgeLabelEl.innerHTML =
            `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${found.color};flex-shrink:0"></span>` +
            `<span style="font-weight:600">${found.label}</span>` +
            `<span style="opacity:0.55">${found.contactIds.length}</span>`
          wedgeLabelEl.style.display = 'flex'
        }, 1500)
      }
    }
    container.addEventListener('mousemove', handleMouseMove)

    // Click node
    sigma.on('clickNode', handleClickNode)

    // Node dragging — persist position on drop
    let draggedNode: string | null = null
    let isDragging = false

    sigma.on('downNode', (e) => {
      if (e.node === YOU_NODE_ID) return
      if (clusterByRef.current) return // no dragging in cluster mode
      draggedNode = e.node
      isDragging = true
      sigma.getCamera().disable()
    })

    sigma.getMouseCaptor().on('mousemovebody', (e) => {
      if (!isDragging || !draggedNode) return
      const pos = sigma.viewportToGraph(e)
      graph.setNodeAttribute(draggedNode, 'x', pos.x)
      graph.setNodeAttribute(draggedNode, 'y', pos.y)
    })

    sigma.getMouseCaptor().on('mouseup', () => {
      if (isDragging && draggedNode) {
        const x = graph.getNodeAttribute(draggedNode, 'x') as number
        const y = graph.getNodeAttribute(draggedNode, 'y') as number
        updateContact(draggedNode, { x, y })
      }
      isDragging = false
      draggedNode = null
      sigma.getCamera().enable()
    })

    sigmaRef.current = sigma

    const handleMouseLeave = () => {
      clearWedgeLabel()
      lastWedgeKey = null
      setHoveredGroupKey(null)
    }
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      clearWedgeLabel()
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      sigma.off('afterRender', onAfterRender)
      sigma.kill()
      sigmaRef.current = null
      setOverlayNodes([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- showWeb, showNames, visibleIds use refs + sigma.refresh() to avoid full rebuild
  }, [contacts, connections, cosmetics, initialized, handleClickNode, updateContact])

  // Clustering orchestration — runs when clusterBy or visibleIds change
  useEffect(() => {
    clusterByRef.current = clusterBy
    const sigma = sigmaRef.current
    if (!sigma) return
    const graph = sigma.getGraph()

    // Cancel any in-progress animation
    animationRef.current?.cancel()
    animationRef.current = null

    if (clusterBy) {
      // Snapshot original positions on first activation
      if (!originalPositionsRef.current) {
        const originals = new Map<string, { x: number; y: number }>()
        graph.forEachNode((id, attrs) => {
          originals.set(id, { x: attrs.x as number, y: attrs.y as number })
        })
        originalPositionsRef.current = originals
      }

      const plan = computeClusterPlan(contacts, clusterBy, visibleIds)
      const targets = computeClusteredPositions(graph, plan)

      clusterPlanRef.current = plan
      setClusterPlan(plan)

      animationRef.current = animateNodePositions(graph, targets, {
        duration: 600,
        onFrame: () => sigma.refresh(),
      })
    } else {
      // Restore original positions
      if (originalPositionsRef.current) {
        const originals = originalPositionsRef.current
        animationRef.current = animateNodePositions(graph, originals, {
          duration: 600,
          onFrame: () => sigma.refresh(),
          onComplete: () => {
            originalPositionsRef.current = null
          },
        })
      }
      clusterPlanRef.current = null
      setClusterPlan(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- contacts used for clustering computation, visibleIds for filtering
  }, [clusterBy, contacts, visibleIds])

  const tooltipRef = useRef<HTMLDivElement>(null)
  const wedgeLabelRef = useRef<HTMLDivElement>(null)

  if (!initialized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-sm text-muted-foreground">Loading network...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="graph-canvas-layer relative h-full w-full bg-secondary">
      <canvas ref={wedgeCanvasRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full" />
      <div ref={containerRef} className="graph-canvas-surface relative z-[1] h-full w-full" />
      <div className="graph-canvas-theme-overlay pointer-events-none absolute inset-0 z-[2]" />
      <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
        {overlayNodes.map((node) => {
          const diameter = node.size * 2
          const fontSize = Math.max(10, Math.min(18, node.size * 0.72))

          return (
            <div
              key={node.id}
              className="absolute flex items-center justify-center rounded-full font-bold uppercase tracking-[0.04em] text-white shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
              style={{
                left: node.x - node.size,
                top: node.y - node.size,
                width: diameter,
                height: diameter,
                fontSize,
                backgroundColor: node.color,
                border: node.isRoot ? '2px solid rgba(255,255,255,0.5)' : '1.5px solid rgba(255,255,255,0.28)',
                boxShadow: node.isRoot
                  ? '0 10px 26px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255,255,255,0.26)'
                  : '0 6px 18px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              <span style={{ transform: 'translateY(0.02em)' }}>{node.initials}</span>
            </div>
          )
        })}
      </div>
      <ClusterLegend plan={clusterPlan} highlightKey={hoveredGroupKey} />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 hidden rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-xl shadow-border/50"
        style={{ maxWidth: 260 }}
      />
      <div
        ref={wedgeLabelRef}
        className="pointer-events-none absolute z-[5] hidden items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-3 py-1.5 text-[12px] text-foreground shadow-lg backdrop-blur-sm"
      />
    </div>
  )
}
