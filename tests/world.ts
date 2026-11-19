// Checks the room layout for clipping: no solid may overlap another solid or the pit. Run with: npm run test:sim
import { buildLayout, findProblems, RING, PIT_HALF } from '../src/world/layout';

const layout = buildLayout();
const problems = findProblems(layout);

// Also confirm each ring platform sits fully outside the pit footprint.
const h = RING.size / 2;
let ringOk = true;
for (const b of layout.solids.filter((s) => s.kind === 'platform')) {
  const inPitX = b.x0 < PIT_HALF && b.x1 > -PIT_HALF;
  const inPitZ = b.z0 < PIT_HALF && b.z1 > -PIT_HALF;
  if (inPitX && inPitZ) ringOk = false;
}

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
}

check('no solid overlaps another solid or the pit', problems.length === 0, problems.slice(0, 5).join('; '));
check('ring platforms all stand outside the pit', ringOk);
check(
  'platform footprint is inside the room',
  layout.solids.every((s) => Math.abs(s.x0) <= 21 && Math.abs(s.x1) <= 21 && Math.abs(s.z0) <= 21 && Math.abs(s.z1) <= 21),
  `half ${h}`
);

if (failed) {
  console.log(`\n${failed} layout check(s) failed.`);
  process.exit(1);
}
console.log('\nLayout checks passed.');
