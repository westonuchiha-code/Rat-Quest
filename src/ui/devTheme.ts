/**
 * The look the development tools share (the level editor, the tweaks panel, the workshop): one set of colours, buttons,
 * fields and small pictures, so they read as one suite. Everything is under `.rqd`.
 */
export const DEV_CSS = `
.rqd { --bg: #0f1218; --panel: #171b24; --panel2: #1e2430; --raise: #272e3d; --line: #323b4d; --line2: #4a5672; --text: #e8ebf2; --dim: #9aa4b8; --faint: #6b7488;
  --gold: #ffc94a; --gold2: #ff9d2e; --go: #49c46b; --go2: #1d5a33; --bad: #ff6b6b; --sel: #6ab7ff;
  color: var(--text); font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: clamp(12px, 1.9vh, 15px); line-height: 1.3;
  -webkit-user-select: none; user-select: none; }
.rqd *, .rqd *::before, .rqd *::after { box-sizing: border-box; }
.rqd button, .rqd input, .rqd select, .rqd textarea { font: inherit; color: var(--text); }
.rqd button { display: inline-flex; align-items: center; justify-content: center; gap: 0.4em; min-height: 2.2em; padding: 0.3em 0.75em; border-radius: 0.5em; border: 1px solid var(--line2);
  background: linear-gradient(var(--raise), #20263300), var(--raise); cursor: pointer; white-space: nowrap; transition: background 0.1s, border-color 0.1s, transform 0.05s; }
.rqd button:hover { border-color: #6b7896; background: #303850; }
.rqd button:active { transform: translateY(1px); }
.rqd button.on { background: #3a3110; border-color: var(--gold); color: #fff3c4; }
.rqd button.go { background: var(--go2); border-color: var(--go); color: #eafff0; font-weight: 700; }
.rqd button.go:hover { background: #26713f; }
.rqd button.primary { background: #4a3a0c; border-color: var(--gold); color: #fff3c4; font-weight: 700; }
.rqd button.danger { border-color: #8a3c3c; color: #ffc9c9; }
.rqd button.danger:hover { background: #4a2020; border-color: var(--bad); }
.rqd button.ghost { border-color: #0000; background: none; padding: 0.3em 0.45em; }
.rqd button.ghost:hover { background: var(--raise); border-color: var(--line); }
.rqd button.ghost.on { background: #3a3110; border-color: var(--gold); }
.rqd button[disabled] { opacity: 0.35; pointer-events: none; }
.rqd button svg, .rqd .ico { width: 1.25em; height: 1.25em; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.rqd input[type=text], .rqd input[type=number], .rqd input[type=search], .rqd select, .rqd textarea { min-height: 2.1em; padding: 0.25em 0.5em; border-radius: 0.45em; border: 1px solid var(--line2); background: #0c0f15; -webkit-user-select: text; user-select: text; }
.rqd input:focus, .rqd select:focus, .rqd textarea:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 2px #ffc94a33; }
.rqd input[type=checkbox] { width: 1.15em; height: 1.15em; accent-color: var(--gold); }
.rqd input[type=range] { accent-color: var(--gold); }
.rqd textarea { width: 100%; resize: vertical; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.9em; }
.rqd .seg { display: inline-flex; border: 1px solid var(--line2); border-radius: 0.5em; overflow: hidden; }
.rqd .seg button { border: 0; border-radius: 0; min-height: 2em; background: var(--panel2); border-right: 1px solid var(--line); }
.rqd .seg button:last-child { border-right: 0; }
.rqd .seg button.on { background: #3a3110; color: #fff3c4; }
.rqd .kbd { display: inline-block; min-width: 1.5em; padding: 0 0.4em; border-radius: 0.3em; border: 1px solid var(--line2); border-bottom-width: 2px; background: var(--panel2); color: var(--dim); font: 0.85em ui-monospace, Menlo, Consolas, monospace; text-align: center; }
.rqd .muted { color: var(--dim); } .rqd .faint { color: var(--faint); }
.rqd .badge { display: inline-block; min-width: 1.5em; padding: 0 0.4em; border-radius: 1em; background: var(--raise); color: var(--dim); font-size: 0.8em; font-weight: 700; text-align: center; }
.rqd .badge.bad { background: #5a1f1f; color: #ffd0d0; } .rqd .badge.ok { background: #173d25; color: #b6f0c6; } .rqd .badge.warn { background: #54380c; color: #ffe0a0; }
.rqd ::-webkit-scrollbar { width: 10px; height: 10px; } .rqd ::-webkit-scrollbar-thumb { background: #3a4459; border-radius: 6px; border: 2px solid var(--panel); } .rqd ::-webkit-scrollbar-track { background: none; }
`;

