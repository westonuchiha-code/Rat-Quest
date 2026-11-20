// THE NEWCOMERS (npc/patrons.ts `class Mole`, `class Hedgehog`; the Green Room, Test Room 17: levels/greenroom.ts,
// 2026-11-20): two new kinds of character for Fable, two of each. Each is a kind with a voice and a portrait, can be
// cast in a scene, and does everything the Club's regulars do, standing on the floor or sitting on a stool.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { levelById } from '../src/levels/levels';
import { makePatron, patronLook, PATRON_KINDS, SEAT, type Doing, type PatronCtx, type PatronLook } from '../src/npc/patrons';
import { VOICES } from '../src/audio/speech';
import { PUPPET_NPCS } from '../src/cutscene/stage';
import { STOOL } from '../src/world/layout';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const CAST: Array<[string, 'mole' | 'hedgehog', PatronLook]> = [['Digger', 'mole', 'digger'], ['Dot', 'mole', 'dot'], ['Bramble', 'hedgehog', 'bramble'], ['Thistle', 'hedgehog', 'thistle']];

check('the mole and the hedgehog are kinds of their own, each with a voice, and a scene can cast them',
  (['mole', 'hedgehog'] as const).every((k) => (PATRON_KINDS as readonly string[]).includes(k) && !!VOICES[k] && (PUPPET_NPCS as readonly string[]).includes(k)));
check('each of the two of a kind is told apart by name', CAST.every(([name, kind, look]) => patronLook(kind, name) === look));

const room = levelById('greenroom')!;
check('the Green Room has the four of them, each with something to say', !!room && CAST.every(([name, kind]) => (room.npcs ?? []).some((n) => n.name === name && n.kind === kind && n.lines.length >= 2)));

const ctx = (time: number, o: Partial<PatronCtx> = {}): PatronCtx => ({ time, talking: false, mouth: 0, headYaw: 0, doing: 'stand', seated: false, turn: 0, ...o });
const box = new THREE.Box3();
const DT = 1 / 30;
for (const [name, kind, look] of CAST) {
  const body = makePatron(kind, look);
  const bad: string[] = [];
  const lows: Record<string, number> = {};
  const doings: Doing[] = ['stand', 'drink', 'chat', 'lean', 'cards', 'tend'];
  for (const doing of doings) {
    for (const seated of [false, true]) {
      if (seated && (doing === 'lean' || doing === 'tend')) continue;
      let low = Infinity;
      for (let i = 0; i < 120; i++) {
        body.update(DT, ctx(i * DT, { doing, seated, talking: i > 60, mouth: i > 60 ? Math.abs(Math.sin(i)) : 0, headYaw: 0.4 * Math.sin(i * 0.05) }));
        body.root.updateMatrixWorld(true);
        // Its lowest point, not counting what it holds (a mug can swing low).
        let any = false;
        body.root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.visible) return;
          let held = false;
          for (let q: THREE.Object3D | null = m; q; q = q.parent) if (!q.visible) held = true;
          if (held) return;
          box.setFromObject(m);
          if (!Number.isFinite(box.min.y)) bad.push(`${doing}${seated ? ' seated' : ''}`);
          low = Math.min(low, box.min.y);
          any = true;
        });
        if (!any) bad.push('nothing drawn');
      }
      lows[`${doing}${seated ? '/seated' : ''}`] = low;
    }
  }
  check(`${name} (${kind}): every way of being (standing, drinking, chatting, leaning, at cards, keeping bar; sitting) runs and stays whole`, bad.length === 0, bad.slice(0, 3).join(', '));
  const standLow = lows.stand;
  check(`...standing, ${name}'s feet are on the floor (not in it, not above it)`, Math.abs(standLow) < 0.02, `lowest ${standLow.toFixed(3)}`);
  const sitLow = lows['drink/seated'];
  check(`...sitting, ${name} is up on the stool, not sunk into it (its seat is ${SEAT})`, sitLow > SEAT - 0.03 && sitLow < SEAT + 0.06 && Math.abs(STOOL.h - SEAT) < 1e-9, `lowest ${sitLow.toFixed(3)}`);
  // Size: a little under the rat (a mole and a hedgehog are small things); taller than a stool.
  body.update(DT, ctx(0));
  body.root.updateMatrixWorld(true);
  box.setFromObject(body.root);
  check(`...${name} is small (shorter than the fox, taller than a stool) and his marker height is right`, box.max.y > 0.7 && box.max.y < 1.3 && Math.abs(body.height - box.max.y) < 0.3, `top ${box.max.y.toFixed(2)}, marker ${body.height}`);
}
// The two of a kind differ in more than colour.
{
  const count = (kind: 'mole' | 'hedgehog', look: PatronLook): number => {
    let n = 0;
    makePatron(kind, look).root.traverse((o) => void ((o as THREE.Mesh).isMesh && n++));
    return n;
  };
  check('the two moles and the two hedgehogs differ in their things, not only their colours (a helmet and lamp, spectacles and a scarf; an apron, a flower and a bow)', count('mole', 'digger') !== count('mole', 'dot') && count('hedgehog', 'bramble') !== count('hedgehog', 'thistle'));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
