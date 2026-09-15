import { useMemo } from 'react'
import GraphCanvas from './GraphCanvas'
import { useUIStore } from '../stores/ui-store'
import { getTheme } from '../themes'
import type { GraphSceneConfig } from '../themes'

/**
 * Cosmetic overlay layer that wraps GraphCanvas.
 *
 * Sigma owns: positions, camera, zoom, pan, hit-testing, drag, tooltips.
 * This layer owns: background effects, ambient decorations, branch visuals.
 *
 * Every decoration div is pointer-events-none so Sigma keeps full control.
 */
export default function GraphSceneLayer() {
  const themeId = useUIStore((s) => s.themeId)
  const theme = useMemo(() => getTheme(themeId), [themeId])
  const scene = theme?.graphScene

  // Props passed down to GraphCanvas (label + edge cosmetics only)
  const cosmetics = useMemo(
    () =>
      scene
        ? { labelStyle: scene.labelStyle, edgeStyle: scene.edgeStyle }
        : undefined,
    [scene],
  )

  return (
    <div
      className={`graph-scene relative h-full w-full${
        scene?.backgroundEffect?.className
          ? ` ${scene.backgroundEffect.className}`
          : ''
      }`}
    >
      {/* Background decorations — behind Sigma */}
      <DecorationLayer scene={scene} layer="back" />

      {/* Sigma graph — z-[1] so it sits above bg decorations */}
      <div className="relative z-[1] h-full w-full">
        <GraphCanvas cosmetics={cosmetics} />
      </div>

      {/* Foreground decorations — above Sigma, no pointer events */}
      <DecorationLayer scene={scene} layer="front" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Decoration renderer
// ---------------------------------------------------------------------------

interface DecorationLayerProps {
  scene: GraphSceneConfig | undefined
  layer: 'back' | 'front'
}

function DecorationLayer({ scene, layer }: DecorationLayerProps) {
  if (!scene?.decoration) return null

  return (
    <div
      className={`graph-scene-decoration pointer-events-none absolute inset-0${
        layer === 'front' ? ' z-[2]' : ' z-0'
      }`}
    >
      {scene.decoration.type === 'forest' && (
        <ForestDecoration layer={layer} />
      )}
      {scene.decoration.type === 'ancient-oak' && (
        <AncientOakDecoration layer={layer} />
      )}
      {scene.decoration.type === 'trace' && (
        <TraceDecoration layer={layer} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Forest-specific decorations
// ---------------------------------------------------------------------------

function ForestDecoration({ layer }: { layer: 'back' | 'front' }) {
  if (layer === 'back') {
    return (
      <>
        <div className="graph-scene-mist graph-scene-mist--back" />
        <div className="graph-scene-branches" />
      </>
    )
  }

  return (
    <>
      <div className="graph-scene-mist graph-scene-mist--front" />
      <div className="graph-scene-fireflies" />
    </>
  )
}

function AncientOakDecoration({ layer }: { layer: 'back' | 'front' }) {
  if (layer === 'back') {
    return (
      <>
        <div className="graph-scene-oak-backdrop" />
        <div className="graph-scene-oak-haze" />
      </>
    )
  }

  return (
    <>
      <div className="graph-scene-oak-canopy" />
      <div className="graph-scene-oak-motes" />
      <div className="graph-scene-oak-leaves" />
    </>
  )
}

function TraceDecoration({ layer }: { layer: 'back' | 'front' }) {
  if (layer === 'back') {
    return (
      <>
        <div className="graph-scene-trace-backdrop" />
        <div className="graph-scene-trace-network graph-scene-trace-network--back" />
        <div className="graph-scene-trace-chip" />
      </>
    )
  }

  return (
    <>
      <div className="graph-scene-trace-network graph-scene-trace-network--front" />
      <div className="graph-scene-trace-signals" />
    </>
  )
}
