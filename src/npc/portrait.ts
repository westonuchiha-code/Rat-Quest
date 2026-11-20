import { lookOf } from './npc';
import { patronLook } from './patrons';
import type { NpcKind } from './npc';

/** The name the knight goes by in a talk box (the Stand-in room: he can be spoken to there). */
export const KNIGHT = 'THE KNIGHT';

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
  px(0, 0, N, N, kind === 'bird' ? '#2a4a3a' : kind === 'villain' ? '#2a1030' : kind === 'pigeon' ? '#3a2a50' : kind === 'turtle' ? '#2e3a2a' : kind === 'fox' ? '#3a2a22' : kind === 'ferret' ? '#2e2a3a' : kind === 'owl' ? '#22303a' : kind === 'ant' ? '#2a2420' : kind === 'stag' ? '#221c2a' : kind === 'rat' ? '#2a1a30' : kind === 'mole' ? '#2a2620' : kind === 'hedgehog' ? '#2a3022' : '#2a3448');
  if (kind === 'rat' && name === KNIGHT) {
    // The knight himself (when someone else has his controls, in the Stand-in room): grey-brown fur, pink ears, his
    // steel helmet with its gold spike, dark eyes.
    px(0, 0, N, N, '#283040');
    px(2, 6, 6, 6, '#7a6a5e');
    px(16, 6, 6, 6, '#7a6a5e');
    px(3, 7, 4, 4, '#e8a0a8');
    px(17, 7, 4, 4, '#e8a0a8');
    px(5, 8, 14, 12, '#8a7a6c'); // head
    px(5, 4, 14, 5, '#a9b3bc'); // helmet
    px(4, 8, 16, 1, '#77818b'); // its rim
    px(11, 1, 2, 3, '#d4aa3c'); // its spike
    px(7, 11, 3, 3, '#14100c');
    px(14, 11, 3, 3, '#14100c');
    px(8, 11, 1, 1, '#ffffff');
    px(15, 11, 1, 1, '#ffffff');
    px(8, 15, 8, 5, '#b8a898'); // muzzle
    px(11, 15, 2, 2, '#f07a9c');
    px(4, 20, 16, 4, '#c84a3a'); // his scarf
    return;
  }
  if (kind === 'turtle') {
    const old = patronLook('turtle', name) === 'mo';
    const skin = old ? '#7c8f4e' : '#9fbf5a';
    px(9, 16, 6, 5, old ? '#5c6c3a' : '#7a9a44'); // neck
    px(6, 6, 12, 10, skin); // head
    px(7, 5, 10, 2, skin);
    px(8, 13, 8, 4, old ? '#c9b56a' : '#e0c060'); // beak
    px(9, 16, 6, 1, '#6a5a30');
    px(7, 9, 3, old ? 2 : 3, '#f4f0e4'); // eyes
    px(14, 9, 3, old ? 2 : 3, '#f4f0e4');
    px(8, 10, 1, 1, '#14100c');
    px(15, 10, 1, 1, '#14100c');
    if (old) {
      px(6, 8, 5, 1, '#14100c'); // glasses
      px(13, 8, 5, 1, '#14100c');
      px(6, 11, 5, 1, '#14100c');
      px(13, 11, 5, 1, '#14100c');
      px(11, 9, 2, 1, '#14100c');
      px(10, 17, 4, 5, '#e9e6da'); // beard
      px(11, 22, 2, 1, '#e9e6da');
    } else {
      px(5, 3, 14, 3, '#4a6a8a'); // flat cap
      px(4, 6, 9, 1, '#3a566f');
      px(6, 19, 12, 3, '#c0392b'); // kerchief
    }
    px(2, 22, 20, 2, old ? '#4f5a32' : '#8a5a30'); // the top of his shell
  } else if (kind === 'fox') {
    const ash = patronLook('fox', name) === 'ash';
    const coat = ash ? '#8a94a8' : '#d8702a';
    const cream = ash ? '#e6e8ee' : '#f3e3c4';
    px(4, 1, 5, 7, coat); // ears
    px(15, 1, 5, ash ? 7 : 7, coat);
    px(5, 3, 3, 4, '#33241c');
    px(16, 3, 3, 4, '#33241c');
    if (ash) px(4, 1, 5, 3, '#2a3448'); // the tip of one ear is gone
    px(5, 7, 14, 9, coat); // head
    px(3, 12, 4, 4, cream); // cheek tufts
    px(17, 12, 4, 4, cream);
    px(8, 13, 8, 6, cream); // muzzle
    px(10, 18, 4, 2, cream);
    px(11, 17, 2, 2, '#14100c'); // nose
    px(7, 10, 3, 2, '#f4f0e4'); // sly eyes
    px(8, 10, 1, 2, '#14100c');
    if (ash) {
      px(13, 9, 5, 4, '#1c1c22'); // eyepatch
      px(5, 7, 14, 1, '#1c1c22');
    } else {
      px(14, 10, 3, 2, '#f4f0e4');
      px(15, 10, 1, 2, '#14100c');
      px(20, 5, 2, 2, '#e8b83a'); // earring
    }
    px(4, 20, 16, 4, ash ? '#6a3f8f' : '#2f8f8a'); // neckerchief
  } else if (kind === 'rat') {
    // Jinx: dark fur, big ears (a notch out of one, two gold rings in it), a fringe over one eye, black to pink.
    px(2, 2, 7, 7, '#3e3846');
    px(15, 2, 7, 7, '#3e3846');
    px(3, 3, 5, 5, '#e58fb0');
    px(16, 3, 5, 5, '#e58fb0');
    px(2, 2, 3, 3, '#2a1a30'); // the notch
    px(1, 6, 1, 1, '#f2c832');
    px(1, 8, 1, 1, '#f2c832');
    px(5, 6, 14, 12, '#5a5262'); // head
    px(8, 13, 8, 5, '#eadcd6'); // muzzle
    px(11, 14, 2, 2, '#f07a9c');
    px(6, 9, 5, 1, '#7a3cff'); // a violet lid
    px(6, 10, 4, 3, '#f4f0e4');
    px(8, 10, 2, 3, '#14100c');
    px(8, 4, 12, 4, '#2a1c3a'); // the fringe
    px(13, 8, 8, 3, '#2a1c3a');
    px(13, 11, 7, 3, '#b02c78');
    px(15, 14, 4, 2, '#ff3e9a');
    px(6, 19, 12, 2, '#1a1620'); // a studded collar
    for (const x of [7, 10, 13, 16]) px(x, 19, 1, 1, '#d8d8e4');
    px(4, 21, 16, 3, '#34303e');
  } else if (kind === 'mole') {
    // A round velvet head, a long pink nose, eyes he can hardly open; a helmet and lamp, or round spectacles.
    const dot = patronLook('mole', name) === 'dot';
    const coat = dot ? '#26222c' : '#3a3440';
    px(5, 6, 14, 12, coat);
    px(4, 8, 16, 8, coat);
    px(7, 11, 3, 1, '#14100c'); // squinting eyes
    px(14, 11, 3, 1, '#14100c');
    px(10, 12, 4, 6, dot ? '#f4b4bc' : '#e8a0a0'); // the snout
    px(9, 17, 6, 3, dot ? '#f4b4bc' : '#e8a0a0');
    px(11, 19, 2, 1, '#b87070');
    if (dot) {
      px(6, 10, 5, 1, '#2a2018'); // spectacles
      px(13, 10, 5, 1, '#2a2018');
      px(6, 13, 5, 1, '#2a2018');
      px(13, 13, 5, 1, '#2a2018');
      px(11, 11, 2, 1, '#2a2018');
      px(4, 20, 16, 3, '#3a8a6a'); // the scarf
      px(6, 20, 2, 3, '#e8e0c8');
      px(12, 20, 2, 3, '#e8e0c8');
      px(18, 20, 2, 3, '#e8e0c8');
    } else {
      px(4, 2, 16, 5, '#e8c040'); // the helmet
      px(3, 6, 18, 1, '#b8902a');
      px(10, 3, 4, 3, '#fff2a0'); // its lamp
      px(4, 21, 16, 3, '#7a5232');
    }
  } else if (kind === 'hedgehog') {
    // Spines round the top of a pale face, a pointed snout with a black nose.
    const th = patronLook('hedgehog', name) === 'thistle';
    const spine = th ? '#b8a690' : '#5e4028';
    const tip = th ? '#fbf5ea' : '#e8d4b0';
    for (let x = 2; x < 22; x += 3) px(x, 2 + (x % 2), 2, 6, spine);
    for (let x = 3; x < 21; x += 3) px(x, 1 + (x % 2), 1, 2, tip);
    px(2, 6, 3, 10, spine);
    px(19, 6, 3, 10, spine);
    px(5, 7, 14, 10, th ? '#eedcc6' : '#d8b48a'); // face
    px(7, 10, 3, 3, '#f4f0e4');
    px(14, 10, 3, 3, '#f4f0e4');
    px(8, 11, 1, 2, '#14100c');
    px(15, 11, 1, 2, '#14100c');
    px(9, 14, 6, 4, th ? '#fbf1e2' : '#f2dcbc'); // the snout
    px(10, 18, 4, 2, th ? '#fbf1e2' : '#f2dcbc');
    px(11, 18, 2, 2, '#1a1210');
    if (th) {
      px(5, 14, 2, 2, '#f0a0a8'); // rosy cheeks
      px(17, 14, 2, 2, '#f0a0a8');
      px(16, 2, 4, 4, '#a860c8'); // the thistle
      px(7, 20, 10, 3, '#8a4a9a'); // a bow
    } else {
      px(4, 20, 16, 4, '#4a7a3a'); // the apron's bib
    }
  } else if (kind === 'ferret') {
    const pale = patronLook('ferret', name) === 'biscuit';
    const coat = pale ? '#ead9b6' : '#7a5236';
    px(5, 4, 4, 4, coat); // small round ears
    px(15, 4, 4, 4, coat);
    px(6, 5, 2, 2, '#fbf3df');
    px(16, 5, 2, 2, '#fbf3df');
    px(6, 6, 12, 10, coat); // head
    px(5, 9, 14, 4, pale ? '#c9a878' : '#2e2018'); // the mask
    px(7, 10, 3, 2, '#f4f0e4');
    px(14, 10, 3, 2, '#f4f0e4');
    px(8, 10, 1, 2, '#14100c');
    px(15, 10, 1, 2, '#14100c');
    px(9, 13, 6, 5, '#fbf3df'); // muzzle
    px(11, 14, 2, 2, pale ? '#e08a8a' : '#2a1a14'); // nose
    px(7, 18, 10, 2, coat); // a long neck
    px(4, 20, 16, 4, pale ? '#a83a32' : '#b8862a'); // waistcoat
    px(10, 20, 4, 4, '#fbf3df');
  } else if (kind === 'owl') {
    const snow = patronLook('owl', name) === 'snow';
    const coat = snow ? '#e9edf2' : '#7a5a3a';
    const face = snow ? '#fdfdfd' : '#e6d6b4';
    if (!snow) {
      px(4, 1, 3, 5, '#4e3824'); // tufts
      px(17, 1, 3, 5, '#4e3824');
    }
    px(3, 4, 18, 14, coat); // a wide head
    px(5, 6, 14, 11, face);
    px(5, 7, 6, 6, snow ? '#f2d23a' : '#e8a020'); // two great eyes
    px(13, 7, 6, 6, snow ? '#f2d23a' : '#e8a020');
    px(7, 9, 2, 2, '#14100c');
    px(15, 9, 2, 2, '#14100c');
    px(11, 12, 2, 4, snow ? '#3a3a44' : '#d9a83a'); // beak
    if (snow) {
      px(12, 6, 8, 1, '#d9b24a'); // a monocle
      px(12, 13, 8, 1, '#d9b24a');
      px(12, 6, 1, 8, '#d9b24a');
      px(19, 6, 1, 8, '#d9b24a');
      px(8, 19, 8, 3, '#8a2a3a'); // bow tie
    } else px(6, 19, 12, 5, '#e6e0cf'); // apron
    px(2, 22, 20, 2, coat);
  } else if (kind === 'stag') {
    px(2, 1, 3, 8, '#2a1e16'); // the great jaws, up either side
    px(19, 1, 3, 8, '#2a1e16');
    px(4, 1, 3, 2, '#2a1e16');
    px(17, 1, 3, 2, '#2a1e16');
    px(4, 7, 3, 3, '#2a1e16');
    px(17, 7, 3, 3, '#2a1e16');
    px(6, 6, 12, 11, '#4a2e1e'); // head
    px(7, 9, 3, 3, '#e8a020'); // eyes
    px(14, 9, 3, 3, '#e8a020');
    px(8, 10, 1, 1, '#14100c');
    px(15, 10, 1, 1, '#14100c');
    px(9, 14, 6, 2, '#2a1e16');
    px(3, 18, 18, 6, '#6a6a74'); // armour at his shoulders
    px(3, 18, 18, 1, '#9a9aa4');
  } else if (kind === 'ant') {
    px(6, 7, 12, 11, '#7a3b24'); // head
    px(7, 6, 10, 2, '#7a3b24');
    px(6, 2, 1, 5, '#3a2018'); // feelers
    px(17, 2, 1, 5, '#3a2018');
    px(5, 1, 2, 2, '#3a2018');
    px(17, 1, 2, 2, '#3a2018');
    px(7, 9, 4, 4, '#14100c'); // big dark eyes
    px(13, 9, 4, 4, '#14100c');
    px(8, 10, 1, 1, '#f4f0e4');
    px(14, 10, 1, 1, '#f4f0e4');
    px(8, 16, 3, 4, '#c9b56a'); // jaws
    px(13, 16, 3, 4, '#c9b56a');
    px(5, 5, 14, 2, '#8f8a78'); // the rim of its helmet, pushed back
    px(4, 20, 16, 4, '#5c2c1a');
  } else if (kind === 'pigeon') {
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
