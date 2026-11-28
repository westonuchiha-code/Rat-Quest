/**
 * The demo: a side view of the example game's jumps, drawn from its tuning table, with the Game Feel panel and the
 * Workshop over it. Move a slider and the arcs change at once. Run it with `npx vite standalone-editor/demo`.
 */
import { PadNav, ToolsPanel, TweakPanel, jumpArc, jumpReach, maxClimb, type Box } from '../src/index';
import { TUNING, jumpParams, makeTweaks } from '../examples/platformer';

const wrap = document.getElementById('game') as HTMLDivElement;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const reg = makeTweaks('standalone-editor.demo.v1');

// A little level of boxes for the jump check: a floor, steps going up, a far ledge.
const level: Box[] = [
  { x0: -2, x1: 30, y0: -1, y1: 0, z0: -2, z1: 2 },
  { x0: 6, x1: 8, y0: 0, y1: 1.5, z0: -2, z1: 2 },
  { x0: 10, x1: 12, y0: 0, y1: 3.5, z0: -2, z1: 2 },
  { x0: 15, x1: 17, y0: 0, y1: 6, z0: -2, z1: 2 },
  { x0: 22, x1: 24, y0: 0, y1: 12, z0: -2, z1: 2 },
];
let reached: Array<[number, number, number]> = [];

const feel = new TweakPanel(wrap, reg, { title: 'GAME FEEL', say: 'The arcs behind follow every change.', onClose: () => draw() });
const tools = new ToolsPanel(wrap, {
  jumpParams,
  level: () => ({
    boxes: level,
    start: { x: 0, y: 0, z: 0 },
    targets: [
      { name: 'the 1.5 step', x: 7, y: 1.5, z: 0 },
      { name: 'the 3.5 step', x: 11, y: 3.5, z: 0 },
      { name: 'the 6 step', x: 16, y: 6, z: 0 },
      { name: 'the 12 tower', x: 23, y: 12, z: 0 },
    ],
  }),
  showReach: (map) => {
    reached = map.points;
    draw();
  },
  warps: () => [
    { id: 'start', name: 'The start', group: 'The demo' },
    { id: 'tower', name: 'The tower', group: 'The demo', note: '12 up' },
  ],
  warp: (id) => console.log('warp to', id),
  spawns: () => [{ id: 'crate', name: 'A crate' }, { id: 'roach', name: 'A roach', group: 'Creatures' }],
  spawn: (id, at) => console.log('spawn', id, 'at', at),
  actions: () => [{ id: 'heal', name: 'Heal' }],
  act: () => 'Healed.',
  onClose: () => draw(),
}, feel);

const nav = new PadNav((a) => {
  if (feel.open) return a === 'menu' ? feel.hide() : feel.press(a);
  if (tools.open) return a === 'menu' ? tools.hide() : tools.press(a);
  if (a === 'menu') tools.show();
});
nav.start();
(document.getElementById('feel') as HTMLButtonElement).onclick = () => feel.show();
(document.getElementById('tools') as HTMLButtonElement).onclick = () => tools.show();
reg.onChange(() => draw());

function draw(): void {
  const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
  const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
  const s = Math.min(w / 32, h / 16);
  const X = (x: number): number => (x + 1) * s;
  const Y = (y: number): number => h - (y + 2) * s;
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2a3142';
  for (const b of level) ctx.fillRect(X(b.x0), Y(b.y1), (b.x1 - b.x0) * s, (b.y1 - b.y0) * s);
  ctx.fillStyle = '#4fd18b';
  for (const [x, , y] of reached) ctx.fillRect(X(x) - 2, Y(y) - 4, 4, 4);
  const p = jumpParams();
  const arc = (n: number, colour: string): void => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.beginPath();
    jumpArc(p, { airJumps: n }).forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke();
  };
  arc(0, '#9aa3b5');
  if (TUNING.jump.airJumps > 0) arc(TUNING.jump.airJumps, '#f2c14e');
  ctx.fillStyle = '#e9ecf2';
  ctx.font = `${14 * devicePixelRatio}px system-ui`;
  ctx.fillText(`Running jump across: ${jumpReach(p, 0).toFixed(2)}   Highest ledge: ${maxClimb(p).toFixed(2)}   Camera distance (no table): ${reg.get('camera.distance')}`, 16 * devicePixelRatio, h - 16 * devicePixelRatio);
}
addEventListener('resize', draw);
draw();
