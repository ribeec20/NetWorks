import { useEffect, useRef, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Sigma from 'sigma'
import { EdgeClampedProgram } from 'sigma/rendering'
import EdgeCurveProgram from '@sigma/edge-curve'
import type { Contact, Connection } from '../types'
import { buildGraph, YOU_NODE_ID } from '../graph/graph-builder'
import { applyRadialLayout } from '../graph/layout'
import { strengthToColor } from '../utils/color'
import { nodesPerBand } from './config'

// ---------------------------------------------------------------------------
// Fake data generation from config
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank',
  'Iris', 'Jack', 'Kate', 'Leo', 'Mia', 'Nate', 'Olga', 'Pete',
  'Quinn', 'Rosa', 'Sam', 'Tina', 'Uma', 'Vic', 'Wren', 'Xena',
  'Yuri', 'Zara', 'Abel', 'Bea', 'Cody', 'Dana', 'Eli', 'Faye',
  'Gil', 'Hope', 'Ivan', 'Jade', 'Kyle', 'Luna', 'Max', 'Nina',
  'Omar', 'Pia', 'Reed', 'Sage', 'Troy', 'Vera', 'Wade', 'Xyla',
  'Yael', 'Zeke', 'Arlo', 'Beth', 'Clay', 'Dora', 'Finn', 'Gwen',
  'Hugo', 'Isla', 'Joel', 'Kira',
]

const LAST_NAMES = [
  'Smith', 'Chen', 'Patel', 'Kim', 'Lopez', 'Müller', 'Tanaka', 'Silva',
  'Singh', 'Brown', 'Jones', 'Lee', 'Clark', 'Hall', 'Adams', 'Wright',
  'Young', 'Allen', 'Scott', 'Green', 'Baker', 'Hill', 'Moore', 'White',
  'King', 'Ross', 'Cruz', 'Bell', 'Ward', 'Ford', 'Cole', 'Hart',
  'Webb', 'Fox', 'Reed', 'Sage', 'Gray', 'Nash', 'Dean', 'Park',
]

const TAGS = ['engineering', 'design', 'product', 'sales', 'marketing', 'ops']