/** Small line drawings for buttons, on a 24 x 24 grid. */
const PATHS: Record<string, string> = {
  select: '<path d="M5 3 L5 19 L9.5 15 L12.5 21 L15 20 L12 14 L18 14 Z"/>',
  erase: '<path d="M4 16 L13 7 L19 13 L13 19 H8 Z M9 11 L15 17 M13 19 H20"/>',
  pan: '<path d="M8 12 V5.5 a1.5 1.5 0 0 1 3 0 V11 M11 10.5 V4.5 a1.5 1.5 0 0 1 3 0 V11 M14 11 V6 a1.5 1.5 0 0 1 3 0 V14 M8 12 L6.5 10.5 a1.6 1.6 0 0 0 -2.3 2.2 L8 18 a6 6 0 0 0 4.5 3 H13 a5 5 0 0 0 5 -5 V9.5"/>',
  measure: '<path d="M3 17 L17 3 L21 7 L7 21 Z M7 13 L9 15 M10 10 L12.5 12.5 M13 7 L15 9"/>',
  undo: '<path d="M9 7 L4 12 L9 17 M4 12 H15 a5 5 0 0 1 0 10 H12"/>',
  redo: '<path d="M15 7 L20 12 L15 17 M20 12 H9 a5 5 0 0 0 0 10 H12"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8 V6 a2 2 0 0 0 -2 -2 H6 a2 2 0 0 0 -2 2 V14 a2 2 0 0 0 2 2 H8"/>',
  paste: '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12 H15 M9 16 H13"/>',
  dup: '<rect x="4" y="4" width="11" height="11" rx="2"/><path d="M9 20 H18 a2 2 0 0 0 2 -2 V9 M14 14 V19 M11.5 16.5 H16.5"/>',
  trash: '<path d="M4 7 H20 M9 7 V4 H15 V7 M6 7 L7 20 H17 L18 7 M10 11 V16 M14 11 V16"/>',
  zoomin: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16 L21 21 M11 8 V14 M8 11 H14"/>',
  zoomout: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16 L21 21 M8 11 H14"/>',
  fit: '<path d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15"/><rect x="9" y="9" width="6" height="6"/>',
  grid: '<path d="M4 4 H20 V20 H4 Z M4 9.3 H20 M4 14.6 H20 M9.3 4 V20 M14.6 4 V20"/>',
  snap: '<path d="M6 4 V12 a6 6 0 0 0 12 0 V4 H14 V12 a2 2 0 0 1 -4 0 V4 Z M6 8 H10 M14 8 H18"/>',
  layers: '<path d="M12 3 L21 8 L12 13 L3 8 Z M3 12.5 L12 17.5 L21 12.5 M3 17 L12 22 L21 17"/>',
  check: '<path d="M4 12.5 L9.5 18 L20 6.5"/>',
  play: '<path d="M7 4 L20 12 L7 20 Z" fill="currentColor"/>',
  here: '<path d="M12 21 C7 15 5 12 5 9 a7 7 0 0 1 14 0 c0 3 -2 6 -7 12 Z"/><path d="M10.2 6.5 L15 9 L10.2 11.5 Z" fill="currentColor"/>',
  eye: '<path d="M2 12 C5 6.5 8.5 5 12 5 s7 1.5 10 7 c-3 5.5 -6.5 7 -10 7 s-7 -1.5 -10 -7 Z"/><circle cx="12" cy="12" r="3"/>',
  cube: '<path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z M4 7.5 L12 12 L20 7.5 M12 12 V21"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5 a2.6 2.6 0 1 1 3.6 2.4 c-0.8 0.4 -1.1 1 -1.1 1.9 M12 17 V17.2"/>',
  file: '<path d="M6 3 H14 L19 8 V21 H6 Z M14 3 V8 H19"/>',
  folder: '<path d="M3 6 H9.5 L11.5 8.5 H21 V19 H3 Z"/>',
  save: '<path d="M4 4 H16 L20 8 V20 H4 Z M8 4 V9 H15 V4 M7 20 V13 H17 V20"/>',
  plus: '<path d="M12 5 V19 M5 12 H19"/>',
  sliders: '<path d="M4 7 H10 M14 7 H20 M4 17 H8 M12 17 H20 M4 12 H14 M18 12 H20"/><circle cx="12" cy="7" r="2"/><circle cx="10" cy="17" r="2"/><circle cx="16" cy="12" r="2"/>',
  turn: '<path d="M20 12 a8 8 0 1 1 -3 -6.2 M20 4 V9 H15"/>',
  fliph: '<path d="M12 3 V21 M9 7 L4 12 L9 17 Z M15 7 L20 12 L15 17 Z"/>',
  flipv: '<path d="M3 12 H21 M7 9 L12 4 L17 9 Z M7 15 L12 20 L17 15 Z"/>',
  up: '<path d="M12 19 V5 M6 11 L12 5 L18 11"/>',
  down: '<path d="M12 5 V19 M6 13 L12 19 L18 13"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16 L21 21"/>',
  close: '<path d="M6 6 L18 18 M18 6 L6 18"/>',
  warn: '<path d="M12 3 L22 20 H2 Z M12 9.5 V14.5 M12 17.3 V17.5"/>',
  list: '<path d="M8 6 H20 M8 12 H20 M8 18 H20 M4 6 H4.2 M4 12 H4.2 M4 18 H4.2"/>',
  level: '<path d="M4 20 V10 L12 4 L20 10 V20 Z M10 20 V14 H14 V20"/>',
  piece: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10 H20 M10 10 V20"/>',
  sound: '<path d="M4 9.5 H8 L13 5 V19 L8 14.5 H4 Z M16.5 9 a4.5 4.5 0 0 1 0 6 M19 6.5 a8 8 0 0 1 0 11"/>',
  music: '<path d="M9 18 V6 L19 4 V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  door: '<path d="M6 21 V4 H18 V21 M3 21 H21 M14.5 12.5 V12.7"/>',
  flask: '<path d="M9 3 H15 M10 3 V9 L4.5 19 a1.5 1.5 0 0 0 1.4 2 H18.1 a1.5 1.5 0 0 0 1.4 -2 L14 9 V3 M7.5 15 H16.5"/>',
  wrench: '<path d="M20.5 7 a5 5 0 0 1 -6.6 4.6 L6 19.5 a2 2 0 0 1 -2.8 -2.8 L11.1 8.8 A5 5 0 0 1 17 2.5 L14.2 5.4 L15.1 8.7 L18.4 9.6 Z"/>',
  back: '<path d="M10 6 L4 12 L10 18 M4 12 H20"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/>',
  heart: '<path d="M12 20 C5 14.5 3 11.5 3 8.5 a4.5 4.5 0 0 1 9 -1 a4.5 4.5 0 0 1 9 1 c0 3 -2 6 -9 11.5 Z"/>',
  bolt: '<path d="M13 2 L5 13.5 H11 L10 22 L19 10 H13 Z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 1.5 V5 M12 19 V22.5 M1.5 12 H5 M19 12 H22.5"/>',
  more: '<path d="M5 12 H5.2 M12 12 H12.2 M19 12 H19.2" stroke-width="3"/>',
  export: '<path d="M12 15 V3 M7 8 L12 3 L17 8 M5 14 V20 H19 V14"/>',
  import: '<path d="M12 3 V15 M7 10 L12 15 L17 10 M5 14 V20 H19 V14"/>',
};

/** One of the small pictures, as an <svg>. */
export function icon(name: string): string {
  return `<svg viewBox="0 0 24 24" class="ico">${PATHS[name] ?? ''}</svg>`;
}

/** Puts the shared style on the page (once). */
export function useDevTheme(): void {
  if (typeof document === 'undefined' || document.getElementById('rqd-css')) return;
  const st = document.createElement('style');
  st.id = 'rqd-css';
  st.textContent = DEV_CSS;
  document.head.appendChild(st);
}

/** Text made safe to put inside HTML. */
export function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
