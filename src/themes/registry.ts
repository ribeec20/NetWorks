import type { UserTier } from '../types'

export interface GraphSceneDecorationConfig {
  type: 'forest' | 'ancient-oak' | 'trace'
  density?: 'low' | 'medium' | 'high'
}

export interface GraphSceneLabelStyle {
  fontFamily?: string
  fontSize?: number
  fontWeight?: string
  colorVar?: string
}

export interface GraphSceneEdgeStyle {
  colorVar?: string
  mutedColorVar?: string
  sizeMultiplier?: number
}

export interface GraphSceneBackgroundEffect {
  className: string
}

export interface GraphSceneConfig {
  backgroundEffect?: GraphSceneBackgroundEffect
  decoration?: GraphSceneDecorationConfig
  labelStyle?: GraphSceneLabelStyle
  edgeStyle?: GraphSceneEdgeStyle
}

export interface ThemeDefinition {
  id: string
  name: string
  /** 'free' = available to everyone, 'paid' = requires paid tier */
  tier: 'free' | 'paid'
  /** Short label shown in the selector */
  description: string
  /** Preview swatches for the theme picker (light-mode representative colors) */
  preview: { bg: string; primary: string; accent: string }
  /** Optional cosmetic graph scene settings. Must never affect layout or positions. */
  graphScene?: GraphSceneConfig
}

// ---------------------------------------------------------------------------
// Registry — add new themes here
// ---------------------------------------------------------------------------

export const themes: ThemeDefinition[] = [
  {
    id: 'default',
    name: 'Default',
    tier: 'free',
    description: 'Clean and minimal',
    preview: { bg: '#ffffff', primary: '#0071e3', accent: '#f5f5f7' },
  },
  {
    id: 'forest',
    name: 'Forest',
    tier: 'free',
    description: 'Canopy, bark, and drifting leaves',
    preview: { bg: '#102315', primary: '#70bf6b', accent: '#8b5e34' },
    graphScene: {
      backgroundEffect: {
        className: 'graph-scene--forest',
      },
      decoration: {
        type: 'forest',
        density: 'medium',
      },
      labelStyle: {
        fontFamily: "'Avenir Next', 'Segoe UI', sans-serif",
        fontSize: 12,
        fontWeight: '600',
        colorVar: '--graph-label-color',
      },
      edgeStyle: {
        colorVar: '--graph-edge-color',
        mutedColorVar: '--graph-edge-muted-color',
        sizeMultiplier: 1.12,
      },
    },
  },
  {
    id: 'ancient-oak',
    name: 'Ancient Oak',
    tier: 'free',
    description: 'Cinematic canopy with drifting leaves and warm bark tones',
    preview: { bg: '#0a130c', primary: '#86be63', accent: '#6a4b2a' },
    graphScene: {
      backgroundEffect: {
        className: 'graph-scene--ancient-oak',
      },
      decoration: {
        type: 'ancient-oak',
        density: 'medium',
      },
      labelStyle: {
        fontFamily: "'Trebuchet MS', 'Avenir Next', 'Segoe UI', sans-serif",
        fontSize: 12,
        fontWeight: '700',
        colorVar: '--graph-label-color',
      },
      edgeStyle: {
        colorVar: '--graph-edge-color',
        mutedColorVar: '--graph-edge-muted-color',
        sizeMultiplier: 1.18,
      },
    },
  },
  {
    id: 'trace',
    name: 'Trace',
    tier: 'free',
    description: 'PCB traces, signal pulses, and core-processor glow',
    preview: { bg: '#07131a', primary: '#78e2d1', accent: '#f0cb7a' },
    graphScene: {
      backgroundEffect: {
        className: 'graph-scene--trace',
      },
      decoration: {
        type: 'trace',
        density: 'medium',
      },
      labelStyle: {
        fontFamily: "'Segoe UI', 'Avenir Next', sans-serif",
        fontSize: 12,
        fontWeight: '700',
        colorVar: '--graph-label-color',
      },
      edgeStyle: {
        colorVar: '--graph-edge-color',
        mutedColorVar: '--graph-edge-muted-color',
        sizeMultiplier: 1.22,
      },
    },
  },
  // To add a theme:
  // 1. Create src/themes/<id>.css  (override CSS vars under [data-theme="<id>"])
  // 2. Add a ThemeDefinition entry here
  // 3. Import the CSS file in src/themes/index.ts
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getTheme(id: string): ThemeDefinition | undefined {
  return themes.find((t) => t.id === id)
}

export function isThemeUnlocked(
  themeId: string,
  userTier: UserTier | null | undefined,
): boolean {
  // Everything unlocked in dev
  if (import.meta.env.DEV) return true

  const theme = getTheme(themeId)
  if (!theme) return false
  if (theme.tier === 'free') return true
  return userTier === 'paid'
}
