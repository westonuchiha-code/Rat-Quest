/** The standalone editor: tweak sliders, a controller-friendly panel, jump arithmetic, a jump checker, a tools page. */
export { TweakRegistry, tweaks, defineTweaks } from './registry';
export type { TweakDef, TweakPreset, PresetList, TweakSection, RegistryOptions, Store } from './registry';
export { TweakPanel } from './panel';
export type { PanelOptions } from './panel';
export { PadNav } from './padNav';
export type { NavAction, PadNavOptions } from './padNav';
export { FAIR, jumpHeight, fullHeight, jumpReach, maxClimb, maxChimney, jumpArc } from './jumpMath';
export type { JumpParams } from './jumpMath';
export { computeReach, unreachable } from './reach';
export type { Box, ReachMap, ReachOptions, Target } from './reach';
export { ToolsPanel } from './toolsPanel';
export type { EditorHost, Place, Point } from './toolsPanel';
export { ensureStyle } from './style';
