import type { NpcKind } from './npc';

/** Draws a chunky little face for the talk box, in a few big pixels, like the portraits in old games. */
export function drawPortrait(canvas: HTMLCanvasElement, kind: NpcKind = 'mouse'): void {
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
    px(4, 3, 5, 6, '#6e5e80'); // ears
    px(15, 3, 5, 6, '#6e5e80');
    px(5, 4, 3, 4, '#8a3a5a');
    px(16, 4, 3, 4, '#8a3a5a');
    px(6, 6, 12, 11, '#6e5e80'); // head
    px(9, 14, 6, 5, '#6e5e80'); // snout
    px(11, 18, 2, 1, '#2a1020'); // nose
    px(7, 4, 10, 2, '#2a2a34'); // crown band
    px(7, 1, 1, 3, '#8a8a9a'); // spikes
    px(11, 0, 2, 4, '#8a8a9a');
    px(16, 1, 1, 3, '#8a8a9a');
    px(7, 9, 4, 3, '#ff3a1a'); // glowing eyes
    px(13, 9, 4, 3, '#ff3a1a');
    px(8, 10, 1, 1, '#ffe0a0');
    px(14, 10, 1, 1, '#ffe0a0');
    px(7, 7, 4, 1, '#16101c'); // heavy brows
    px(13, 7, 4, 1, '#16101c');
    px(10, 19, 4, 1, '#3a1830'); // grin
    px(10, 19, 1, 2, '#f0ead8'); // fangs
    px(13, 19, 1, 2, '#f0ead8');
    px(2, 21, 20, 3, '#0c0810'); // cowl
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
