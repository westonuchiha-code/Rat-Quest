// Rumble: it is silent without a pad, remembers on/off, and sends the right effect to a pad that can vibrate.
import { Rumble } from '../src/core/rumble';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const mem = new Map<string, string>();
const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
const r = new Rumble(store);
check('on by default', r.enabled());
r.hit(); // no navigator: must not throw
check('no pad: nothing happens', true);
r.setEnabled(false);
check('off is remembered', !new Rumble(store).enabled());

const calls: Array<{ duration: number; strong: number; weak: number }> = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
  getGamepads: () => [{ connected: true, vibrationActuator: { playEffect: (_t: string, p: { duration: number; strongMagnitude: number; weakMagnitude: number }) => { calls.push({ duration: p.duration, strong: p.strongMagnitude, weak: p.weakMagnitude }); return Promise.resolve(); } } }],
} });
const r2 = new Rumble(null);
r2.kill();
check('a pad that can vibrate gets a buzz', calls.length === 1 && calls[0].strong > 0 && calls[0].duration > 0);
r2.setEnabled(false);
r2.hurt();
check('off means silent', calls.length === 1);
// An embedded viewer (a chat app's file preview) forbids gamepads: asking must not stop the game.
let asked = 0;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => { asked++; throw new Error('SecurityError: gamepad is disallowed by permissions policy'); } } });
const r3 = new Rumble(null);
let threw = false;
try { r3.land(20); r3.hurt(); r3.kill(); } catch { threw = true; }
check('a forbidden gamepad does not throw, and is asked only once', !threw && asked === 1, `asked ${asked}`);
if (failures) { console.log(`${failures} FAILED`); process.exit(1); }
