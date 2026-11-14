// Button prompts: the right names and pictures for the pad in his hands (Xbox, PlayStation, Switch, Steam Deck) or the
// keyboard; Steam's word on what a pad really is; the player's own choice; and rumble strengths.
import { padKind, gamepadInfo, setPadKindOverride, actionsForButton } from '../src/core/controls';
import { bindings } from '../src/core/bindings';
import {
  padLabel, kindForSteamType, setGlyphMode, glyphMode, labelKind, prompt, helpLine, setDefaultDevice, lastDevice, promptStamp, loadGlyphMode, keyLabel,
} from '../src/ui/glyphs';
import { Rumble } from '../src/core/rumble';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

// ---- Which pad ----
check('the Steam Deck\'s own controls are a Deck', padKind('Valve Software Steam Deck Controller (STANDARD GAMEPAD Vendor: 28de Product: 1205)') === 'deck');
check('Steam\'s virtual pad (any pad through Steam Input) reads as an Xbox pad', padKind('Microsoft X-Box 360 pad 0 (STANDARD GAMEPAD Vendor: 28de Product: 11ff)') === 'xbox');
check('Deck names: A B X Y, L1 R1 L2 R2, VIEW and MENU', ['south', 'east', 'west', 'north', 'l1', 'r1', 'l2', 'r2', 'select', 'start'].map((b) => padLabel(b as never, 'deck')).join(' ') === 'A B X Y L1 R1 L2 R2 VIEW MENU');
check('Steam\'s controller types map to ours',
  kindForSteamType('PS5Controller') === 'playstation' && kindForSteamType('PS4Controller') === 'playstation' && kindForSteamType('SteamDeckController') === 'deck' &&
  kindForSteamType('XBoxOneController') === 'xbox' && kindForSteamType('SwitchProController') === 'nintendo' && kindForSteamType('GenericGamepad') === null && kindForSteamType(null) === null);
gamepadInfo.connected = true;
gamepadInfo.kind = 'xbox';
setPadKindOverride('playstation');
check('when Steam says it is a DualSense, the names follow (even though the pad says Xbox)', gamepadInfo.kind === 'playstation' && labelKind() === 'playstation');
setPadKindOverride(null);
gamepadInfo.kind = 'xbox';

// ---- The player's choice ----
const mem = new Map<string, string>();
const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
loadGlyphMode(store);
check('button pictures follow the pad by default', glyphMode() === 'auto' && labelKind() === 'xbox');
setGlyphMode('nintendo');
check('a chosen set wins over the pad, and is remembered', labelKind() === 'nintendo' && mem.get('ratquest.glyphs') === 'nintendo');
setGlyphMode('auto');
loadGlyphMode(store);
check('AUTO is remembered too', glyphMode() === 'auto');

// ---- Chips ----
check('pad: the jump button on an Xbox pad is a green A', /rqg-xbox-south">A</.test(prompt('jump', 'pad')));
check('keyboard: a keycap with the key\'s name', /rqg-key">SPACE</.test(prompt('jump', 'keyboard')) && /ENTER/.test(prompt('confirm', 'keyboard')) && /ESC/.test(prompt('back', 'keyboard')));
check('the phone test shows the touch pad\'s PlayStation shapes', /rqg-ps-south/.test(prompt('jump', 'touch')) && /<svg/.test(prompt('jump', 'touch')));
check('moving: WASD on a keyboard, the left stick on a pad', /WASD/.test(prompt('move', 'keyboard')) && /rqg-stick">L</.test(prompt('move', 'pad')) && /rqg-stick">R</.test(prompt('look', 'pad')));
check('menu tabs are the shoulder buttons (LB/RB on Xbox, L1/R1 on PlayStation and the Deck)', /LB/.test(prompt('tabPrev', 'pad')) && (setGlyphMode('deck'), /L1/.test(prompt('tabPrev', 'pad'))) && (setGlyphMode('playstation'), /R1/.test(prompt('tabNext', 'pad'))));
setGlyphMode('auto');
bindings.setKey('jump', 'KeyU');
bindings.setPad('jump', 'north');
check('prompts follow the player\'s own bindings', bindings.key('jump') === 'KeyU' && />U</.test(prompt('jump', 'keyboard')) && /rqg-xbox-north/.test(prompt('jump', 'pad')));
bindings.reset();
const line = helpLine([['confirm', 'select'], ['back', 'close']], 'pad');
check('a help line is chips and words', (line.match(/rqg-pair/g) ?? []).length === 2 && /select/.test(line) && /close/.test(line));
check('keys get short names', keyLabel('Escape') === 'ESC' && keyLabel('Delete') === 'DEL' && keyLabel('KeyJ') === 'J');

// ---- Before any input: the machine's default ----
gamepadInfo.connected = false;
gamepadInfo.kind = null;
setDefaultDevice('keyboard');
check('desktop: keyboard prompts before anything is pressed', lastDevice() === 'keyboard');
setDefaultDevice('pad');
check('Steam Deck: its pad prompts from the start', lastDevice() === 'pad' && labelKind() === 'deck');
const before = promptStamp();
setGlyphMode('xbox');
check('changing the choice changes what the screens redraw for', promptStamp() !== before);
setGlyphMode('auto');

// ---- Photo mode on a pad: the frame button is not the one that leaves ----
const frameBtn = bindings.pad('lock');
check('photo mode: frame (lock) and rat (view) are not on the back button', !actionsForButton(frameBtn).includes('back') && !actionsForButton('select').includes('back'));

// ---- Rumble strengths ----
const calls: Array<{ strong: number; weak: number }> = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
  getGamepads: () => [{ connected: true, vibrationActuator: { playEffect: (_t: string, p: { strongMagnitude: number; weakMagnitude: number }) => { calls.push({ strong: p.strongMagnitude, weak: p.weakMagnitude }); return Promise.resolve(); } } }],
} });
const rmem = new Map<string, string>();
const rstore = { getItem: (k: string) => rmem.get(k) ?? null, setItem: (k: string, v: string) => void rmem.set(k, v) };
// (Each check uses its own Rumble: a weaker buzz right after a stronger one is ignored on purpose.)
check('rumble is full by default', new Rumble(rstore).level() === 'full');
new Rumble(rstore).pulse(0.8, 0.6, 100);
const low = new Rumble(rstore);
low.setLevel('low');
low.pulse(0.8, 0.6, 100);
check('low is half as strong', calls.length === 2 && Math.abs(calls[1].strong - calls[0].strong / 2) < 1e-9 && Math.abs(calls[1].weak - calls[0].weak / 2) < 1e-9);
check('low is remembered', new Rumble(rstore).level() === 'low');
const off = new Rumble(rstore);
off.setLevel('off');
off.wedge();
check('off is silent', calls.length === 2 && !new Rumble(rstore).enabled());
rmem.set('ratquest.rumble', '1');
check('an older "on" means full', new Rumble(rstore).level() === 'full');
new Rumble(rstore).wedge();
check('a Golden Wedge is a big buzz', calls.length === 3 && calls[2].strong >= 0.5 && calls[2].weak >= 0.8);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
