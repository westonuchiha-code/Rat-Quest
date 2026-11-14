import { lookOf } from './npc';
import type { NpcKind } from './npc';

/** Draws a chunky little face for the talk box, in a few big pixels, like the portraits in old games. */
export function drawPortrait(canvas: HTMLCanvasElement, kind: NpcKind = 'mouse', name = ''): void {
  const look = lookOf(kind, name);
  const N = 24;
  canvas.width = N;
  canvas.height = N;
  const g = canvas.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, N, N);
  const px = (x: number, y: number, w: number, h: number, c: string): void => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  px(0, 0, N, N, kind === 'bird' ? '#2a4a3a' : kind === 'villain' ? '#2a1030' : kind === 'pigeon' ? '#3a2a50' : '#2a3448');
  if (kind === 'pigeon') {
    px(6, 5, 12, 13, '#8d93a0'); // head
    px(7, 4, 10, 3, '#8d93a0');
    px(6, 14, 12, 4, '#2f8f6a'); // green neck
    px(8, 17, 8, 2, '#b06ac0');
    px(5, 9, 6, 3, '#101014'); // shades
    px(13, 9, 6, 3, '#101014');
    px(11, 9, 2, 1, '#101014');
    px(6, 9, 2, 1, '#ffffff');
    px(14, 9, 2, 1, '#ffffff');
    px(10, 12, 4, 3, '#e8e0d0'); // beak
    px(11, 12, 2, 1, '#ffffff');
    px(4, 20, 16, 1, '#e8c040'); // chain
    px(11, 21, 2, 2, '#e8c040');
    px(2, 22, 20, 2, '#5f6572');
  } else if (kind === 'villain') {
    // The gaunt king: a tall jagged crown low on his brow, torn ears lying out to the sides, a scowl over small burning
    // eyes, a long thin snout, and two long whiskers a side hanging down past his chin.
    px(2, 19, 20, 5, '#0e0818'); // robe
    px(1, 12, 3, 9, '#8a1c2c'); // the collar's crimson, either side
    px(20, 12, 3, 9, '#8a1c2c');
    px(1, 11, 2, 2, '#120a1a');
    px(21, 11, 2, 2, '#120a1a');
    px(2, 8, 5, 4, '#6e5e80'); // ears
    px(17, 8, 5, 4, '#6e5e80');
    px(3, 9, 3, 2, '#7a4a68');
    px(18, 9, 3, 2, '#7a4a68');
    px(2, 8, 1, 1, '#2a1030'); // a bite out of each
    px(21, 8, 1, 1, '#2a1030');
    px(7, 7, 10, 9, '#6e5e80'); // head
    px(8, 16, 8, 2, '#6e5e80');
    px(7, 12, 2, 4, '#4a3e5a'); // hollow cheeks
    px(15, 12, 2, 4, '#4a3e5a');
    px(10, 12, 4, 8, '#7c6c8e'); // the long snout
    px(10, 19, 4, 1, '#c4b8cc');
    px(11, 20, 2, 1, '#2a1020'); // nose
    px(11, 21, 1, 2, '#e8dcc0'); // teeth
    px(12, 21, 1, 2, '#e8dcc0');
    px(6, 6, 12, 2, '#34343e'); // crown band
    px(7, 1, 1, 5, '#8a8a9a'); // spikes, uneven
    px(9, 3, 1, 3, '#8a8a9a');
    px(11, 0, 2, 6, '#8a8a9a');
    px(14, 4, 1, 2, '#8a8a9a');
    px(16, 2, 1, 4, '#8a8a9a');
    px(11, 6, 2, 2, '#d8203a'); // the red stone
    px(7, 10, 3, 2, '#1a0e1e'); // sunken eyes
    px(14, 10, 3, 2, '#1a0e1e');
    px(8, 10, 2, 2, '#ff3a1a');
    px(14, 10, 2, 2, '#ff3a1a');
    px(9, 10, 1, 1, '#ffc040');
    px(14, 10, 1, 1, '#ffc040');
    px(7, 9, 2, 1, '#2a1e34'); // the scowl: brows low over the nose
    px(9, 10, 1, 1, '#2a1e34');
    px(15, 9, 2, 1, '#2a1e34');
    px(14, 10, 1, 1, '#2a1e34');
    // Whiskers: out from the snout, then down.
    for (const [x, y, w, h] of [[7, 17, 3, 1], [6, 18, 1, 4], [5, 16, 5, 1], [4, 17, 1, 3], [14, 17, 3, 1], [17, 18, 1, 4], [14, 16, 5, 1], [19, 17, 1, 3]]) px(x, y, w, h, '#e4dcec');
  } else if (look === 'wren') {
    px(5, 6, 14, 13, '#c8905a'); // head
    px(7, 4, 10, 3, '#c8905a');
    px(6, 4, 12, 3, '#8a5c36'); // brown crown
    px(8, 1, 2, 4, '#e06a8a'); // the pink feather
    px(6, 8, 5, 1, '#f0dcb8'); // pale stripes over the eyes
    px(13, 8, 5, 1, '#f0dcb8');
    px(8, 10, 3, 3, '#101010'); // eyes
    px(13, 10, 3, 3, '#101010');
    px(9, 10, 1, 1, '#fff');
    px(14, 10, 1, 1, '#fff');
    px(8, 14, 8, 4, '#ecd8b0'); // pale throat
    px(11, 13, 2, 4, '#f0c040'); // thin beak
    px(11, 17, 2, 1, '#c89a20');
    px(4, 19, 16, 4, '#2a8880'); // teal collar
    px(11, 20, 2, 2, '#e8c040');
  } else if (kind === 'bird') {
    px(5, 6, 14, 13, '#f2c230'); // head
    px(7, 4, 10, 3, '#f2c230');
    px(6, 5, 12, 3, '#2e2e34'); // black cap
    px(11, 1, 2, 4, '#2e2e34'); // tuft
    px(8, 10, 3, 3, '#101010'); // eyes
    px(13, 10, 3, 3, '#101010');
    px(9, 10, 1, 1, '#fff');
    px(14, 10, 1, 1, '#fff');
    px(10, 13, 4, 3, '#e88a30'); // beak
    px(11, 16, 2, 1, '#b8661e');
    px(4, 19, 16, 4, '#c83a3a'); // neckerchief
    px(7, 19, 3, 1, '#e86a6a');
  } else if (look === 'mort') {
    px(6, 7, 12, 12, '#9a8aa0'); // head
    px(3, 4, 6, 6, '#9a8aa0'); // ears, drooping
    px(15, 4, 6, 6, '#9a8aa0');
    px(4, 5, 4, 4, '#c8a0b8');
    px(16, 5, 4, 4, '#c8a0b8');
    px(6, 4, 12, 4, '#8a3a4a'); // slouching hat
    px(6, 7, 12, 1, '#e0d8b0');
    px(16, 3, 4, 3, '#6a2a3a');
    px(8, 12, 3, 2, '#101010'); // half-shut eyes
    px(13, 12, 3, 2, '#101010');
    px(8, 11, 3, 1, '#7a6a80'); // heavy lids
    px(13, 11, 3, 1, '#7a6a80');
    px(9, 15, 6, 3, '#c8bccc'); // muzzle
    px(11, 15, 2, 2, '#7a5a70'); // nose
    px(4, 19, 16, 5, '#6a7a3a'); // olive jumper
    px(4, 21, 16, 1, '#e0d8b0');
  } else {
    px(6, 7, 12, 12, '#d8c8a8'); // head
    px(3, 3, 6, 6, '#d8c8a8'); // ears
    px(15, 3, 6, 6, '#d8c8a8');
    px(4, 4, 4, 4, '#e8a8a0');
    px(16, 4, 4, 4, '#e8a8a0');
    px(6, 5, 12, 3, '#4a8a3a'); // cap
    px(8, 11, 3, 3, '#101010');
    px(13, 11, 3, 3, '#101010');
    px(11, 15, 3, 2, '#e87a8a'); // nose
    px(4, 19, 16, 4, '#3a5a8a'); // cloak
  }
  // A dark edge, so it reads on any background.
  g.strokeStyle = '#0a0a0a';
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, N - 1, N - 1);
}
