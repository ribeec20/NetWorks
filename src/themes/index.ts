// Import theme CSS files here so they're bundled.
// Each theme targets [data-theme="<id>"] with light & dark variants.
//
// Example:
// import './ocean.css'

import './ancient-oak.css'
import './forest.css'
import './trace.css'

export { themes, getTheme, isThemeUnlocked } from './registry'
export type {
	ThemeDefinition,
	GraphSceneConfig,
	GraphSceneDecorationConfig,
	GraphSceneLabelStyle,
	GraphSceneEdgeStyle,
	GraphSceneBackgroundEffect,
} from './registry'
