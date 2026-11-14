const PREVENT_DEFAULT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const down = new Set<string>();
const pressed = new Set<string>();

let lastKeyAt = 0;
let lastCode: string | null = null;

const hasWindow = typeof window !== 'undefined';
if (hasWindow) window.addEventListener('keydown', (e) => {
  lastKeyAt = performance.now();
  if (!e.repeat) lastCode = e.code;
  if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
  if (!e.repeat && !down.has(e.code)) pressed.add(e.code);
  down.add(e.code);
});

if (hasWindow) window.addEventListener('keyup', (e) => {
  down.delete(e.code);
});

if (hasWindow) window.addEventListener('blur', () => {
  down.clear();
  pressed.clear();
});

/** Keyboard state. Presses are latched until a simulation tick consumes them. */
export const input = {
  /** When a key was last pressed (milliseconds), for choosing which button names to show. */
  lastKeyAt(): number {
    return lastKeyAt;
  },
  /** The next key pressed since the last call, or null. Used while waiting for a new key binding. */
  takeAnyPressed(): string | null {
    const c = lastCode;
    lastCode = null;
    pressed.clear();
    return c;
  },
  clearLast(): void {
    lastCode = null;
  },
  isDown(code: string): boolean {
    return down.has(code);
  },
  consumePressed(code: string): boolean {
    if (pressed.has(code)) {
      pressed.delete(code);
      return true;
    }
    return false;
  },
};
