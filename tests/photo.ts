// Photo mode's maths: the looks (the same filter chain shown live and baked into the saved picture), and the camera
// that circles him (starts on the game's own shot, stays inside its limits).
import { LOOKS, POSES, FRAMES, PHOTO_CAM, applyLook, lookCss, orbitFrom, orbitPosition, photoScale, stepOrbit } from '../src/ui/photoMode';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const px = (r: number, g: number, b: number): number[] => [r, g, b, 255];
const run = (name: string, p: number[]): number[] => {
  const d = [...p];
  applyLook(d, LOOKS.find((l) => l.name === name)!);
  return d;
};
check('there are several looks, poses and frames', LOOKS.length >= 5 && POSES.length >= 5 && FRAMES.length >= 3);
check('Natural changes nothing', JSON.stringify(run('Natural', px(12, 200, 90))) === JSON.stringify(px(12, 200, 90)) && lookCss(LOOKS[0]) === 'none');
const noir = run('Noir', px(200, 60, 30));
check('Noir is black and white', noir[0] === noir[1] && noir[1] === noir[2], noir.slice(0, 3).join(','));
const sep = run('Sepia', px(128, 128, 128));
check('Sepia turns grey brown (red over green over blue)', sep[0] > sep[1] && sep[1] > sep[2], sep.slice(0, 3).join(','));
const cold = run('Cold', px(128, 128, 128));
check('Cold turns grey blue', cold[2] > cold[0], cold.slice(0, 3).join(','));
const warm = run('Warm', px(128, 128, 128));
check('Warm turns grey warm', warm[0] > warm[2], warm.slice(0, 3).join(','));
check('the alpha is left alone and values stay in range', [noir, sep, cold, warm].every((p) => p[3] === 255 && p.slice(0, 3).every((v) => v >= 0 && v <= 255)));
check(
  'the live CSS names each step the way CSS spells it',
  lookCss(LOOKS.find((l) => l.name === 'Cold')!).includes('hue-rotate(175deg)')
    && lookCss(LOOKS.find((l) => l.name === 'Sepia')!).startsWith('sepia(')
);

// The camera.
const rat = { x: 3, y: 2, z: -4 };
const cam = { x: 6, y: 5.5, z: 1 };
const o = orbitFrom(cam, rat, 1, 60);
const back = orbitPosition(o, rat);
check('photo mode starts with the camera where the game had it', Math.hypot(back.x - cam.x, back.y - cam.y, back.z - cam.z) < 1e-6);
let far = o;
for (let i = 0; i < 600; i++) far = stepOrbit(far, { orbitX: 0, orbitY: 1, zoom: -1, rise: 1, fov: -1 }, 1 / 60);
check(
  'it cannot go further, higher or wider than its limits',
  far.dist === PHOTO_CAM.maxDist
    && far.pitch === PHOTO_CAM.maxPitch
    && far.rise === PHOTO_CAM.maxRise
    && far.fov === PHOTO_CAM.maxFov
);
let near = o;
for (let i = 0; i < 600; i++) near = stepOrbit(near, { orbitX: 1, orbitY: -1, zoom: 1, rise: -1, fov: 1 }, 1 / 60);
check(
  '...or closer, lower or narrower',
  near.dist === PHOTO_CAM.minDist
    && near.pitch === PHOTO_CAM.minPitch
    && near.rise === PHOTO_CAM.minRise
    && near.fov === PHOTO_CAM.minFov
);
check(
  'circling round keeps the distance',
  Math.abs(Math.hypot(orbitPosition(near, rat).x - rat.x, orbitPosition(near, rat).y - rat.y - near.rise, orbitPosition(near, rat).z - rat.z) - near.dist) < 1e-6
);

check(
  'a picture is made big enough to share (long side 1600 or more, whole steps so pixels stay sharp)',
  photoScale(523, 240) * 523 >= 1600
    && Number.isInteger(photoScale(523, 240))
    && photoScale(2000, 1000) === 1
);

console.log(failures === 0 ? 'photo: all pass' : `photo: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
