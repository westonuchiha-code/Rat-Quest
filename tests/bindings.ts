// Rebinding: defaults, swapping, reserved keys, saving, and that pad presses follow the bindings.
import { Bindings, DEFAULT_BINDINGS } from '../src/core/bindings';
import { actionsForButton } from '../src/core/controls';
import { bindings } from '../src/core/bindings';
import { keyLabel, padLabel } from '../src/ui/glyphs';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const mem = (): { data: Record<string, string>; getItem(k: string): string | null; setItem(k: string, v: string): void } => {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
};

const st = mem();
const b = new Bindings(st);
check('defaults', b.key('jump') === 'Space' && b.pad('attack') === 'west' && b.pad('lock') === 'r2');
check('right shift follows left shift for sneak', b.keys('sneak').includes('ShiftRight'));
check('reserved keys are refused', !b.setKey('jump', 'Escape') && !b.setKey('jump', 'KeyW') && b.key('jump') === 'Space');
check('reserved buttons are refused', !b.setPad('jump', 'start') && b.pad('jump') === 'south');
b.setKey('attack', 'KeyF');
check('a new key is taken', b.key('attack') === 'KeyF');
b.setKey('dodge', 'KeyF');
check('taking a used key swaps the two', b.key('dodge') === 'KeyF' && b.key('attack') === DEFAULT_BINDINGS.dodge.key);
b.setPad('jump', 'north');
check('a used button swaps', b.pad('jump') === 'north' && b.pad('stow') === 'south');
const again = new Bindings(st);
check('bindings are saved and reloaded', again.key('dodge') === 'KeyF' && again.pad('jump') === 'north');
b.reset();
check('reset restores defaults', b.key('dodge') === 'KeyK' && b.pad('jump') === 'south');
st.data['ratquest.bindings'] = JSON.stringify({ jump: { key: 'KeyZ', pad: 'north' }, attack: { key: 'KeyZ', pad: 'north' } });
check('a corrupt save falls back to defaults', new Bindings(st).key('attack') === 'KeyJ');
st.data['ratquest.bindings'] = '{nope';
check('unreadable save is ignored', new Bindings(st).key('jump') === 'Space');

// Pad presses follow the live bindings.
bindings.reset();
check('south jumps and confirms by default', actionsForButton('south').includes('jump') && actionsForButton('south').includes('confirm'));
check('R1 attacks while spare', actionsForButton('r1').includes('attack') && actionsForButton('r1').includes('tabNext'));
bindings.setPad('dodge', 'r1');
check('R1 dodges once bound, and stops attacking', actionsForButton('r1').includes('dodge') && !actionsForButton('r1').includes('attack'));
bindings.reset();

check('keyboard names', keyLabel('KeyJ') === 'J' && keyLabel('Space') === 'SPACE' && keyLabel('ShiftLeft') === 'L-SHIFT' && keyLabel('Digit3') === '3');
check('pad names per kind', padLabel('south', 'playstation') === '✕' && padLabel('south', 'xbox') === 'A' && padLabel('east', 'nintendo') === 'A' && padLabel('l2', 'xbox') === 'LT' && padLabel('north', 'generic') === 'TOP BTN');

console.log(failures === 0 ? 'bindings: all pass' : `bindings: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
