/**
 * The look the panels share: dark, with a gold accent, big enough to read on a TV from the sofa. Every colour is a
 * custom property on `.se-root`, so a game can restyle the panels by setting them (see the README).
 */
const CSS = `
.se-root { --se-bg: #0f1218f2; --se-panel: #171c26; --se-raise: #222a39; --se-bar: #151a24; --se-line: #2c3445;
  --se-text: #e9ecf2; --se-dim: #9aa3b5; --se-faint: #6b7487; --se-gold: #f2c14e; --se-gold-bg: #3a3110; --se-bad: #ff6b6b;
  --se-font: system-ui, -apple-system, "Segoe UI", sans-serif; --se-num: ui-monospace, Menlo, Consolas, monospace;
  position: absolute; inset: 0; z-index: 1000; display: none; flex-direction: column; background: var(--se-bg);
  color: var(--se-text); font: 16px/1.35 var(--se-font); touch-action: pan-y; }
.se-root.on { display: flex; }
.se-root * { box-sizing: border-box; }
.se-root button { font: inherit; color: var(--se-text); background: var(--se-raise); border: 1px solid var(--se-line);
  border-radius: 0.5em; padding: 0.35em 0.8em; min-height: 2.2em; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4em; }
.se-root button:hover { border-color: var(--se-gold); }
.se-root button:disabled { opacity: 0.35; cursor: default; }
.se-root button.on { background: var(--se-gold-bg); border-color: var(--se-gold); color: #fff3c4; }
.se-root button.go { background: var(--se-gold); color: #1a1405; border-color: var(--se-gold); font-weight: 700; }
.se-root button.danger { border-color: #7a3030; }
.se-root button.cur, .se-root .cur > button.pick { box-shadow: 0 0 0 3px var(--se-gold); }
.se-root input, .se-root textarea { font: inherit; color: var(--se-text); background: #0c0f14; border: 1px solid var(--se-line); border-radius: 0.4em; padding: 0.3em 0.5em; }
.se-root textarea { width: 100%; }
.se-root > header, .se-root > footer { display: flex; align-items: center; gap: 0.6em; padding: 0.6em 1em; background: var(--se-bar); flex-wrap: wrap; }
.se-root > header { border-bottom: 1px solid var(--se-line); }
.se-root > footer { border-top: 1px solid var(--se-line); }
.se-root h1 { margin: 0; font-size: 1.2em; letter-spacing: 0.14em; color: var(--se-gold); }
.se-root .say { flex: 1; color: var(--se-dim); font-size: 0.9em; min-width: 8em; }
.se-root .msg { flex: 1; color: #fff3c4; font-size: 0.9em; min-width: 6em; }
.se-root .help { width: 100%; color: var(--se-dim); font-size: 0.85em; }
.se-root .badge { margin-left: auto; min-width: 1.6em; padding: 0 0.4em; border-radius: 1em; background: var(--se-gold); color: #1a1405; font-size: 0.8em; font-weight: 700; text-align: center; }
.se-root .body { flex: 1; display: flex; min-height: 0; }
.se-root .groups { width: 14em; flex: none; padding: 0.5em; border-right: 1px solid var(--se-line); overflow-y: auto; background: var(--se-panel); }
.se-root .groups h4 { margin: 0.8em 0.3em 0.3em; font-size: 0.74em; letter-spacing: 0.14em; text-transform: uppercase; color: var(--se-faint); }
.se-root .groups button { width: 100%; justify-content: flex-start; border-color: transparent; background: none; margin-bottom: 0.15em; }
.se-root .groups.zone { box-shadow: inset -3px 0 0 var(--se-gold); }
.se-root .list { flex: 1; overflow-y: auto; padding: 0.3em 1.1em 1em; min-width: 0; }
.se-root .list h3 { margin: 1em 0 0.2em; font-size: 0.8em; letter-spacing: 0.14em; text-transform: uppercase; color: var(--se-dim); }
.se-root .tw { display: grid; grid-template-columns: minmax(10em, 18em) minmax(6em, 1fr) 5.4em 2.4em; align-items: center; gap: 0.8em; padding: 0.5em; border-bottom: 1px solid #232a38; border-radius: 0.5em; }
.se-root .tw label small { display: block; color: var(--se-faint); font-size: 0.8em; }
.se-root .tw.ch label { color: var(--se-gold); }
.se-root .tw input[type=range] { width: 100%; height: 2em; touch-action: none; accent-color: var(--se-gold); }
.se-root .tw input[type=number] { width: 100%; text-align: right; font-family: var(--se-num); }
.se-root .tw.ch input[type=number] { color: var(--se-gold); border-color: #7a6220; }
.se-root .tw button { padding: 0; justify-content: center; }
.se-root .tw.cur { background: #2a2410; box-shadow: inset 0 0 0 2px var(--se-gold); }
.se-root .sets { padding: 0.7em 0.5em 0.8em; border-bottom: 1px solid #232a38; border-radius: 0.5em; }
.se-root .sets.cur { box-shadow: inset 0 0 0 2px var(--se-gold); }
.se-root .sets h3 { margin: 0 0 0.5em; }
.se-root .sets .row { display: flex; flex-wrap: wrap; gap: 0.5em; }
.se-root .sets p { margin: 0.6em 0 0; color: var(--se-dim); font-size: 0.9em; }
.se-root .none { color: var(--se-dim); padding: 1.5em 0; }
.se-root main { flex: 1; min-height: 0; overflow-y: auto; padding: 1em 1.2em 1.4em; }
.se-root .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(16em, 1fr)); gap: 0.9em; max-width: 70em; margin: 0 auto; }
.se-root .card { flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 0.4em; padding: 1em 1.1em; min-height: 7.5em; border-radius: 0.9em; white-space: normal; text-align: left; }
.se-root .card b { font-size: 1.1em; } .se-root .card span { color: var(--se-dim); font-size: 0.92em; }
.se-root .items { max-width: 50em; margin: 0 auto; display: flex; flex-direction: column; gap: 0.4em; }
.se-root .items button { justify-content: flex-start; width: 100%; }
.se-root .items small { color: var(--se-dim); margin-left: auto; }
.se-root .items h3 { margin: 0.9em 0 0.2em; font-size: 0.8em; letter-spacing: 0.14em; text-transform: uppercase; color: var(--se-dim); }
`;

export function ensureStyle(): void {
  if (typeof document === 'undefined' || document.getElementById?.('se-css')) return;
  const st = document.createElement('style');
  st.id = 'se-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