function generateFakeData(): { contacts: Contact[]; connections: Connection[] } {
  const contacts: Contact[] = []
  const connections: Connection[] = []
  const now = Date.now()
  let nameIdx = 0

  for (let band = 0; band < nodesPerBand.length; band++) {
    const count = nodesPerBand[band] ?? 0
    // Band 0 = strength 90–100, band 9 = strength 0–9
    const bandBottom = (9 - band) * 10
    const bandTop = band === 0 ? 100 : bandBottom + 9

    for (let i = 0; i < count; i++) {
      // Spread strengths evenly across the band
      const strength = count === 1
        ? Math.round((bandBottom + bandTop) / 2)
        : Math.round(bandBottom + (i / (count - 1)) * (bandTop - bandBottom))

      const id = `test-${band}-${i}`
      const firstName = FIRST_NAMES[nameIdx % FIRST_NAMES.length]
      const lastName = LAST_NAMES[nameIdx % LAST_NAMES.length]
      nameIdx++

      contacts.push({
        id,
        firstName,
        lastName,
        positions: [{ company: 'TestCo', role: 'Engineer', startDate: now, endDate: null }],
        notes: '',
        socials: [],
        tags: [TAGS[nameIdx % TAGS.length]],
        dateAdded: now,
        dateFirstMet: now,
        strength,
        strengthHistory: [],
        userStrengthOverride: null,
        x: null, // force layout
        y: null,
        createdAt: now,
        updatedAt: now,
      })

      connections.push({
        id: `conn-${id}`,
        sourceId: 'self',
        targetId: id,
        isDirect: true,
        referralSource: null,
        label: null,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  return { contacts, connections }
}

// ---------------------------------------------------------------------------
// Overlay node type (same as GraphCanvas)
// ---------------------------------------------------------------------------

interface OverlayNode {
  id: string
  initials: string
  x: number
  y: number
  size: number
  color: string
  isRoot: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TestLayoutPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [overlayNodes, setOverlayNodes] = useState<OverlayNode[]>([])

  const { contacts, connections } = useMemo(() => generateFakeData(), [])

  const totalNodes = contacts.length

  useEffect(() => {
    if (!containerRef.current) return

    if (sigmaRef.current) {
      sigmaRef.current.kill()
      sigmaRef.current = null
    }

    const graph = buildGraph(contacts, connections)

    // All nodes need layout (x/y are null)
    applyRadialLayout(graph)

    // Resolve theme colors (same as GraphCanvas)
    const style = getComputedStyle(document.documentElement)
    const resolveVar = (name: string, fallback: string) =>
      style.getPropertyValue(name).trim() || fallback
    const themeLabel = resolveVar('--muted-foreground', '#86868b')
    const themeBorder = resolveVar('--border', '#d2d2d7')
    const themeRootNode = resolveVar('--graph-root-node-color', '#7c3aed')
    const themeDefaultNode = resolveVar('--graph-default-node-color', '#9ca3af')

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
      labelFont: "'Inter', system-ui, -apple-system, sans-serif",
      labelSize: 13,
      labelWeight: '500',
      labelColor: { color: themeLabel },
      defaultNodeColor: themeBorder,
      defaultEdgeColor: themeBorder,
      enableEdgeEvents: false,
      edgeReducer: (_edge, data) => {
        return {
          ...data,
          color: data.isMutual ? themeBorder : themeBorder,
        }
      },
      nodeReducer: (node, data) => {
        if (node === YOU_NODE_ID) {
          return { ...data, color: themeRootNode, label: 'You' }
        }
        if (!data.tag) {
          return { ...data, color: themeDefaultNode }
        }
        return data
      },
    })

    syncOverlayNodes()
    sigma.on('afterRender', syncOverlayNodes)

    // Hover tooltip (same as GraphCanvas)
    const tooltipEl = tooltipRef.current
    sigma.on('enterNode', ({ node }) => {
      if (node === YOU_NODE_ID) sigma.refresh()
      if (!tooltipEl) return
      const attrs = graph.getNodeAttributes(node)
      const strength = attrs.strength as number | undefined

      let html = `<strong>${attrs.label}</strong>`
      if (strength != null) {
        const color = strengthToColor(strength)
        html += `<br/><span style="color:${color};font-weight:600">Strength: ${strength}</span>`
      }
      html += `<br/><span style="color:${themeLabel}">Band: ${9 - Math.floor((strength ?? 0) / 10)}</span>`
      tooltipEl.innerHTML = html
      tooltipEl.style.display = 'block'
    })

    sigma.on('leaveNode', ({ node }) => {
      if (node === YOU_NODE_ID) sigma.refresh()
      if (!tooltipEl) return
      tooltipEl.style.display = 'none'
    })

    const container = containerRef.current
    const handleMouseMove = (e: MouseEvent) => {
      if (!tooltipEl) return
      tooltipEl.style.left = `${e.offsetX + 12}px`
      tooltipEl.style.top = `${e.offsetY + 12}px`
    }
    container.addEventListener('mousemove', handleMouseMove)

    // Node dragging (for experimentation)
    let draggedNode: string | null = null
    let isDragging = false

    sigma.on('downNode', (e) => {
      if (e.node === YOU_NODE_ID) return
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
      isDragging = false
      draggedNode = null
      sigma.getCamera().enable()
    })

    sigmaRef.current = sigma

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      sigma.off('afterRender', syncOverlayNodes)
      sigma.kill()
      sigmaRef.current = null
      setOverlayNodes([])
    }
  }, [contacts, connections])

  return (
    <div className="flex h-full flex-col bg-secondary">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-border bg-background px-5 py-3">
        <Link
          to="/"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          &larr; Back
        </Link>
        <h1 className="text-sm font-semibold text-foreground">Layout Test</h1>
        <span className="text-xs text-muted-foreground">
          {totalNodes} nodes &middot; Edit <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">src/test-layout/config.ts</code> to change
        </span>
        <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
          {nodesPerBand.map((count, band) => (
            <span key={band} className="tabular-nums">
              B{band}:{count}
            </span>
          ))}
        </div>
      </div>

      {/* Graph */}
      <main className="relative flex-1 overflow-hidden">
        <div className="graph-canvas-layer relative h-full w-full bg-secondary">
          <div ref={containerRef} className="graph-canvas-surface h-full w-full" />
          <div className="graph-canvas-theme-overlay pointer-events-none absolute inset-0 z-[1]" />
          <div className="pointer-events-none absolute inset-0 z-[3]">
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
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute z-10 hidden rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-xl shadow-border/50"
            style={{ maxWidth: 260 }}
          />
        </div>
      </main>
    </div>
  )
}
