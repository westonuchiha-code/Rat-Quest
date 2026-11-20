// Must be first: turns off color management before any THREE.Color is created.
import './ui/fonts';
import './core/colorSetup';
import * as THREE from 'three';
import { ps1Uniforms, lyingOn } from './render/ps1Material';
import { SwordTrail } from './render/swordTrail';
import { input } from './core/input';
import { TUNING } from './data/tuning';
import { CHAMBER_OPTIONS, Chamber, buildChamber, storyPower } from './world/chamber';
import { MusicFloor, noteRate } from './world/musicFloor';
import { leversOn, strikeThings } from './world/strikeables';
import { HAZARD, HazardFoes, carry as beltCarry, hurt as hazardHurt, lift as fanLift, sounds as hazardSounds } from './world/hazards';
import { CollectibleTracker, browserStorage } from './world/collectibles';
import { CollectibleVisuals } from './world/collectibleMeshes';
import { PlayerController } from './player/controller';
import { DREAM_LOOK, RatModel, RIDE_MOUNT, RIDE_MOUNT_LAND } from './player/ratModel';
import { ATTACK_CLIPS } from './player/animations';
import { Scuttler, ScuttlerState } from './enemies/scuttler';
import { GRIM, Grimsqueak } from './enemies/grimsqueak';
import { Ambience, worldSoundFor } from './audio/ambience';
import { MoteField } from './world/motes';
import { SENSES } from './enemies/foe';
import type { GrimState, Orb, Ring } from './enemies/grimsqueak';
import { GRIM_FIGHT_FLOAT, type GrimGesture , type GrimInput } from './npc/grimsqueakModel';
import { Director } from './enemies/director';
import { Toad, ToadState, Glob, stepGlobs } from './enemies/toad';
import { ToadModel } from './enemies/toadModel';
import { IRONBACK, Ironback, IronbackState } from './enemies/ironback';
import { IronbackModel } from './enemies/ironbackModel';
import { Guard } from './enemies/guard';
import { GuardModel } from './enemies/guardModel';
import { buildPlate, buttonStep, pressPlate, raisePlate } from './world/plates';
import { isDown, heldTurn, carryPlace, groundUnder, liftFoe, liftTarget, putDownSpot, startThrow, stepThrown, throwAim, thrownAs, type Target, type Thrown } from './world/lifting';
import type { Crate } from './world/crates';
import { pinnedUnder } from './world/crush';
import { MANTIS, Mantis } from './enemies/mantis';
import { MantisModel } from './enemies/mantisModel';
import { STAG, Stag } from './enemies/stag';
import { Brood } from './enemies/brood';
import { BroodModel } from './enemies/broodModel';
import { Wyrm } from './enemies/wyrm';
import { Widow } from './enemies/widow';
import { WidowModel } from './enemies/widowModel';
import { WyrmModel } from './enemies/wyrmModel';
import { BossBar } from './ui/bossBar';
import { Workshop } from './ui/workshop';
import { DEV, devSummary } from './core/devSwitches';
import { HitShapes } from './render/hitShapes';
import { StagModel } from './enemies/stagModel';
import { Bat, BAT, rouseRoost } from './enemies/bat';
import { Hornet } from './enemies/hornet';
import { HornetModel } from './enemies/hornetModel';
import { ANT, Ant, pairAnts } from './enemies/ant';
import { AntModel } from './enemies/antModel';
import { FIREFLY, Firefly } from './enemies/firefly';
import { FireflyModel } from './enemies/fireflyModel';
import { SCORPION, Scorpion } from './enemies/scorpion';
import { ScorpionModel } from './enemies/scorpionModel';
import { Roller } from './enemies/roller';
import { RollerModel } from './enemies/rollerModel';
import { blow, gasAt, gasNear, gustsOf, jetsOf, type Gust } from './world/gusts';
import { shadowSpokes } from './world/shadow';
import { ShadowCuts } from './render/cutShadow';
import { Dozer, dreamify } from './world/dozers';
import { railCurve } from './world/rails';
import { PICTURE, pictureSize } from './render/picture';
import { autoLayer } from './render/layering';
import { SkyDome } from './world/sky';
import { drawnHeight, safeToReturnTo, fallFrom, fellTooFar, fallCost } from './player/standing';
import { compileCutscene, sampleCutscene, CUT_FPS, type Cutscene, type CutsceneDef } from './cutscene/cutscene';
import { CutStage } from './cutscene/stage';
import { CUTSCENES, cutsceneById } from './cutscene/scenes';
import { Flames, flameHeat, groundFrom, makeEmber, stepEmbers, type Ember } from './world/embers';
import { EmberFx, type FxLight } from './world/emberFx';
import { BatModel } from './enemies/batModel';
import type { Foe } from './enemies/foe';
import { ScuttlerModel } from './enemies/scuttlerModel';
import { CombatEvents, pickAim, resolveCombat, resolveGlobs, resolveFlames } from './combat/combat';
import { FollowCamera } from './camera/followCamera';
import { Action, controlSources, gamepadControls, gamepadDpad, gamepadInfo, padControls, pollGamepad } from './core/controls';
import { PadShaper } from './levels/place3d';
import { bindings, BindAction, BIND_ACTIONS, BIND_NAMES } from './core/bindings';
import { ensureGlyphCss, GLYPH_MODES, glyphMode, glyphModeLabel, helpLine, keyChip, keyLabel, kindForSteamType, lastDevice, loadGlyphMode, padLabel, pair, prompt, promptStamp, setDefaultDevice, setGlyphMode } from './ui/glyphs';
import { setPadKindOverride } from './core/controls';
import type { LevelRow } from './ui/menu';
import { Menu, MenuKey } from './ui/menu';
import { RatPreview } from './ui/ratPreview';
import { Discoveries } from './core/stickers';
import { STICKERS, STICKER_GROUPS, charIdFor } from './data/stickers';
import { itemIcon, stickerIcon } from './ui/icons';
import { newestSave, readSave, SaveData, SaveSlot, writeSave } from './core/save';
import { copyFile, eraseFile, FILE_COUNT, fileSummary, FileStore, formatPlayed, lastFile, readMeta, setLastFile, writeMeta } from './core/slots';
import { installTouchPad } from './dev/touchPad';
import { Hud } from './ui/hud';
import { Debris } from './world/debris';
import { ITEMS, gearMods } from './data/equipment';
import { Equipment } from './player/equipment';
import { PickupVisuals } from './world/pickups';
import { LevelProgress } from './core/levelProgress';
import { GoalTracker, keepersOf, shyShows } from './levels/goals';
import { fireAt, inBrazierFire , slimeZones } from './world/layout';
import { ALL_LEVELS, ARCHIVE, LEVELS, TEST_ROOMS, levelById, setExtraLevels } from './levels/levels';
import { feelOf } from './data/feel';
import { HALL_ID } from './levels/testRooms';
import { wayOutOf } from './levels/wayOut';
import { MyLevels } from './levels/library';
import { HUB_GUEST_DOORS, doorLetsIn, doorState, type DoorState } from './levels/junction';
import type { CourseDoorDef } from './levels/types';
import { isUnlocked, nextInOrder } from './levels/campaign';
import { compileScene, sceneFrame } from './story/scene';
import type { CompiledScene, SceneDef, SceneFrame } from './story/scene';
import { STORY, StorySeen } from './story/scenes';
import { StoryOverlay } from './ui/storyOverlay';
import { MemoryStage, buildKeepsake } from './story/memory';
import type { KeepsakeKind } from './story/memory';
import type { StoryCtx } from './story/scenes';
import type { EnemySpec, LevelDef } from './levels/types';
import { GoalHud } from './ui/goalHud';
import { TrickLog } from './player/trickLog';
import { FilmDrive, type Seen } from './dev/filmDrive';
import { revealFrame, REVEAL } from './core/revealCutscene';
import { Doorway } from './world/doorway';
import { WedgeVisuals } from './world/wedges';
import { Sparks } from './world/itemModels';
import { CourseDoors, roomOverDoor } from './world/courseDoors';
import { atDoor, doorCamera, doorFrameBoxes, type DoorSpec } from './world/rooms';
import { Fader } from './ui/fader';
import { Inventory } from './player/inventory';
import { DropField } from './world/drops';
import { CONSUMABLES, rollCrateDrop } from './data/consumables';
import { CollectHud } from './ui/collectHud';
import { runViewer } from './dev/viewer';
import { Npc, isHere } from './npc/npc';
import { Dialog } from './ui/dialog';
import { Builder } from './ui/builder';
import { Tweaks } from './core/tweaks';
import { TweaksPanel } from './ui/tweaksPanel';
import { FlyEdit } from './ui/flyEdit';
import { PhotoMode } from './ui/photoMode';
import { ShopPanel, ShopRow } from './ui/shopPanel';
import { Wallet } from './core/wallet';
import { SHOP } from './data/shop';
import { nachoIcon } from './ui/icons';
import { compileCustom, CustomLevel } from './levels/custom';
import { platform } from './platform/platform';
import { makeAabb, topAt } from './world/collision';
import { floorUnder, slopeUnder, standsOn, wallOver } from './enemies/footing';
import { AudioEngine, nearness } from './audio/audio';
import { DreamVoices, speaksRobot, voiceOf } from './audio/dreamVoices';
import { ROBOT_VOICES } from './audio/robotVoices';
import { decodeRecorded, type Sample } from './audio/synth';
import { SFX_NAMES, loudness, sfx, type SfxName } from './audio/synth';
import { TRACK_NAMES, type TrackName } from './audio/music';
import { speak } from './audio/speech';
import { Rumble } from './core/rumble';
import { Display } from './ui/display';
import { pickTarget, keepTarget, switchTarget, cameraYawToward, facingToward } from './combat/lockon';
import { Boot } from './ui/boot';

// ---- Low-res internal resolution. The canvas is CSS-scaled with nearest-neighbor filtering. ----
// The short side of the screen gets this many pixels; the long side follows the screen's shape,
// so nothing is stretched on a tall phone.
const SIM_HZ = 60;
const SIM_STEP = 1 / SIM_HZ;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const gameWrap = document.getElementById('gameWrap') as HTMLDivElement;

// The on-screen pad exists only in the phone-test build. The real game uses a keyboard or a gamepad.
if (import.meta.env.VITE_TOUCHPAD && !import.meta.env.VITE_EDITOR && !location.hash.startsWith('#view') && !location.hash.includes('nopad')) installTouchPad();

/** True if any control source (test pad or gamepad) pressed the action since last asked. */
function consumeAction(action: Action): boolean {
  let any = false;
  for (const s of controlSources) if (s.consume(action)) any = true;
  return any;
}

function startGame(): void {
  // Feel tweaks from the Tweaks panel go into the tuning tables before anything reads them.
  const tweaks = new Tweaks(browserStorage());
  // Button prompts: the player's choice of pictures; before any input, the phone test shows the touch pad's names, the
  // desktop build the keyboard, a Steam Deck its own buttons.
  loadGlyphMode(browserStorage());
  setDefaultDevice(platform.steamDeck ? 'pad' : platform.desktop ? 'keyboard' : 'touch');
  if (platform.steamDeck) setPadKindOverride('deck');
  // In the desktop build, Steam says what the controller really is (it passes every pad on as an Xbox pad).
  if (platform.desktop) {
    // (Nothing from Steam: go by the pad's own name again, or the Deck's buttons on a Deck.)
    const ask = (): void => void platform.padType().then((t) => setPadKindOverride(kindForSteamType(t) ?? (platform.steamDeck ? 'deck' : null)));
    ask();
    setInterval(ask, 2000);
  }
  const debugEl = document.getElementById('debug') as HTMLDivElement;
  const showDebug = location.hash.includes('debug');
  if (!showDebug) debugEl.style.display = 'none';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setClearColor(ps1Uniforms.fogColor.value);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 4 / 3, 0.1, 200);

  /** Matches the low-res picture and the camera to the shape of the screen. */
  function resize(): void {
    // The picture fills whatever box the canvas is in: the whole screen, or the little window inside the level builder.
    const box = canvas.parentElement ?? gameWrap;
    const w = Math.max(1, box.clientWidth);
    const h = Math.max(1, box.clientHeight);
    // (Every dot of the picture a whole number of the screen's dots, the same each way: see render/picture.ts.)
    const size = pictureSize(w, h, PICTURE.rows, window.devicePixelRatio || 1);
    const iw = size.iw;
    const ih = size.ih;
    renderer.setSize(iw, ih, false);
    // (So it is drawn at exactly that many times its size: a hair bigger than its box at most, and cropped by it.)
    canvas.style.width = `${size.cssW}px`;
    canvas.style.height = `${size.cssH}px`;
    box.style.overflow = 'hidden';
    ps1Uniforms.resolution.value.set(iw, ih);
    camera.aspect = iw / ih;
    // On a tall screen, widen the vertical view so the sides are not cropped away.
    const sideways = (52 * Math.PI) / 180;
    const vertical = (2 * Math.atan(Math.tan(sideways / 2) / camera.aspect) * 180) / Math.PI;
    camera.fov = Math.min(86, Math.max(55, vertical));
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  const viewObserver = new ResizeObserver(resize);
  viewObserver.observe(gameWrap);

  // The level being played. loadLevel() fills these in; everything below reads them as they are now.
  let chamber!: Chamber;
  let cur!: LevelDef;
  let doorway!: Doorway;
  let wedgeVis: WedgeVisuals | null = null;
  /** Sitting by the fire: seconds so far, or -1 when not. */
  let resting = -1;
  let nearFire = false;
  let courseVis: CourseDoors | null = null;
  /** Whether the exit door's stone frame has been made solid yet (it is not there until the door has grown out of the wall). */
  let exitFrameSolid = false;
  /**
   * Makes a door's frame solid: its two jambs and its step, as drawn. With `careful`, not while he is standing where
   * one of them will be (the exit door grows out of the wall while he may be right beside it): it says false, and is
   * asked again.
   */
  function addDoorFrame(door: DoorSpec, careful = false): boolean {
    const boxes = doorFrameBoxes(door);
    const R = TUNING.rat.radius;
    const p = player.position;
    if (careful && boxes.some((b) => p.x + R > b.x0 && p.x - R < b.x1 && p.z + R > b.z0 && p.z - R < b.z1 && p.y < b.y1 && p.y + TUNING.rat.height > b.y0)) return false;
    for (const b of boxes) chamber.colliders.push(makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
    return true;
  }
  let wedgeWasOut: boolean[] = [];
  /** For each shy wedge (by its place in the level's list), the beasts that keep it. */
  let shyKeepers = new Map<number, Foe[]>();
  let goals!: GoalTracker;
  const fader = new Fader(gameWrap);

  const player = new PlayerController(new THREE.Vector3(TUNING.spawn.x, TUNING.spawn.y, TUNING.spawn.z));
  const rat = new RatModel();
  /** The dream's knight: another rat in loud colours, never shown: the knight borrows its paint (`wearColours`). */
  let dreamRat: RatModel | null = null;
  let dreaming = false;
  const sky = new SkyDome();
  const dozers: Dozer[] = [];
  scene.add(sky.mesh);
  scene.add(rat.root);

  // Soft round shadow under the rat. It makes jumps much easier to judge.
  // (A disc of spokes lying flat: each spoke is drawn in where the ground under the shadow ends, so it never stands out
  // in the air past the edge of what he is on. See world/shadow.ts.)
  const SHADOW_R = 0.34;
  const shadowCuts = new ShadowCuts();
  const SHADOW_SPOKES = 12;
  const shadowGeo = new THREE.BufferGeometry();
  shadowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SHADOW_SPOKES + 1) * 3), 3));
  shadowGeo.setIndex(Array.from({ length: SHADOW_SPOKES }, (_, i) => [0, 1 + ((i + 1) % SHADOW_SPOKES), 1 + i]).flat());
  const shadow = new THREE.Mesh(shadowGeo, lyingOn(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide })));
  shadow.frustumCulled = false;
  const shadowLen: number[] = [];
  scene.add(shadow);

  const trail = new SwordTrail();
  scene.add(trail.mesh);
  // The sparks his shield strikes from an edge as he grinds along it.
  const grindSparks = new Sparks();
  scene.add(grindSparks.group);
  let grindSparkIn = 0;
  let rideLandIn = 0; // seconds till he comes down on the shield he has hopped onto

  // Enemies in the level. Waves add more as they arrive.
  /** What the game needs from an enemy's drawn model, whatever kind of enemy it is. */
  interface FoeView {
    root: THREE.Object3D;
    setTransform(pos: THREE.Vector3, facing: number): void;
    flash(): void;
    tick(dt: number, foe: Foe): void;
    /** The sword glanced off it (from that direction, world yaw): sparks. */
    glance?(fromAngle: number): void;
  }
  const enemies: Foe[] = [];
  /** The kinds that walk on the ground, and so can walk a slope (their models are tipped to it). */
  const WALKERS = new Set<Foe['kind']>(['scuttler', 'toad', 'ironback', 'guard', 'mantis', 'stag', 'ant', 'scorpion', 'roller']);
  const UP_AXIS = new THREE.Vector3(0, 1, 0);
  /** The ant pikemen among them (they are paired up each tick). */
  const antList: Ant[] = [];
  const enemyModels: FoeView[] = [];
  const counted = new WeakSet<Foe>();
  /** Those that are no part of what a 'defeat' goal asks for (see EnemySpec.uncounted). */
  const uncounted = new WeakSet<Foe>();
  /** Whether an enemy can stand here: floor under its middle at its own height (a slope's, on a slope), and nothing solid at body height. See enemies/footing.ts. */
  const canStand = (x: number, y: number, z: number, r: number): boolean => standsOn(chamber.colliders, x, y, z, r);
  /** The floor under an enemy's feet, so that they follow a slope. */
  const foeFloor = (x: number, y: number, z: number, r?: number): number | null => floorUnder(chamber.colliders, x, y, z, r);
  /** How far each creature's model is tipped to the ground it stands on (eased, so that it does not snap at a slope's foot). */
  const foeTilt = new WeakMap<Foe, { x: number; z: number; on: boolean }>();
  const tiltQ = new THREE.Quaternion();
  const tiltN = new THREE.Vector3();
  /**
   * The height of the floor under a point: the highest solid top below it, within three units. Null if there is none,
   * or if it is a moving platform, or if water or lava lies between (a shadow would sit on the bed, under the surface).
   * It is where a floating collectible's shadow falls.
   */
  const floorAt = (x: number, y: number, z: number): number | null => {
    let best: number | null = null;
    for (const b of chamber.colliders) {
      if (x <= b.min.x || x >= b.max.x || z <= b.min.z || z >= b.max.z) continue;
      const top = topAt(b, x, z);
      if (top > y - 0.1 || top < y - 3) continue;
      if (chamber.movers.some((m) => m.aabb === b)) continue;
      if (best === null || top > best) best = top;
    }
    if (best === null) return null;
    const floor = best;
    const wet = [...chamber.water, ...chamber.lava].some((w) => x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && w.y > floor && w.y < y + 0.5);
    return wet ? null : floor;
  };
  /** Something solid at body height (the ironback's ram bonks into it): a slope it can walk is not, from its foot. */
  const wallAt = (x: number, y: number, z: number, r: number): boolean => wallOver(chamber.colliders, x, y, z, r);
  /** Room for a flier: nothing solid where its body is, from y up half a unit. */
  const canFly = (x: number, y: number, z: number, r: number): boolean =>
    !chamber.colliders.some((b) => !(x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) && b.max.y > y + 0.02 && b.min.y < y + 0.5);
  /** What Grimsqueak's body does in each part of the fight (each attack's tell has its own shape). */
  /** How big one of the Widow's young is, of the Broodmother's size. */
  const HATCHLING_SIZE = 0.26;
  const ORIGIN = new THREE.Vector3();
  const GRIM_GESTURE: Record<GrimState, GrimGesture> = {
    idle: 'rest', float: 'rest', volley: 'cast', swoopWind: 'rear', swoop: 'sweep', slamWind: 'raise', slamFall: 'smash', orbWind: 'conjure', orbWait: 'rest',
    bat: 'point', stormWind: 'cast', storm: 'cast', summon: 'rest', heal: 'rest', spent: 'slump', stunned: 'slump', repel: 'rage', rage: 'rage', dead: 'slump',
  };
  /**
   * The SPELL his body is casting in each part of the fight, and how far into it he is (it takes over the gesture
   * above while it runs). The spells have their own timings; the fight's are kept, and each spell is run at the
   * fight's pace: its blow lands when the fight's does.
   */
  const grimSpell = (boss: Grimsqueak): NonNullable<GrimInput['spell']> | undefined => {
    const t = boss.stateTime;
    const h = boss.phase === 2 ? GRIM.rage.haste : 1;
    switch (boss.state) {
      case 'volley': {
        // A fireball for each bolt: gathered and drawn back through the tell, then throw after throw.
        const w = GRIM.volley.windup * h;
        if (t < w) return { kind: 'fireball', t: (t / w) * 0.68, plain: true };
        const gap = GRIM.volley.gap * h;
        return { kind: 'fireball', t: 0.66 + (((t - w) % gap) / gap) * 0.26, plain: true };
      }
      // The slam is a blast: gathered in as he rises, held as he falls, burst open as he lands.
      case 'slamWind': return { kind: 'blast', t: Math.min(0.6, (t / (GRIM.slam.windup * h)) * 0.6), plain: true };
      case 'slamFall': return { kind: 'blast', t: 0.6, plain: true };
      case 'spent': return boss.lastAttack === 'slam' && t < 0.5 ? { kind: 'blast', t: 0.8 + t, plain: true } : undefined;
      case 'stormWind': return { kind: 'lightning', t: Math.min(0.5, (t / (GRIM.storm.windup * h)) * 0.5), reach: GRIM.storm.long };
      case 'storm': return { kind: 'lightning', t: 0.56 + Math.min(0.9, t), reach: GRIM.storm.long };
      case 'summon': return { kind: 'summon', t };
      case 'heal': return { kind: 'heal', t: Math.min(1.9, t) };
      default: return undefined;
    }
  };
  function addEnemy(spec: EnemySpec): void {
    if (spec.type === 'grimsqueak') {
      // The boss: the toad's logic with his own numbers, drawn with the villain's model.
      const boss = new Grimsqueak(spec);
      const look = new Npc({ name: 'Lord Grimsqueak', kind: 'villain', x: spec.x, y: spec.y ?? 0, z: spec.z, facing: 0, lines: [] });
      let flash = 0;
      enemies.push(boss);
      enemyModels.push({
        root: look.root,
        setTransform: (p, f) => {
          // The model already floats a body's height over its root, so sinking means lowering the root below the floor.
          look.moveTo(p.x, boss.floorY, p.z);
          look.act = {
            lookAt: [p.x + Math.sin(f) * 4, p.z + Math.cos(f) * 4], shrug: 0, gone: boss.asleep || !boss.alive,
            low: 1 - boss.lift, bow: boss.state === 'spent' ? 0.6 : boss.state === 'stunned' ? 1 : 0,
            reach: 0, still: boss.state === 'stunned', gesture: GRIM_GESTURE[boss.state], float: GRIM_FIGHT_FLOAT, spell: grimSpell(boss) ?? null,
          };
        },
        flash: () => {
          flash = 0.14;
          look.flash();
        },
        tick: (dt, e) => {
          flash = Math.max(0, flash - dt);
          // Every attack has a tell: gathering the light he shudders, rearing for the swoop he leans back and swells,
          // before the slam he draws himself up. Raging, he throbs. Struck, he jolts.
          const st = boss.state;
          const t = e.stateTime;
          const shudder = st === 'volley' || st === 'orbWind' || st === 'stormWind' || st === 'storm' ? 0.06 * Math.sin(t * 46) : st === 'rage' ? 0.14 * Math.sin(t * 30) : 0;
          const swell = st === 'swoopWind' ? 0.22 * Math.min(1, t / GRIM.swoop.windup) : st === 'slamWind' ? 0.3 * Math.min(1, t / GRIM.slam.windup) : 0;
          look.root.scale.setScalar(1 + shudder + swell + (flash > 0 ? 0.16 : 0));
          look.root.rotation.x = st === 'swoopWind' ? -0.35 * Math.min(1, t / 0.4) : st === 'swoop' ? 0.7 : 0;
          look.update(dt, player.position.x, player.position.y, player.position.z, st === 'volley' || st === 'rage');
        },
      });
      scene.add(look.root);
    } else if (spec.type === 'ironback') {
      const m = new IronbackModel();
      const e = new Ironback(spec);
      e.wallAt = wallAt;
      enemies.push(e);
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        glance: (a) => m.glance(a),
        tick: (dt, f) => m.update(dt, { state: f.state as IronbackState, stateTime: f.stateTime, moving: f.state === 'chase' || f.state === 'return' }),
      });
      scene.add(m.root);
    } else if (spec.type === 'wyrm') {
      // The Sump Wyrm. Its body is drawn wherever the rules have each segment, in the world's own places: the model
      // is not moved about as one thing, only told how high the floor is.
      const m = new WyrmModel();
      const e = new Wyrm(spec);
      e.wallAt = wallAt;
      m.setFloor(e.floorY);
      enemies.push(e);
      enemyModels.push({
        root: m.root,
        setTransform: () => m.setFloor(e.floorY),
        flash: () => m.flash(),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, windTime: e.windTime, x: e.x, z: e.z, facing: e.facing, body: e.body, crawled: e.crawled, moving: e.moving, raging: e.raging, coilAt: e.coilAt }),
      });
      scene.add(m.root);
    } else if (spec.type === 'widow') {
      // The Widow. She is drawn in the world's own places, wherever the rules have each piece of her.
      const m = new WidowModel();
      const e = new Widow(spec);
      enemies.push(e);
      enemyModels.push({ root: m.root, setTransform: () => {}, flash: () => m.flash(), tick: (dt) => m.update(dt, e) });
      scene.add(m.root);
    } else if (spec.type === 'brood') {
      // The Broodmother. She is drawn on the floor under her even when the rules have her up in the air (the model
      // lifts her itself), and her whirl turns her on top of the way she faces.
      const m = new BroodModel();
      const e = new Brood(spec);
      const floor = new THREE.Vector3();
      enemies.push(e);
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(floor.set(p.x, e.floorY, p.z), f + e.whirled),
        flash: () => m.flash(),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, walking: e.walking, arm: e.arm, windTime: e.windTime, stabAt: e.stabAt, air: e.air, raging: e.raging }),
      });
      scene.add(m.root);
    } else if (spec.type === 'stag') {
      const m = new StagModel();
      const e = new Stag(spec);
      enemies.push(e);
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, walking: e.walking }),
      });
      scene.add(m.root);
    } else if (spec.type === 'mantis') {
      const m = new MantisModel();
      const e = new Mantis(spec);
      e.wallAt = wallAt;
      enemies.push(e);
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, walking: e.walking, arm: e.arm, held: e.held, windupTime: e.windupTime, air: e.air }),
      });
      scene.add(m.root);
    } else if (spec.type === 'guard') {
      const m = new GuardModel();
      const e = new Guard(spec);
      enemies.push(e);
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        glance: (a) => m.glance(a),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, walking: e.walking, counter: e.counter }),
      });
      scene.add(m.root);
    } else if (spec.type === 'hornet') {
      const e = new Hornet(spec);
      const m = new HornetModel();
      e.canFly = canFly;
      enemies.push(e);
      enemyModels.push({
        root: m.root,
        // (Its model is put where the rules have it each frame, lance and all: see its tick.)
        setTransform: () => undefined,
        flash: () => m.flash(),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, x: e.x, y: e.y, z: e.z, facing: e.facing, tip: e.tip, aim: e.aim, floor: e.floor, moving: e.moving }),
      });
      scene.add(m.root);
    } else if (spec.type === 'firefly') {
      const e = new Firefly(spec);
      const m = new FireflyModel(spec.color);
      e.canFly = canFly;
      enemies.push(e);
      lanterns.set(e, { x: e.x, y: e.y, z: e.z, r: 6.5, color: new THREE.Color(spec.color ?? 0xd9ff5a), power: 0, flash: 0, flicker: 0, phase: 0 });
      enemyModels.push({
        root: m.root,
        // (Its model is put where the rules have it each frame, the tip of its lantern and all: see its tick.)
        setTransform: () => undefined,
        flash: () => m.flash(),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, x: e.x, y: e.y, z: e.z, facing: e.facing, vent: e.vent, light: e.light, floor: e.floor, moving: e.moving }),
      });
      scene.add(m.root);
    } else if (spec.type === 'roller') {
      // The Frost Roller: a pill bug that bowls across the ice. It is told which floor is ice (off it, it is dragged to a stop).
      const e = new Roller(spec);
      const m = new RollerModel();
      e.onIce = (x, y, z) => chamber.colliders.some((b) => !!b.slick && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && Math.abs(topAt(b, x, z) - y) < 0.3);
      enemies.push(e);
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, curl: e.curl, spin: e.spin, moving: e.moving }),
      });
      scene.add(m.root);
    } else if (spec.type === 'scorpion') {
      const e = new Scorpion(spec);
      const m = new ScorpionModel(spec.color);
      enemies.push(e);
      // (Its lamp lights the room from the barb's point, as bright as its lamp is.)
      stingLamps.set(e, { x: e.x, y: e.y, z: e.z, r: 5, color: new THREE.Color(spec.color ?? 0x4dffc8), power: 0, flash: 0, flicker: 0, phase: 0 });
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, tail: e.tail, light: e.light, claw: e.claw, moving: e.moving, mark: e.mark ? { ahead: e.aimDist, r: e.mark.r, fill: e.mark.fill } : null }),
      });
      scene.add(m.root);
    } else if (spec.type === 'ant') {
      const e = new Ant(spec);
      const m = new AntModel();
      enemies.push(e);
      antList.push(e);
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        tick: (dt) => m.update(dt, { state: e.state, stateTime: e.stateTime, walking: e.walking, tip: e.tip, level: e.level, windupTime: e.windupTime }),
      });
      scene.add(m.root);
    } else if (spec.type === 'bat') {
      const e = new Bat(spec);
      const m = new BatModel({ x: e.home.x, y: e.floorY + BAT.roostHeight, z: e.home.z }, spec.perch ?? 'rock');
      if (e.flutter) m.noPerch();
      e.canFly = canFly;
      enemies.push(e);
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        // (A flutterer is drawn as one hovering; its "floor" for the model is far below, so that it is drawn flying.)
        tick: (dt) => m.update(dt, { state: e.state === 'flutter' ? 'hover' : e.state, stateTime: e.stateTime, swoopU: e.swoopU, floorY: e.flutter ? e.floorY - 3 : e.floorY, y: e.y }),
      });
      scene.add(m.root);
    } else if (spec.type === 'toad') {
      const m = new ToadModel();
      enemies.push(new Toad(spec));
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        tick: (dt, e) => m.update(dt, { state: e.state as ToadState, stateTime: e.stateTime, moving: e.state === 'return', hopY: (e as Toad).hopY }),
      });
      scene.add(m.root);
    } else if (spec.look === 'hatchling') {
      // One of the Widow's young: a roach in all it does, drawn as a small spider (the Broodmother's shape, a
      // quarter her size, in the Widow's dark colours).
      // (The model sets its own size as it moves: so it stands in a holder that is made small, and is placed in that.)
      const m = new BroodModel();
      const holder = new THREE.Group();
      holder.scale.setScalar(HATCHLING_SIZE);
      holder.add(m.root);
      enemies.push(new Scuttler(spec));
      enemyModels.push({
        root: holder,
        setTransform: (p, f) => {
          holder.position.copy(p);
          m.setTransform(ORIGIN, f);
        },
        flash: () => m.flash(),
        tick: (dt, e) => {
          const st = e.state as ScuttlerState;
          const going = st === 'chase' || st === 'return' || st === 'lunge';
          m.update(dt, { state: st === 'dead' ? 'dead' : st === 'windup' ? 'stabWind' : st === 'lunge' ? 'stab' : going ? 'chase' : 'idle', stateTime: e.stateTime, walking: going ? 2.5 : 0, arm: 0, windTime: 0.4, stabAt: 2, air: 0, raging: false } as never);
        },
      });
      scene.add(holder);
    } else {
      const m = new ScuttlerModel();
      enemies.push(new Scuttler(spec));
      enemyModels.push({
        root: m.root,
        setTransform: (p, f) => m.setTransform(p, f),
        flash: () => m.flash(),
        tick: (dt, e) => m.update(dt, { state: e.state as ScuttlerState, stateTime: e.stateTime, moving: e.state === 'chase' || e.state === 'return' }),
      });
      scene.add(m.root);
    }
    enemies[enemies.length - 1].canStand = canStand;
    enemies[enemies.length - 1].floorUnder = foeFloor;
    if (spec.uncounted) uncounted.add(enemies[enemies.length - 1]);
  }
  const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
  const director = new Director();
  // ---- The boss's own things: the rings from his slam, and the orb. ----
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x7fe8f4, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ringGeo = new THREE.RingGeometry(0.86, 1, 28);
  const ringMeshes = new Map<Ring, THREE.Mesh>();
  const orbMesh = new THREE.Group();
  orbMesh.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ color: 0xbff6fb })));
  orbMesh.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4fc4d4, transparent: true, opacity: 0.35 })));
  orbMesh.visible = false;
  scene.add(orbMesh);
  let orbShown: Orb | null = null;
  /** The ironback's and the bat's noises (their events), and a bat's wing beats so it is heard before it is seen. */
  const flapIn = new WeakMap<Bat, number>();
  function beastSounds(e: Ironback | Bat | Guard | Mantis | Stag | Brood | Wyrm | Widow | Hornet | Ant | Firefly | Scorpion | Roller, dt: number): void {
    const v = hearAt(e.x, e.z);
    for (const ev of e.events.splice(0)) {
      if (e instanceof Roller) {
        // The Frost Roller, in sounds the game already has (it has none of its own yet): a click as it sees him;
        // plates knocking shut as it tucks; a knock at each thing it comes off; a heavier one as it spills.
        if (ev === 'alert') audio.play('antClick', { vol: v * 0.8, rate: 0.8, priority: 5 });
        else if (ev === 'tuck') audio.play('plateKnock', { vol: Math.max(0.3, v), rate: 1.5, priority: 7 });
        else if (ev === 'roll') audio.play('chitinTap', { vol: Math.max(0.3, v), rate: 0.7, priority: 7 });
        else if (ev === 'bounce') audio.play('plateKnock', { vol: Math.max(0.35, v), rate: 1.05, priority: 7 });
        else if (ev === 'spill') audio.play('plateKnock', { vol: Math.max(0.4, v), rate: 0.7, priority: 7 });
        else if (ev === 'right') audio.play('chitinTap', { vol: v * 0.7, rate: 1.2, priority: 4 });
        else if (ev === 'hurt') audio.play('scorpHurt', { vol: v, rate: 1.3, priority: 6 });
        else if (ev === 'die') audio.play('antDie', { vol: v, rate: 1.2, priority: 6 });
      } else if (e instanceof Scorpion) {
        // The Lamp Scorpion, in sounds of its own: its dry rasp when it sees him; its lamp filling as the tail
        // rears, as long as the tell; the whip of the tail and the barb's crack into the floor; its claws shutting
        // (the rasp, quick, is their tell); a scraped squeal when it is struck; its lamp snuffed as it runs, and the
        // note of it coming back; and the knock of it thrown down.
        if (ev === 'alert') audio.play('scorpRasp', { vol: v * 0.9, priority: 6 });
        else if (ev === 'stingWind') audio.play('scorpCharge', { vol: Math.max(0.4, v), rate: Math.max(0.6, Math.min(2.2, 0.7 / SCORPION.stingWind)), priority: 8 });
        else if (ev === 'sting') audio.play('scorpSting', { vol: Math.max(0.4, v), priority: 8 });
        else if (ev === 'snapWind') audio.play('scorpRasp', { vol: Math.max(0.3, v), rate: Math.max(1.2, Math.min(2.4, 0.5 / SCORPION.snapWind)), priority: 7 });
        else if (ev === 'snap') audio.play('scorpSnap', { vol: Math.max(0.35, v), priority: 8 });
        else if (ev === 'hurt') audio.play('scorpHurt', { vol: v, priority: 6 });
        else if (ev === 'douse') audio.play('scorpDouse', { vol: Math.max(0.3, v), priority: 6 });
        else if (ev === 'relight') audio.play('scorpCharge', { vol: v * 0.5, rate: 2.4, priority: 5 });
        else if (ev === 'flip') audio.play('plateKnock', { vol: v, rate: 1.1, priority: 8 });
        continue;
      }
      if (e instanceof Ant) {
        // The Ant Pikeman, in sounds of its own: its jaws clacking when it sees him; the shaft of its pike sliding
        // back through its claw (as long as the wind-up) and the rush of the thrust with one hard clack; its jaws
        // chattering, quick and high, before it bites, and the snap of them; a scraped chirp when it is struck, the
        // patter of its feet as it springs back, and the knock of its pike beaten down to the floor.
        if (ev === 'alert') audio.play('antClick', { vol: v * 0.9, priority: 6 });
        else if (ev === 'windup') audio.play('pikeReady', { vol: Math.max(0.3, v * 0.9), rate: Math.max(0.6, Math.min(1.8, 0.55 / e.windupTime)), priority: 7 });
        else if (ev === 'thrust') {
          audio.play('whoosh', { vol: v, rate: 1.45, priority: 7 });
          audio.play('antSnap', { vol: v * 0.6, rate: 1.3, priority: 6 });
        } else if (ev === 'biteWind') audio.play('antClick', { vol: Math.max(0.3, v), rate: Math.max(1, Math.min(2.2, 0.6 / ANT.biteWind)), priority: 7 });
        else if (ev === 'bite') audio.play('antSnap', { vol: Math.max(0.35, v), priority: 8 });
        else if (ev === 'reel') {
          audio.play('plateKnock', { vol: v, rate: 1.2, priority: 8 });
          audio.play('antHurt', { vol: v * 0.8, rate: 0.8, priority: 7 });
        } else if (ev === 'hurt') audio.play('antHurt', { vol: v, priority: 6 });
        else if (ev === 'spring') audio.play('chitinTap', { vol: v * 0.6, rate: 0.85, priority: 3 });
        continue;
      }
      if (e instanceof Firefly) {
        // The Firefly Bomber, in sounds of its own: two quick blinks of its lantern when it sees him; the blinking
        // quickening and climbing before a run (as long as the tell), the rush of the run, and a small falling note
        // for each drop it lets go; its light running down when it is spent, and a blink or two as it comes back; a
        // thin peep when it is struck. (The whirr of its wings is a loop, and the fire catching is with the fire: see below.)
        if (ev === 'alert') audio.play('fireflyBlink', { vol: v * 0.7, rate: 2, priority: 6 });
        else if (ev === 'runWind') audio.play('fireflyBlink', { vol: Math.max(0.4, v), rate: Math.max(0.5, Math.min(2.5, 0.7 / e.windTime)), priority: 8 });
        else if (ev === 'run') audio.play('whoosh', { vol: v * 0.8, rate: 1.1, priority: 6 });
        else if (ev === 'drop') audio.play('emberDrop', { vol: Math.max(0.3, v), priority: 6 });
        else if (ev === 'spent') audio.play('fireflyFade', { vol: Math.max(0.3, v), priority: 6 });
        else if (ev === 'rise') audio.play('fireflyBlink', { vol: v * 0.6, rate: 1.6, priority: 4 });
        else if (ev === 'hurt') audio.play('fireflyHurt', { vol: v, priority: 6 });
        else if (ev === 'thud') audio.play('land', { vol: v, rate: 1.4, priority: 5 });
        else if (ev === 'lost') audio.play('fireflyDie', { vol: v * 0.7, rate: 1.3, priority: 5 });
        continue;
      }
      if (e instanceof Hornet) {
        // The Hornet Lancer: an angry buzz when it sees him; its wings climbing to a whine as its lance comes down
        // to point at him (as long as the wind-up), the rush of the dive and the crack of its lance into the floor;
        // the same whine, lower, before it runs at him; a knock as it wrenches its lance free; a buzz when it is
        // struck and the thump of it landing. (The drone of its wings is a loop: see below.)
        if (ev === 'alert') audio.play('hornetHurt', { vol: v * 0.8, rate: 0.8, priority: 6 });
        else if (ev === 'diveWind') audio.play('hornetWhine', { vol: Math.max(0.45, v), rate: 0.8 / e.windTime, priority: 8 });
        else if (ev === 'dive') audio.play('whoosh', { vol: v, rate: 1.2, priority: 7 });
        else if (ev === 'stick') {
          audio.play('spikeHit', { vol: Math.max(0.4, v), rate: 1.15, priority: 8 });
          shake = Math.max(shake, 0.05 * v);
        } else if (ev === 'joustWind') audio.play('hornetWhine', { vol: Math.max(0.45, v), rate: (0.8 / e.windTime) * 0.8, priority: 8 });
        else if (ev === 'joust') audio.play('whoosh', { vol: v, rate: 0.75, priority: 7 });
        else if (ev === 'free') audio.play('plateKnock', { vol: v * 0.8, rate: 1.5, priority: 5 });
        else if (ev === 'hurt') audio.play('hornetHurt', { vol: v, priority: 6 });
        else if (ev === 'thud') audio.play('land', { vol: v, rate: 1.3, priority: 5 });
        else if (ev === 'lost') audio.play('hornetDie', { vol: v * 0.7, rate: 1.3, priority: 5 });
        continue;
      }
      if (e instanceof Wyrm) {
        // The Sump Wyrm, in sounds of its own: its roar when it sees him and again when it turns angry; the tap of
        // all its feet; a wet hiss with its fangs ticking as its head goes up, and the clack of them shutting; its
        // plates rattling faster and faster before it runs (with a short roar), the rush of it, and its head meeting
        // the wall; the same rattle, quick and high, from its tail, and the crack of that; the slow grind as it winds
        // its coil, the creak as it draws tight and the crunch when it closes. A sword on its plates is a dull knock;
        // on its head while it is helpless, a cry.
        const loud = Math.max(0.5, v);
        if (ev === 'roar' || ev === 'rage') {
          audio.play('wyrmRoar', { vol: loud, rate: ev === 'rage' ? 0.85 : 1, priority: 9 });
          audio.play('rumble', { vol: loud * 0.6, rate: 1.1, priority: 6 });
          shake = Math.max(shake, 0.12);
        } else if (ev === 'step') audio.play('chitinTap', { vol: v * 0.32, rate: roll(1.25, 1.7), priority: 2 });
        else if (ev === 'biteWind') audio.play('wyrmHiss', { vol: v * 0.9, rate: Math.max(1, Math.min(1.9, 0.55 / e.windTime)), priority: 7 });
        else if (ev === 'bite') audio.play('wyrmSnap', { vol: v, priority: 7 });
        else if (ev === 'chargeWind') {
          // (The rattle lasts as long as the wind-up does: shorter, and so higher, before the second of two charges.)
          audio.play('wyrmRattle', { vol: loud, rate: Math.max(1, Math.min(1.8, 0.85 / e.windTime)), priority: 8 });
          audio.play('wyrmRoar', { vol: loud * 0.55, rate: 1.7, priority: 8 });
        } else if (ev === 'charge') {
          audio.play('whoosh', { vol: loud, rate: 0.5, priority: 8 });
          shake = Math.max(shake, 0.08);
        } else if (ev === 'ram') {
          audio.play('wyrmRam', { vol: loud, priority: 9 });
          shake = Math.max(shake, 0.32);
          rumble.shock();
        } else if (ev === 'bump') {
          // (Angry, the first wall only turns it.)
          audio.play('wyrmRam', { vol: loud * 0.7, rate: 1.35, priority: 8 });
          shake = Math.max(shake, 0.16);
        } else if (ev === 'whipWind') audio.play('wyrmRattle', { vol: v * 0.8, rate: 1.7, priority: 7 });
        else if (ev === 'whip') audio.play('wyrmLash', { vol: v, priority: 7 });
        else if (ev === 'coil') audio.play('wyrmRattle', { vol: loud * 0.8, rate: 0.7, priority: 7 });
        else if (ev === 'coilWind') {
          audio.play('wyrmCreak', { vol: loud, priority: 9 });
          audio.play('wyrmHiss', { vol: loud * 0.7, rate: 0.8, priority: 8 });
        } else if (ev === 'squeeze') {
          audio.play('wyrmCrunch', { vol: loud, priority: 9 });
          shake = Math.max(shake, 0.16);
        } else if (ev === 'reel') audio.play('wyrmCry', { vol: v, rate: 0.8, priority: 8 });
        else if (ev === 'crit') audio.play('wyrmCry', { vol: v * 0.7, rate: 1.4, priority: 6 });
        else if (ev === 'hurt') audio.play('plateKnock', { vol: v * 0.7, priority: 4 });
      } else if (e instanceof Widow) {
        // The Widow, in sounds of her own: her scream when she wakes and when she turns angry; the tap of her feet
        // as she goes round the rim; the creak of a leg pulled up (as long as its wind-up) and the crack of it into
        // the floor; a quick creak as it is laid out, and the rush of it sweeping; a long creak as her head rears,
        // and her jaws shutting on the floor; a cry when she is thrown down, a yelp when struck, a sharper one for
        // her head.
        const loud = Math.max(0.6, v);
        // (Two of them in a room: the second has a DEEPER voice, every sound of hers, so the ear knows which one is
        // pulling a leg up when she is behind the camera. The floor shows it too: a pointer from the ring to her.)
        const pack = enemies.filter((o): o is Widow => o instanceof Widow);
        const deep = pack.indexOf(e) > 0;
        if (deep) {
          const sounds: Record<string, Parameters<typeof audio.play>[0]> = { slamWind: 'widowRear', sweepWind: 'widowRear', biteWind: 'widowRear', stabWind: 'widowRear' };
          if (sounds[ev]) audio.play(sounds[ev], { vol: loud * 0.9, rate: (0.8 / Math.max(0.3, e.windTime)) * 0.62, priority: 8 });
        }
        if (ev === 'rage') for (const at of e.young.splice(0)) addEnemy({ type: 'scuttler', look: 'hatchling', x: at.x, z: at.z, y: e.floorY, hunt: true, uncounted: true, respawn: false });
        if (deep && (ev === 'slamWind' || ev === 'sweepWind' || ev === 'biteWind' || ev === 'stabWind')) continue;
        if (ev === 'wake' || ev === 'rage') {
          audio.play('widowScream', { vol: loud, rate: ev === 'rage' ? 0.85 : 1, priority: 9 });
          audio.play('rumble', { vol: loud * 0.7, rate: 1.1, priority: 6 });
          shake = Math.max(shake, 0.16);
        } else if (ev === 'step') audio.play('chitinTap', { vol: loud * 0.5, rate: roll(0.55, 0.75), priority: 2 });
        else if (ev === 'slamWind') audio.play('widowRear', { vol: loud * 0.9, rate: 0.8 / Math.max(0.4, e.windTime), priority: 7 });
        else if (ev === 'slam') {
          audio.play('shock', { vol: loud, rate: 0.7, priority: 9 });
          audio.play('spikeHit', { vol: loud * 0.8, rate: 0.6, priority: 8 });
          shake = Math.max(shake, 0.3);
          rumble.shock();
        } else if (ev === 'sweepWind') audio.play('widowRear', { vol: loud * 0.8, rate: 0.8 / Math.max(0.2, e.windTime), priority: 8 });
        else if (ev === 'sweep') audio.play('whoosh', { vol: loud, rate: 0.55, priority: 8 });
        else if (ev === 'biteWind') audio.play('widowRear', { vol: loud, rate: 0.8 / Math.max(0.4, e.windTime), priority: 8 });
        else if (ev === 'bite') {
          audio.play('widowBite', { vol: loud, priority: 9 });
          shake = Math.max(shake, 0.24);
          rumble.shock();
        } else if (ev === 'stabWind') audio.play('widowRear', { vol: loud * 0.7, rate: 0.8 / Math.max(0.3, e.windTime), priority: 7 });
        else if (ev === 'stab') {
          audio.play('whoosh', { vol: loud * 0.7, rate: 1.5, priority: 6 });
          audio.play('spikeHit', { vol: loud * 0.9, priority: 7 });
          shake = Math.max(shake, 0.08);
        } else if (ev === 'reel') audio.play('widowHurt', { vol: loud, rate: 0.6, priority: 8 });
        else if (ev === 'crit') audio.play('widowHurt', { vol: loud * 0.8, rate: 1.25, priority: 6 });
        else if (ev === 'hurt') audio.play('widowHurt', { vol: loud * 0.5, priority: 4 });
      } else if (e instanceof Brood) {
        // The Broodmother, in sounds of her own: her scream when she sees him and again when she turns angry; the tap
        // of her feet; the rasp of a spike going up and the crack of it into the floor; a quick light rattle before
        // her legs sweep and the rush of them; a long low rasp as she sinks to spring; the floor shaking where she
        // lands; the thread she hangs by let go before she drops; a yelp when she is struck.
        const loud = Math.max(0.5, v);
        if (ev === 'roar' || ev === 'rage') {
          audio.play('broodScream', { vol: loud * 0.9, rate: ev === 'rage' ? 0.82 : 1, priority: 9 });
          audio.play('rumble', { vol: loud * 0.6, rate: 1.3, priority: 6 });
          shake = Math.max(shake, 0.12);
        } else if (ev === 'step') audio.play('chitinTap', { vol: v * 0.45, rate: roll(0.8, 1.1), priority: 2 });
        else if (ev === 'stabWind') audio.play('broodHiss', { vol: v * 0.9, rate: e.windTime < 0.5 ? 1.5 : 1.15, priority: 7 });
        else if (ev === 'stab') {
          audio.play('whoosh', { vol: v * 0.7, rate: 1.5, priority: 6 });
          audio.play('spikeHit', { vol: v * 0.9, priority: 7 });
          shake = Math.max(shake, 0.06 * v);
        } else if (ev === 'sweepWind' || ev === 'whirlWind') audio.play('broodRattle', { vol: v, rate: ev === 'whirlWind' ? 0.75 : 0.65, priority: 7 });
        else if (ev === 'sweep' || ev === 'whirl') audio.play('whoosh', { vol: v, rate: ev === 'whirl' ? 0.9 : 0.7, priority: 7 });
        else if (ev === 'crouch') audio.play('broodHiss', { vol: v, rate: 0.62, priority: 7 });
        else if (ev === 'leap') audio.play('whoosh', { vol: v, rate: 0.55, priority: 7 });
        else if (ev === 'slam') {
          audio.play('shock', { vol: loud, rate: 0.75, priority: 9 });
          audio.play('spikeHit', { vol: loud * 0.7, rate: 0.7, priority: 7 });
          shake = Math.max(shake, 0.26 * Math.max(0.4, v));
          rumble.shock();
        } else if (ev === 'climb') {
          audio.play('whoosh', { vol: v * 0.8, rate: 1.2, priority: 6 });
          audio.play('broodRattle', { vol: v * 0.6, rate: 1.3, priority: 5 });
        } else if (ev === 'twang') audio.play('threadTwang', { vol: loud, priority: 9 });
        else if (ev === 'drop') audio.play('broodDrop', { vol: loud, priority: 8 });
        else if (ev === 'kneel') audio.play('broodHurt', { vol: v, rate: 0.55, priority: 8 });
        else if (ev === 'rise') audio.play('broodHiss', { vol: v * 0.8, rate: 0.9, priority: 5 });
        else if (ev === 'hurt') audio.play('broodHurt', { vol: v * 0.5, priority: 4 });
      } else if (e instanceof Stag) {
        // The Stag Knight, in sounds of its own: its bellow when it sees the rat; each heavy footfall, plates and
        // all; the creak and climbing hum of the hammer going up (as long as the wind-up, and quicker and higher for
        // the sweep) and the iron of it on the stone, over the floor shaking; the rush of the sweep; its wing cases
        // rattling and the thump of the stomp; a groan and a clang as it goes down on one knee. A sword on it is a
        // dull knock, no more.
        if (ev === 'alert') audio.play('stagBellow', { vol: v, priority: 6 });
        else if (ev === 'step') {
          audio.play('stagStep', { vol: v * 0.7, priority: 3 });
          shake = Math.max(shake, 0.025 * v);
        } else if (ev === 'windup') audio.play('hammerHum', { vol: v * 0.9, rate: 0.9 / STAG.windup, priority: 7 });
        else if (ev === 'slam') {
          audio.play('shock', { vol: Math.max(0.5, v), rate: 0.8, priority: 9 });
          audio.play('hammerSlam', { vol: Math.max(0.5, v), priority: 9 });
          shake = Math.max(shake, 0.22 * v);
          if (v > 0.4) rumble.shock();
        } else if (ev === 'sweepWind') audio.play('hammerHum', { vol: v * 0.7, rate: 0.9 / STAG.sweepWindup, priority: 6 });
        else if (ev === 'sweep') audio.play('whoosh', { vol: v, rate: 0.6, priority: 7 });
        else if (ev === 'stompWind') audio.play('stagRattle', { vol: v, rate: 0.55 / STAG.stompWindup, priority: 7 });
        else if (ev === 'stomp') {
          audio.play('shock', { vol: Math.max(0.4, v), rate: 1.25, priority: 8 });
          audio.play('stagStep', { vol: Math.max(0.4, v), rate: 0.7, priority: 7 });
          shake = Math.max(shake, 0.14 * v);
          if (v > 0.5) rumble.shock();
        } else if (ev === 'kneel') {
          audio.play('flipClang', { vol: v, rate: 0.7, priority: 8 });
          audio.play('stagBellow', { vol: v * 0.6, rate: 1.35, priority: 6 });
        } else if (ev === 'rise') audio.play('stagBellow', { vol: v * 0.7, rate: 1.2, priority: 5 });
        else if (ev === 'hurt') audio.play('plateKnock', { vol: v * 0.9, rate: 0.75, priority: 5 });
        continue;
      }
      if (e instanceof Mantis) {
        // The mantis, in sounds of its own: a dry trill when it sees the rat; the thin ring of a scythe going up (as
        // long as the wind-up: lower and longer when the second cut is held) and the tight cut of it; its wings
        // flaring before a leap, the rush of it and the crack as its scythes go into the floor; a flutter as it
        // springs away; two chirps when it is struck.
        if (ev === 'alert') audio.play('mantisHiss', { vol: v * 0.9, priority: 6 });
        else if (ev === 'windup') audio.play('scytheRing', { vol: v * 0.7, rate: Math.max(0.7, Math.min(1.8, 0.5 / e.windupTime)), priority: 6 });
        else if (ev === 'slash') audio.play('scytheCut', { vol: v, priority: 7 });
        else if (ev === 'crouch') audio.play('mantisWings', { vol: v, rate: 0.6 / MANTIS.leapWindup, priority: 7 });
        else if (ev === 'leap') audio.play('whoosh', { vol: v, rate: 0.9, priority: 7 });
        else if (ev === 'land') {
          audio.play('land', { vol: Math.max(0.3, v), rate: 1.4, priority: 7 });
          audio.play('spikeHit', { vol: v * 0.8, rate: 1.3, priority: 6 });
          shake = Math.max(shake, 0.07 * v);
        } else if (ev === 'hop') audio.play('mantisWings', { vol: v * 0.6, rate: 2.2, priority: 6 });
        else if (ev === 'reel') {
          audio.play('scytheRing', { vol: v, rate: 0.6, priority: 8 });
          audio.play('mantisCry', { vol: v * 0.8, rate: 0.8, priority: 7 });
        } else if (ev === 'hurt') audio.play('mantisCry', { vol: v * 0.8, priority: 6 });
        continue;
      }
      if (e instanceof Guard) {
        // The guard, in sounds of his own: a soldier's bark when he sees the rat; his spear sliding back over the rim
        // of his shield (as long as the wind-up); his bark again and the rush of the thrust; a yelp when he is
        // struck, and with the clatter of his shield knocked wide. (A sword on his shield clanks by itself, as off
        // the ironback.)
        if (ev === 'alert') audio.play('guardBark', { vol: v * 0.9, rate: 0.9, priority: 6 });
        else if (ev === 'windup') audio.play('spearReady', { vol: v * 0.7, rate: Math.max(0.7, Math.min(1.6, 0.5 / e.windupTime)), priority: 6 });
        else if (ev === 'thrust') {
          audio.play('whoosh', { vol: v, rate: 1.6, priority: 7 });
          audio.play('guardBark', { vol: v * 0.8, rate: 1.2, priority: 6 });
        } else if (ev === 'broken') {
          audio.play('flipClang', { vol: v, rate: 1.45, priority: 8 });
          audio.play('guardYelp', { vol: v * 0.8, rate: 0.85, priority: 6 });
        } else if (ev === 'hurt') audio.play('guardYelp', { vol: v, priority: 6 });
        continue;
      }
      // The Ironback, in sounds of its own: a snort of steam and its horn scraping the floor, three rasps, for as
      // long as the tell; its feet drumming for as long as the ram; the great dull knock of its head on a wall; the
      // clang of it going over; a grunt and a scrape as its horn goes down for a toss; a sharp snort as it bucks; its
      // shell rocking as it rights itself.
      if (ev === 'snort') {
        audio.play('snort', { vol: v, priority: 6 });
        audio.play('ironScrape', { vol: v * 0.9, rate: 0.9 / IRONBACK.windup, priority: 6 });
      } else if (ev === 'ram') audio.play('ironCharge', { vol: v, rate: 1.2 / IRONBACK.ramTime, priority: 7 });
      else if (ev === 'bonk') {
        audio.play('ironBonk', { vol: Math.max(0.4, v), priority: 8 });
        shake = Math.max(shake, 0.14 * v);
        if (v > 0.5) rumble.shock();
      } else if (ev === 'flip') audio.play('flipClang', { vol: v, priority: 8 });
      else if (ev === 'toss') audio.play('ironToss', { vol: v * 0.9, rate: 0.42 / IRONBACK.tossWind, priority: 6 });
      else if (ev === 'buck') audio.play('snort', { vol: v, rate: 1.5, priority: 6 });
      else if (ev === 'rise') audio.play('ironRise', { vol: v * 0.9, rate: 0.6 / IRONBACK.riseTime, priority: 4 });
      // The Flitter: its squeak when it wakes, lower when it screeches before a swoop and lower still as it is lost.
      else if (ev === 'wake') audio.play('batSqueak', { vol: v, priority: 6 });
      else if (ev === 'screech') audio.play('batSqueak', { vol: Math.max(0.45, v), rate: 0.75, priority: 7 });
      else if (ev === 'swoop') audio.play('whoosh', { vol: v, rate: 1.3, priority: 6 });
      else if (ev === 'thud') audio.play('land', { vol: v, rate: 1.7, priority: 4 });
      else if (ev === 'lost') audio.play('batSqueak', { vol: v, rate: 0.55, priority: 5 });
    }
    if (e instanceof Bat && e.alive && !e.asleep && !e.downed) {
      const left = (flapIn.get(e) ?? 0) - dt;
      if (left <= 0 && v > 0.08) audio.play('flap', { vol: v * 0.45, rate: roll(0.9, 1.15), priority: 2 });
      flapIn.set(e, left <= 0 ? 0.2 : left);
    }
  }
  /** One tick of the boss's extras: his sounds, the rings and the orb against the rat, and the shove when he bursts away. */
  const grimHp = new WeakMap<Grimsqueak, number>();
  function bossTick(boss: Grimsqueak): void {
    const p = player.position;
    // Lord Grimsqueak, in sounds of his own: the Engine's light gathering before each attack (as long as that
    // attack's tell, so quicker and higher when he rages); the crack of each bolt; his cloak and his snarl in the
    // swoop; the boom of his slam and the ring running out from it; the orb's hum as he sends it, and the glass of it
    // rung by a sword (higher each time it is sent back) or by his own hand (lower); his shriek when it bursts on him,
    // and a shorter one when the sword finds him; the burst that throws the knight off him; his laugh when he rages.
    const hpWas = grimHp.get(boss) ?? boss.hp;
    grimHp.set(boss, boss.hp);
    let cried = false;
    for (const ev of boss.events.splice(0)) {
      const v = Math.max(0.4, hearAt(boss.x, boss.z));
      if (ev === 'tell') {
        const windup = (boss.state === 'volley' ? GRIM.volley.windup : boss.state === 'swoopWind' ? GRIM.swoop.windup : boss.state === 'slamWind' ? GRIM.slam.windup : boss.state === 'stormWind' ? GRIM.storm.windup : boss.state === 'summon' ? GRIM.summon.at : GRIM.orb.windup) * (boss.phase === 2 ? GRIM.rage.haste : 1);
        audio.play('grimGather', { vol: v * 0.8, rate: 0.9 / windup, priority: 7 });
      } else if (ev === 'bolt') audio.play('grimBolt', { vol: v, rate: roll(0.94, 1.08), priority: 6 });
      else if (ev === 'swoop') audio.play('grimSwoop', { vol: v, rate: 0.65 / GRIM.swoop.time, priority: 7 });
      else if (ev === 'slam') {
        audio.play('grimSlam', { vol: 1, priority: 9 });
        shake = Math.max(shake, 0.22);
        rumble.shock();
      } else if (ev === 'orbThrow') audio.play('orbHum', { vol: v, priority: 7 });
      else if (ev === 'orbBack') {
        audio.play('orbStrike', { vol: 0.95, rate: 1.15 + 0.14 * Math.min(4, boss.orb?.bats ?? 0), priority: 8 });
        hitStop = Math.max(hitStop, 0.07);
        rumble.block();
      } else if (ev === 'orbBat') audio.play('orbStrike', { vol: 0.8, rate: 0.8, priority: 7 });
      else if (ev === 'orbHit') {
        audio.play('grimCry', { vol: 1, rate: 0.85, priority: 9 });
        audio.play('boltBurst', { vol: 1, rate: 0.6, priority: 8 });
        cried = true;
        rumble.kill();
        shake = Math.max(shake, 0.2);
        hitStop = Math.max(hitStop, 0.1);
      } else if (ev === 'repel') {
        audio.play('grimRepel', { vol: 0.95, priority: 8 });
        rumble.block();
        shake = Math.max(shake, 0.12);
      } else if (ev === 'rage') {
        audio.play('villainLaugh', { vol: 1, verb: 0.4, priority: 9 });
        audio.play('rumble', { vol: 1, priority: 8 });
      } else if (ev === 'storm') {
        // The storm lets go: the crack of his bolts, one on top of another, and the hall shakes with it.
        audio.play('grimBolt', { vol: 1, rate: 0.7, priority: 8 });
        audio.play('boltBurst', { vol: 0.9, rate: 1.3, priority: 7 });
        shake = Math.max(shake, 0.1);
      } else if (ev === 'summon') {
        audio.play('rumble', { vol: 0.9, priority: 8 });
        audio.play('chitinTap', { vol: 0.9, rate: 1.4, priority: 7 });
      } else if (ev === 'heal') audio.play('orbHum', { vol: v, rate: 0.7, priority: 7 });
      else if (ev === 'healed') audio.play('orbStrike', { vol: 0.8, rate: 0.6, priority: 7 });
      else if (ev === 'healBroken') {
        audio.play('boltBurst', { vol: 0.9, rate: 0.8, priority: 8 });
        hitStop = Math.max(hitStop, 0.06);
      }
    }
    // (The sword finding him: a short sharp cry, but not on top of the one above, nor as he dies: his end has its own.)
    if (boss.hp < hpWas && !cried && boss.alive) audio.play('grimCry', { vol: 0.6, rate: 1.4, priority: 6 });
    if (boss.state === 'rage') shake = Math.max(shake, 0.06);
    // He bursts away: the rat is thrown back, unhurt.
    if (boss.repelPulse) {
      boss.repelPulse = false;
      const dx = p.x - boss.x;
      const dz = p.z - boss.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < GRIM.repel.radius && !player.dead) {
        player.velocity.x = (dx / d) * GRIM.repel.push;
        player.velocity.z = (dz / d) * GRIM.repel.push;
      }
    }
    // What his summoning called up: a roach at each place, hunting the rat, counting toward nothing.
    for (const at of boss.summons.splice(0)) addEnemy({ type: 'scuttler', x: at.x, z: at.z, y: boss.floorY, hunt: true, uncounted: true, respawn: false });
    if (player.dead) return;
    // His storm rakes its line: the rat on it is hurt, unless his shield is up or he is rolling through.
    if (boss.stormAtRat(p.x, p.y, p.z)) {
      const r = player.takeHit(boss.x, boss.z, GRIM.storm.damage);
      if (r !== 'dodged') {
        events.playerResult = r;
        boss.stormTaken();
      }
    }
    // A ring from his slam reaches the rat on the ground. In the air it passes under him; a roll goes through it.
    const ringHit = boss.ringAtRat(p.x, p.y, p.z);
    if (ringHit) {
      const r = player.takeHit(ringHit.x, ringHit.z, GRIM.slam.damage);
      if (r !== 'dodged') events.playerResult = r;
    }
    // The orb: his sword sends it back; otherwise it reaches him.
    if (player.attackActive && boss.swingAt(p.x, p.z, player.facing, player.attackClip.reach, player.attackClip.arc)) {
      // Struck.
    } else if (boss.orb && boss.orbAtRat(p.x, p.y, p.z)) {
      const o = boss.orb;
      const r = player.takeHit(o.x - o.vx, o.z - o.vz, GRIM.orb.damage);
      if (r !== 'dodged') {
        events.playerResult = r;
        boss.orbTaken();
      }
    }
  }
  /** Draws the rings and the orb where the boss has them. */
  function bossDraw(time: number): void {
    const boss = enemies.find((e): e is Grimsqueak => e instanceof Grimsqueak);
    const rings = boss?.rings ?? [];
    for (const [r, m] of ringMeshes) {
      if (rings.includes(r)) continue;
      scene.remove(m);
      ringMeshes.delete(r);
    }
    for (const r of rings) {
      let m = ringMeshes.get(r);
      if (!m) {
        m = new THREE.Mesh(ringGeo, ringMat);
        m.rotation.x = -Math.PI / 2;
        scene.add(m);
        ringMeshes.set(r, m);
      }
      m.position.set(r.x, boss!.floorY + 0.12, r.z);
      m.scale.setScalar(r.r);
    }
    const o = boss?.orb ?? null;
    orbMesh.visible = !!o;
    if (o) {
      // A new orb appears where it is thrown; after that the picture follows it.
      if (o !== orbShown) orbMesh.position.set(o.x, o.y, o.z);
      orbMesh.position.set(o.x, o.y + 0.08 * Math.sin(time * 9), o.z);
      orbMesh.rotation.y = time * 4;
      orbMesh.scale.setScalar(1 + 0.1 * Math.sin(time * 14) + (o.toBoss ? 0.15 : 0));
    }
    orbShown = o;
  }
  // Toad spit in flight.
  const globs: Glob[] = [];
  const globMeshes = new Map<Glob, THREE.Mesh>();
  // A firefly's fire: the drops in the air, the flames they leave on the floor, how they are drawn, and the light
  // they and the fireflies' lanterns throw on the room.
  const embers: Ember[] = [];
  const flames = new Flames();
  const emberFx = new EmberFx();
  scene.add(emberFx.group);
  const fxLights: FxLight[] = [];
  /** The floor a drop of fire falls to: the level's solid floor, but nothing that moves (a drop falls past a lift). */
  let emberFloor: ReturnType<typeof groundFrom> | null = null;
  let emberFloorOf: unknown = null;
  const emberGround = (): ReturnType<typeof groundFrom> => {
    if (!emberFloor || emberFloorOf !== chamber) {
      emberFloor = groundFrom(chamber.colliders, new Set(chamber.movers.map((m) => m.aabb)));
      emberFloorOf = chamber;
    }
    return emberFloor;
  };
  /** The level's gusts (jets of gas that push), and the clock they and their drawing both go by. */
  let gusts: Gust[] = [];
  /** Music underfoot in this room, if any: floor keys and echo puzzles (world/musicFloor.ts). */
  let musicFloor: MusicFloor | null = null;
  /** The room clock when the hazards were last heard (world/hazards.ts `sounds`: what happened since). */
  let hazardClock = 0;
  /** The hazards' memory of which creature they last struck, and when. */
  const hazardFoes = new HazardFoes();
  /** (All its jets, for what is heard of them; and whether each was letting gas go at the last look.) */
  let jets: Gust[] = [];
  let jetOpen: boolean[] = [];
  let worldClock = 0;
  const lanterns = new WeakMap<Firefly, FxLight>();
  const stingLamps = new WeakMap<Scorpion, FxLight>();
  const globGeo = new THREE.SphereGeometry(0.2, 6, 5);
  const globMat = new THREE.MeshBasicMaterial({ color: 0x8aff5a });
  /** Grimsqueak throws the cold light of the Engine, not sludge. */
  const boltMat = new THREE.MeshBasicMaterial({ color: 0x7fe8f4 });
  /** One of Grimsqueak's fireballs in flight. */
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
  // Friendly characters and the talk box.
  const npcs: Npc[] = [];
  /** Each character's solid body, so it can be taken out of the room with him and put back where he ends up. */
  const npcBodies = new Map<Npc, ReturnType<typeof makeAabb>>();
  function syncNpcBodies(): void {
    for (const n of npcs) {
      const b = npcBodies.get(n);
      if (!b) continue;
      const at = chamber.colliders.indexOf(b);
      if (n.gone && at >= 0) chamber.colliders.splice(at, 1);
      if (!n.gone) {
        const y = n.spec.y ?? 0;
        b.min.set(n.spec.x - 0.35, y, n.spec.z - 0.35);
        b.max.set(n.spec.x + 0.35, y + 1.2, n.spec.z + 0.35);
        if (at < 0) chamber.colliders.push(b);
      }
    }
  }
  const dialog = new Dialog(gameWrap);
  let talkingTo: Npc | null = null;
  let dlgCam = 0;
  // Floor plates: stand on one and it stays pressed; gates can wait for them.
  let plateGroup: THREE.Group | null = null;
  let platesDown: boolean[] = [];

  // Collectibles.
  // ---- Save files: three games side by side. The game's own things are kept under the chosen file's keys (slots.ts). ----
  const deviceStore = browserStorage() as (ReturnType<typeof browserStorage> & { removeItem?(k: string): void }) | null;
  const files = new FileStore(deviceStore, lastFile(deviceStore));
  const levelProgress = new LevelProgress(files);
  // (The archive's levels are tracked too, so one opened by #level= still works; only the worlds count towards the purse.)
  const tracker = new CollectibleTracker([...ALL_LEVELS, ...TEST_ROOMS].map((l) => ({ id: l.id, name: l.name, items: l.collectibles })), files);
  let collectVisuals!: CollectibleVisuals;
  const revealedCrates = new Set<number>(); // crates broken so far, so the things inside show
  // ---- Picking things up and throwing them (world/lifting.ts) ----
  /** The crate or barrel over his head, and where it was when he took hold of it (it comes up from there). */
  let held: Crate | null = null;
  /** ...or the creature (it is down: world/lifting.ts DOWN_STATES), and how long he has had it. */
  let heldFoe: Foe | null = null;
  let heldFoeTime = 0;
  /** Creatures drawn turned over in his hands (or tumbling) last frame: their pictures are put straight before the next. */
  const turnedInHand = new Set<Foe>();
  /** Seconds to the next scrabble of a carried creature. */
  let squirmIn = 0.8;
  const handQ = new THREE.Quaternion();
  const handAxis = new THREE.Vector3();
  const handMid = new THREE.Vector3();
  const thrownFoes: Array<Thrown<Foe>> = [];
  /** A creature that is in his hands or in the air does nothing of its own, and is not fought. */
  const inHand = (e: Foe): boolean => e === heldFoe || thrownFoes.some((t) => t.what === e);
  const heldFrom = new THREE.Vector3();
  /** What he could lift from where he stands (for the hint). */
  let liftable: Crate | null = null;
  let liftableFoe: Foe | null = null;
  const thrown: Thrown[] = [];
  const hands = new THREE.Vector3();
  const thrownWas = new THREE.Vector3();
  /** Things that were in a crate broken somewhere else than it stood, and where they belong (put back as a level loads). */
  const movedItems = new Map<{ x: number; y: number; z: number }, { x: number; y: number; z: number }>();
  /** Where the thing over his head is: on its way up from where it stood, or there. */
  const heldPlace = (at: { x: number; y: number; z: number }, halfHigh: number): THREE.Vector3 => {
    carryPlace(at, halfHigh, hands);
    const k = Math.min(1, player.carryPose * 1.15);
    return hands.set(heldFrom.x + (hands.x - heldFrom.x) * k, heldFrom.y + (hands.y - heldFrom.y) * Math.sin((k * Math.PI) / 2), heldFrom.z + (hands.z - heldFrom.z) * k);
  };
  const collectHud = new CollectHud(gameWrap);
  const goalHud = new GoalHud(gameWrap);
  /** His tricks on the shield in this air (B4): how many, for the horn stab as he lands them, and when a grab counts. (Their
   * NAMES were shown on landing for a day; the owner, 2026-11-18: "I'd actually like to remove the trick names".) */
  const trickLog = new TrickLog();
  const preview = new RatPreview();
  const equipment = new Equipment(files);
  const inventory = new Inventory(files);
  const drops = new DropField();
  scene.add(drops.group);
  let pickups!: PickupVisuals;
  /** How far he sees: the level's fog, pushed back by a lamp on his helmet. */
  function applySight(): void {
    const k = player.gear.sight;
    ps1Uniforms.fogNear.value = (cur?.fogRange?.[0] ?? 18) * k;
    ps1Uniforms.fogFar.value = (cur?.fogRange?.[1] ?? 90) * k;
  }
  /**
   * The dream's look: the dream's rat is given the same parts in the same order as his own (a helmet put on anew is a
   * new part: so both are dressed alike first), in the dream's colours, and he takes its paint.
   */
  const wearDream = (): void => {
    dreamRat ??= new RatModel(DREAM_LOOK);
    dreamRat.setHelmet({ dome: 0xff8a2a, rim: 0x7a3cff, spike: 0xffffff });
    dreamRat.setScarf({ cloth: 0xffe53a, trim: 0xff4fb0 });
    dreamRat.setSword({ blade: 0xbffcff, hilt: 0xffe53a });
    dreamRat.setShield({ face: 0xff3a6a, trim: 0x39e6ff });
    rat.wearColours(dreamRat);
    rat.setScarfLong(3.2);
  };
  /** Shows what he wears on the model. */
  const applyGear = (): void => {
    // (His own paint back first: what he wears is painted onto it. Then, in the dream, the dream's over that.)
    if (dreaming) rat.wearColours(null);
    const helm = ITEMS[equipment.equipped('helmet')];
    rat.setHelmet({ dome: helm.colors.dome, rim: helm.colors.rim, spike: helm.colors.spike });
    preview.setHelmet({ dome: helm.colors.dome, rim: helm.colors.rim, spike: helm.colors.spike });
    const sc = ITEMS[equipment.equipped('scarf')].colors;
    rat.setScarf({ cloth: sc.cloth, trim: sc.trim });
    preview.setScarf({ cloth: sc.cloth, trim: sc.trim });
    const sw = ITEMS[equipment.equipped('sword')].colors;
    rat.setSword({ blade: sw.blade, hilt: sw.hilt });
    preview.setSword({ blade: sw.blade, hilt: sw.hilt });
    const sh = ITEMS[equipment.equipped('shield')].colors;
    rat.setShield({ face: sh.face, trim: sh.trim });
    preview.setShield({ face: sh.face, trim: sh.trim });
    if (dreaming) wearDream();
  };
  /** What his gear does: his moves (in the controller), how far beasts notice him, his hearts, how far he sees. */
  const applyGearFx = (): void => {
    player.gear = gearMods((['helmet', 'sword', 'shield', 'scarf'] as const).map((s) => equipment.equipped(s)));
    SENSES.notice = player.gear.notice;
    player.hp = Math.min(player.hp, player.maxHp);
    hud?.setMax(player.maxHp);
    applySight();
  };
  applyGear();
  equipment.onChange(applyGear);
  const refreshCollectHud = (): void =>
    collectHud.set(tracker.count(cur.id, 'crumb'), tracker.count(cur.id, 'cap'), tracker.count(cur.id, 'relic'));
  tracker.onChange(() => cur && refreshCollectHud());

  const hud = new Hud(gameWrap, 12);
  const bossBar = new BossBar(gameWrap);
  applyGearFx();
  equipment.onChange(applyGearFx);
  const follow = new FollowCamera(camera);

  // ---- Sound ----
  const audio = new AudioEngine(browserStorage());
  const rumble = new Rumble(browserStorage());
  const display = new Display(gameWrap, browserStorage());
  if (location.hash.includes('nosound')) audio.disabled = true;
  for (const ev of ['pointerdown', 'keydown', 'touchstart'] as const) window.addEventListener(ev, () => audio.unlock(), { passive: true });
  dialog.onBlip = (ch, kind, step, line, idx) => {
    if (speak(audio, kind, ch, step, line, idx) && talkingTo) talkingTo.pulse();
  };
  const dreamVoices = new DreamVoices<(typeof enemies)[number]>();
  const robotSamples = new Map<string, Sample>();
  const hearAt = (x: number, z: number, range = 18): number => nearness(Math.hypot(x - player.position.x, z - player.position.z), range);
  const roll = (a: number, b: number): number => a + Math.random() * (b - a);
  /** What the last tick looked like, so the sound code can tell what just happened. */
  const heard = { state: 'idle' as string, grounded: true, swing: 0, hp: TUNING.health.max as number, stepDist: 0, foes: new Map<object, string>(), globs: 0, gates: 0 };

  // Keyboard debug keys (desktop only).
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Digit1') ps1Uniforms.snapEnabled.value = 1 - ps1Uniforms.snapEnabled.value;
    if (e.code === 'Digit2') ps1Uniforms.fogFar.value = ps1Uniforms.fogFar.value > 1000 ? 90 : 1000;
    if (e.code === 'KeyR') player.respawn();
    if (e.code === 'KeyC') follow.yaw = player.facing + Math.PI;
  });

  // Shockwave ring shown when an air attack lands.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  let ringAge = 1; // seconds since the blast; the ring is gone after 0.35
  let ringSize: number = TUNING.plunge.shockRadius;

  // ---- Per-tick state ----
  let accumulator = 0;
  let moving = false;
  let planarSpeed = 0;
  // Lock-on: the foe the rat and camera are fixed on, a marker over his head, and a short pause between target switches.
  let lockTarget: Foe | null = null;
  // Lock on pressed with nobody to lock on to: the view comes round behind him instead (seconds of that left, and where to).
  let recentre = 0;
  let recentreTo = 0;
  let lockCool = 0;
  const lockMarker = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 4), new THREE.MeshBasicMaterial({ color: 0xff5a3a, depthTest: false, transparent: true, opacity: 0.95 }));
  lockMarker.rotation.x = Math.PI;
  lockMarker.renderOrder = 999;
  lockMarker.visible = false;
  scene.add(lockMarker);
  let slowT = 0; // real seconds of slow motion left after a kill
  let hitStop = 0; // seconds the simulation freezes after a hit lands, for impact
  let shake = 0; // camera shake strength, decays
  let flash = 0; // red flash on the rat when hurt, decays
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const renderPos = new THREE.Vector3();
  const enemyPos = new THREE.Vector3();
  const bladeBase = new THREE.Vector3();
  const bladeTip = new THREE.Vector3();

  /** Converts the stick (or WASD) into a world-space direction relative to the camera. */
  function computeMove(): THREE.Vector3 {
    let ix = 0;
    let iy = 0;
    if (input.isDown('KeyD')) ix += 1;
    if (input.isDown('KeyA')) ix -= 1;
    if (input.isDown('KeyW')) iy += 1;
    if (input.isDown('KeyS')) iy -= 1;
    ix += padControls.moveX + gamepadControls.moveX;
    iy += padControls.moveY + gamepadControls.moveY;

    // Forward is the direction from the camera toward the rat, flattened to the ground.
    const yaw = follow.yaw;
    forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    move.set(0, 0, 0).addScaledVector(right, ix).addScaledVector(forward, iy);
    if (move.lengthSq() > 1) move.normalize();
    return move;
  }

  // ---- Levels, the door reveal, and moving between levels ----
  const cutscene = { active: false, t: 0, baseFacing: 0 };
  const trans = { active: false, t: 0, moved: false, to: null as LevelDef | null, arrive: null as { x: number; z: number; y: number; yaw: number } | null };
  const FADE_OUT = 0.4;
  const FADE_HOLD = 0.15;
  const FADE_IN = 0.4;
  const doorCamPos = new THREE.Vector3();
  const doorCamLook = new THREE.Vector3();
  const dlgPos = new THREE.Vector3();
  const dlgLook = new THREE.Vector3();
  const lookTmp = new THREE.Vector3();
  const angleLerp = (a: number, b: number, t: number): number => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

  // ---- Story scenes: wordless bits of acting at the start and end of a level. While one plays the game holds still. ----
  const storySeen = new StorySeen(files);
  const storyOverlay = new StoryOverlay(gameWrap);
  const story = { scene: null as CompiledScene | null, t: 0, finished: false, beat: -1, onDone: null as (() => void) | null };
  let storyFrame: SceneFrame | null = null;
  /** An opening waiting for the start-up screens to clear. */
  let storyPending: SceneDef | null = null;
  let exitScenePlayed = false;
  const storyCamPos = new THREE.Vector3();
  const storyCamLook = new THREE.Vector3();
  const storyOff = !!import.meta.env.VITE_EDITOR || /nostory|at=|view/.test(location.hash);
  const storyFreeze = location.hash.includes('sthold'); // dev: hold a scene still at &st=, for screenshots
  /** Where a cutscene has the view. */
  const showCam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const unlockAll = location.hash.includes('unlockall');
  /** dev: `&nojoin` keeps every character's parts apart (npc/stillParts.ts), to compare the joined ones with. */
  const noJoin = location.hash.includes('nojoin');
  /** dev: `&nogather` keeps the room's still dressing as it was built (world/chamber.ts gatherStill), to compare. */
  if (location.hash.includes('nogather')) CHAMBER_OPTIONS.gatherStill = false;
  // dev: `&slow=0.25` starts the game in slow motion (the Workshop's own switch), for pictures of quick things.
  const slowHash = /[#&]slow=([\d.]+)/.exec(location.hash);
  if (slowHash) DEV.slow = Math.min(1, Math.max(0.05, Number(slowHash[1])));
  // His purse: every crumb and cap he has picked up in the worlds, less what he has spent at Pip's.
  const wallet = new Wallet(files, () => {
    let crumbs = 0;
    let caps = 0;
    for (const l of LEVELS) {
      crumbs += tracker.worth(l.id, 'crumb').have;
      caps += tracker.worth(l.id, 'cap').have;
    }
    return { crumbs, caps };
  });
  // Open courses (Golden Wedges) sit outside the campaign chain: always open, and leaving one goes back to the start.
  // The old chain of levels (only the archive's, opened by #level=, still lead one to the next).
  const levelOrder = ARCHIVE.map((l) => l.id);
  const hubLevel = LEVELS.find((l) => l.hub) ?? null;
  /**
   * HOME: the Hall (levels/hall.ts), where the game starts and every room's door leads back to. (`hubLevel` is the
   * Club, the first hub: it is one of the Hall's rooms now, and its own doors and their prices still work.)
   */
  const homeLevel = levelById(HALL_ID) ?? hubLevel;
  /** A place with no way out of its own: home. (The Club is a hub too, but its door leads back to the Hall.) */
  const noWayOut = (l: LevelDef): boolean => !!l.hub && (l === homeLevel || !homeLevel);
  /** Which level he came into each level FROM, by a door (this sitting): its way out leads back to that door. */
  const cameFrom = new Map<string, string>();
  // The player's own levels from the builder: compiled on demand, and rebuilt when the library changes.
  const myLevels = new MyLevels(browserStorage());
  let myDefs: LevelDef[] = [];
  let myDefsVersion = -1;
  const mine = (): LevelDef[] => {
    if (myDefsVersion !== myLevels.version) {
      myDefsVersion = myLevels.version;
      myDefs = myLevels.list().map((m) => compileCustom(m.level, m.id));
    }
    return myDefs;
  };
  setExtraLevels(mine);
  const isMine = (id: string): boolean => id.startsWith('my-');
  /** Part of the new world (the Club, the open courses, his own levels); the old campaign levels are being folded in. */
  const inWorld = (l: LevelDef): boolean => !!l.hub || !!l.wedges || isMine(l.id);
  const allWedges = (): number => [...LEVELS, ...mine()].reduce((n, l) => n + (l.wedges?.length ?? 0), 0);
  /** The Club's doors: the built-in worlds, then a guest door on the south wall for each of the player's levels hung there. */
  const hubDoors = (): CourseDoorDef[] => {
    const doors = (hubLevel?.courseDoors ?? []).map((d) => ({ ...d }));
    for (const side of ['west', 'east'] as const) {
      const m = myLevels.list().find((x) => x.level.hubDoor === side);
      if (m) doors.push({ ...HUB_GUEST_DOORS[side], to: m.id, name: m.level.name, need: m.level.hubNeed ?? 0 });
    }
    return doors;
  };
  const doorsOf = (def: LevelDef): CourseDoorDef[] => (def.hub && def === hubLevel ? hubDoors() : def.courseDoors ?? []);
  /** Where a level's way out leads (levels/wayOut.ts): the door he came in by, or the Hall, or the area it is part of. */
  const parentOf = (l: LevelDef): LevelDef | null => wayOutOf(l, cameFrom.get(l.id), { home: homeLevel, hub: hubLevel, byId: levelById, doorsOf, isMine });
  /** Every area in the world this one belongs to (the world's main area and its side areas). */
  const worldAreas = (def: LevelDef): LevelDef[] => {
    const w = def.world ?? def.id;
    return [...LEVELS, ...mine()].filter((l) => (l.world ?? l.id) === w);
  };
  const wedgeTotal = (): number => discoveries.countPrefix('wedge:');
  /** What the doors count: his wedges, or (the test room, or the Workshop's switch) as many as any door could ask. */
  const doorWedges = (): number => (unlockAll || DEV.openDoors ? 9999 : wedgeTotal());
  /**
   * Whether a door to another place will let him through: he has the wedges it asks for, or he has been through it
   * before. (A door's price can go up between one build and the next, as wedges are added to the game: that must not
   * shut a world on someone who had already got into it.)
   */
  const doorOpen = (cd: { need: number; to?: string | null }): boolean => doorLetsIn(cd.need, doorWedges(), !!cd.to && discoveries.has(`place:${cd.to}`));
  const levelOpen = (id: string): boolean => unlockAll || DEV.openDoors || isMine(id) || isUnlocked(id, levelOrder, (x) => levelProgress.cleared(x));
  const storyCtx = (): StoryCtx => ({ x: player.position.x, z: player.position.z, facing: player.facing, y: player.position.y, exit: { x: cur.exit.x, z: cur.exit.z }, spots: cur.storySpots ?? {} });
  // Memories are played on a small stage far below the level, by two rats of their own.
  const memoryStage = new MemoryStage();
  memoryStage.addTo(scene);
  const castPos = new THREE.Vector3();
  /** A scene that will start as soon as he is standing quietly (after a crate breaks, or when he walks up to something). */
  let storyWaiting: ((c: StoryCtx) => SceneDef) | null = null;
  /** The keepsake he has found: on the ground where the crate was, then in his paw, then put away. */
  let keepsake: THREE.Group | null = null;
  function dropKeepsake(kind: KeepsakeKind, at: { x: number; y: number; z: number }): void {
    clearKeepsake();
    keepsake = buildKeepsake(kind);
    keepsake.scale.setScalar(1.7);
    keepsake.position.set(at.x, at.y + 0.06, at.z);
    scene.add(keepsake);
  }
  function clearKeepsake(): void {
    rat.setHeld(null);
    if (keepsake) scene.remove(keepsake);
    keepsake = null;
  }

  function playScene(def: SceneDef, onDone: (() => void) | null = null, at = 0): void {
    story.scene = compileScene(def, { x: player.position.x, y: player.position.y, z: player.position.z, facing: player.facing });
    story.t = at;
    story.finished = false;
    story.beat = -1;
    story.onDone = onDone;
    if (def.stowed) {
      player.armed = false;
      player.stowTimer = -1;
    }
    player.velocity.set(0, 0, 0);
    lockTarget = null;
  }
  function endScene(): void {
    story.scene = null;
    storyFrame = null;
    memoryStage.show(null);
    memoryStage.hideCast();
    rat.setHeld(null);
    for (const n of npcs) n.act = null;
    syncNpcBodies();
    storyPower.value = 1;
    if (storySaying) dialog.close();
    storySaying = null;
  }
  /** The line a scene has up in the talk box. */
  let storySaying: string | null = null;

  // ---- A cutscene (cutscene/): marionettes, things and the view, played from a list of keys. ----
  // It plays INSIDE a story scene of one long beat, which is what holds the knight still, takes his buttons, puts up
  // the bars and keeps everything else (saving, doors, talk) waiting, as for any scene. Its time is that scene's.
  let show: { sc: Cutscene; stage: CutStage; paused: boolean; last: number; hidden: Npc[]; stepHeld: number; sounds: number } | null = null;
  /** One asked for from another room: it plays when he has been taken to its own. */
  let showPending: CutsceneDef | null = null;
  const showReadout = document.createElement('div');
  showReadout.style.cssText = 'position:absolute;left:10px;bottom:8px;font:12px var(--rq-font-game);color:#f4e9c8;text-shadow:1px 1px 0 #000;pointer-events:none;display:none;z-index:6';
  gameWrap.appendChild(showReadout);
  function playCutscene(def: CutsceneDef, at = 0, hold = false): void {
    if (cur.id !== def.level) {
      const there = levelById(def.level);
      if (!there) return;
      showPending = def;
      startTransition(there);
      return;
    }
    endCutscene();
    if (dialog.open) dialog.close();
    const sc = compileCutscene(def);
    const stage = new CutStage(sc);
    scene.add(stage.group);
    // The room's own people of the same names step out while it plays (nobody is in two places).
    const names = new Set([...Object.values(def.cast).map((c) => (c.who.is === 'npc' ? c.who.name : '')), ...(def.clear ?? [])].filter(Boolean).map((n) => n.toLowerCase()));
    const hidden = npcs.filter((n) => !n.gone && names.has(n.spec.name.toLowerCase()));
    for (const n of hidden) n.gone = true;
    syncNpcBodies();
    show = { sc, stage, paused: hold, last: at, hidden, stepHeld: 0, sounds: at };
    playScene({ id: `show:${def.id}`, beats: [{ dur: 0, bars: 1 }, { dur: def.length, bars: 1 }] }, endCutscene, at);
  }
  function endCutscene(): void {
    if (!show) return;
    const was = show;
    show = null;
    was.stage.dispose();
    for (const n of was.hidden) n.gone = false;
    syncNpcBodies();
    showReadout.style.display = 'none';
    if (story.scene) endScene();
  }
  /** The boss joins the fight: he leaves the dais (the talking figure goes) and comes awake in the hall. */
  function wakeBoss(): void {
    for (const e of enemies) if (e instanceof Grimsqueak && e.asleep) e.wake();
    for (const n of npcs) if (n.spec.kind === 'villain' && STORY[cur.id]?.boss) n.gone = true;
    syncNpcBodies();
  }
  let afterPlayed = false;
  /** Footsteps in a scene: how far each walker has gone since his last one. */
  const strides = new Map<string, number>();
  function sceneStep(who: string, speed: number, dt: number, vol: number, verb: number): void {
    if (speed < 0.3) return void strides.set(who, 0.3);
    const d = (strides.get(who) ?? 0.3) + speed * dt;
    if (d >= 0.55) {
      audio.play('softStep', { vol, verb, priority: 2 });
      strides.set(who, 0);
    } else strides.set(who, d);
  }

  function disposeGroup(g: THREE.Object3D): void {
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
  }

  /** Builds a level and puts him at its start. `keep` leaves the collectibles as they were; otherwise the level starts fresh. */
  // ---- Saving. The SAVE GAME button, the quicksave key (F5, load with F9) and an autosave every so often all keep the same things. ----
  function snapshot(): SaveData {
    return {
      x: player.position.x, y: player.position.y, z: player.position.z, facing: player.facing,
      cameraYaw: follow.yaw, hp: player.hp, savedAt: Date.now(), levelId: cur.id,
    };
  }
  function applySave(d: SaveData | null): boolean {
    if (!d) return false;
    const there = levelById(d.levelId ?? 'sewer');
    if (there && there.id !== cur.id) loadLevel(there, true);
    player.respawn();
    player.position.set(d.x, d.y, d.z);
    player.prevPosition.copy(player.position);
    player.facing = d.facing;
    player.hp = Math.max(1, d.hp);
    follow.yaw = d.cameraYaw;
    follow.snap();
    lockTarget = null;
    return true;
  }
  function saveRowLabel(name: string, slot: SaveSlot): string {
    const at = readSave(storage, slot)?.savedAt;
    if (!at) return `${name}: NONE`;
    const t = new Date(at);
    return `${name}: ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`;
  }
  /** Seconds since the last autosave. It saves when he is standing somewhere safe: not mid-scene, mid-talk, dead or in a menu. */
  let autoAge = 0;
  function autosave(): void {
    if (cur.id === 'custom' || builder.open) return;
    writeSave(storage, snapshot(), 'auto');
    autoAge = 0;
    flushPlayed();
  }
  // ---- Time played, per file: counted while he is playing (not on the title, in the menu or with the window hidden). ----
  let played = readMeta(files).played;
  let playedSaved = played;
  function flushPlayed(): void {
    if (played - playedSaved < 1) return;
    writeMeta(files, { played });
    playedSaved = played;
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushPlayed);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPlayed();
    });
  }
  /** Switches the game's stores over to another file (reads it; writes nothing). */
  function useFile(n: number): void {
    flushPlayed();
    files.file = n;
    setLastFile(deviceStore, n);
    reloadFile();
  }
  /** Reads the current file again (after it was copied over or erased from the file screen). */
  function reloadFile(): void {
    levelProgress.reload();
    tracker.reload();
    equipment.reload();
    inventory.reload();
    wallet.reload();
    storySeen.reload();
    discoveries.reload();
    played = playedSaved = readMeta(files).played;
  }
  /** Plays a file: where it was saved, or a new game when it is empty. */
  function playFile(n: number): void {
    const empty = fileSummary(deviceStore, n).empty;
    // An empty file may still hold a few things written before it was played (the sticker book's first page): start clean.
    if (empty) eraseFile(deviceStore, n);
    useFile(n);
    discoveries.add('char:knight');
    if (empty) {
      restartGame();
      follow.snap();
      return;
    }
    const d = newestSave(files)?.data ?? null;
    // Always build the level again, so nothing of the other file's game is left in it.
    // (As of 2026-11-17 a file opens IN THE HALL, whatever level it was saved in: the Hall is the list of places, and
    // every level is a test room off it. What the file holds, his hearts and all he has found, is as it was saved.
    // Loading a save from the pause menu still puts him back exactly where it was made.)
    loadLevel(homeLevel || hubLevel || LEVELS[0], true);
    if (d) player.hp = Math.max(1, d.hp);
    follow.snap();
    applyGear();
  }
  const AUTOSAVE_EVERY = 20;
  // ---- The sticker book: what he has met and found. ----
  const discoveries = new Discoveries(files);
  discoveries.add('char:knight');
  if (location.hash.includes('allstickers')) {
    for (const st of STICKERS) discoveries.add(st.id);
    for (const l of LEVELS.slice(0, 9)) discoveries.add(`place:${l.id}`);
  }
  // Development aid: #...&wedges=9 gives him the first nine Golden Wedges (in the order of the worlds), for looking at
  // the doors and the pause menu part-way through the game. (They are kept, as anything found is.)
  const giveWedges = /wedges=(\d+)/.exec(location.hash);
  if (giveWedges) {
    let left = Number(giveWedges[1]);
    for (const id of ['cistern', 'pumpworks', 'works', 'sludgepit', 'sump', 'foundry', 'shaft', 'coalcellars', 'hollows', 'webs', 'faith', 'dark', 'brood', 'keep', 'lair']) {
      for (const w of LEVELS.find((l) => l.id === id)?.wedges ?? []) if (left-- > 0) discoveries.add(`wedge:${id}:${w.id}`);
    }
  }
  dialog.morePrompt = () => (lastDevice() === 'touch' ? '' : prompt('jump'));
  dialog.onStart = (name) => {
    const id = charIdFor(name);
    if (id) discoveries.add(id);
  };
  let moodCombat = 0;
  let moodWater = 0;

  function loadLevel(def: LevelDef, keep = false): void {
    resting = -1;
    // (Nothing is carried from one place to the next; and what a carried crate left somewhere else is back where it belongs.)
    trickLog.clear();
    held = null;
    heldFoe = null;
    thrownFoes.length = 0;
    liftable = null;
    liftableFoe = null;
    thrown.length = 0;
    player.endCarry();
    for (const [d, was] of movedItems) Object.assign(d, was);
    movedItems.clear();
    player.allowGrab = !def.noGrab;
    player.allowLongJump = !def.noLongJump;
    discoveries.add(`place:${def.id}`);
    // His own levels are not in the tracker's list from the start; each visit starts their collectibles afresh.
    if (isMine(def.id)) tracker.setLevel({ id: def.id, name: def.name, items: def.collectibles } as never);
    if (chamber) {
      scene.remove(chamber.group);
      disposeGroup(chamber.group);
      scene.remove(collectVisuals.group);
      scene.remove(pickups.group);
      scene.remove(doorway.group);
    }
    if (wedgeVis) {
      scene.remove(wedgeVis.group);
      wedgeVis.dispose();
      wedgeVis = null;
    }
    if (courseVis) {
      scene.remove(courseVis.group);
      courseVis.dispose();
      courseVis = null;
    }
    for (const m of enemyModels) scene.remove(m.root);
    for (const g of globs) {
      const gm = globMeshes.get(g);
      if (gm) scene.remove(gm);
    }
    globs.length = 0;
    globMeshes.clear();
    embers.length = 0;
    flames.clear();
    emberFx.clear();
    for (const n of npcs) scene.remove(n.root);
    npcs.length = 0;
    if (plateGroup) scene.remove(plateGroup);
    plateGroup = new THREE.Group();
    platesDown = (def.plates ?? []).map(() => false);
    for (const pl of def.plates ?? []) plateGroup.add(...buildPlate(pl.x, pl.y, pl.z));
    scene.add(plateGroup);
    dialog.close();
    talkingTo = null;
    heard.foes.clear();
    lockTarget = null;
    audio.stopLoops();
    audio.playTrack(def.music ?? 'drift', def.id);
    braziers = def.decor.filter((d) => d.kind === 'brazier').map((d) => ({ x: d.x, y: d.y + 0.8, z: d.z }));
    motes.setTheme(def.motes ?? def.theme, !!def.hub, new THREE.Vector3(def.spawn.x, def.spawn.y, def.spawn.z));
    sky.show(def.sky);
    // The dream's creatures: made for the place, thrown away when he leaves it.
    for (const dz of dozers.splice(0)) dz.dispose();
    for (const spec of def.dozers ?? []) {
      const dz = new Dozer(spec);
      scene.add(dz.root);
      dozers.push(dz);
    }
    // (The dream: he wears its colours and a scarf three times as long. Only looks.)
    if ((def.look === 'dream') !== dreaming) {
      dreaming = def.look === 'dream';
      if (dreaming) wearDream();
      else {
        rat.wearColours(null);
        rat.setScarfLong(1);
      }
    }
    enemies.length = 0;
    antList.length = 0;
    enemyModels.length = 0;
    drops.clear();
    debris.clear();
    revealedCrates.clear();
    cur = def;
    ps1Uniforms.fogColor.value.set(def.fog ?? 0x0b1410);
    ps1Uniforms.ambient.value = def.ambient ?? 1;
    gusts = gustsOf(def.decor);
    jets = jetsOf(def.decor);
    jetOpen = [];
    applySight();
    renderer.setClearColor(ps1Uniforms.fogColor.value);
    if (!keep) tracker.reset(def.id);

    chamber = buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, pipes: def.pipes, gates: def.gates, movers: def.movers, lava: def.lava, fire: def.fire });
    // Whatever lies on something else in it is painted on after it, so the two never flicker through each other
    // (render/layering.ts). A place that looks straight into something solid is never seen, and is left alone.
    {
      const cs = chamber.colliders;
      autoLayer(chamber.group, (p) => cs.some((b) => !b.ramp && p.x > b.min.x + 1e-3 && p.x < b.max.x - 1e-3 && p.y > b.min.y + 1e-3 && p.y < b.max.y - 1e-3 && p.z > b.min.z + 1e-3 && p.z < b.max.z - 1e-3));
      // Then its still dressing is gathered into fewer meshes (what was layered is left as it is).
      chamber.gather();
      musicFloor = chamber.music ? new MusicFloor(chamber.music.pads) : null;
    }
    scene.add(chamber.group);
    player.water = chamber.water;
    player.well = def.well ?? null;
    player.slime = slimeZones(def.decor);
    collectVisuals = new CollectibleVisuals({ id: def.id, name: def.name, items: def.collectibles }, tracker, { floorAt });
    collectVisuals.hidden = (d) => d.crate !== undefined && !revealedCrates.has(d.crate);
    scene.add(collectVisuals.group);
    pickups = new PickupVisuals(def.gear, equipment);
    scene.add(pickups.group);
    doorway = new Doorway(def.exit, def.theme ?? 'sewer');
    scene.add(doorway.group);
    goals = new GoalTracker(def, (k) => tracker.count(def.id, k));
    dreamVoices.reset();
    for (const spec of def.enemies) addEnemy(spec);
    // THE DREAM'S CREATURES ARE THE WAKING WORLD'S, IN LOUD COLOURS (as its sleepers are: world/dozers.ts): the same
    // creature in all it does, its painted colours turned round the wheel. Only looks.
    if (def.look === 'dream') enemyModels.forEach((m, i) => dreamify(m.root, [0.42, 0.58, 0.3, 0.7][i % 4]));
    // Its light rails (world/rails.ts): the lines that are drawn are the lines he grinds.
    player.feel = feelOf(def);
    player.skateAnywhere = !!def.skate;
    player.rails = def.decor.filter((d): d is Extract<typeof d, { kind: 'lightrail' }> => d.kind === 'lightrail').map((d) => railCurve(d));
    // An open course: the wedges he already has, and the ones out in the course right now (so they do not chime on arrival).
    if (def.wedges) {
      for (const w of def.wedges) if (discoveries.has(`wedge:${def.id}:${w.id}`)) goals.earned.add(w.id);
      wedgeVis = new WedgeVisuals(def.wedges);
      scene.add(wedgeVis.group);
      shyKeepers = new Map();
      def.wedges.forEach((w, i) => {
        if (w.appears?.type === 'unseen') shyKeepers.set(i, keepersOf(w, w.appears.radius, enemies));
      });
      wedgeWasOut = def.wedges.map((_, i) => goals.wedgeOut(i, aliveCount()));
    }
    // A hub: its own door is open from the start, and its course doors show what they lead to and what they want.
    // A sub-area's door back out is open from the start: unless the area asks something of him first (the Long
    // Drop's way out opens when the Widow is beaten; he walked out past her, the first time she was put in).
    // (And the Club's, now that it is a room off the Hall: it leads back there.)
    if ((def.returnTo || (def.hub && !noWayOut(def))) && def.goals.length === 0) levelProgress.markCleared(def.id);
    // Doors to other areas (the Club's world doors, or a world's doors into its side areas), each with a sign.
    const doors = doorsOf(def);
    if (doors.length) {
      courseVis = new CourseDoors(doors, doors.map((cd) => {
        const to = cd.to ? levelById(cd.to) : null;
        // The Club's signs count the whole world (every area in it); a side door counts just that area.
        const areas = to ? (def.hub ? worldAreas(to) : [to]) : [];
        const got = areas.reduce((n, a) => n + (a.wedges ?? []).filter((w) => discoveries.has(`wedge:${a.id}:${w.id}`)).length, 0);
        const of = areas.reduce((n, a) => n + (a.wedges?.length ?? 0), 0);
        return { open: doorOpen(cd), got, of };
      }), def.theme ?? 'sewer', doors.map((cd) => roomOverDoor(def.solids, cd.door)));
      scene.add(courseVis.group);
      // Their stone frames are solid, as drawn (he used to walk into the jambs).
      for (const cd of doors) addDoorFrame(cd.door);
    }
    exitFrameSolid = false;
    for (const spec of def.npcs ?? []) {
      // A copy, because a story scene may move him about.
      const n = new Npc({ ...spec });
      // (His still parts joined: fewer draw calls. `&nojoin` keeps them apart, to compare.)
      if (!noJoin) n.settle();
      // One of the Club's later regulars: not here until what brings him has been done. (`#unlockall` shows them all.)
      if (!isHere(spec.when, levelProgress) && !unlockAll) n.gone = true;
      npcs.push(n);
      scene.add(n.root);
      // He is solid, so the rat cannot walk through him. (Not while he is out of the room.)
      const body = makeAabb(spec.x, (spec.y ?? 0) + 0.6, spec.z, 0.7, 1.2, 0.7);
      npcBodies.set(n, body);
      if (!n.gone) chamber.colliders.push(body);
    }

    const hp = player.hp;
    player.spawn.set(def.spawn.x, def.spawn.y, def.spawn.z);
    player.respawn();
    player.hp = Math.max(1, hp);
    player.facing = def.spawn.facing;
    follow.yaw = def.spawn.facing + Math.PI;
    follow.snap();
    lastSafe.copy(player.position);

    const dc = doorCamera(def.exit);
    doorCamPos.set(...dc.pos);
    doorCamLook.set(...dc.look);
    cutscene.active = false;
    levelProgress.setLast(def.id);
    refreshCollectHud();

    // Story: any scene from the last room is over; this room's opening plays the first time he arrives.
    endScene();
    clearKeepsake();
    exitScenePlayed = false;
    storyPending = null;
    storyWaiting = null;
    // Something from the old days lying in the room, waiting to be noticed.
    const lying = STORY[def.id]?.near;
    const lyingAt = lying?.prop && def.storySpots?.[lying.spot];
    if (lying?.prop && lyingAt && !storyOff && !storySeen.seen(`${def.id}.near`)) dropKeepsake(lying.prop, lyingAt);
    const st = STORY[def.id];
    const opening = st?.open;
    afterPlayed = false;
    for (const m of ringMeshes.values()) scene.remove(m);
    ringMeshes.clear();
    if (opening && !storyOff && !storySeen.seen(`${def.id}.open`) && (st.openEvenIfCleared || !levelProgress.cleared(def.id)) && (!st.openAfter || levelProgress.cleared(st.openAfter))) storyPending = opening(storyCtx());
    // No opening to sit through: the boss is in the fight from the start.
    if (st?.boss && !storyPending) wakeBoss();
    // The story is over: Grimsqueak stays where the ending left him, on the ground (in the Club, or the old Dave's Spot).
    if ((def.id === 'davespot' && storySeen.seen('davespot.open')) || (def.id === 'hub' && storySeen.seen('hub.open'))) {
      for (const n of npcs) {
        if (n.spec.kind !== 'villain') continue;
        n.moveTo(def.spawn.x + 1.35, def.spawn.y, def.spawn.z - 3.5);
        n.rest();
      }
      syncNpcBodies();
    }
  }

  function startCutscene(at = 0): void {
    cutscene.active = true;
    cutscene.t = at;
    cutscene.baseFacing = player.facing;
    player.velocity.set(0, 0, 0);
  }
  /** Fades out, loads the level, fades back in. */
  function startTransition(to: LevelDef): void {
    trans.active = true;
    trans.t = 0;
    trans.moved = false;
    trans.to = to;
    player.velocity.set(0, 0, 0);
  }
  const nextLevel = (): LevelDef => levelById(nextInOrder(cur.id, levelOrder)) ?? hubLevel ?? LEVELS[0];
  const aliveCount = (): number => enemies.filter((e) => e.alive).length;
  const allCollected = (): boolean => {
    const c = (['crumb', 'cap', 'relic'] as const).map((k) => tracker.count(cur.id, k));
    return c.some((x) => x.total > 0) && c.every((x) => x.have >= x.total);
  };

  // The "to talk" hint, shown when the rat stands next to someone with something to say.
  if (!document.getElementById('rq-hint-css')) {
    const st = document.createElement('style');
    st.id = 'rq-hint-css';
    st.textContent = `.rq-hint { position: absolute; left: 6%; bottom: 34%; z-index: 20; display: none; align-items: center; gap: 0.5em; pointer-events: none;
      font: 800 clamp(13px, 3.4vh, 30px)/1 var(--rq-font-game); color: #ffe27a; text-shadow: 0.1em 0.1em 0 #000, -0.05em -0.05em 0 #000; letter-spacing: 0.06em; }
      .rq-hint.on { display: flex; }
      .rq-hint .rqg { font-size: 0.9em; }`;
    document.head.appendChild(st);
  }
  const talkHint = document.createElement('div');
  talkHint.className = 'rq-hint';
  ensureGlyphCss();
  let talkShown = '';
  gameWrap.appendChild(talkHint);

  /** Sounds for what the rat just did: jumps, landings, steps, swings, hits taken, swimming. */
  function soundAfterPlayer(sneak: boolean, vyBefore: number): void {
    const s = player.state;
    const was = heard.state;
    const inWater = s === 'swim';
    if (player.velocity.y > 3 && vyBefore <= 3 && !player.grounded && !inWater) {
      audio.play(Math.random() < 0.5 ? 'ratJump' : 'ratJump2', { vol: 0.85, rate: roll(0.92, 1.1), priority: 7 });
    } else if (!player.grounded && !inWater && was !== 'swim' && player.velocity.y > vyBefore + 2.5) {
      // A jump in mid-air: the extra one.
      audio.play('ratDouble', { vol: 0.9, priority: 7 });
      audio.play('doubleJump', { vol: 0.5, priority: 4 });
    }
    // The open-course moves.
    const ev = player.moveEvent;
    if (ev === 'longjump') audio.play('whoosh', { vol: 0.55, rate: 1.2, priority: 5 });
    else if (ev === 'wallkick') {
      audio.play('land', { vol: 0.55, rate: 1.35, priority: 6 });
      rumble.land(6);
    } else if (ev === 'grab') {
      audio.play('step', { vol: 0.7, rate: 0.8, priority: 6 });
      audio.play('cloth', { vol: 0.5, priority: 4 });
    } else if (ev === 'climb') audio.play('ratJump2', { vol: 0.6, rate: 1.25, priority: 6 });
    // Riding his shield: it goes down under his feet, cracks off the ground and back onto it, whirls round in a
    // kickflip (a bright note if he lands one), and clatters away when he comes off.
    // (Getting on is a hop: the swing of it now, the crack of it under his feet when he comes down on it.)
    else if (ev === 'ride') {
      audio.play('whoosh', { vol: 0.5, rate: 1.5, priority: 5 });
      audio.play('cloth', { vol: 0.5, priority: 4 });
      rideLandIn = RIDE_MOUNT * RIDE_MOUNT_LAND;
    } else if (ev === 'ollie') audio.play('ridePop', { vol: 0.75, rate: roll(1.0, 1.12), priority: 6 });
    else if (ev === 'kickflip') {
      // (The same event begins a kickflip and a spin: a spin is the one just begun, at nought of the way round.)
      const spin = player.rideSpinProgress >= 0 && player.rideSpinProgress < 0.1;
      trickLog.begin(spin ? 'spin' : 'flip');
      if (spin) audio.play('spinWhirl', { vol: 0.7, rate: roll(0.95, 1.08), priority: 5 });
      else audio.play('whoosh', { vol: 0.6, rate: 1.7, priority: 5 });
    }
    else if (ev === 'rideLand') {
      trickLog.clear();
      audio.play('ridePop', { vol: 0.6, rate: roll(0.85, 0.95), priority: 5 });
    }
    else if (ev === 'trick') {
      audio.play('ridePop', { vol: 0.65, rate: 0.9, priority: 6 });
      audio.play('sparkle', { vol: 0.5, rate: 1.3, priority: 6 });
      // A stab of horns, a step higher for each trick after the first.
      const did = trickLog.count;
      trickLog.clear();
      audio.play('trickStab', { vol: 0.6, rate: Math.pow(2, (2 * Math.min(4, Math.max(0, did - 1))) / 12), priority: 6 });
      rumble.land(5);
    } else if (ev === 'bail') {
      trickLog.clear();
      audio.play('rideClatter', { vol: 0.85, priority: 8 });
      audio.play('ratHurt', { vol: 0.55, rate: 1.15, priority: 7 });
      rumble.land(9);
    } else if (ev === 'rideEnd') {
      trickLog.clear();
      audio.play('step', { vol: 0.6, rate: 0.85, priority: 4 });
    }
    // Off his feet on ground too steep for him: a yelp and a thump, a grunt for the hop out of it, a scuff getting up.
    else if (ev === 'slip') {
      audio.play('ratHurt', { vol: 0.4, rate: 1.3, priority: 6 });
      audio.play('land', { vol: 0.5, rate: 0.8, priority: 5 });
      audio.play('cloth', { vol: 0.6, priority: 4 });
    } else if (ev === 'slideHop') audio.play('ratJump', { vol: 0.5, rate: 1.1, priority: 4 });
    else if (ev === 'slideEnd') audio.play('step', { vol: 0.6, rate: 0.8, priority: 4 });
    // Onto an edge with it: iron on stone, a hard knock and a ring.
    else if (ev === 'grind') {
      // (Onto a rail out of the air: what he was doing up there is over, and not paid for.)
      trickLog.clear();
      audio.play('ridePop', { vol: 0.7, rate: 1.35, priority: 6 });
      audio.play('clank', { vol: 0.45, rate: 1.5, priority: 5 });
      rumble.land(4);
    } else if (ev === 'grindEnd') audio.play('ridePop', { vol: 0.4, rate: 1.2, priority: 4 });
    if (!heard.grounded && player.grounded && !inWater) {
      audio.play('land', { vol: Math.min(1, 0.35 + Math.abs(vyBefore) / 12), rate: roll(0.9, 1.1) });
      rumble.land(Math.abs(vyBefore));
      // Odds and ends close by answer it (world/chamber.ts thump), each with a little sound of its own: a knock for
      // wood and bone and glass, a tink for tin and china. Unheard by Claude.
      for (const what of new Set(chamber.thump(player.position.x, player.position.y, player.position.z, Math.min(1, Math.abs(vyBefore) / 10)))) {
        if (what === 'spoon' || what === 'sardines' || what === 'teacup' || what === 'battery') audio.play('clank', { vol: 0.16, rate: what === 'teacup' ? 3.2 : what === 'battery' ? 2.0 : 2.6, priority: 3 });
        else audio.play('rockKnock', { vol: 0.2, rate: what === 'marble' ? 3 : what === 'die' ? 1.9 : 2.4, priority: 3 });
      }
    }
    if ((s === 'attack' || (player.riding && player.attackTime > 0)) && player.swingId !== heard.swing) {
      audio.play('swing', { vol: 0.7, rate: roll(0.95, 1.12), priority: 6 });
      if (Math.random() < 0.7) audio.play('ratAttack', { vol: 0.7, rate: roll(0.9, 1.15), priority: 6 });
    }
    if (s === 'dodge' && was !== 'dodge') audio.play('dodge', { vol: 0.7, priority: 6 });
    if (s === 'plunge' && was !== 'plunge') audio.play('ratAttack', { vol: 0.8, rate: 0.7, priority: 7 });
    if (player.splash) audio.play('splash', { vol: 0.8, rate: roll(0.9, 1.1), verb: 0.3, priority: 6 });
    if (player.hp < heard.hp) audio.play(player.hp <= 0 || player.dead ? 'ratDie' : 'ratHurt', { vol: 1, rate: roll(0.95, 1.05), priority: 9 });
    // (Down he goes: the slow piano, over what is left of the music. It stops when he is up again.)
    if (player.hp < heard.hp && (player.hp <= 0 || player.dead)) audio.jingle('defeat', { under: 0.12 });
    // Footsteps by distance covered, quieter when sneaking.
    if (player.grounded && (s === 'walk' || s === 'run')) {
      heard.stepDist += Math.hypot(player.position.x - player.prevPosition.x, player.position.z - player.prevPosition.z);
      if (heard.stepDist >= (s === 'run' ? 1.5 : 1.0)) {
        heard.stepDist = 0;
        audio.play('step', { vol: sneak ? 0.18 : 0.4, rate: roll(0.85, 1.15), verb: 0.08, priority: 1 });
      }
    } else heard.stepDist = 0;
    heard.state = s;
    heard.grounded = player.grounded;
    heard.swing = player.swingId;
    heard.hp = player.hp;
  }
  /** Sounds from the rest of the world: foes winding up, dying, spitting, water, gates. */
  function soundWorld(dt: number): void {
    // The dream's creatures speak, in the voices of old speech chips: a word for an attack, a grunt when struck, a word
    // as they go down (audio/dreamVoices.ts). ONLY in the dream: the owner's rule for the robot voice.
    if (speaksRobot(cur)) {
      for (const c of dreamVoices.step(dt, enemies)) {
        const voice = voiceOf(c.who.kind);
        const list = ROBOT_VOICES[voice][c.cry];
        const i = Math.floor(Math.random() * list.length);
        const key = `robot:${voice}:${c.cry}:${i}`;
        let smp = robotSamples.get(key);
        if (!smp) robotSamples.set(key, (smp = decodeRecorded(list[i])));
        audio.playSample(key, smp, { vol: Math.max(0.35, hearAt(c.who.x, c.who.z, 26)) * (c.cry === 'hurt' ? 0.8 : 1), rate: roll(0.96, 1.06), priority: c.cry === 'die' ? 8 : 7 });
      }
    }
    for (const e of enemies) {
      const prev = heard.foes.get(e);
      if (prev === e.state) continue;
      heard.foes.set(e, e.state);
      const v = hearAt(e.x, e.z);
      if (v <= 0 || prev === undefined) continue;
      if (e.kind === 'scuttler') {
        if (e.state === 'windup') audio.play('roachWind', { vol: v, priority: 5 });
        else if (e.state === 'lunge') audio.play('roachScreech', { vol: v, rate: roll(0.92, 1.12), priority: 6 });
        else if (e.state === 'dead') audio.play('roachDie', { vol: v, rate: roll(0.9, 1.1), priority: 6 });
      } else if (e.kind === 'guard') {
        // (What he does has its own sounds, in beastSounds; only his fall is here.)
        if (e.state === 'dead') audio.play('guardDie', { vol: v, priority: 6 });
      } else if (e.kind === 'hornet') {
        if (e.state === 'dead') audio.play('hornetDie', { vol: v, priority: 6 });
      } else if (e.kind === 'ant') {
        if (e.state === 'dead') audio.play('antDie', { vol: v, priority: 6 });
      } else if (e.kind === 'firefly') {
        if (e.state === 'dead') audio.play('fireflyDie', { vol: v, priority: 6 });
      } else if (e.kind === 'scorpion') {
        if (e.state === 'dead') audio.play('scorpDie', { vol: v, priority: 6 });
      } else if (e.kind === 'mantis') {
        if (e.state === 'dead') audio.play('mantisDie', { vol: v, priority: 6 });
      } else if (e.kind === 'wyrm') {
        if (e.state === 'dead') {
          audio.play('wyrmDie', { vol: 1, priority: 9 });
          audio.play('recall', { vol: 0.7, rate: 0.5, priority: 8 });
        }
      } else if (e.kind === 'widow') {
        if (e.state === 'dead') {
          audio.play('widowDie', { vol: 1, priority: 9 });
          audio.play('rumble', { vol: 0.8, rate: 0.9, priority: 8 });
        }
      } else if (e.kind === 'brood') {
        // (What she does has its own sounds, in beastSounds; only her fall is here.)
        if (e.state === 'dead') {
          audio.play('broodDie', { vol: 1, priority: 9 });
          audio.play('recall', { vol: 0.7, rate: 0.6, priority: 8 });
        }
      } else if (e.kind === 'stag') {
        if (e.state === 'dead') {
          audio.play('flipClang', { vol: v, rate: 0.5, priority: 8 });
          audio.play('stagDie', { vol: v, priority: 6 });
        }
      } else if (e instanceof Grimsqueak) {
        // His sounds come from what he does (bossTick), not from his states; only his sinking and his fall are here.
        if (e.state === 'dead') {
          audio.play('grimDie', { vol: 1, priority: 9 });
          audio.play('recall', { vol: 0.7, rate: 0.7, priority: 8 });
        } else if (e.state === 'spent' || e.state === 'stunned') audio.play('grimSag', { vol: Math.max(0.4, v) * 0.8, rate: e.state === 'stunned' ? 0.75 : 1.1, priority: 5 });
      } else if (e.kind === 'ironback') {
        // (What it does has its own sounds, in beastSounds; only its end is here.)
        if (e.state === 'dead') audio.play('ironDie', { vol: v, priority: 6 });
      } else if (e.kind === 'bat') {
        if (e.state === 'dead') audio.play('batDie', { vol: v, priority: 6 });
      } else if (e.state === 'crouch') audio.play('croak', { vol: v, rate: 0.55, priority: 6 });
      else if (e.state === 'pounce') audio.play('whoosh', { vol: v, rate: 0.8, priority: 6 });
      else if (e.state === 'windup') audio.play('toadWind', { vol: v, priority: 5 });
      else if (e.state === 'hop') audio.play('croak', { vol: v, priority: 5 });
      else if (e.state === 'dead') audio.play('croak', { vol: v, rate: 0.6, priority: 6 });
    }
    // (A toad's spit leaving its mouth. Grimsqueak's bolts have their own crack, from what he does.)
    const slime = globs.reduce((n, g) => n + (g.kind ? 0 : 1), 0);
    if (slime > heard.globs) audio.play('spit', { vol: 0.8, priority: 6 });
    heard.globs = slime;
    const open = chamber.gates.filter((g) => g.open).length;
    if (open > heard.gates) audio.play('gate', { vol: 0.9, verb: 0.3, priority: 8 });
    heard.gates = open;
    // Running water: loud near the river, quiet far away; each burst pipe gushes.
    // The river is heard at a moderate level when you are in it or at its edge, and fades out over about 12 units, counting height too,
    // so up on a high platform it is nearly gone.
    let wv = 0;
    for (const w of chamber.water) {
      const dx = Math.max(w.x0 - player.position.x, 0, player.position.x - w.x1);
      const dz = Math.max(w.z0 - player.position.z, 0, player.position.z - w.z1);
      const dy = Math.max(0, player.position.y - w.y - 0.5);
      wv = Math.max(wv, nearness(Math.hypot(dx, dz, dy * 1.5), 12));
    }
    audio.loop('water', wv * wv * 0.4);
    // The music follows the game: drums come in when something is hunting him, and the sound goes dull in the water.
    let fighting = lockTarget !== null;
    for (const e of enemies) {
      if (!e.alive || (e instanceof Grimsqueak && e.asleep)) continue;
      if (e.state === 'idle' || e.state === 'return') continue;
      discoveries.add(e.kind === 'boss' ? 'char:grimsqueak' : `foe:${e.kind}`);
      if (Math.hypot(e.x - player.position.x, e.z - player.position.z) < 14 && Math.abs(e.y - player.position.y) < 6) fighting = true;
    }
    moodCombat += Math.max(-0.25 * dt, Math.min(1.5 * dt, (fighting ? 1 : 0) - moodCombat));
    const waterMood = player.swimming ? 1 : 0.3 * wv * wv;
    moodWater += Math.max(-1.5 * dt, Math.min(2.5 * dt, waterMood - moodWater));
    audio.setMood({ combat: story.scene || dialog.open ? 0 : moodCombat, water: moodWater });
    let gv = 0;
    for (const pp of chamber.pipes) if (!pp.alive) gv = Math.max(gv, hearAt(pp.x, pp.z, 16));
    audio.loop('gush', gv * gv * 0.3);
    // The world's own sound: its bed, and now and then something far off.
    const ws = worldSoundFor(cur.theme, !!cur.hub, cur.sky === 'space');
    for (const bed of WORLD_BEDS) audio.loop(bed, bed === ws.bed ? ws.bedVol : 0);
    for (const n of ambience.step(dt, ws)) audio.play(n.name, { vol: n.vol, rate: n.rate, verb: n.verb, priority: 0 });
    // Close to lava: it roils and pops. Close to a brazier: it crackles.
    let lv = 0;
    for (const l of chamber.lava) {
      const dx = Math.max(l.x0 - player.position.x, 0, player.position.x - l.x1);
      const dz = Math.max(l.z0 - player.position.z, 0, player.position.z - l.z1);
      lv = Math.max(lv, nearness(Math.hypot(dx, dz, Math.max(0, player.position.y - l.y) * 1.2), 14));
    }
    audio.loop('lavaBubble', lv * lv * 0.45);
    // A hornet in the air near him: the drone of its wings (louder while it winds up; nothing once it is down).
    let hv = 0;
    for (const e of enemies) {
      if (!(e instanceof Hornet) || !e.alive || e.state === 'grounded' || e.state === 'fall') continue;
      hv = Math.max(hv, nearness(Math.hypot(e.x - player.position.x, e.y - player.position.y, e.z - player.position.z), 15) * (e.attacking || e.state === 'stuck' ? 1 : 0.7));
    }
    audio.loop('hornetBuzz', hv * hv * 0.5);
    // A firefly in the air near him: the soft whirr of its wings (fainter while it hangs spent; nothing once it is down).
    let ffv = 0;
    for (const e of enemies) {
      if (!(e instanceof Firefly) || !e.alive || e.state === 'grounded' || e.state === 'fall') continue;
      ffv = Math.max(ffv, nearness(Math.hypot(e.x - player.position.x, e.y - player.position.y, e.z - player.position.z), 15) * (e.low ? 0.6 : e.attacking ? 1 : 0.8));
    }
    audio.loop('fireflyHum', ffv * ffv * 0.5);
    // Gas: the crack and rush of a pipe letting go (the warning of a gust: its gas is then a couple of seconds from
    // the floor), and a hiss as loud as the nearest gas is near.
    let gasV = 0;
    jets.forEach((j, i) => {
      const open = gasAt(j, worldClock, 0);
      // (Where a jet takes up from another, it is the first that is the pipe: only that one cracks.)
      if (open && jetOpen[i] === false && j.delay === 0) audio.play('gasBurst', { vol: Math.max(0.25, hearAt(j.x, j.z, 26)), rate: roll(0.94, 1.06), priority: 6 });
      jetOpen[i] = open;
      gasV = Math.max(gasV, nearness(gasNear(j, worldClock, player.position.x, player.position.y + TUNING.rat.height / 2, player.position.z), 9));
    });
    audio.loop('gasHiss', gasV * gasV * 0.4);
    // His shield on the stone, while he rides it on the ground: louder the faster he goes.
    if (rideLandIn > 0 && (rideLandIn -= dt) <= 0 && player.riding) {
      audio.play('ridePop', { vol: 0.7, rate: 0.8, priority: 6 });
      rumble.land(4);
    }
    const rideV = player.riding && player.grounded && !player.dead ? Math.min(1, Math.hypot(player.velocity.x, player.velocity.z) / TUNING.ride.max) : 0;
    // (Sliding on his hide is the same grit, a good deal quieter.)
    const slideV = player.sliding && player.grounded && !player.dead ? Math.min(1, Math.hypot(player.velocity.x, player.velocity.z) / TUNING.slide.max) : 0;
    // (The scrape of the shield is a hiss, and in the dream he is on it all the time: it was up to 0.63 of full, and
    // was the other half of his "white noise that permeates in the background everywhere". A third of that now.)
    audio.loop('rideScrape', player.grinding ? 0 : Math.max(rideV * RIDE_SCRAPE.speed + (rideV > 0 ? RIDE_SCRAPE.least : 0), slideV * 0.22 + (slideV > 0 ? 0.05 : 0)));
    // ...and its rim along an edge: a ringing shriek, higher and louder the faster.
    audio.loop('grindRing', player.grinding ? rideV * 0.3 + 0.1 : 0);
    let fv = 0;
    for (const b of braziers) fv = Math.max(fv, nearness(Math.hypot(b.x - player.position.x, b.y - player.position.y, b.z - player.position.z), 6));
    // (A firefly's flames crackle as a brazier does, for as long as they burn.)
    for (const f of flames.list) fv = Math.max(fv, nearness(Math.hypot(f.x - player.position.x, f.y - player.position.y, f.z - player.position.z), 8) * flameHeat(f));
    audio.loop('fire', fv * fv * 0.3);
  }

  const ambience = new Ambience();
  // The air of each world: embers, spores, dust.
  const motes = new MoteField();
  scene.add(motes.points);
  const WORLD_BEDS = ['drain', 'machine', 'wind', 'hall'] as const;
  /** How loud the shield's scrape is as he rides: at his standing top speed, and the least of it while he is moving at all. */
  /** (And then, of that: "it also should be mixed really low so you like barely hear it". A ninth of what it first was.) */
  const RIDE_SCRAPE = { speed: 0.07, least: 0.01 } as const;
  /** Where this level's braziers stand (for their crackle). Set when a level loads. */
  let braziers: Array<{ x: number; y: number; z: number }> = [];
  // Lava: touching it hurts and puts him back on the last safe ground he stood on.
  const lastSafe = new THREE.Vector3();
  let fallFromY = 0;
  let fallWasY = 0;

  function lavaStep(): void {
    if (player.dead) return;
    const p = player.position;
    // A round room at the bottom of a long way down (the Long Drop's arena): once he stands on its floor, that is
    // where he comes back to. He is not sent up to ride all the way down again.
    const well = cur.well;
    if (well && player.grounded && p.y < well.y + 0.5 && player.spawn.y > well.top) player.spawn.set(well.x, well.y, well.z - well.r * 0.5);
    // A level with a drop into the dark: a heart, and back to the last ground he stood on.
    // (How far: from where he last had something under him, a rail or an edge he was grinding as much as the ground.)
    fallFromY = fallFrom(fallFromY, p.y, player.grounded || player.grinding, fallWasY);
    fallWasY = p.y;
    if ((cur.fallBack && p.y < -3) || (cur.fallDepth !== undefined && fellTooFar(fallFromY, p.y, cur.fallDepth))) {
      fallFromY = lastSafe.y;
      p.copy(lastSafe);
      player.prevPosition.copy(lastSafe);
      // (In the dream, and on any ride downhill, a fall costs nothing: he is only put back.)
      const cost = fallCost(cur, !!player.gear.fireproof);
      const result = cost > 0 ? player.takeFall(cost) : 'dodged';
      player.velocity.set(0, 0, 0);
      if (result === 'hit' || result === 'killed') events.playerResult = result;
      follow.snap();
      audio.play('plunge', { vol: 0.6, rate: 0.6, priority: 7 });
      // (The record pulled back: he is where he was a moment ago.)
      audio.play('rewind', { vol: 0.7, priority: 7 });
      return;
    }
    // A fire bowl's fire: it burns him like any fire (the owner, 2026-11-15: "it's fire so you shouldn't be able to just
    // stand in it"), in the Club as anywhere, and throws him off the bowl. No roll or shield helps; the Ember Helm does.
    const bowl = player.dead || player.gear.fireproof ? null : inBrazierFire(cur.decor, p.x, p.y, p.z);
    if (bowl) {
      const result = player.takeBurn(bowl.x, bowl.z, 1);
      if (result === 'hit' || result === 'killed') {
        events.playerResult = result;
        resting = -1;
        // (Up and off it, not just sideways: he is standing in the bowl.)
        if (!player.dead) player.velocity.y = Math.max(player.velocity.y, 5);
        audio.play('emberBurst', { vol: 0.7, rate: 1.2, priority: 7 });
      }
    }
    // A standing fire: it burns anyone who is not fireproof (no roll or shield helps) and he is back where he last stood.
    // In the Ember Helm he walks through it.
    if (fireAt(cur.fire, p.x, p.y, p.z)) {
      if (player.gear.fireproof) return;
      const result = player.takeFall(1);
      if (result === 'hit' || result === 'killed') events.playerResult = result;
      if (player.dead) return;
      p.copy(lastSafe);
      player.prevPosition.copy(lastSafe);
      player.velocity.set(0, 0, 0);
      follow.snap();
      audio.play('splash', { vol: 0.8, rate: 1.5, priority: 7 });
      return;
    }
    let inLava: (typeof chamber.lava)[number] | null = null;
    let near = false;
    for (const l of chamber.lava) {
      if (p.x > l.x0 - 1.4 && p.x < l.x1 + 1.4 && p.z > l.z0 - 1.4 && p.z < l.z1 + 1.4 && p.y < l.y + 1.2) near = true;
      if (p.x > l.x0 && p.x < l.x1 && p.z > l.z0 && p.z < l.z1 && p.y < l.y + 0.1) inLava = l;
    }
    if (inLava) {
      // (The Ember Helm: thrown back all the same, but no heart lost.)
      const result = player.gear.fireproof ? 'dodged' : player.takeHit((inLava.x0 + inLava.x1) / 2, (inLava.z0 + inLava.z1) / 2, 1);
      if (result === 'hit' || result === 'killed') events.playerResult = result;
      if (player.dead) return;
      p.copy(lastSafe);
      player.prevPosition.copy(lastSafe);
      player.velocity.set(0, 4, 0);
      follow.snap();
      audio.play('splash', { vol: 0.8, priority: 7 });
    } else if (player.grounded && !near && !player.swimming && !fireAt(cur.fire, p.x, p.y, p.z) && !inBrazierFire(cur.decor, p.x, p.y, p.z)) {
      const onMover = chamber.movers.some((m) => p.x > m.aabb.min.x && p.x < m.aabb.max.x && p.z > m.aabb.min.z && p.z < m.aabb.max.z && Math.abs(p.y - m.aabb.max.y) < 0.2);
      // (Only a place with ground under his middle and round it: not one where he stands with his middle past an edge.)
      if (!onMover && safeToReturnTo(chamber.colliders, p.x, p.y, p.z)) lastSafe.copy(p);
    }
  }

  /** A moving platform that pins him against the ceiling crushes him: a hit, and back to the last safe ground. */
  function crushCheck(): void {
    if (player.dead) return;
    const p = player.position;
    if (!pinnedUnder(p, chamber.colliders, chamber.movers.map((m) => m.aabb), chamber.carry)) return;
    const result = player.takeHit(p.x, p.z, 1);
    if (result === 'hit' || result === 'killed') events.playerResult = result;
    if (player.dead) return;
    p.copy(lastSafe);
    player.prevPosition.copy(lastSafe);
    player.velocity.set(0, 0, 0);
    follow.snap();
  }

  /** True while any key bound to the action is held. */
  const keyHeld = (a: BindAction): boolean => bindings.keys(a).some((c) => input.isDown(c));
  /** True once per press of a key bound to the action. */
  const keyTap = (a: BindAction): boolean => bindings.keys(a).reduce((r, c) => input.consumePressed(c) || r, false);

  function simulate(dt: number): void {
    const m = computeMove();
    // He always runs. Holding the sneak button (Shift, or L2 on a pad) slows him to a quiet walk.
    const sneak = keyHeld('sneak') || controlSources.some((s) => s.runHeld);
    let run = !sneak;
    let jumpPressed = keyTap('jump') || consumeAction('jump');
    // Next to someone with something to say, the jump button talks to him instead.
    const nearNpc = npcs.find((n) => n.inRange(player.position.x, player.position.y, player.position.z));
    if (jumpPressed && nearNpc?.spec.shop && player.grounded && !player.dead && !builder.live) {
      // A shopkeeper: straight to his shop.
      jumpPressed = false;
      const id = charIdFor(nearNpc.spec.name);
      if (id) discoveries.add(id);
      player.velocity.set(0, 0, 0);
      shop.show(nearNpc.spec.lines[0] ?? 'Squeak! Have a look.');
      audio.play('menuMove', { vol: 0.7, priority: 6 });
    } else if (jumpPressed && nearNpc && player.grounded && !player.dead && !builder.live) {
      jumpPressed = false;
      talkingTo = nearNpc;
      dialog.start(nearNpc.spec.name, nearNpc.spec.lines, nearNpc.spec.kind);
      if (nearNpc.spec.kind === 'villain') audio.play('villainLaugh', { vol: 0.9, verb: 0.3, priority: 8 });
      player.velocity.set(0, 0, 0);
    }
    // A villain who speaks first: when the rat walks into his hall he starts his speech.
    if (!dialog.open && !jumpPressed && audio.started && player.grounded && !player.dead && !builder.live && !story.scene && !showPending) {
      const starter = npcs.find((n) => n.spec.auto && !n.autoDone && Math.hypot(n.spec.x - player.position.x, n.spec.z - player.position.z) < (n.spec.auto ?? 0));
      if (starter) {
        starter.autoDone = true;
        talkingTo = starter;
        dialog.start(starter.spec.name, starter.spec.lines, starter.spec.kind);
        if (starter.spec.kind === 'villain') audio.play('villainLaugh', { vol: 0.9, verb: 0.3, priority: 8 });
        player.velocity.set(0, 0, 0);
      }
    }
    let jumpHeld = keyHeld('jump') || controlSources.some((s) => s.jumpHeld);
    let attackPressed = keyTap('attack') || consumeAction('attack');
    let dodgePressed = keyTap('dodge') || consumeAction('dodge');
    let guardHeld = keyHeld('guard') || controlSources.some((s) => s.guardHeld);
    let stowPressed = keyTap('stow') || consumeAction('stow');

    // Resting by the fire: he sits down, his hearts fill and the game saves. Moving or any button gets him up.
    const fire = cur.restSpot;
    // (Beside the fire, on the floor it stands on: not up on the bowl, in it.)
    nearFire = !!fire && !nearNpc && player.grounded && !player.dead && Math.hypot(fire.x - player.position.x, fire.z - player.position.z) < 2.9 && Math.abs(fire.y - player.position.y) < 0.6 && !inBrazierFire(cur.decor, player.position.x, player.position.y, player.position.z);
    if (resting < 0 && jumpPressed && nearFire && fire && !builder.live) {
      jumpPressed = false;
      resting = 0;
      player.hp = player.maxHp;
      player.velocity.set(0, 0, 0);
      player.facing = Math.atan2(fire.x - player.position.x, fire.z - player.position.z);
      autosave();
      audio.play('recall', { vol: 0.8, priority: 8 });
      audio.play('sparkle', { vol: 0.6, priority: 6 });
      rumble.collect();
    } else if (resting >= 0) {
      resting += dt;
      const wantsUp = m.lengthSq() > 0.04 || (resting > 0.5 && (jumpPressed || attackPressed || dodgePressed || stowPressed));
      if (wantsUp || player.dead || player.hp < player.maxHp) resting = -1;
      else {
        m.set(0, 0, 0);
        jumpPressed = jumpHeld = attackPressed = dodgePressed = guardHeld = stowPressed = false;
      }
    }

    const wasGrounded = player.grounded;
    chamber.stepMovers(dt, player.dead ? undefined : player);
    crushCheck();
    if (keyTap('lock') || consumeAction('lock')) {
      if (lockTarget) lockTarget = null;
      else {
        lockTarget = pickTarget(player.position, follow.yaw, enemies);
        if (lockTarget) audio.play('menuMove', { vol: 0.5, rate: 1.4, verb: 0.05, priority: 3 });
        else {
          // Nobody there: the view swings round behind him. (It no longer does that by itself as he moves.)
          recentre = 0.35;
          recentreTo = player.facing + Math.PI;
        }
      }
    }
    if (lockTarget && (player.dead || builder.live)) lockTarget = null;
    if (lockTarget) lockTarget = keepTarget(player.position, follow.yaw, lockTarget, enemies);
    player.attackAim = lockTarget ? facingToward(player.position, lockTarget) : pickAim(player, enemies, m.x, m.z);
    const vyBefore = player.velocity.y;
    // A gust of gas carries him along with it (he stands against it on ground he can grip; on ice it takes him).
    if (gusts.length && !player.dead) blow(gusts, worldClock, player.position, player.velocity, dt, TUNING.rat.radius, TUNING.rat.height);
    // Hazards and helpers (world/hazards.ts): a belt under him carries him; a fan's column lifts him.
    if (chamber.hazards && !player.dead) {
      beltCarry(chamber.hazards.specs, player, dt);
      fanLift(chamber.hazards.specs, player, dt, worldClock);
    }
    // The film and test drives (dev/filmDrive.ts): `&autoride`, `&autorail`, `&chaos`, `&autowalk`, `&autogo`, `&autojump`, `&autoswing`, `&autoplunge`.
    // (`&autofight`, `&autolift` and `&carryfoe`, which reach into the fight and his hands, are below.)
    if (filmDrive) {
      const pad = { move: m, run, jumpPressed, jumpHeld, attackPressed, dodgePressed, guardHeld, stowPressed };
      filmDrive.drive(dt, pad, filmSeen());
      ({ run, jumpPressed, jumpHeld, attackPressed, dodgePressed, guardHeld, stowPressed } = pad);
    }
    if (devAuto.fight && !player.dead) {
      let near: (typeof enemies)[number] | null = null;
      let nd = 26;
      for (const e of enemies) {
        const d = Math.hypot(e.x - player.position.x, e.z - player.position.z);
        if (e.alive && d < nd && Math.abs(e.y - player.position.y) < 4) {
          nd = d;
          near = e;
        }
      }
      devAuto.swing -= dt;
      if (near) {
        const dx = near.x - player.position.x;
        const dz = near.z - player.position.z;
        if (nd > 1.7) m.set(dx / nd, 0, dz / nd);
        else m.set((dx / nd) * 0.05, 0, (dz / nd) * 0.05);
        run = nd > 5;
        if (nd < 2.3 && devAuto.swing <= 0) {
          attackPressed = true;
          devAuto.swing = 0.42;
        }
      }
    }
    // (`&autolift`, for the films: he goes to the nearest crate and lifts it, carries it toward the nearest creature,
    // and throws it from five off; and again.)
    // (`&carryfoe`, for the films only: a second in, the nearest creature is put in his hands, down or not, once; so how
    // one looks carried and thrown can be filmed without waiting on a fight to knock one down.)
    if (devCarryFoe && !devCarried && worldClock > 1.5 && !held && !heldFoe && !player.dead) {
      const near = enemies.filter((e) => e.alive).sort((a, b) => Math.hypot(a.x - player.position.x, a.z - player.position.z) - Math.hypot(b.x - player.position.x, b.z - player.position.z))[0];
      if (near) {
        devCarried = true;
        heldFoe = near;
        heldFoeTime = 0;
        heldFrom.set(near.x, near.y, near.z);
        player.startCarry(true);
      }
    }
    if (devLift && !player.dead) {
      const to = (x: number, z: number, stopAt: number): number => {
        const d = Math.hypot(x - player.position.x, z - player.position.z);
        const k = d > stopAt ? 1 : 0.05;
        m.set(((x - player.position.x) / (d || 1)) * k, 0, ((z - player.position.z) / (d || 1)) * k);
        run = d > 3;
        return d;
      };
      const foe = enemies.filter((e) => e.alive && !inHand(e)).sort((a, b) => Math.hypot(a.x - player.position.x, a.z - player.position.z) - Math.hypot(b.x - player.position.x, b.z - player.position.z))[0];
      // (A creature that is DOWN within reach of a short run comes first: he goes and picks IT up.)
      const down = enemies.find((e) => e.alive && !inHand(e) && isDown(e) && Math.hypot(e.x - player.position.x, e.z - player.position.z) < 9);
      if (!held && !heldFoe && down) {
        to(down.x, down.z, 0);
        run = true;
        if (player.canLift && enemies[liftFoe(enemies, player.position, player.facing)] === down) stowPressed = true;
      } else if (heldFoe) {
        // Thrown at another creature if there is one; else at the nearest wall he is facing, after a moment.
        if (foe && player.carryPose > 0.9) {
          const d = to(foe.x, foe.z, 6);
          const aim = Math.atan2(foe.x - player.position.x, foe.z - player.position.z);
          if (d <= 7 && Math.abs(Math.atan2(Math.sin(aim - player.facing), Math.cos(aim - player.facing))) < 0.2) attackPressed = true;
        } else if (!foe && heldFoeTime > 0.8) attackPressed = true;
      } else if (!held) {
        const c = chamber.crates.filter((k) => k.alive && !k.lifted).sort((a, b) => Math.hypot(a.x - player.position.x, a.z - player.position.z) - Math.hypot(b.x - player.position.x, b.z - player.position.z))[0];
        if (c) {
          to(c.x, c.z, 0);
          if (player.canLift && liftTarget(chamber.crates, player.position, player.facing) === c) stowPressed = true;
        }
      } else if (foe && player.carryPose > 0.9) {
        const d = to(foe.x, foe.z, 5);
        const aim = Math.atan2(foe.x - player.position.x, foe.z - player.position.z);
        if (d <= 5.5 && Math.abs(Math.atan2(Math.sin(aim - player.facing), Math.cos(aim - player.facing))) < 0.15) attackPressed = true;
      }
    }
    // LIFTING (world/lifting.ts): STOW beside a crate or a barrel takes it up over his head. (With nothing to lift it
    // puts his sword away, as it did.)
    const handsFree = !held && !heldFoe && player.canLift && !talkingTo;
    liftable = handsFree ? liftTarget(chamber.crates, player.position, player.facing) : null;
    // (And a creature that is DOWN, if nothing else is nearer to hand.)
    liftableFoe = handsFree && !liftable ? enemies[liftFoe(enemies, player.position, player.facing)] ?? null : null;
    if (stowPressed && liftable) {
      held = liftable;
      liftable = null;
      heldFrom.set(held.x, held.y, held.z);
      chamber.liftCrate(held);
      player.startCarry(thrownAs(held).light);
      stowPressed = false;
      audio.play('heave', { vol: 0.75, rate: roll(0.95, 1.08) * (thrownAs(held).light ? 1.2 : 1), priority: 6 });
    } else if (stowPressed && liftableFoe) {
      heldFoe = liftableFoe;
      liftableFoe = null;
      heldFoeTime = 0;
      squirmIn = 0.8;
      heldFrom.set(heldFoe.x, heldFoe.y, heldFoe.z);
      if (lockTarget === heldFoe) lockTarget = null;
      player.startCarry(true);
      stowPressed = false;
      audio.play('heave', { vol: 0.6, rate: 1.15, priority: 6 });
      audio.play('squirm', { vol: 0.6, rate: roll(0.95, 1.1), priority: 5 });
    }
    player.update(dt, { move: m, run, jumpPressed, jumpHeld, attackPressed, dodgePressed, guardHeld, stowPressed }, chamber.colliders);
    // Music underfoot (world/musicFloor.ts): a key or a pad he lands on sounds; an echo puzzle plays and listens.
    if (musicFloor && chamber.music) {
      for (const ev of musicFloor.update(dt, player.position, player.grounded && !player.dead)) {
        if (ev.kind === 'note') audio.play('chipNote', { rate: noteRate(ev.note), vol: 0.7, priority: 6 });
        else if (ev.kind === 'wrong') audio.play('chipBuzz', { vol: 0.6, priority: 6 });
        else if (ev.kind === 'solved') audio.play('clear', { vol: 0.8, priority: 7 });
      }
      chamber.music.show(musicFloor.lit, musicFloor.down, musicFloor.flash, worldClock);
    }
    // (His tricks by name, for the name shown as he lands them: a grab is the guard held long enough in the air, as
    // the controller counts it; and a slap of his paw on the rim when it counts.)
    if (player.riding && !player.grounded) {
      if (trickLog.air(dt, guardHeld && player.feel.ride.airTricks, TUNING.ride.grabTime)) audio.play('grabSlap', { vol: 0.7, rate: roll(0.95, 1.1), priority: 5 });
    } else if (player.grounded) trickLog.ground();
    /** What a throw would be aimed at: the creature in front of him, or the one he is locked on to (not the one in his hands). */
    const marks = (): Target[] => enemies.map((e) => ({ x: e.x, y: e.y, z: e.z, r: e.radius, high: Math.max(0.9, e.radius * 2), alive: e.alive && !inHand(e), parts: e.parts }));
    const aimNow = (): { x: number; y: number; z: number } | null => throwAim(marks(), player.position, player.facing, lockTarget ? enemies.indexOf(lockTarget) : null);
    if (held) {
      const c = held;
      const halfHigh = (c.aabb.max.y - c.aabb.min.y) / 2;
      const at = heldPlace(player.position, halfHigh);
      if (player.liftEvent === 'throw') {
        // (From over his head, whatever was left of its way up.)
        thrown.push(startThrow(c, c.half, c.aabb, carryPlace(player.position, halfHigh, hands), player.facing, player.velocity, 1, aimNow(), thrownAs(c).speed));
        held = null;
        audio.play('hurl', { vol: 0.85, rate: roll(0.92, 1.05) * (thrownAs(c).light ? 1.2 : 1), priority: 7 });
      } else if (player.liftEvent === 'down') {
        const spot = putDownSpot(chamber.colliders, player.position, player.facing, c);
        if (spot) {
          chamber.setCrate(c, spot.x, spot.y, spot.z);
          player.endCarry();
          held = null;
          audio.play('setDown', { vol: 0.75, rate: roll(0.95, 1.05) * (thrownAs(c).light ? 1.25 : 1), priority: 5 });
        } else audio.play('menuBack', { vol: 0.4, rate: 0.8, priority: 4 });
      } else if (!player.carrying) {
        // Let go of (he was hurt, or is in the water): it falls where he is.
        thrown.push(startThrow(c, c.half, c.aabb, at, player.facing, { x: 0, z: 0 }, 0));
        held = null;
      } else chamber.moveCrate(c, at.x, at.y, at.z, player.facing);
    }
    if (heldFoe) {
      const e = heldFoe;
      heldFoeTime += dt;
      // (It scrabbles to be let go, now and then, and more often as it nears getting free.)
      squirmIn -= dt;
      if (squirmIn <= 0) {
        audio.play('squirm', { vol: 0.5, rate: roll(0.95, 1.15), priority: 4 });
        squirmIn = Math.max(0.35, 0.9 * (1 - heldFoeTime / TUNING.lift.foeHold)) + roll(0, 0.25);
      }
      // (It stands on air over his head: a creature's place is where its feet are.)
      const at = heldPlace(player.position, 0);
      const free = (): void => {
        // Out of his hands without a throw: it is set on the floor before him, and is its own again.
        const fx = player.position.x + Math.sin(player.facing) * (e.radius + TUNING.rat.radius + 0.1);
        const fz = player.position.z + Math.cos(player.facing) * (e.radius + TUNING.rat.radius + 0.1);
        const floor = groundUnder(chamber.colliders, fx, fz, e.radius * 0.6, player.position.y + 0.4);
        const ok = Number.isFinite(floor) && Math.abs(floor - player.position.y) < 0.6;
        e.x = ok ? fx : player.position.x;
        e.z = ok ? fz : player.position.z;
        e.y = ok ? floor : player.position.y;
        heldFoe = null;
      };
      if (!e.alive) heldFoe = null;
      else if (player.liftEvent === 'throw') {
        thrownFoes.push(startThrow(e, Math.max(0.3, e.radius), null, carryPlace(player.position, 0, hands), player.facing, player.velocity, 1, aimNow(), 1.1));
        heldFoe = null;
        audio.play('hurl', { vol: 0.85, rate: roll(1.0, 1.12), priority: 7 });
      } else if (player.liftEvent === 'down' || !player.carrying || heldFoeTime > TUNING.lift.foeHold) {
        // Set down; or he was hurt; or it has wriggled free.
        if (player.carrying) player.endCarry();
        free();
      } else {
        e.x = at.x;
        e.y = at.y;
        e.z = at.z;
        e.facing = player.facing;
      }
    }
    // Locked on, the rat keeps facing the foe while he walks, so he circles him.
    if (lockTarget && player.grounded && ['idle', 'walk', 'run', 'land', 'guard'].includes(player.state)) player.facing = facingToward(player.position, lockTarget);
    soundAfterPlayer(sneak, vyBefore);
    filmDrive?.watch(filmSeen(), chamber.colliders, dialog.open);
    // Jumping off a moving platform keeps some of its motion.
    if (wasGrounded && !player.grounded && player.velocity.y > 1 && chamber.carry.lengthSq() > 0) {
      player.velocity.x += chamber.carry.x;
      player.velocity.z += chamber.carry.z;
      player.velocity.y += Math.max(0, Math.min(chamber.carry.y, 4));
    }
    // Who may attack: up close they take turns. Roosting bats hear him unless he sneaks.
    SENSES.quiet = sneak && player.grounded;
    director.update(dt, enemies, player.position.x, player.position.z, lockTarget);
    // The ants find their mates, and settle which of each pair holds him and which goes round him.
    if (antList.length) pairAnts(antList, player.position.x, player.position.z);
    const swinging = player.state === 'attack' || (player.riding && player.attackTime > 0);
    for (const e of enemies) {
      // (One in his hands, or thrown and in the air, does nothing: its own clock is stopped.)
      if (inHand(e)) continue;
      if (!DEV.still) e.update(dt, player.position.x, player.position.y, player.position.z, !player.dead, swinging);
      if (e instanceof Grimsqueak) bossTick(e);
      const spits = e instanceof Grimsqueak ? e.spits.splice(0) : e.kind === 'toad' && (e as Toad).spit ? [(e as Toad).spit!] : [];
      if (e.kind === 'toad') (e as Toad).spit = null;
      // A firefly's drops of fire: each is let go from the tip of its lantern, and where it will land is known at once
      // (and marked on the floor). One let go over no floor (a pit, a wall's top, water) falls and is gone.
      if (e instanceof Firefly) {
        for (const d of e.drops.splice(0)) {
          const em = makeEmber(d, { gravity: FIREFLY.bombFall, radius: FIREFLY.flameRadius, burnFor: FIREFLY.flameTime }, emberGround());
          // (Nor does one catch under water, or need to in lava.)
          const L = em.land;
          const wet = !!L && [...chamber.water, ...chamber.lava].some((w) => L.x > w.x0 && L.x < w.x1 && L.z > w.z0 && L.z < w.z1 && w.y > L.y);
          if (L && (wet || !canStand(L.x, L.y, L.z, 0.1))) em.land = null;
          embers.push(em);
        }
      }
      for (const spit of spits) {
        const g: Glob = { ...spit, age: 0, done: false };
        globs.push(g);
        const gm = new THREE.Mesh(globGeo, spit.kind === 'fire' ? fireMat : spit.kind === 'energy' ? boltMat : globMat);
        if (spit.kind) gm.scale.setScalar(spit.kind === 'fire' ? 1.7 : 1.5);
        gm.position.set(g.x, g.y, g.z);
        scene.add(gm);
        globMeshes.set(g, gm);
      }
    }
    // One bat waking wakes the roost; then the new beasts' sounds.
    rouseRoost(enemies.filter((e): e is Bat => e instanceof Bat));
    for (const e of enemies) if (e instanceof Ironback || e instanceof Bat || e instanceof Guard || e instanceof Mantis || e instanceof Stag || e instanceof Brood || e instanceof Wyrm || e instanceof Widow || e instanceof Hornet || e instanceof Ant || e instanceof Firefly || e instanceof Scorpion || e instanceof Roller) beastSounds(e, dt);
    // Globs fly, splat on the ground, or hit him.
    const landed = stepGlobs(globs, dt, groundBelow);
    const hitGlobs = resolveGlobs(player, globs, events);
    for (const g of [...landed, ...hitGlobs]) {
      ringAge = 0;
      ringSize = 0.9;
      // (A toad's spit splats, green; a bolt of the Engine's light bursts, its own colour.)
      (ring.material as THREE.MeshBasicMaterial).color.set(g.kind === 'fire' ? 0xffa23a : g.kind === 'energy' ? 0x9fefff : 0x8aff5a);
      ring.position.set(g.x, Math.max(0.05, g.y), g.z);
      if (g.kind) audio.play('boltBurst', { vol: 0.8 * hearAt(g.x, g.z, 22), rate: roll(0.92, 1.1), priority: 4 });
      else audio.play('splat', { vol: 0.7 * hearAt(g.x, g.z, 22), priority: 4 });
    }
    for (let i = globs.length - 1; i >= 0; i--) {
      const g = globs[i];
      const gm = globMeshes.get(g);
      if (g.done) {
        if (gm) scene.remove(gm);
        globMeshes.delete(g);
        globs.splice(i, 1);
      } else if (gm) gm.position.set(g.x, g.y, g.z);
    }
    // Drops of fire fall; where one meets the floor it catches, and the flames burn for a while.
    for (const em of stepEmbers(embers, dt, emberGround())) {
      if (!em.land) continue;
      flames.add(em.x, em.y, em.z, em.radius, em.burnFor, em.color);
      audio.play('emberBurst', { vol: Math.max(0.25, hearAt(em.x, em.z, 22)), rate: roll(0.92, 1.1), priority: 5 });
    }
    for (let i = embers.length - 1; i >= 0; i--) if (embers[i].done) embers.splice(i, 1);
    flames.step(dt);
    soundWorld(dt);

    resolveCombat(player, heldFoe || thrownFoes.length ? enemies.filter((e) => !inHand(e)) : enemies, events, [...chamber.crates, ...chamber.pipes]);
    // What has been thrown flies on, and breaks on what it meets (world/lifting.ts).
    /** A creature met by something thrown: it is hurt, unless its armour turns it. */
    const strike = (index: number, part: number, from: { x: number; z: number }, damage: number): void => {
      const e = enemies[index];
      if (e.deflects?.(from.x, from.z, 'thrown', part)) events.glanced = e;
      else {
        events.enemyHit = e;
        if (e.takeHit(damage * player.feel.fight.dealt, from.x, from.z, 'thrown', part)) events.enemyKilled = true;
      }
    };
    for (let i = thrown.length - 1; i >= 0; i--) {
      const t = thrown[i];
      const c = t.what;
      const as = thrownAs(c);
      // (A sword can break it in the air.)
      if (!c.alive) {
        thrown.splice(i, 1);
        continue;
      }
      thrownWas.copy(t.pos);
      const hit = stepThrown(t, dt, chamber.colliders, marks());
      chamber.moveCrate(c, t.pos.x, t.pos.y, t.pos.z, t.spent ? 0 : t.age * 5);
      if (hit.what === 'none') continue;
      if (hit.what === 'lost') {
        // Out of the world: gone, with nothing to show for it.
        c.alive = false;
        if (c.mesh) c.mesh.visible = false;
        thrown.splice(i, 1);
        continue;
      }
      if (hit.what === 'foe') strike(hit.index, hit.part, t.from, as.damage);
      // Another crate, a barrel, a pot or a pipe's joint that it met breaks too.
      if (hit.what === 'solid') {
        const other = [...chamber.crates, ...chamber.pipes].find((k) => k.aabb === hit.box && k.alive && !k.tough && k.type !== 'rock');
        if (other) events.cratesBroken.push(other);
      }
      if (!as.breaks) {
        // Bound in iron, or a rock: it does not break. It stops where it was, falls, and stands where it lands.
        if (!t.spent) {
          t.spent = true;
          t.pos.copy(thrownWas);
          t.vel.set(0, Math.min(0, t.vel.y), 0);
          events.crateRang = c;
          continue;
        }
        const hy = (c.aabb.max.y - c.aabb.min.y) / 2;
        const floor = groundUnder(chamber.colliders, thrownWas.x, thrownWas.z, c.half * 0.9, thrownWas.y, c.aabb);
        chamber.setCrate(c, thrownWas.x, (Number.isFinite(floor) ? floor : thrownWas.y - hy) + hy, thrownWas.z);
        audio.play(c.type === 'rock' ? 'rockKnock' : 'land', { vol: 0.8, rate: c.type === 'rock' ? roll(0.95, 1.08) : 0.7, priority: 6 });
        shake = Math.max(shake, 0.06);
        thrown.splice(i, 1);
        continue;
      }
      // It breaks here; and what was in it is left HERE, not where the crate used to stand.
      const inside = cur.crateContents[c.index];
      const item = inside ? cur.collectibles.find((q) => q.id === inside) : undefined;
      if (item) {
        const floor = groundBelow(c.x, c.y + 0.3, c.z);
        if (!movedItems.has(item)) movedItems.set(item, { x: item.x, y: item.y, z: item.z });
        item.x = c.x;
        item.y = (floor ?? c.y - c.half) + 0.5;
        item.z = c.z;
        collectVisuals.moveItem(item.id, item.x, item.y, item.z, floor);
      }
      events.cratesBroken.push(c);
      thrown.splice(i, 1);
    }
    // A thrown CREATURE: it is hurt where it comes down, and hurts what it comes down on.
    for (let i = thrownFoes.length - 1; i >= 0; i--) {
      const t = thrownFoes[i];
      const e = t.what;
      thrownWas.copy(t.pos);
      // (It does not meet itself: it is not among the marks while it is in the air.)
      const hit = stepThrown(t, dt, chamber.colliders, marks());
      e.x = t.pos.x;
      e.y = t.pos.y;
      e.z = t.pos.z;
      e.facing += dt * 9;
      if (hit.what === 'none') continue;
      thrownFoes.splice(i, 1);
      const floor = hit.what === 'lost' ? -Infinity : groundUnder(chamber.colliders, thrownWas.x, thrownWas.z, Math.max(0.2, e.radius * 0.6), thrownWas.y + 0.3);
      if (hit.what === 'foe') strike(hit.index, hit.part, t.from, TUNING.lift.damage);
      if (!Number.isFinite(floor)) {
        // Thrown out of the world: that is the end of it.
        for (let k = 0; k < 60 && e.alive; k++) e.takeHit(99, t.from.x, t.from.z, 'plunge');
        events.enemyHit = e;
        events.enemyKilled = !e.alive;
        continue;
      }
      e.x = thrownWas.x;
      e.z = thrownWas.z;
      e.y = floor;
      events.enemyHit = e;
      if (e.takeHit(TUNING.lift.damage, t.from.x, t.from.z, 'thrown')) events.enemyKilled = true;
      audio.play('land', { vol: 0.8, rate: 0.9, priority: 6 });
      shake = Math.max(shake, 0.06);
    }
    lavaStep();
    // A firefly's flames: whoever stands in them is burned (no roll or shield helps). In the Ember Helm he walks through.
    resolveFlames(player, flames, FIREFLY.burn, events);
    // A blade's touch (too big for a shield) or spikes underfoot (no roll helps); what they sound like near him.
    if (chamber.hazards) {
      const hz = chamber.hazards;
      const touch = hazardHurt(hz.specs, player, worldClock, TUNING.rat.radius, TUNING.rat.height);
      if (touch) {
        const result = touch.kind === 'blade' ? player.takeHit(touch.x, touch.z, HAZARD.blade.damage, true) : player.takeBurn(touch.x, touch.z, HAZARD.spikes.damage);
        if (result === 'hit' || result === 'killed') events.playerResult = result;
      }
      // And on the creatures (not one in his hands or in flight from his throw: inHand): a belt carries, a fan blows off,
      // a blade or spikes strike.
      for (const ev of hazardFoes.act(hz.specs, enemies.filter((e) => !inHand(e)), dt, worldClock)) {
        audio.play(ev.killed ? 'kill' : 'hit', { vol: 0.6, rate: roll(0.9, 1.1), priority: 5 });
      }
      for (const sd of hazardSounds(hz.specs, hazardClock, worldClock, player.position)) {
        if (sd.kind === 'swish') audio.play('whoosh', { vol: 0.9 * sd.vol, rate: roll(0.55, 0.65), priority: 5 });
        else audio.play('spikeUp', { vol: 0.8 * sd.vol, rate: roll(0.95, 1.05), priority: 5 });
      }
      hazardClock = worldClock;
      hz.show(worldClock);
    }
    for (const e of enemies) {
      if (!e.alive && !counted.has(e)) {
        counted.add(e);
        if (!uncounted.has(e)) goals.kills++;
      }
    }
    const arrived = goals.director.update(dt, aliveCount());
    if (arrived) for (const spec of arrived) addEnemy({ ...spec, hunt: true });
    goals.update(player.position.x, player.position.y, player.position.z);
    for (const c of events.cratesBroken) {
      audio.play(c.type === 'barrel' ? 'barrel' : c.type === 'pipe' ? 'pipe' : c.type === 'pot' ? 'potSmash' : 'crate', { vol: 0.9, rate: roll(0.92, 1.1), priority: 6 });
      smashCrate(c);
      rumble.smash();
      shake = Math.max(shake, 0.05);
      hitStop = Math.max(hitStop, 0.02);
    }
    if (events.crateRang) {
      // An iron-bound crate shrugs off a light blow: a dull clang and a jarred arm, so he knows it wants something heavier.
      audio.play('clank', { vol: 0.8, rate: roll(0.7, 0.8), priority: 7 });
      hitStop = Math.max(hitStop, 0.05);
      shake = Math.max(shake, 0.05);
      rumble.block();
    }
    // Things to hit (world/strikeables.ts): a lever flipped, a cracked wall struck or down, a cracked floor plunged through.
    if (chamber.strike) {
      for (const ev of strikeThings(chamber.strike.things, player)) {
        const t = chamber.strike.things[ev.index];
        t.struckAt = worldClock;
        if (ev.kind === 'flip') {
          audio.play('leverThrow', { vol: 0.85, rate: ev.on ? 1 : 0.9, priority: 7 });
          hitStop = Math.max(hitStop, 0.03);
        } else if (ev.kind === 'crack') {
          audio.play('stoneCrack', { vol: 0.9, rate: roll(0.95, 1.08), priority: 7 });
          hitStop = Math.max(hitStop, 0.04);
          shake = Math.max(shake, 0.05);
        } else {
          chamber.strike.remove(ev.index);
          debris.burst(t.x, t.y + t.h / 2, t.z, Math.min(1.2, Math.max(t.w, t.d) / 2), player.position.x, player.position.z, 'pipe');
          audio.play('stoneFall', { vol: 1, rate: roll(0.95, 1.05), priority: 8 });
          shake = Math.max(shake, 0.14);
          rumble.smash();
        }
      }
      chamber.strike.show(worldClock);
    }
    if (events.glanced) {
      // Off the ironback's shell: a clank, sparks, and his arm jarred.
      const g = events.glanced;
      enemyModels[enemies.indexOf(g)]?.glance?.(Math.atan2(player.position.x - g.x, player.position.z - g.z));
      audio.play('clank', { vol: 0.9, rate: roll(1.2, 1.4), priority: 8 });
      hitStop = Math.max(hitStop, 0.04);
      shake = Math.max(shake, 0.04);
      rumble.block();
    }
    if (events.enemyHit) {
      enemyModels[enemies.indexOf(events.enemyHit)].flash();
      audio.play(events.enemyKilled ? 'kill' : 'hit', { vol: 0.9, rate: roll(0.92, 1.1), priority: 8 });
      // Only the tiniest freeze on a normal hit (a hint of that old Zelda feel); a kill adds a short slow-motion beat.
      hitStop = events.enemyKilled ? 0.05 : 0.025;
      if (events.enemyKilled) {
        // (Counted, on his save: the Club's regulars turn up on how many of a kind he has beaten.)
        levelProgress.noteBeaten(events.enemyHit.kind);
        slowT = TUNING.feel.killSlowSeconds;
        rumble.kill();
      } else rumble.hit();
      shake = Math.max(shake, events.enemyKilled ? 0.09 : 0.05);
    }
    if (player.splash) {
      // Splash: a small green ring on the surface.
      ringAge = 0;
      ringSize = 1.3;
      (ring.material as THREE.MeshBasicMaterial).color.set(0xa8f0b8);
      ring.position.set(player.position.x, player.waterY + 0.05, player.position.z);
    }
    if (events.shockwave) {
      ringAge = 0;
      ringSize = TUNING.plunge.shockRadius;
      (ring.material as THREE.MeshBasicMaterial).color.set(0xffd9a0);
      ring.position.set(player.position.x, player.position.y + 0.05, player.position.z);
      shake = Math.max(shake, 0.2);
      hitStop = Math.max(hitStop, 0.06);
      audio.play('shock', { vol: 1, priority: 8 });
      rumble.shock();
    }
    if (events.playerResult === 'hit' || events.playerResult === 'killed') {
      hitStop = 0.1;
      shake = 0.16;
      flash = 1;
      rumble.hurt();
    } else if (events.playerResult === 'blocked') {
      hitStop = 0.05;
      shake = Math.max(shake, 0.06);
      audio.play('block', { vol: 0.9, priority: 7 });
      rumble.block();
    } else if (events.playerResult === 'parried') {
      goals.parries++;
      // Turned aside at the last instant: a longer freeze, a brighter ring, and no shove.
      hitStop = 0.12;
      shake = Math.max(shake, 0.1);
      audio.play('block', { vol: 1, rate: 1.35, priority: 8 });
      audio.play('sparkle', { vol: 0.6, rate: 1.3, priority: 7 });
      rumble.block();
    }

    // Gear lying around: walking into it puts it on.
    for (const def of pickups.remaining()) {
      const dx = def.x - player.position.x;
      const dz = def.z - player.position.z;
      const dy = def.y - (player.position.y + TUNING.rat.height / 2);
      if (Math.hypot(dx, dz) < 0.9 && Math.abs(dy) < 1.1 && equipment.give(def.itemId)) {
        pickups.taken(def.itemId);
        audio.play('relic', { vol: 0.9, priority: 8 });
      }
    }

    for (const id of drops.collect(player.position.x, player.position.y, player.position.z, 0.9, TUNING.rat.height)) {
      inventory.add(id);
      audio.play('item', { vol: 0.8, priority: 5 });
    }

    const got = tracker.tryCollect(cur.id, player.position, TUNING.rat.radius, TUNING.rat.height, undefined, (d) => d.crate !== undefined && !revealedCrates.has(d.crate));
    if (got.length) {
      collectVisuals.collected(got);
      for (const d of got) discoveries.add(`find:${d.kind}`);
      for (const d of got) {
        audio.play(d.kind === 'relic' ? 'relic' : d.kind === 'cap' ? 'cap' : 'crumb', { vol: 0.8, priority: 5 });
        // (A hunk of cheese: the crumb's note, and a flourish after it.)
        if (d.kind === 'crumb' && (d.worth ?? 1) > 1) audio.play('item', { vol: 0.7, priority: 5 });
      }
      if (got.length) rumble.collect();
    }

    // Floor plates.
    (cur.plates ?? []).forEach((pl, i) => {
      if (pl.spawn) {
        // A button that comes back up: each press puts one more of its creature in the room (levels/practice.ts).
        const off = Math.hypot(pl.x - player.position.x, pl.z - player.position.z);
        const pad = plateGroup?.children[i * 2] as THREE.Mesh | undefined;
        const does = buttonStep(platesDown[i], off, player.grounded && !player.dead && Math.abs(player.position.y - pl.y) < 0.6);
        if (does === 'press') {
          platesDown[i] = true;
          if (pad) pressPlate(pad, pl.y);
          const room = aliveCount() < (pl.most ?? 6);
          if (room) addEnemy({ ...pl.spawn });
          if (room && cur.look === 'dream') dreamify(enemyModels[enemyModels.length - 1].root, 0.42);
          audio.play('menuOk', { vol: 0.9, rate: room ? 0.7 : 0.45, priority: 6 });
          shake = Math.max(shake, 0.05);
        } else if (does === 'release') {
          platesDown[i] = false;
          if (pad) raisePlate(pad, pl.y);
        }
        return;
      }
      if (platesDown[i] || !player.grounded || player.dead) return;
      if (Math.hypot(pl.x - player.position.x, pl.z - player.position.z) < 0.95 && Math.abs(player.position.y - pl.y) < 0.6) {
        platesDown[i] = true;
        const m = plateGroup?.children[i * 2] as THREE.Mesh | undefined;
        if (m) pressPlate(m, pl.y);
        audio.play('menuOk', { vol: 0.9, rate: 0.7, priority: 6 });
        shake = Math.max(shake, 0.05);
      }
    });
    updateGates();

    moving = m.lengthSq() > 0.01;

    // Main goals done: start the scene, once he is standing still enough on the ground.
    const calm = player.state === 'idle' || player.state === 'walk' || player.state === 'run' || player.state === 'land';
    // Autosave: every so often while he stands somewhere safe, and the moment a level is cleared.
    autoAge += dt;
    if (autoAge >= AUTOSAVE_EVERY && calm && player.grounded && !player.dead && !dialog.open && !menu.open && !story.scene && !storyWaiting && !cutscene.active && !trans.active && !boot.blocking && !enemies.some((e) => e.alive && e.attacking)) autosave();
    // Story: something has turned up (a keepsake from a crate, or a place he has walked up to). Play it once he is still.
    const nearby = STORY[cur.id]?.near;
    const nearSpot = nearby && cur.storySpots?.[nearby.spot];
    if (nearby && nearSpot && !storyOff && !storyWaiting && !story.scene && !storySeen.seen(`${cur.id}.near`) && Math.hypot(nearSpot.x - player.position.x, nearSpot.z - player.position.z) < nearby.r && Math.abs(nearSpot.y - player.position.y) < 1.5) {
      storyWaiting = nearby.scene;
    }
    // The last enemy is down: the level's closing scene, before the door opens.
    const closing = STORY[cur.id]?.after;
    if (closing && !afterPlayed && !storyOff && !storyWaiting && !story.scene && enemies.length > 0 && aliveCount() === 0 && !levelProgress.cleared(cur.id)) {
      afterPlayed = true;
      const last = enemies[enemies.length - 1];
      const fell = { x: last.x, y: last instanceof Grimsqueak ? last.floorY : last.y, z: last.z };
      storyWaiting = (c) => closing({ ...c, spots: { ...c.spots, foe: fell } });
    }
    if (storyWaiting && !story.scene && !cutscene.active && !trans.active && player.grounded && calm && !player.dead) {
      const def = storyWaiting(storyCtx());
      storyWaiting = null;
      storySeen.mark(def.id);
      playScene(def);
    }
    if (!cur.hub && !story.scene && !storyWaiting && !levelProgress.cleared(cur.id) && !cutscene.active && !trans.active && goals.mainDone(aliveCount()) && player.grounded && calm) {
      startCutscene();
    }
    // Everything in the level found, after clearing it: the bonus is remembered and any reward is his.
    if (!cur.hub && levelProgress.cleared(cur.id) && !levelProgress.perfect(cur.id) && allCollected()) {
      levelProgress.markPerfect(cur.id);
      platform.achieve('PERFECT_LEVEL');
      audio.play('clear', { vol: 0.9, priority: 9 });
      if (cur.reward) equipment.give(cur.reward);
    }
    // Stepping up to an open door takes him to the next level.
    if (!noWayOut(cur) && levelProgress.cleared(cur.id) && !cutscene.active && !trans.active && !story.scene && player.grounded && !player.dead && atDoor(cur.exit, player.position.x, player.position.z)) {
      const leaving = STORY[cur.id]?.exit;
      if (leaving && !storyOff && !exitScenePlayed) {
        // A last bit of acting at the door, then on to the next room.
        exitScenePlayed = true;
        const to = nextLevel();
        playScene(leaving(storyCtx()), () => startTransition(to));
      } else if (cur.id === 'custom') {
        // Finished a level from the builder: back to the builder.
        levelProgress.forget('custom');
        builder.show();
        player.velocity.set(0, 0, 0);
        player.position.z += 2.5;
      } else if (parentOf(cur)) {
        // Out of a room: back to where he came in from (or the Hall, or the area it is part of), in front of the door
        // that leads here, if there is one.
        const parent = parentOf(cur)!;
        const cd = doorsOf(parent).find((d) => d.to === cur.id);
        startTransition(parent);
        if (cd) trans.arrive = { x: cd.door.x, z: cd.door.z, y: cd.door.y ?? 0, yaw: cd.door.yaw };
      } else startTransition(nextLevel());
    }
    // In a hub: walking into an open course door goes into that course.
    if (!trans.active && !cutscene.active && !story.scene && player.grounded && !player.dead) {
      for (const cd of doorsOf(cur)) {
        const to = cd.to ? levelById(cd.to) : null;
        if (to && doorOpen(cd) && atDoor(cd.door, player.position.x, player.position.z)) {
          cameFrom.set(to.id, cur.id);
          startTransition(to);
          break;
        }
      }
    }
  }

  // ---- Menu ----
  const storage = files;
  function restartGame(): void {
    tracker.reset();
    equipment.reset();
    inventory.reset();
    wallet.reset();
    levelProgress.reset();
    storySeen.reset();
    trans.active = false;
    player.hp = player.maxHp;
    // A new game starts at home, in the Hall.
    loadLevel(homeLevel ?? LEVELS[0]);
    applyGear();
  }
  const menu = new Menu(gameWrap, {
    equipment,
    inventory,
    useItem: (id) => {
      const def = CONSUMABLES[id];
      if (!def || inventory.count(id) <= 0) return null;
      if (player.dead) return 'Not now.';
      if (player.hp >= player.maxHp) return 'Already at full health.';
      inventory.remove(id);
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + def.heal);
      audio.play('heal', { vol: 0.9, priority: 7 });
      return `Ate the ${def.name}. +${player.hp - before} heart${player.hp - before === 1 ? '' : 's'}.`;
    },
    quest: () => ({
      name: cur.name,
      goals: goals.status(aliveCount()),
      collectibles: (['crumb', 'cap', 'relic'] as const).map((k) => {
        const c = tracker.count(cur.id, k);
        // (Where the cheese is in hunks, each worth several crumbs, it says so.)
        const hunks = k === 'crumb' && cur.collectibles.some((x) => x.kind === 'crumb' && (x.worth ?? 1) > 1);
        return { label: hunks ? 'Hunks of cheese' : { crumb: 'Cheese crumbs', cap: 'Bottle caps', relic: 'Golden relics' }[k], icon: k, have: c.have, total: c.total };
      }),
    }),
    levels: () =>
      worldRows(),
    goLevel: (id) => {
      const def = levelById(id);
      if (def && levelOpen(id)) startTransition(def);
    },
    health: () => ({ hp: player.hp, max: player.maxHp }),
    preview,
    previewItem: (item) => {
      const c = (item && item.slot === 'helmet' ? item : ITEMS[equipment.equipped('helmet')]).colors;
      preview.setHelmet({ dome: c.dome, rim: c.rim, spike: c.spike });
      const s = (item && item.slot === 'scarf' ? item : ITEMS[equipment.equipped('scarf')]).colors;
      preview.setScarf({ cloth: s.cloth, trim: s.trim });
      const w = (item && item.slot === 'sword' ? item : ITEMS[equipment.equipped('sword')]).colors;
      preview.setSword({ blade: w.blade, hilt: w.hilt });
      const h = (item && item.slot === 'shield' ? item : ITEMS[equipment.equipped('shield')]).colors;
      preview.setShield({ face: h.face, trim: h.trim });
    },
    save: () => {
      flushPlayed();
      return writeSave(storage, snapshot(), 'manual');
    },
    inGame: () => !optionsFromTitle,
    fileInfo: () => ({ file: files.file, where: cur.name, wedges: wedgeTotal(), total: allWedges(), played: formatPlayed(played) }),
    // The way out of any place but the Club, from the pause menu: a side area's leads back to its world, any other
    // to the Club; he arrives in front of the door that led here. (The owner, 2026-11-16, at the top of the Milky Way:
    // "there's no door to go back so it feels like a soft lock".)
    leave: () => {
      if (noWayOut(cur) || cur.id === 'custom' || trans.active || cutscene.active || story.scene || player.dead) return null;
      const parent = parentOf(cur) ?? homeLevel;
      if (!parent || parent === cur) return null;
      return {
        to: parent.name,
        go: () => {
          const cd = doorsOf(parent).find((d) => d.to === cur.id);
          startTransition(parent);
          if (cd) trans.arrive = { x: cd.door.x, z: cd.door.z, y: cd.door.y ?? 0, yaw: cd.door.yaw };
        },
      };
    },
    toTitle: () => {
      if (cur.id !== 'custom') writeSave(storage, snapshot(), 'auto');
      flushPlayed();
      boot.showTitle();
    },
    load: () => applySave(readSave(storage, 'manual')),
    savedAt: () => readSave(storage, 'manual')?.savedAt ?? null,
    restart: restartGame,
    fullscreen: () => !!document.fullscreenElement || platform.isFullscreen(),
    toggleFullscreen: () => platform.toggleFullscreen(),
    scenes: CUTSCENES.map((c) => ({ id: c.id, name: c.name })),
    playCutscene: (id) => {
      const def = cutsceneById(id);
      if (def) playCutscene(def);
    },
    openBuilder: () => builder.show(),
    openTweaks: () => tweaksPanel.show(),
    openWorkshop: () => workshop.show(),
    openPhoto: () => {
      if (canPhoto()) photo.start();
    },
    quit: platform.desktop ? () => platform.quit() : undefined,
    extras: [
      { id: 'quick', group: 'save', label: () => saveRowLabel('LOAD QUICKSAVE', 'quick'), change: (d) => { if (d === 1 && applySave(readSave(storage, 'quick'))) menu.close(); } },
      { id: 'auto', group: 'save', label: () => saveRowLabel('LOAD AUTOSAVE', 'auto'), change: (d) => { if (d === 1 && applySave(readSave(storage, 'auto'))) menu.close(); } },
      { id: 'glyphs', group: 'controls', label: () => `BUTTON ICONS: ${glyphModeLabel()}`, change: (d) => setGlyphMode(GLYPH_MODES[(GLYPH_MODES.indexOf(glyphMode()) + d + GLYPH_MODES.length) % GLYPH_MODES.length]) },
      { id: 'screen', label: () => `SCREEN: ${display.aspect === 'wide' ? 'WIDE' : '4:3'}`, change: () => display.toggleAspect() },
      { id: 'sharp', label: () => `PICTURE: ${display.sharpLabel()}`, change: (d) => display.cycleSharp(d) },
      { id: 'filter', label: () => `FILTER: ${display.filterLabel()}`, change: (d) => display.cycleFilter(d) },
      { id: 'text', label: () => `TALK TEXT: ${display.largeText ? 'LARGE' : 'NORMAL'}`, change: () => display.toggleText() },
      { id: 'lights', label: () => `COLOUR LIGHTS: ${display.lights ? 'ON' : 'OFF'}`, change: () => display.toggleLights() },
    ],
    book: () => {
      const rows: Array<{ id: string; group: string; name: string; blurb: string; found: boolean; icon: string }> = [];
      for (const g of STICKER_GROUPS) {
        if (g === 'Gear') {
          for (const it of Object.values(ITEMS)) rows.push({ id: `gear:${it.id}`, group: g, name: it.name, blurb: it.description, found: equipment.owns(it.id), icon: itemIcon(it, 48) });
        } else if (g === 'Places') {
          for (const l of LEVELS.filter(inWorld)) rows.push({ id: `place:${l.id}`, group: g, name: l.name, blurb: l.blurb, found: discoveries.has(`place:${l.id}`), icon: stickerIcon('place', 48) });
        } else {
          for (const st of STICKERS.filter((x) => x.group === g)) rows.push({ id: st.id, group: g, name: st.name, blurb: st.blurb, found: discoveries.has(st.id), icon: stickerIcon(st.icon, 48) });
        }
      }
      return rows;
    },
    rebind: {
      rows: () => BIND_ACTIONS.map((a) => ({ id: a, name: BIND_NAMES[a], key: keyLabel(bindings.key(a)), pad: padLabel(bindings.pad(a)) })),
      reset: () => bindings.reset(),
      summary: () => {
        const l = (a: BindAction): string => `${keyLabel(bindings.key(a))} / ${padLabel(bindings.pad(a))}`;
        return `<b>Move</b>  WASD / left stick (you run by default)<br><b>Camera</b>  arrows / right stick<br><b>Jump / talk</b>  ${l('jump')}<br><b>Attack</b>  ${l('attack')}<br><b>Dodge</b>  ${l('dodge')}<br><b>Guard</b>  hold ${l('guard')}<br><b>Sneak</b>  hold ${l('sneak')}<br><b>Stow sword</b>  ${l('stow')}<br><b>Lock on</b>  ${l('lock')} (nobody near: view behind you)<br><b>Menu</b>  Esc or P / ${padLabel('start')}<br><b>Quicksave / load</b>  F5 / F9<br><b>Fullscreen</b>  F11 or Alt+Enter`;
      },
    },
    rumble: {
      level: () => rumble.level(),
      set: (l) => {
        rumble.setLevel(l);
        if (l !== 'off') rumble.kill(); // a little buzz so you can feel how strong it is
      },
    },
    audio: {
      sfx: () => audio.sfxVolume(),
      music: () => audio.musicVolume(),
      setSfx: (v) => audio.setSfxVolume(v),
      setMusic: (v) => audio.setMusicVolume(v),
    },
    sound: (name) => audio.play(name === 'ok' ? 'menuOk' : name === 'back' ? 'menuBack' : 'menuMove', { vol: 0.6, verb: 0.05, priority: 3 }),
    onToggle: (open: boolean) => {
      // Presses made while the menu was open (or just before) must not leak into the game.
      for (const a of ['jump', 'attack', 'dodge', 'stow', 'respawn'] as const) consumeAction(a);
      // Closing the menu that OPTIONS opened returns to the title screen.
      if (!open && optionsFromTitle) {
        optionsFromTitle = false;
        boot.showTitle();
      }
    },
  });

  // ---- Start-up: boot logo, title screen, loading screen. Only on a plain start (no dev hash) and never in the editor. ----
  let optionsFromTitle = false;
  /** Where closing the editor, the tweaks or the Workshop leads back to (null: to the game). */
  let editorBack: 'title' | 'workshop' | null = null;
  let tweaksBack: 'workshop' | null = null;
  let workshopBack: 'title' | null = null;
  const boot = new Boot(gameWrap, {
    files: () => Array.from({ length: FILE_COUNT }, (_, i) => {
      const f = fileSummary(deviceStore, i + 1);
      const at = f.savedAt ? new Date(f.savedAt) : null;
      return {
        file: i + 1,
        empty: f.empty,
        where: (f.levelId && levelById(f.levelId)?.name) || (hubLevel?.name ?? ''),
        wedges: f.wedges,
        total: allWedges(),
        played: formatPlayed(f.played),
        saved: at ? `${at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : '',
      };
    }),
    currentFile: () => files.file,
    playFile: (n) => playFile(n),
    copyFile: (from, to) => {
      copyFile(deviceStore, from, to);
      if (to === files.file) reloadFile();
    },
    eraseFile: (n) => {
      eraseFile(deviceStore, n);
      if (n === files.file) reloadFile();
    },
    help: (screen) => {
      const kb = lastDevice() === 'keyboard';
      if (screen === 'title') return helpLine([['nav', 'move'], ['confirm', 'select']]);
      const copy = kb ? keyChip('KeyC') : prompt('stow');
      const erase = kb ? keyChip('Delete') : prompt('attack');
      if (screen === 'files') return `${helpLine([['nav', 'choose'], ['confirm', 'play']])}${pair(copy, 'copy')}${pair(erase, 'erase')}${helpLine([['back', 'back']])}`;
      if (screen === 'pickCopy') return helpLine([['nav', 'choose'], ['confirm', 'copy here'], ['back', 'cancel']]);
      if (screen === 'sureErase') return `${pair(erase, 'erase it')}${helpLine([['back', 'cancel']])}`;
      return helpLine([['confirm', 'copy over it'], ['back', 'cancel']]);
    },
    onOptions: () => {
      optionsFromTitle = true;
      boot.hide();
      menu.showAt(3);
    },
    onEditor: () => {
      editorBack = 'title';
      boot.hide();
      builder.show();
    },
    onWorkshop: () => {
      workshopBack = 'title';
      boot.hide();
      workshop.show();
    },
    sound: (n) => {
      if (n === 'chime') audio.play('boot', { vol: 0.8, verb: 0.2, priority: 9 });
      else audio.play(n === 'ok' ? 'menuOk' : n === 'back' ? 'menuBack' : 'menuMove', { vol: 0.6, verb: 0.05, priority: 3 });
    },
  });
  const bootOn = !import.meta.env.VITE_EDITOR && (location.hash === '' || location.hash.includes('boot'));
  if (bootOn) boot.begin();
  // Development aids: #boot&title skips the logo; #boot&loadscreen stays on the loading screen (for screenshots).
  if (location.hash.includes('loadscreen')) boot.loading(() => undefined, 1e9);
  else if (location.hash.includes('title')) boot.showTitle();
  else if (bootOn && location.hash.includes('files')) boot.showFiles();
  /** While a start-up screen is up: the arrows, stick, confirm and back buttons steer it, and nothing reaches the game. */
  let bootNav: 'up' | 'down' | 'left' | 'right' | null = null;
  let bootTimer = 0;
  function bootInput(dt: number): void {
    const key = (...codes: string[]) => codes.reduce((a, c) => input.consumePressed(c) || a, false);
    let up = consumeAction('up') || key('ArrowUp', 'KeyW');
    let down = consumeAction('down') || key('ArrowDown', 'KeyS');
    let left = consumeAction('left') || key('ArrowLeft', 'KeyA');
    let right = consumeAction('right') || key('ArrowRight', 'KeyD');
    const ok = [consumeAction('confirm'), consumeAction('jump'), key('Enter', 'Space')].some(Boolean);
    const back = [consumeAction('back'), key('Escape', 'Backspace', 'KeyK')].some(Boolean);
    // On the file screen: copy is the top face button (or C), erase the left one (or Delete / X).
    const copy = [consumeAction('stow'), key('KeyC')].some(Boolean);
    const erase = [consumeAction('attack'), key('Delete', 'KeyX')].some(Boolean);
    const ay = controlSources.reduce((a, s) => a + s.moveY, 0);
    const ax = controlSources.reduce((a, s) => a + s.moveX, 0);
    const dir = ay > 0.6 ? 'up' : ay < -0.6 ? 'down' : ax > 0.6 ? 'right' : ax < -0.6 ? 'left' : null;
    if (dir !== bootNav) {
      bootNav = dir;
      bootTimer = 0.35;
      if (dir === 'up') up = true;
      if (dir === 'down') down = true;
      if (dir === 'left') left = true;
      if (dir === 'right') right = true;
    } else if (dir && (bootTimer -= dt) <= 0) {
      bootTimer = 0.15;
      if (dir === 'up') up = true;
      else if (dir === 'down') down = true;
      else if (dir === 'left') left = true;
      else right = true;
    }
    if (up) boot.cmd('up');
    else if (down) boot.cmd('down');
    else if (left) boot.cmd('left');
    else if (right) boot.cmd('right');
    if (ok) boot.cmd('ok');
    else if (back) boot.cmd('back');
    else if (copy) boot.cmd('copy');
    else if (erase) boot.cmd('erase');
    for (const a of ['dodge', 'respawn', 'menu', 'tabPrev', 'tabNext'] as const) consumeAction(a);
    key('F2', 'F3', 'KeyP', 'KeyQ', 'KeyE', 'KeyH', 'KeyB', 'KeyJ');
  }

  // ---- The level builder. It draws over the game; PLAY tries the level, and reaching its exit comes back to the builder. ----
  /** The world map: home, then each world with its areas under it, then his own levels (and the old ones with #unlockall). */
  function worldRows(): LevelRow[] {
    const total = wedgeTotal();
    const wedgeInfo = (areas: LevelDef[]) => {
      const list = areas.flatMap((a) => (a.wedges ?? []).map((w) => ({ name: w.name, got: discoveries.has(`wedge:${a.id}:${w.id}`) })));
      return { wedges: { got: list.filter((w) => w.got).length, of: list.length }, list };
    };
    const base = (l: LevelDef) => ({ id: l.id, name: l.name, blurb: l.blurb, cleared: levelProgress.cleared(l.id), perfect: levelProgress.perfect(l.id), current: l.id === cur.id });
    const rows: LevelRow[] = [];
    // Each of the Club's doors: what it asks and how near he is (every wedge he holds counts towards every door).
    const doorOf = (cd: CourseDoorDef): DoorState => doorState(cd, total, !!cd.to && discoveries.has(`place:${cd.to}`), unlockAll || DEV.openDoors);
    if (hubLevel) rows.push({ ...base(hubLevel), kind: 'home', doors: hubDoors().filter((cd) => !!cd.to).map(doorOf) });
    for (const cd of hubDoors()) {
      const w = cd.to ? levelById(cd.to) : null;
      if (!w) {
        rows.push({ id: '', name: cd.name, blurb: '', cleared: false, perfect: false, current: false, kind: 'world', locked: true, lockText: `Still being dug out. Its door in the Club will want ${cd.need} Golden Wedges.` });
        continue;
      }
      const areas = worldAreas(w).sort((a, b) => (a.id === w.id ? -1 : b.id === w.id ? 1 : 0));
      const all = wedgeInfo(areas);
      const shut = !doorOpen(cd);
      rows.push({ ...base(w), kind: 'world', wedges: all.wedges, wedgeList: wedgeInfo([w]).list, locked: shut, lockText: `Its door in the Club needs ${cd.need} Golden Wedges. You have ${total}.`, door: doorOf(cd) });
      for (const a of areas) {
        if (a.id === w.id) continue;
        const seen = discoveries.has(`place:${a.id}`) || unlockAll || DEV.openDoors;
        const info = wedgeInfo([a]);
        rows.push({ ...base(a), kind: 'area', wedges: info.wedges, wedgeList: info.list, locked: shut || !seen, lockText: `Somewhere in ${w.name} is a door to this place.` });
      }
    }
    const hung = new Set(hubDoors().map((d) => d.to));
    for (const l of mine()) if (!hung.has(l.id)) rows.push({ ...base(l), name: `MY LEVEL: ${l.name}`, kind: 'area', wedges: wedgeInfo([l]).wedges, wedgeList: wedgeInfo([l]).list });
    return rows;
  }

  // Pip's shop.
  const shop = new ShopPanel(gameWrap, {
    help: () => (lastDevice() === 'touch' ? '' : helpLine([['nav', 'choose'], ['confirm', 'buy'], ['back', 'leave']])),
    money: () => wallet.balance(),
    rows: (): ShopRow[] => {
      const m = wallet.balance();
      return SHOP.map((it) => {
        const poor = m.crumbs < it.crumbs || m.caps < it.caps;
        if (it.kind === 'gear') {
          const def = ITEMS[it.id];
          return { id: it.id, name: def.name, description: def.description, perk: def.perk, cost: def.cost, icon: itemIcon(def, 48), crumbs: it.crumbs, caps: it.caps, state: equipment.owns(it.id) ? 'owned' : poor ? 'poor' : 'buy' };
        }
        const def = CONSUMABLES[it.id];
        const have = inventory.count(it.id);
        return { id: it.id, name: def.name, description: def.description, icon: nachoIcon(48), crumbs: it.crumbs, caps: it.caps, state: have >= def.maxStack ? 'full' : poor ? 'poor' : 'buy', note: `carrying ${have} of ${def.maxStack}` };
      });
    },
    buy: (id) => {
      const it = SHOP.find((s) => s.id === id);
      if (!it) return '';
      if (it.kind === 'gear' && equipment.owns(id)) return 'You have one of those already! One is plenty.';
      if (it.kind === 'snack' && inventory.count(id) >= CONSUMABLES[id].maxStack) return 'Your bag cannot hold any more of those, knight.';
      if (!wallet.pay({ crumbs: it.crumbs, caps: it.caps })) {
        audio.play('menuBack', { vol: 0.6, priority: 5 });
        return 'Squeak... a little short, I am afraid. Come back after a world or two!';
      }
      audio.play('relic', { vol: 0.6, rate: 1.3, priority: 7 });
      if (it.kind === 'gear') {
        // Bought, not worn: he puts it on himself from the menu.
        equipment.give(id);
        return `The ${ITEMS[id].name}! Lovely choice. Put it on from the menu, under EQUIP.`;
      }
      inventory.add(id);
      return 'One nacho cheese, warm as you like. Use it from ITEMS when you need a heart or two.';
    },
    onClose: () => {
      input.clearLast();
      audio.play('menuBack', { vol: 0.6, priority: 5 });
    },
  });
  if (/[#&]shop\b/.test(location.hash)) setTimeout(() => shop.show('Squeak! Welcome to Pip\'s. Crumbs and caps, I take both!'), 400);
  const tweaksPanel = new TweaksPanel(gameWrap, tweaks, () => {
    input.clearLast();
    if (tweaksBack === 'workshop') {
      tweaksBack = null;
      workshop.show();
    }
  });
  if (/[#&]tweaks\b/.test(location.hash)) setTimeout(() => tweaksPanel.show(), 300);
  // 3D editing from the builder: the game holds still while a free camera flies through the level.
  let flyDone: ((l: CustomLevel) => void) | null = null;
  const flyShaper = new PadShaper();
  /** In the 3D editor: whether a controller's d-pad up and down change the piece's height (or else its depth). */
  let flyLift = false;
  const fly = new FlyEdit(gameWrap, {
    scene,
    camera,
    solids: () => [chamber.group],
    rebuild: (level) => {
      const def = compileCustom(level);
      tracker.setLevel({ id: def.id, name: def.name, items: def.collectibles } as never);
      levelProgress.forget('custom');
      trans.active = false;
      cutscene.active = false;
      loadLevel(def);
    },
    done: (level) => {
      const f = flyDone;
      flyDone = null;
      for (const a of ['jump', 'attack', 'dodge', 'stow', 'respawn', 'menu', 'confirm', 'back', 'tabPrev', 'tabNext'] as const) consumeAction(a);
      f?.(level);
    },
  });
  // Photo mode: the game holds still and a camera circles him.
  const photo = new PhotoMode(gameWrap, {
    canvas,
    camera,
    ratAt: () => renderPos,
    help: () => {
      const d = lastDevice();
      if (d === 'touch') return '';
      if (d === 'keyboard') {
        return [pair(keyChip('#WASD'), 'zoom, turn'), pair(keyChip('#ARROWS'), 'circle'), pair(keyChip('KeyQ') + keyChip('KeyE'), 'down, up'), pair(keyChip('KeyZ') + keyChip('KeyX'), 'lens'),
          pair(keyChip('Digit1'), 'look'), pair(keyChip('Digit2'), 'pose'), pair(keyChip('Digit3'), 'frame'), pair(keyChip('Digit4'), 'rat'), pair(keyChip('Enter'), 'take'), pair(keyChip('Escape'), 'done')].join('');
      }
      return [pair(prompt('move'), 'zoom, turn'), pair(prompt('look'), 'circle'), pair(prompt('tabPrev') + prompt('tabNext'), 'look'), pair(prompt('stow'), 'pose'),
        pair(prompt('lock'), 'frame'), pair(prompt('respawn'), 'rat'), pair(prompt('attack'), 'take'), pair(prompt('back'), 'done')].join('');
    },
    done: () => {
      for (const a of ['jump', 'attack', 'dodge', 'stow', 'respawn', 'menu', 'confirm', 'back', 'tabPrev', 'tabNext'] as const) consumeAction(a);
    },
  });
  /** Photo mode can open when he is just playing: not in a scene, a room change, a talk, the builder, or dead. */
  const canPhoto = (): boolean => !story.scene && !storyPending && !cutscene.active && !trans.active && !dialog.open && !builder.open && !shop.open && !fly.open && !player.dead && !boot.blocking;
  // Development aids for the films. `&chase=dx,dy,dz`: the view keeps that far from HIM, looking at him.
  // `&orbit=x,y,z,r,h,rate[,from]`: it goes round that place, `r` out and `h` up, `rate` radians a second.
  const devNums = (name: string, n: number): number[] | null => {
    const v = new RegExp(`[#&]${name}=([-\\d.,]+)`).exec(location.hash)?.[1].split(',').map(Number) ?? [];
    return v.length === n && v.every((q) => Number.isFinite(q)) ? v : null;
  };
  const devChase = devNums('chase', 3);
  // (A seventh number is the angle it starts from, radians, 0 being south of the place: with a slow rate that is a
  // sweep through part of a turn, for a place with a wall close on one side.)
  const devOrbit = devNums('orbit', 7) ?? devNums('orbit', 6);
  let orbitFrom = -1;
  const devLift = /[#&]autolift\b/.test(location.hash);
  const devCarryFoe = /[#&]carryfoe\b/.test(location.hash);
  let devCarried = false;
  /** The film and test drives on the address (dev/filmDrive.ts), if any is asked for; and what they may look at. */
  const filmDrive = /[#&](autoride|autorail|chaos|autowalk|autogo|autojump|autoswing|autoplunge)\b/.test(location.hash) ? new FilmDrive(location.hash) : null;
  const filmSeen = (): Seen => ({ room: cur.id, player, enemies, fighting: devAuto.fight });
  // (For the cost report: what the last frame asked of the graphics card, and how much is in the room.)
  (window as unknown as { __cost?: () => unknown }).__cost = () => {
    let meshes = 0;
    let tris = 0;
    let lights = 0;
    scene.traverse((o) => {
      if ((o as THREE.Light).isLight && o.visible) lights++;
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible || !m.geometry) return;
      meshes++;
      const g = m.geometry;
      tris += (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
    });
    // (And which of the scene's own groups holds the meshes: the biggest few.)
    const by: Record<string, number> = {};
    for (const c of scene.children) {
      let n = 0;
      c.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) n++; });
      const key = c.name || c.type + (c === chamber.group ? ':chamber' : enemyModels.some((e) => e.root === c) ? ':enemy' : npcs.some((x) => x.root === c) ? ':npc' : '');
      by[key] = (by[key] ?? 0) + n;
    }
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8);
    // (Each of the scene's other groups, by how many meshes it shows: him, the doors, and the rest.)
    const groups = scene.children.filter((c) => !c.name && c !== chamber.group && !npcs.some((x) => x.root === c)).map((c) => {
      let n = 0;
      c.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) n++; });
      return `${n}${c === rat.root ? ' (him)' : c === courseVis?.group ? ' (doors)' : ''}`;
    }).filter((t) => t !== '0');
    return { level: cur.id, top, groups, calls: renderer.info.render.calls, frameTris: renderer.info.render.triangles, meshes, tris: Math.round(tris), lights, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
  };
  (window as unknown as { __chaos?: () => unknown }).__chaos = () => ({ level: cur.id, x: player.position.x, y: player.position.y, z: player.position.z, state: player.state, hp: player.hp });
  const devAuto: { fight: boolean; swing: number } = { fight: /[#&]autofight\b/.test(location.hash), swing: 0 };
  if (/[#&]god\b/.test(location.hash)) DEV.god = true;
  // Development aid, for pictures of a place: `&eye=x,y,z&look=x,y,z` puts the view there, looking there, whatever he is doing.
  const devEye = ((): number[] | null => {
    const e = /[#&]eye=([-\d.,]+)/.exec(location.hash);
    const l = /[#&]look=([-\d.,]+)/.exec(location.hash);
    const v = e && l ? [...e[1].split(','), ...l[1].split(',')].map(Number) : [];
    return v.length === 6 && v.every((n) => Number.isFinite(n)) ? v : null;
  })();
  // Development aid: #photo opens photo mode a moment after the start; #photo=look,pose,frame also picks those.
  const photoHash = /[#&]photo(?:=(\d+),(\d+),(\d+))?/.exec(location.hash);
  if (photoHash) {
    setTimeout(() => {
      if (!canPhoto()) return;
      photo.start();
      if (photoHash[1]) {
        photo.look = Number(photoHash[1]);
        photo.pose = Number(photoHash[2]);
        photo.frame = Number(photoHash[3]);
        photo.render();
      }
    }, 1500);
  }
  const builder: Builder = new Builder(gameWrap, {
    fly: (level, done, jumpCheck) => {
      editorReturn = false; // (it is only stepping aside for the 3D view)
      flyDone = done;
      fly.start(level, jumpCheck);
    },
    storage: browserStorage() ?? { getItem: () => null, setItem: () => undefined },
    library: myLevels,
    live: {
      attachView: (box) => {
        viewObserver.disconnect();
        if (box) box.appendChild(canvas);
        else gameWrap.insertBefore(canvas, gameWrap.firstChild);
        viewObserver.observe(box ?? gameWrap);
        resize();
        requestAnimationFrame(resize);
      },
      update: (level, restart) => {
        const def = compileCustom(level);
        // Edits keep him where he stands, if that spot is still inside the room.
        const keep = !restart && cur.id === 'custom' && Math.abs(player.position.x) < level.width / 2 && Math.abs(player.position.z) < level.depth / 2 && player.position.y > -3 ? player.position.clone() : null;
        tracker.setLevel({ id: def.id, name: def.name, items: def.collectibles } as never);
        levelProgress.forget('custom');
        trans.active = false;
        cutscene.active = false;
        loadLevel(def);
        if (keep) {
          player.position.copy(keep);
          player.prevPosition.copy(keep);
          player.velocity.set(0, 0, 0);
        }
      },
    },
    play: (level) => {
      // Into the game with it: wherever the editor was opened from, there is no going back there now.
      editorReturn = false;
      editorBack = null;
      workshopBack = null;
      boot.leave();
      const def = compileCustom(level);
      tracker.setLevel({ id: def.id, name: def.name, items: def.collectibles } as never);
      levelProgress.forget('custom');
      startTransition(def);
    },
    onClose: () => {
      for (const a of ['jump', 'attack', 'dodge', 'stow', 'respawn', 'confirm', 'back'] as const) consumeAction(a);
      // Opened from the title or the Workshop, it closes back to there (unless it closed to play or to fly: they say so at once).
      if (!editorBack) return;
      editorReturn = true;
      queueMicrotask(() => {
        if (!editorReturn) return;
        editorReturn = false;
        const back = editorBack;
        editorBack = null;
        if (back === 'workshop') workshop.show();
        else if (back === 'title') boot.showTitle();
      });
    },
  });
  let editorReturn = false;

  // ---- The Workshop: every development tool in one place, and the test switches. ----
  const WORLD_LABEL: Record<string, string> = { cistern: 'The Great Cistern', foundry: 'The Foundry', hollows: 'The Hollows', keep: "Grimsqueak's Keep" };
  let soundList: Array<{ name: string; loud: number; secs: number; loop: boolean }> | null = null;
  const hitShapes = new HitShapes();
  scene.add(hitShapes.object);
  const devTag = document.createElement('div');
  devTag.style.cssText = 'position:absolute;left:50%;top:4px;transform:translateX(-50%);z-index:21;pointer-events:none;font:600 11px var(--rq-font-tools);letter-spacing:0.06em;color:#ffc94a;background:#0c0f15cc;border:1px solid #ffc94a66;border-radius:10px;padding:1px 9px;display:none;white-space:nowrap';
  gameWrap.appendChild(devTag);
  const workshop: Workshop = new Workshop(gameWrap, {
    openEditor: () => {
      editorBack = 'workshop';
      builder.show();
    },
    openTweaks: () => {
      tweaksBack = 'workshop';
      tweaksPanel.show();
    },
    tweaksChanged: () => tweaks.count(),
    sounds: () => (soundList ??= SFX_NAMES.map((name) => {
      const smp = sfx(name);
      return { name, loud: loudness(smp), secs: smp.data.length / smp.rate, loop: smp.loop };
    }).sort((a, b) => a.name.localeCompare(b.name))),
    playSound: (name, rate, vol) => {
      audio.playSample(`ws:${name}`, { ...sfx(name as SfxName), loop: false }, { rate, vol, priority: 9, verb: 0.05 });
    },
    tracks: () => [...TRACK_NAMES],
    playTrack: (name) => audio.playTrack((name as TrackName | null) ?? cur.music ?? 'drift', cur.id),
    places: () => {
      // The Club first, then the worlds in the order he meets them (each world's own area before its side areas).
      const order = ['The Club', ...Object.values(WORLD_LABEL), 'Other places'];
      const world = LEVELS.map((l) => ({ id: l.id, name: l.name, group: l.hub ? 'The Club' : WORLD_LABEL[l.world ?? ''] ?? 'Other places', note: l.wedges ? `${l.wedges.length} wedge${l.wedges.length === 1 ? '' : 's'}` : '', here: l.id === cur.id, main: l.id === l.world }));
      world.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || Number(b.main) - Number(a.main));
      return [
        ...world,
        ...mine().map((l) => ({ id: l.id, name: l.name, group: 'My Levels', here: l.id === cur.id })),
        ...TEST_ROOMS.map((l) => ({ id: l.id, name: l.name, group: 'Test rooms', here: l.id === cur.id })),
        ...ARCHIVE.map((l) => ({ id: l.id, name: l.name, group: 'Old levels (retired)', here: l.id === cur.id })),
      ];
    },
    goTo: (id) => {
      const def = levelById(id);
      if (!def) return;
      workshopBack = null;
      editorBack = null;
      boot.leave();
      trans.active = false;
      cutscene.active = false;
      loadLevel(def);
      player.hp = player.maxHp;
      follow.snap();
      input.clearLast();
    },
    switched: (key) => {
      if (key === 'god') player.untouchable = DEV.god;
      if (key === 'readout') debugEl.style.display = showDebug || DEV.readout ? '' : 'none';
    },
    act: (what) => {
      if (what === 'heal') {
        if (player.dead) return 'He is down. Start this place again instead.';
        player.hp = player.maxHp;
        return 'Healed.';
      }
      if (what === 'gear') {
        for (const id of Object.keys(ITEMS)) equipment.give(id);
        applyGear();
        return 'He owns every piece of gear now (put it on in the pause menu, under EQUIP).';
      }
      if (what === 'restart') {
        trans.active = false;
        cutscene.active = false;
        loadLevel(cur);
        player.hp = player.maxHp;
        follow.snap();
        return `${cur.name}: started again.`;
      }
      let beaten = 0;
      for (const e of enemies) {
        if (!e.alive) continue;
        // (A boss up on her thread cannot be touched: she is brought down first.)
        for (let k = 0; k < 400 && e.alive; k++) e.takeHit(5, player.position.x, player.position.z, 'plunge');
        if (!e.alive) beaten++;
      }
      return beaten ? `${beaten} beaten.` : 'There is nothing here to beat (or it cannot be reached just now).';
    },
    onClose: () => {
      input.clearLast();
      if (workshopBack === 'title') {
        workshopBack = null;
        boot.showTitle();
      }
    },
  });
  if (/[#&]workshop\b/.test(location.hash)) setTimeout(() => workshop.show(), 300);

  if (/[#&]flyedit\b/.test(location.hash)) {
    setTimeout(() => {
      flyDone = (l) => builder.show(l);
      fly.start(builder.current(), builder.jumpCheck);
    }, 300);
  }

  /** What was asked of the menu in one frame, in the order it is done: moves, then changes of screen, then yes and no. */
  const menuOrder = (asked: Set<MenuKey>): MenuKey[] => (['left', 'right', 'up', 'down', 'tabPrev', 'tabNext', 'confirm', 'back'] as const).filter((k) => asked.has(k));
  /** How fast the right stick moves the menu's DETAILS card, in heights of the card a second. */
  const MENU_READ = 1.5;
  const MENU_KEYS: Array<[MenuKey, string[]]> = [
    ['left', ['ArrowLeft', 'KeyA']],
    ['right', ['ArrowRight', 'KeyD']],
    ['up', ['ArrowUp', 'KeyW']],
    ['down', ['ArrowDown', 'KeyS']],
    ['tabPrev', ['KeyQ', 'PageUp']],
    ['tabNext', ['KeyE', 'PageDown']],
    ['confirm', ['Space', 'KeyJ']],
    ['back', ['Backspace', 'KeyB', 'KeyK']],
  ];
  // Development aid: #...&ownall gives all gear, and #...&menu2 opens the menu on screen 2, for screenshots.
  if (location.hash.includes('ownall')) {
    for (const id of Object.keys(ITEMS)) equipment.give(id);
    inventory.add('nachoCheese', 3);
  }
  let captureSince = 0;
  let navDir: MenuKey | null = null;
  let navTimer = 0;
  /** Opens and closes the menu and steers it. Keeps menu presses out of the game and game presses out of the menu. */
  function handleMenuInput(dt: number): void {
    if (input.consumePressed('F11') || (input.isDown('AltLeft') && input.consumePressed('Enter'))) platform.toggleFullscreen();
    if (shop.open) {
      // Pip's shop: up and down to choose, confirm to buy, back to leave.
      if (input.consumePressed('ArrowUp') || input.consumePressed('KeyW') || consumeAction('up')) shop.move(-1);
      if (input.consumePressed('ArrowDown') || input.consumePressed('KeyS') || consumeAction('down')) shop.move(1);
      if (input.consumePressed('Enter') || input.consumePressed('Space') || input.consumePressed('KeyE') || consumeAction('confirm')) shop.buy();
      if (input.consumePressed('Escape') || input.consumePressed('KeyP') || consumeAction('back') || consumeAction('menu')) shop.close();
      for (const a of ['jump', 'attack', 'dodge', 'stow', 'respawn', 'left', 'right', 'tabPrev', 'tabNext', 'lock'] as const) consumeAction(a);
      input.takeAnyPressed();
      return;
    }
    if (photo.open) {
      // Photo mode takes every press.
      const sum = (k: 'moveX' | 'moveY' | 'lookX' | 'lookY'): number => controlSources.reduce((a, s) => a + s[k], 0);
      const k = (c: string): number => (input.isDown(c) ? 1 : 0);
      const press = (...codes: string[]): boolean => codes.map((c) => input.consumePressed(c)).some(Boolean);
      photo.step(dt, {
        orbitX: Math.max(-1, Math.min(1, k('ArrowRight') - k('ArrowLeft') - sum('lookX'))),
        orbitY: Math.max(-1, Math.min(1, k('ArrowUp') - k('ArrowDown') + sum('lookY'))),
        zoom: Math.max(-1, Math.min(1, k('KeyW') - k('KeyS') + sum('moveY'))),
        turn: Math.max(-1, Math.min(1, k('KeyD') - k('KeyA') + sum('moveX'))),
        rise: k('KeyE') - k('KeyQ'),
        fov: k('KeyZ') - k('KeyX'),
        look: (press('Digit1') || consumeAction('tabNext') ? 1 : 0) - (consumeAction('tabPrev') ? 1 : 0),
        pose: press('Digit2') || consumeAction('stow') ? 1 : 0,
        // (Not on the dodge button: on a pad that is also the back button, which leaves photo mode.)
        frame: press('Digit3') || consumeAction('lock'),
        hide: press('Digit4') || consumeAction('respawn'),
        snap: press('Enter', 'Space') || consumeAction('attack') || consumeAction('confirm'),
        exit: press('Escape', 'KeyO', 'KeyP') || consumeAction('menu') || consumeAction('back'),
      });
      for (const a of ['jump', 'dodge', 'left', 'right', 'up', 'down'] as const) consumeAction(a);
      input.takeAnyPressed();
      return;
    }
    if (fly.open) {
      // 3D editing takes every press.
      const sum = (k: 'moveX' | 'moveY' | 'lookX' | 'lookY'): number => controlSources.reduce((a, s) => a + s[k], 0);
      const k = (c: string): number => (input.isDown(c) ? 1 : 0);
      const press = (...codes: string[]): boolean => codes.map((c) => input.consumePressed(c)).some(Boolean);
      // (While he types a piece's name into its search, none of those keys are the editor's.)
      const typing = fly.typing;
      // A controller's d-pad shapes the piece here (see PadShaper); it does not fly, as it walks in the game.
      // (Select switches its up and down between the piece's depth and its height.)
      if (consumeAction('respawn')) flyLift = !flyLift;
      const shape = flyShaper.step(dt, gamepadDpad.x, gamepadDpad.y, flyLift);
      const dpadX = gamepadDpad.walks ? gamepadControls.moveX : 0;
      const dpadY = gamepadDpad.walks ? gamepadControls.moveY : 0;
      const shift = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const z = press('KeyZ');
      const inp = {
        moveX: Math.max(-1, Math.min(1, k('KeyD') - k('KeyA') + sum('moveX') - dpadX)),
        moveY: Math.max(-1, Math.min(1, k('KeyW') - k('KeyS') + sum('moveY') - dpadY)),
        lookX: Math.max(-1, Math.min(1, k('ArrowRight') - k('ArrowLeft') + sum('lookX'))),
        lookY: Math.max(-1, Math.min(1, k('ArrowUp') - k('ArrowDown') + sum('lookY'))),
        up: input.isDown('Space') || controlSources.some((s) => s.jumpHeld),
        down: input.isDown('KeyC') || controlSources.some((s) => s.runHeld),
        fast: shift,
        place: press('KeyE', 'Enter') || consumeAction('attack'),
        del: press('KeyX', 'Delete', 'Backspace') || consumeAction('dodge'),
        pick: press('KeyQ') || consumeAction('lock'),
        move: press('KeyG'),
        prev: press('BracketLeft') || consumeAction('tabPrev'),
        next: press('BracketRight') || consumeAction('tabNext'),
        raise: (press('KeyR') ? 1 : 0) - (press('KeyF') ? 1 : 0) + shape.raise,
        width: (press('Digit2') ? 1 : 0) - (press('Digit1') ? 1 : 0) + shape.width,
        depth: (press('Digit4') ? 1 : 0) - (press('Digit3') ? 1 : 0) + shape.depth,
        turn: press('KeyT') || consumeAction('stow'),
        undo: z && !shift,
        redo: press('KeyY') || (z && shift),
        palette: press('KeyB'),
        help: press('KeyH'),
        check: press('KeyJ'),
        exit: press('Escape', 'KeyP') || consumeAction('menu') || consumeAction('back'),
        padLift: gamepadInfo.connected ? flyLift : null,
      };
      fly.frame(dt, typing ? { ...inp, moveX: 0, moveY: 0, lookX: 0, lookY: 0, up: false, down: false, fast: false, place: false, del: false, pick: false, move: false, prev: false, next: false, raise: 0, width: 0, depth: 0, turn: false, undo: false, redo: false, palette: false, help: false, check: false, exit: false } : inp);
      for (const a of ['jump', 'confirm', 'left', 'right', 'up', 'down'] as const) consumeAction(a);
      input.takeAnyPressed();
      return;
    }
    if (builder.open && !builder.live) {
      // The builder has its own mouse and keyboard handling; keep every game press out of it.
      for (const a of ['jump', 'attack', 'dodge', 'stow', 'respawn', 'menu', 'confirm', 'back', 'left', 'right', 'up', 'down', 'tabPrev', 'tabNext'] as const) consumeAction(a);
      return;
    }
    if (input.consumePressed('F2') && !builder.open && !workshop.open) builder.show();
    if (input.consumePressed('F4') && !builder.open && !tweaksPanel.open && !menu.open) {
      if (workshop.open) workshop.hide();
      else workshop.show();
    }
    // Quicksave (F5) and quickload (F9). There is no pop-up: a chime says it worked, a low note says there was nothing to load.
    if (input.consumePressed('F3') && !builder.open) {
      if (tweaksPanel.open) tweaksPanel.hide();
      else if (!menu.open) tweaksPanel.show();
    }
    if (tweaksPanel.open) {
      // The sliders, worked from a controller (or the touch pad): the bumpers change group, the stick or d-pad moves
      // the cursor and changes the slider it is on, repeating while held. (The keyboard is left to the panel itself:
      // its boxes are typed into.)
      const asked = new Set<MenuKey>();
      for (const [key] of MENU_KEYS) if (consumeAction(key)) asked.add(key);
      const ax = controlSources.reduce((a, s2) => a + s2.moveX, 0);
      const ay = controlSources.reduce((a, s2) => a + s2.moveY, 0);
      const dir: MenuKey | null = Math.abs(ay) > Math.abs(ax) ? (ay > 0.6 ? 'up' : ay < -0.6 ? 'down' : null) : ax > 0.6 ? 'right' : ax < -0.6 ? 'left' : null;
      if (dir !== navDir) {
        navDir = dir;
        navTimer = 0.35;
        if (dir) asked.add(dir);
      } else if (dir) {
        navTimer -= dt;
        if (navTimer <= 0) {
          // (Left and right on a slider run faster the longer they are held: a slider can have a hundred steps.)
          navTimer = dir === 'left' || dir === 'right' ? 0.06 : 0.15;
          asked.add(dir);
        }
      }
      const resetOne = consumeAction('stow');
      for (const key of menuOrder(asked)) tweaksPanel.press(key);
      if (resetOne) tweaksPanel.press('reset');
      for (const a2 of ['jump', 'attack', 'dodge', 'respawn', 'menu'] as const) consumeAction(a2);
      return;
    }
    if (!menu.open && !dialog.open && !boot.blocking && !story.scene && !cutscene.active && !trans.active && !builder.open && !tweaksPanel.open) {
      if (input.consumePressed('F5') && !player.dead) {
        writeSave(storage, snapshot(), 'quick');
        audio.play('menuOk', { vol: 0.7, verb: 0.1, priority: 6 });
      }
      if (input.consumePressed('F9')) {
        const ok = applySave(readSave(storage, 'quick'));
        audio.play(ok ? 'menuOk' : 'menuBack', { vol: 0.7, verb: 0.1, priority: 6 });
      }
    }
    // Waiting for a new key or button: take the next press and give it to the action.
    const cap = menu.open ? menu.capturing() : null;
    if (cap) {
      for (const a of ['jump', 'attack', 'dodge', 'stow', 'respawn', 'menu', 'confirm', 'back', 'left', 'right', 'up', 'down', 'tabPrev', 'tabNext', 'lock'] as const) consumeAction(a);
      if (captureSince === 0) {
        captureSince = performance.now();
        input.clearLast();
        input.takeAnyPressed();
      }
      const action = cap.id as BindAction;
      if (cap.col === 0) {
        const code = input.takeAnyPressed();
        if (code === 'Escape') captureSince = 0, menu.finishCapture('Cancelled.');
        else if (code) {
          const ok = bindings.setKey(action, code);
          captureSince = 0;
          menu.finishCapture(ok ? '' : 'That key is reserved. Pick another.');
        }
      } else if (gamepadInfo.lastAt > captureSince && gamepadInfo.lastButton) {
        const ok = bindings.setPad(action, gamepadInfo.lastButton);
        captureSince = 0;
        menu.finishCapture(ok ? '' : 'That button is reserved. Pick another.');
      } else if (input.takeAnyPressed() === 'Escape') {
        captureSince = 0;
        menu.finishCapture('Cancelled.');
      }
      return;
    }
    captureSince = 0;
    if (dialog.open && !story.scene) {
      // Talking: the jump, attack or confirm button turns the page; dodge or back leaves.
      let next = consumeAction('jump') || consumeAction('attack') || consumeAction('confirm');
      for (const c of [...bindings.keys('jump'), ...bindings.keys('attack'), 'Enter']) if (input.consumePressed(c)) next = true;
      let leave = consumeAction('dodge') || consumeAction('back');
      for (const c of [...bindings.keys('dodge'), 'Escape', 'Backspace']) if (input.consumePressed(c)) leave = true;
      if (leave) dialog.close();
      else if (next) dialog.advance();
      for (const a of ['stow', 'respawn', 'menu', 'left', 'right', 'up', 'down', 'tabPrev', 'tabNext'] as const) consumeAction(a);
      return;
    }
    if (input.consumePressed('KeyO') && !menu.open && canPhoto()) {
      photo.start();
      return;
    }
    const toggle = (consumeAction('menu') || input.consumePressed('Escape') || input.consumePressed('KeyP')) && !builder.live;
    const enter = input.consumePressed('Enter') && !builder.live;
    if (toggle || (enter && !menu.open)) menu.toggle();
    if (menu.open) {
      // Everything asked for this frame, each thing once. (A d-pad press is a button AND, with the stick at rest, a
      // push of the stick: asked for twice over, it used to move the cursor two rows.)
      const asked = new Set<MenuKey>();
      for (const [key, base] of MENU_KEYS) {
        const codes = key === 'confirm' ? [...base, ...bindings.keys('jump'), ...bindings.keys('attack')] : key === 'back' ? [...base, ...bindings.keys('dodge')] : base;
        let hit = consumeAction(key);
        for (const c of codes) if (input.consumePressed(c)) hit = true;
        if (hit) asked.add(key);
      }
      if (enter) asked.add('confirm');
      // The left stick (or the d-pad) moves the cursor, repeating while held.
      const ax = controlSources.reduce((a, s) => a + s.moveX, 0);
      const ay = controlSources.reduce((a, s) => a + s.moveY, 0);
      const dir: MenuKey | null = Math.abs(ay) > Math.abs(ax) ? (ay > 0.6 ? 'up' : ay < -0.6 ? 'down' : null) : ax > 0.6 ? 'right' : ax < -0.6 ? 'left' : null;
      if (dir !== navDir) {
        navDir = dir;
        navTimer = 0.35;
        if (dir) asked.add(dir);
      } else if (dir) {
        navTimer -= dt;
        if (navTimer <= 0) {
          navTimer = 0.15;
          asked.add(dir);
        }
      }
      for (const key of menuOrder(asked)) menu.press(key);
      // The right stick (or R and F) moves what is written in the DETAILS card, when there is more of it than fits.
      const read = controlSources.reduce((a, s) => a + s.lookY, 0) + (input.isDown('KeyR') ? 1 : 0) - (input.isDown('KeyF') ? 1 : 0);
      if (Math.abs(read) > 0.25) menu.scroll(-Math.max(-1, Math.min(1, read)) * MENU_READ * dt);
      for (const a of ['jump', 'attack', 'dodge', 'stow', 'respawn'] as const) consumeAction(a);
      for (const code of bindings.allKeys()) input.consumePressed(code);
    } else {
      // Closed: throw away menu presses so they don't pile up.
      for (const a of ['left', 'right', 'up', 'down', 'tabPrev', 'tabNext', 'confirm', 'back'] as const) consumeAction(a);
      for (const [, codes] of MENU_KEYS) for (const c of codes) if (!bindings.allKeys().has(c)) input.consumePressed(c);
      navDir = null;
    }
  }

  /** Height of the highest surface under a point, or null over the pit. */
  /** Where he is drawn (see where it is set): his place, but standing on what is under his feet. */
  const drawnPos = new THREE.Vector3();
  let drawnY = 0;
  /** The highest floor under his FEET (a small square round his middle, not his whole footprint), at or below `y`. */
  function feetGround(x: number, y: number, z: number): number | null {
    const r = 0.1;
    let best: number | null = null;
    for (const b of chamber.colliders) {
      if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
      const top = topAt(b, x, z);
      if (top <= y + 0.05 && (best === null || top > best)) best = top;
    }
    return best;
  }
  function groundBelow(x: number, y: number, z: number): number | null {
    let best: number | null = null;
    for (const b of chamber.colliders) {
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      const top = topAt(b, x, z);
      if (top <= y + 0.05 && (best === null || top > best)) best = top;
    }
    return best;
  }

  const debris = new Debris(scene, groundBelow);
  /** Breaks a crate: pieces fly, and something may pop out. */
  function smashCrate(c: (typeof chamber.crates)[number]): void {
    chamber.breakCrate(c);
    // (A pot goes to shards, as a pipe's joint does.)
    debris.burst(c.x, c.y, c.z, c.half, player.position.x, player.position.z, c.type === 'pot' || c.type === 'rock' ? 'pipe' : c.type);
    if (c.type === 'pipe') {
      goals.burst++;
      shake = Math.max(shake, 0.1);
      return;
    }
    const index = c.index;
    revealedCrates.add(index);
    // Story: this is the crate with the keepsake in it.
    const found = STORY[cur.id]?.find;
    const foundAt = found && cur.storySpots?.[found.spot];
    if (found && foundAt && !storyOff && !storySeen.seen(`${cur.id}.find`) && Math.hypot(c.x - foundAt.x, c.z - foundAt.z) < 0.3) {
      dropKeepsake(found.prop, foundAt);
      storyWaiting = found.scene;
    }
    // A crate with something inside gives that; an empty one may give a snack.
    const id = cur.crateContents[index] ? null : rollCrateDrop();
    if (id) drops.spawn(id, c.x, c.z, c.y - c.half, c.y);
  }
  /** Lifts any gate whose pipes are all burst, and any gate that waits for the goals. */
  function updateGates(): void {
    for (const g of chamber.gates) {
      if (g.open) continue;
      const pipes = g.spec.pipes ?? [];
      const byPipes = pipes.length > 0 && pipes.every((i) => !chamber.pipes[i]?.alive);
      const plates = g.spec.plates ?? [];
      const byPlates = plates.length > 0 && plates.every((i) => platesDown[i]);
      const byGoals = !!g.spec.onGoals && goals.mainDone(aliveCount());
      const foes = g.spec.foes ?? [];
      const byFoes = foes.length > 0 && foes.every((i) => !enemies[i]?.alive);
      // (Levers all on at once, world/strikeables.ts; an echo puzzle solved, world/musicFloor.ts.)
      const byLevers = !!chamber.strike && leversOn(chamber.strike.things, g.spec.levers ?? []);
      const byEcho = !!g.spec.echo && !!musicFloor?.solved(g.spec.echo);
      if (byPipes || byGoals || byPlates || byFoes || byLevers || byEcho) {
        chamber.openGate(g);
        shake = Math.max(shake, 0.12);
      }
    }
  }
  // Development aid: #...&smash breaks every crate and pipe after a moment, for screenshots.
  if (location.hash.includes('smash')) {
    setTimeout(() => {
      for (const c of [...chamber.crates, ...chamber.pipes]) smashCrate(c);
    }, 100);
  }

  // Start the first level, then the development aids: #level=caps starts a level fresh, #cutscene or #cut=5 starts the door
  // scene (5 seconds in), #door shows the open door, #go2 goes through it, #menu2 opens the menu on screen 2.
  const cutAt = /cut=([\d.]+)/.exec(location.hash);
  const startAt = /level=(\w+)/.exec(location.hash);
  // He picks up where he was if that is part of the world; otherwise (a new game, or an old campaign level) at home.
  // (As of 2026-11-17 every level is a test room off the Hall: he starts in the Hall, whatever he was in last. The
  // Hall is the list of places.)
  const first = (startAt && levelById(startAt[1])) || homeLevel || hubLevel || LEVELS[0];
  loadLevel(first, !startAt);
  // Development aid: #at=x,y,z,cameraYaw starts the rat somewhere else, for screenshots.
  const atMatch = /at=([-\d.,]+)/.exec(location.hash);
  if (atMatch) {
    const [x, y, z, yaw] = atMatch[1].split(',').map(Number);
    player.position.set(x, y, z);
    player.prevPosition.copy(player.position);
    lastSafe.copy(player.position);
    follow.yaw = yaw || 0;
    // (`&tilt=-0.3`: and the view tilted so, as his right stick would: under 0.1 it is looking up.)
    const tilt = /[#&]tilt=(-?[\d.]+)/.exec(location.hash);
    if (tilt) follow.pitch = Number(tilt[1]);
    follow.snap();
    // (`&riding`: and on his shield from the start, for pictures of the ride.)
    if (/[#&]riding\b/.test(location.hash)) player.devRide();
  }
  if (cutAt || location.hash.includes('cutscene')) startCutscene(cutAt ? Number(cutAt[1]) : 0);
  // Development aids: #story=open or #story=exit plays that scene of this level now; &st=4.5 starts it that many seconds in.
  // Development aid: #level=hub&scene=<id>&t=<seconds>&hold plays a cutscene from a moment (and holds it there).
  const showAt = /[#&]scene=([\w-]+)/.exec(location.hash);
  if (showAt) {
    const def = cutsceneById(showAt[1]);
    if (def) playCutscene(def, Number(/[#&]t=([\d.]+)/.exec(location.hash)?.[1] ?? 0), /[#&]hold\b/.test(location.hash));
  }
  const storyAt = /story=(open|exit|find|near)/.exec(location.hash);
  if (storyAt && (storyAt[1] === 'find' || storyAt[1] === 'near')) {
    // #story=find or #story=near: stand him by the spot and play it.
    const part = STORY[cur.id]?.[storyAt[1] as 'find' | 'near'];
    const sp = part && cur.storySpots?.[part.spot];
    storyPending = null;
    if (part && sp) {
      player.position.set(sp.x + 0.3, sp.y, sp.z + 1.6);
      player.prevPosition.copy(player.position);
      player.facing = Math.PI;
      const fp = STORY[cur.id]?.find;
      if (storyAt[1] === 'find' && fp) {
        for (const c of chamber.crates) if (c.alive && Math.hypot(c.x - sp.x, c.z - sp.z) < 0.3) smashCrate(c);
        if (!keepsake) dropKeepsake(fp.prop, sp);
      }
      storyWaiting = null;
      playScene(part.scene(storyCtx()), null, Number(/st=([\d.]+)/.exec(location.hash)?.[1] ?? 0));
    }
  } else if (storyAt) {
    const make = STORY[cur.id]?.[storyAt[1] as 'open' | 'exit'];
    storyPending = null;
    if (storyAt[1] === 'exit') player.position.set(cur.exit.x + Math.sin(cur.exit.yaw) * 1.2, player.position.y, cur.exit.z + Math.cos(cur.exit.yaw) * 1.2);
    if (make) playScene(make(storyCtx()), null, Number(/st=([\d.]+)/.exec(location.hash)?.[1] ?? 0));
  }
  // Development aid: #bossdo=storm (or volley, slam, summon, heal): the boss is woken and begins that part of his fight
  // at once, to look at it.
  {
    const what = /bossdo=(volley|slam|storm|summon|heal)/.exec(location.hash)?.[1] as 'volley' | 'slam' | 'storm' | 'summon' | 'heal' | undefined;
    if (what) {
      storyPending = null;
      wakeBoss();
      // (Over and over: each time he is back to floating he begins it again, so it can be watched.)
      const again = (): void => {
        for (const e of enemies) if (e instanceof Grimsqueak && e.alive && (e.state === 'float' || e.asleep)) e.rehearse(what);
      };
      again();
      window.setInterval(again, 200);
    }
  }
  // Development aid: #bossdown beats the level's boss at once, to see what follows the fight.
  if (location.hash.includes('bossdown')) {
    storyPending = null;
    wakeBoss();
    for (const e of enemies) if (e instanceof Grimsqueak) while (e.alive) e.takeHit(1, player.position.x, player.position.z);
  }
  if (location.hash.includes('door')) levelProgress.markCleared(cur.id);
  if (location.hash.includes('go2')) {
    levelProgress.markCleared(cur.id);
    startTransition(nextLevel());
    trans.t = FADE_OUT + 0.01; // skip ahead to the moment he is moved
  }
  if (import.meta.env.VITE_EDITOR) builder.standalone();
  else if (location.hash.includes('build')) builder.show();
  const liveDemo = /live=(\w+)/.exec(location.hash);
  if (liveDemo) {
    builder.show();
    builder.demo(liveDemo[1]);
  }
  // Development aid: #...&talk opens the first character's talk box, for screenshots.
  // Development aid: #lockon locks onto the nearest foe a moment after starting, for screenshots.
  if (location.hash.includes('lockon')) {
    setTimeout(() => (lockTarget = pickTarget(player.position, follow.yaw, enemies, 60)), 400);
    if (location.hash.includes('debug')) setInterval(() => console.log('LOCK', !!lockTarget, follow.yaw.toFixed(2), lockTarget ? cameraYawToward(player.position, lockTarget).toFixed(2) : '-', player.facing.toFixed(2)), 1000);
  }
  if (/[#&]talk\b/.test(location.hash) && npcs[0]) {
    talkingTo = npcs[0];
    dialog.start(npcs[0].spec.name, npcs[0].spec.lines, npcs[0].spec.kind);
  }
  const openAt = /menu(\d)/.exec(location.hash);
  if (openAt) {
    menu.show();
    for (let i = 0; i < Number(openAt[1]); i++) menu.press('tabNext');
    if (location.hash.includes('rebind')) menu.debugRebind();
  }
  window.addEventListener('blur', () => {
    if (platform.desktop && !boot.blocking && !menu.open && !cutscene.active && !trans.active) menu.toggle();
  });
  // ---- Fixed-timestep loop: simulation at SIM_HZ, rendering every frame with interpolation. ----
  let lastFrame = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let fps = 0;

  let promptsShown = '';
  let slowClock = 0;
  // Development aid for the films: `&film=4`. The game goes a sixtieth of a second for every frame, whatever the
  // clock says; it DRAWS only every 4th, and then WAITS, drawn, until a picture of it has been taken
  // (`window.__filmReady` says it is waiting, `window.__filmGo()` lets it go on). So a film is even, and true to the
  // game's speed, however slow the machine that takes it. (Filming in slow motion against the clock was neither.)
  const filmEvery = Number(/[#&]film=(\d+)/.exec(location.hash)?.[1] ?? 0);
  const film = { clock: 0, count: 0, hold: false };
  const filmWindow = window as unknown as { __filmReady?: boolean; __filmGo?: () => void };
  if (filmEvery) {
    filmWindow.__filmGo = () => {
      film.hold = false;
      filmWindow.__filmReady = false;
    };
  }
  function frame(now: number): void {
    if (filmEvery) {
      if (film.hold) return void requestAnimationFrame(frame);
      film.clock = (film.clock || now) + 1000 / 60;
      now = film.clock;
    }
    const rawDt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    // (In the dev slow motion the scenery's clock is slowed with the rest: it ran on at full speed, and a film taken
    // in slow motion showed every lamp, bellows and pour five times too fast.)
    if (DEV.slow !== 1) slowClock = (slowClock || now / 1000) + rawDt * DEV.slow;
    const time = DEV.slow !== 1 ? slowClock : now / 1000;
    worldClock = time;

    pollGamepad();
    // Button prompts follow what he last touched: redraw the screens that show them when that changes.
    const stamp = promptStamp();
    if (stamp !== promptsShown) {
      promptsShown = stamp;
      menu.refresh();
      shop.refresh();
      photo.refresh();
      boot.refresh();
    }
    if (boot.blocking) bootInput(rawDt);
    else handleMenuInput(rawDt);
    boot.update(rawDt);
    // Time played: while he is in the game (not the title or the menu, and the window showing). Kept every half minute.
    if (!boot.blocking && !menu.open && !(typeof document !== 'undefined' && document.hidden)) {
      played += rawDt;
      if (played - playedSaved >= 30) flushPlayed();
    }
    // While the menu, a conversation or the builder is open the world holds still.
    // Slow motion after a kill: time crawls, then eases back to normal.
    let timeScale = DEV.slow;
    player.untouchable = DEV.god;
    if (slowT > 0) {
      const k = 1 - slowT / TUNING.feel.killSlowSeconds;
      timeScale *= TUNING.feel.killSlowScale + (1 - TUNING.feel.killSlowScale) * k * k;
      slowT = Math.max(0, slowT - rawDt);
    }
    const frameDt = boot.blocking || menu.open || tweaksPanel.open || workshop.open || fly.open || photo.open || shop.open || (dialog.open && !story.scene) || (builder.open && !builder.live) ? 0 : rawDt * timeScale;
    dialog.update(rawDt);
    menu.update(rawDt);
    audio.duck(menu.open ? 0.35 : dialog.open ? 0.55 : 1);
    if (!player.dead && audio.jingleOn === 'defeat') audio.stopJingle(0.5);

    // Hit-stop: when a blow lands, everything freezes for a few frames.
    let animDt = frameDt;
    if (hitStop > 0) {
      hitStop -= frameDt;
      animDt = 0;
    } else if (cutscene.active || trans.active || story.scene || storyPending) {
      accumulator = 0;
    } else {
      accumulator += frameDt;
      while (accumulator >= SIM_STEP) {
        simulate(SIM_STEP);
        accumulator -= SIM_STEP;
        if (hitStop > 0) {
          accumulator = 0;
          break;
        }
      }
    }

    // Interpolate the rat between the last two simulation positions to avoid stutter on high-refresh displays.
    const alpha = accumulator / SIM_STEP;
    renderPos.lerpVectors(player.prevPosition, player.position, alpha);
    planarSpeed = Math.hypot(player.velocity.x, player.velocity.z);

    // The door reveal scene: he looks around, the room rumbles, the camera finds the wall, the door appears.
    // The Club has no door of its own: its ways out are the world doors.
    const open = levelProgress.cleared(cur.id) && !noWayOut(cur);
    let doorSparkle = open ? 1 : 0;
    let doorFade = open ? 1 : 0;
    let camBlend = 0;
    // While a villain talks, the camera swings round in front of him.
    dlgCam += ((dialog.open && talkingTo?.spec.kind === 'villain' ? 1 : 0) - dlgCam) * Math.min(1, rawDt * 3);
    if (cutscene.active) {
      cutscene.t += frameDt;
      const f = revealFrame(cutscene.t);
      const toDoor = Math.atan2(cur.exit.x - player.position.x, cur.exit.z - player.position.z);
      player.facing = angleLerp(cutscene.baseFacing + f.lookOffset, toDoor, f.faceDoor);
      shake = Math.max(shake, f.rumble);
      rumble.quake(f.rumble);
      doorSparkle = f.sparkle;
      doorFade = f.fade;
      camBlend = f.camBlend;
      if (cutscene.t - frameDt <= 0) audio.play('rumble', { vol: 0.9, verb: 0.3, priority: 8 });
      if (cutscene.t >= REVEAL.fadeEnd && !levelProgress.cleared(cur.id)) {
        levelProgress.markCleared(cur.id);
        autosave();
        platform.achieve('FIRST_CLEAR');
        audio.play('doorOpen', { vol: 1, verb: 0.3, priority: 9 });
        audio.play('sparkle', { vol: 0.8, priority: 8 });
      }
      if (f.done) cutscene.active = false;
    }
    // A story scene: it places him, turns his head, and says where the camera is.
    if (showPending && !trans.active && !boot.blocking && cur.id === showPending.level) {
      const def = showPending;
      showPending = null;
      playCutscene(def);
    }
    if (storyPending && !boot.blocking) {
      storySeen.mark(storyPending.id);
      playScene(storyPending, STORY[cur.id]?.boss ? wakeBoss : null);
      storyPending = null;
    }
    if (story.scene) {
      const sc = story.scene;
      const jumpTap = keyTap('jump') || consumeAction('jump');
      // (A cutscene can be HELD and gone through a frame at a time: attack holds it or lets it go; held, left and
      // right step it back and on, one frame of thirty to the second, and go on stepping while they are kept down.)
      if (show) {
        if (keyTap('attack') || consumeAction('attack')) show.paused = !show.paused;
        if (show.paused) {
          const stickX = controlSources.reduce((a, c) => a + c.moveX, 0) + (input.isDown('ArrowRight') || input.isDown('KeyD') || input.isDown('Period') ? 1 : 0) - (input.isDown('ArrowLeft') || input.isDown('KeyA') || input.isDown('Comma') ? 1 : 0);
          const way = stickX > 0.5 ? 1 : stickX < -0.5 ? -1 : 0;
          if (way === 0) show.stepHeld = 0;
          else {
            const before = show.stepHeld;
            show.stepHeld += rawDt;
            if (before === 0 || (show.stepHeld > 0.4 && Math.floor(show.stepHeld / 0.06) !== Math.floor(before / 0.06))) {
              story.t = Math.max(0, Math.min(sc.total - 1e-3, Math.round(story.t * CUT_FPS + way) / CUT_FPS));
            }
          }
        }
      }
      for (const a of ['attack', 'dodge', 'stow'] as const) consumeAction(a);
      if (!trans.active && !story.finished && !storyFreeze && !show?.paused) {
        story.t += frameDt;
        // The jump button skips to the end.
        if (jumpTap && frameDt > 0 && story.t > 0.4) story.t = sc.total;
      }
      const f = sceneFrame(sc, story.t);
      storyFrame = f;
      if (f.beat !== story.beat) {
        for (let b = story.beat + 1; b <= f.beat; b++) {
          const snd = sc.keys[b].beat.sound;
          if (snd && story.t < sc.total) for (const one of Array.isArray(snd) ? snd : [snd]) audio.play(one as Parameters<typeof audio.play>[0], { vol: 0.75, verb: 0.35, priority: 8 });
        }
        story.beat = f.beat;
      }
      const gy = groundBelow(f.x, sc.y + 1, f.z) ?? sc.y;
      player.position.set(f.x, (Math.abs(gy - sc.y) < 0.6 ? gy : sc.y) + (f.y - sc.y), f.z);
      player.prevPosition.copy(player.position);
      player.velocity.set(0, 0, 0);
      player.facing = f.facing;
      renderPos.copy(player.position);
      planarSpeed = f.speed;
      follow.yaw = f.facing + Math.PI;
      if (!f.air) sceneStep('', f.speed, frameDt, 0.4, 0.2);
      storyPower.value = f.power;
      if (frameDt > 0) shake = Math.max(shake, f.shake);
      // The level's own characters take direction too.
      for (const n of npcs) {
        const d = f.npc[n.spec.name.toLowerCase()];
        n.act = d ? { ...d, lookAt: d.lookAt === 'hero' ? [f.x, f.z] : d.lookAt } : null;
      }
      // A line in the talk box for as long as its beat lasts.
      const line = f.say?.line ?? null;
      if (line !== storySaying) {
        if (storySaying) dialog.close();
        if (f.say && story.t < sc.total) dialog.start(f.say.name, [f.say.line], f.say.kind as Parameters<typeof dialog.start>[2]);
        storySaying = f.say && story.t < sc.total ? line : null;
      }
      // The memory stage and its cast.
      memoryStage.show(f.set, time);
      for (const [name, model] of Object.entries(memoryStage.cast)) {
        const a = f.cast[name];
        model.root.visible = !!a?.visible;
        if (!a?.visible) continue;
        if (!a.air) sceneStep(name, a.speed, frameDt, f.memory > 0.5 ? 0.22 : 0.4, f.memory > 0.5 ? 0.6 : 0.25);
        castPos.set(a.x, a.y, a.z);
        model.setTransform(castPos, a.facing);
        model.setDress({ scarf: a.scarf });
        model.update(frameDt, {
          state: a.air ? (a.vy > 0 ? 'jump' : 'fall') : a.speed > 3.6 ? 'run' : a.speed > 0.3 ? 'walk' : 'idle',
          planarSpeed: a.speed, comboStep: 0, attackTime: 0, dodgeKind: 'roll', dodgeProgress: 0, verticalSpeed: a.vy, flipProgress: 0,
          armed: false, stowProgress: -1, plungeStage: 0,
          act: { headYaw: a.headYaw, headPitch: a.headPitch, gesture: a.gesture, weight: a.gestureWeight },
        });
      }
      // The keepsake: where the scene says it is.
      if (keepsake) {
        if (f.prop === 'hand') {
          keepsake.scale.setScalar(1.25);
          rat.setHeld(keepsake);
          // He turns it over while he looks at it.
          if (f.gesture === 'inspect') keepsake.rotation.set(Math.sin(story.t * 2.2) * 0.9, story.t * 1.6, 0);
        } else if (f.prop === 'gone') clearKeepsake();
      }
      if (show) {
        const cf = sampleCutscene(show.sc, story.t);
        // (Stepped back, the models' own clocks do not run back: they are only put where the frame has them.)
        // (HELD, the scene's own time stands still but its people go on breathing: so a held frame is a settled pose.)
        show.stage.apply(cf, show.paused ? frameDt : Math.max(0, story.t - show.last));
        for (const p of Object.values(show.stage.cast)) shadowCuts.cut(p.root, chamber.colliders);
        for (const snd of show.sc.def.sounds ?? []) if (snd.t > show.sounds && snd.t <= story.t) audio.play(snd.name as Parameters<typeof audio.play>[0], { vol: 0.7, verb: 0.3, priority: 7 });
        show.sounds = Math.max(show.sounds, story.t);
        show.last = story.t;
        showCam.pos.set(...cf.cam.pos);
        showCam.look.set(...cf.cam.look);
        showReadout.style.display = show.paused ? 'block' : 'none';
        if (show.paused) showReadout.textContent = `${show.sc.def.id}   ${story.t.toFixed(2)} / ${show.sc.def.length.toFixed(2)} s   frame ${cf.frame} of ${Math.round(show.sc.def.length * CUT_FPS)}   HELD: left/right step, attack plays, jump ends`;
      }
      if (f.done && !story.finished) {
        story.finished = true;
        lastSafe.copy(player.position);
        const then = story.onDone;
        story.onDone = null;
        // Back to the game: he reaches over his shoulder and draws.
        if (sc.def.stowed && !sc.def.sheathe && !player.armed) player.stowTimer = 0;
        if (!sc.def.hold) endScene();
        then?.();
      }
    }
    storyOverlay.set(!!story.scene, storyFrame?.bars ?? 0, storyFrame?.memory ?? 0);
    // Room change: fade to black, move him, fade back in.
    let cover = 0;
    if (trans.active) {
      trans.t += frameDt;
      if (trans.t < FADE_OUT) cover = trans.t / FADE_OUT;
      else {
        if (!trans.moved) {
          trans.moved = true;
          if (trans.to) loadLevel(trans.to);
          // Coming out of a course: stand him in front of its door in the hub, facing into the hall.
          const a = trans.arrive;
          // (Unless the room's opening starts him at its start: the ending in the Club.)
          if (a && storyPending && STORY[cur.id]?.fromSpawn) trans.arrive = null;
          else if (a) {
            trans.arrive = null;
            player.position.set(a.x + Math.sin(a.yaw) * 3.2, a.y + 0.05, a.z + Math.cos(a.yaw) * 3.2);
            player.prevPosition.copy(player.position);
            player.velocity.set(0, 0, 0);
            player.facing = a.yaw;
            follow.yaw = a.yaw - Math.PI;
            follow.snap();
          }
          renderPos.copy(player.position);
        }
        cover = trans.t < FADE_OUT + FADE_HOLD ? 1 : 1 - (trans.t - FADE_OUT - FADE_HOLD) / FADE_IN;
        if (trans.t >= FADE_OUT + FADE_HOLD + FADE_IN) trans.active = false;
      }
    }
    fader.set(Math.max(cover, story.scene && storyFrame ? storyFrame.cover : 0));
    doorway.setReveal(doorSparkle, doorFade, time);
    if (doorFade >= 1 && !exitFrameSolid && !noWayOut(cur)) exitFrameSolid = addDoorFrame(cur.exit, true);
    if (wedgeVis && cur.wedges) {
      const ws = cur.wedges;
      const alive = aliveCount();
      // Shy wedges: there only while their keepers sleep on and he is outside the range they notice him from.
      shyKeepers.forEach((keepers, i) => goals.unseen.set(i, shyShows(keepers, player.position.x, player.position.z, player.gear.notice)));
      ws.forEach((w, i) => {
        const out = goals.wedgeOut(i, alive);
        // A wedge has just appeared: a chime, no pop-up. (A shy one comes and goes without a sound.)
        if (out && !wedgeWasOut[i] && w.appears?.type !== 'unseen') {
          audio.play('sparkle', { vol: 0.9, priority: 8 });
          audio.play('menuOk', { vol: 0.8, rate: 1.5, priority: 7 });
        }
        wedgeWasOut[i] = out;
        const dy = player.position.y - w.y;
        if (out && !goals.earned.has(w.id) && !player.dead && !trans.active && !story.scene && Math.hypot(w.x - player.position.x, w.z - player.position.z) < 1.1 && dy > -0.6 && dy < 1.9) {
          goals.earned.add(w.id);
          // Wedges taken while trying a level in the builder are not kept.
          if (cur.id !== 'custom') discoveries.add(`wedge:${cur.id}:${w.id}`);
          // (A wedge won: a bar of horns over a beat, with a scratch in its tail, and the sparkle over it.)
          audio.jingle('wedge', { under: 0.3 });
          audio.play('sparkle', { vol: 0.9, priority: 8 });
          rumble.wedge();
          shake = Math.max(shake, 0.12);
        }
      });
      wedgeVis.update(frameDt, time, (i) => wedgeWasOut[i], (i) => goals.earned.has(ws[i].id), camera.quaternion);
    }
    courseVis?.update(time);
    // (The Hall asks nothing of him and counts nothing: only its name.)
    const gs = noWayOut(cur) ? { label: cur.name, text: '', done: false } : cur.hub ? { label: 'Golden Wedges', text: `${wedgeTotal()}/${allWedges()}`, done: false } : goals.current(aliveCount());
    // (A room that asks nothing, a practice room, shows its own name: not the line of the room he came from.)
    if (gs) goalHud.set(gs.label, gs.text, goals.mainDone(aliveCount()) || open);
    else goalHud.set(cur.name, '', false);
    if (builder.live) builder.setPlayer(renderPos.x, renderPos.z, player.facing);
    if (builder.live) builder.info(`hearts ${player.hp}  ${gs ? `${gs.label} ${gs.text}` : ''}${open ? '  DOOR OPEN' : ''}`);

    // Where he is DRAWN standing. The rules stand him on the highest thing any part of his round footprint is over, so
    // coming up to a step he is lifted onto it while his feet are still over the tread below, and he floated there.
    // He is drawn on what is under his FEET (when that is no more than a step below where the rules have him), and
    // eased onto it, so that he walks up and down stairs instead of hopping from one height to the next.
    {
      const under = player.state === 'swim' || player.state === 'hang' || player.state === 'climb' || player.grinding || player.velocity.y > 0.01 ? null : feetGround(renderPos.x, renderPos.y, renderPos.z);
      const want = under !== null && renderPos.y - under <= TUNING.physics.stepHeight + 0.05 ? under : renderPos.y;
      // (More than a step away it is a new place: no easing. Nor in the air, nor riding or sliding: see player/standing.ts.)
      drawnY = drawnHeight(drawnY, want, !player.grounded || player.riding || player.sliding, frameDt);
      drawnPos.set(renderPos.x, drawnY, renderPos.z);
    }
    rat.setTransform(drawnPos, player.facing + (photo.open ? photo.turn : 0));
    // In photo mode he holds the chosen pose (he still breathes; nothing else moves).
    const posing = photo.open ? photo.gesture : null;
    rat.update(photo.open ? rawDt : animDt, {
      state: photo.open ? (photo.gesture ? 'idle' : player.state === 'run' || player.state === 'walk' ? 'idle' : player.state) : story.scene ? (planarSpeed > 0.3 ? 'walk' : 'idle') : cutscene.active || trans.active ? 'idle' : player.state,
      planarSpeed: story.scene ? planarSpeed : cutscene.active || trans.active ? 0 : planarSpeed,
      comboStep: player.comboStep,
      attackTime: player.attackTime,
      dodgeKind: player.currentDodgeKind,
      dodgeProgress: player.dodgeProgress,
      verticalSpeed: player.velocity.y,
      flipProgress: player.flipProgress,
      armed: player.armed,
      stowProgress: player.stowProgress,
      plungeStage: player.plungeStage,
      ledge: player.ledge,
      hangTime: player.hangTime,
      climbProgress: player.climbProgress,
      kickProgress: player.kickProgress,
      onWall: player.onWall,
      slide: player.sliding ? { back: player.slideBack, air: !player.grounded, ...player.rideGround } : null,
      glide: player.gliding,
      carry: player.carryPose,
      throwT: player.throwProgress,
      ride: player.riding ? { steer: player.rideSteer, tuck: player.rideTuck, spin: player.rideSpinProgress, grab: player.rideGrabPose, flip: player.rideFlipProgress, air: !player.grounded, ...player.rideGround, grind: player.grinding, grindSide: player.grindSide } : null,
      act: posing ? { headYaw: 0, headPitch: 0, gesture: posing, weight: 1 } : story.scene && storyFrame ? { headYaw: storyFrame.headYaw, headPitch: storyFrame.headPitch, gesture: storyFrame.gesture, weight: storyFrame.gestureWeight } : resting >= 0 ? { headYaw: 0, headPitch: -0.15, gesture: 'sit', weight: Math.min(1, resting * 3) } : undefined,
    });
    // Blink while he is safe after a hit, and flash red at the moment of the hit.
    rat.root.visible = photo.open ? !photo.hideRat : !(player.recentlyHit && Math.floor(time * 18) % 2 === 0 && player.state !== 'hurt');
    // (A cutscene has its own cast: the knight himself waits out of the picture.)
    if (show) rat.root.visible = false;
    flash = Math.max(0, flash - frameDt * 5);
    rat.setFlash(flash * 0.7, flash * 0.05, flash * 0.05);

    const ground = groundBelow(renderPos.x, renderPos.y, renderPos.z);
    shadow.visible = ground !== null && !(photo.open && photo.hideRat) && !show;
    if (ground !== null) {
      const drop = Math.max(0, renderPos.y - ground);
      shadow.position.set(renderPos.x, ground + 0.02, renderPos.z);
      const size = SHADOW_R * Math.max(0.35, 1 - drop * 0.14);
      shadowSpokes(chamber.colliders, renderPos.x, ground, renderPos.z, size, SHADOW_SPOKES, shadowLen);
      const sp = shadowGeo.attributes.position;
      for (let i = 0; i < SHADOW_SPOKES; i++) {
        const a = (i / SHADOW_SPOKES) * Math.PI * 2;
        sp.setXYZ(1 + i, Math.cos(a) * size * shadowLen[i], 0, Math.sin(a) * size * shadowLen[i]);
      }
      sp.needsUpdate = true;
    }

    // Sword ribbon during the fast part of a swing.
    rat.getBlade(bladeBase, bladeTip);
    const clip = ATTACK_CLIPS[player.comboStep];
    const swinging = (player.state === 'attack' || player.riding) && player.attackTime > clip.activeStart - 0.05 && player.attackTime < clip.activeEnd + 0.05;
    trail.update(animDt, swinging && animDt > 0, bladeBase, bladeTip);

    enemies.forEach((e, i) => {
      enemyPos.set(e.x, e.y, e.z);
      // (On a slope its body lies along the slope, and its shadow with it.)
      const tip = foeTilt.get(e) ?? { x: 0, z: 0, on: false };
      const [gx, gz] = e.floorUnder && e.alive && WALKERS.has(e.kind) ? slopeUnder(chamber.colliders, e.x, e.y, e.z) : [0, 0];
      const ease = Math.min(1, animDt * 10);
      tip.x += (gx - tip.x) * ease;
      tip.z += (gz - tip.z) * ease;
      const root = enemyModels[i].root;
      if (tip.on || turnedInHand.has(e)) root.rotation.set(0, 0, 0);
      enemyModels[i].setTransform(enemyPos, e.facing);
      tip.on = Math.abs(tip.x) + Math.abs(tip.z) > 0.004;
      if (tip.on) root.quaternion.premultiply(tiltQ.setFromUnitVectors(UP_AXIS, tiltN.set(-tip.x, 1, -tip.z).normalize()));
      foeTilt.set(e, tip);
      enemyModels[i].tick(animDt, e);
      // In his hands it is on its back, legs going; thrown, it goes end over end (world/lifting.ts, heldTurn). (After
      // its tick: some creatures, the fliers among them, place their own models there, and would undo it.)
      turnedInHand.delete(e);
      if (inHand(e) && e.alive) {
        const flying = thrownFoes.find((t) => t.what === e);
        const turn = heldTurn(flying ? flying.age : null, worldClock, e.kind);
        const mid = e.radius * 0.8;
        handQ.setFromAxisAngle(handAxis.set(Math.sin(e.facing), 0, Math.cos(e.facing)), turn.roll);
        handQ.multiply(tiltQ.setFromAxisAngle(handAxis.set(Math.cos(e.facing), 0, -Math.sin(e.facing)), turn.pitch));
        handMid.set(e.x, e.y + mid, e.z);
        root.position.sub(handMid).applyQuaternion(handQ).add(handMid);
        root.quaternion.premultiply(handQ);
        turnedInHand.add(e);
      }
      // (Its shadow is cut where its ground ends, as the knight's is: render/cutShadow.ts.)
      shadowCuts.cut(root, chamber.colliders);
    });
    for (const dz of dozers) {
      dz.update(animDt);
      shadowCuts.cut(dz.root, chamber.colliders);
    }
    for (const n of npcs) {
      n.update(rawDt, player.position.x, player.position.y, player.position.z, dialog.open && talkingTo === n);
      shadowCuts.cut(n.root, chamber.colliders);
    }
    // (The same small hint says what STOW would do beside a crate, and what his hands can do with one over his head.)
    const talkable = npcs.some((n) => n.near) || (nearFire && resting < 0);
    const hintWord = talkable ? (nearFire && !npcs.some((n) => n.near) ? 'rest by the fire' : 'talk') : held || heldFoe ? 'carry' : liftable || liftableFoe ? 'lift' : 'talk';
    if (promptStamp() + hintWord !== talkShown) {
      talkShown = promptStamp() + hintWord;
      talkHint.innerHTML = hintWord === 'carry' ? `${prompt('attack')}<span>throw</span>${prompt('stow')}<span>set down</span>` : hintWord === 'lift' ? `${prompt('stow')}<span>to lift</span>` : `${prompt('jump')}<span>to ${hintWord}</span>`;
    }
    talkHint.classList.toggle('on', !dialog.open && !menu.open && !builder.open && !cutscene.active && !trans.active && !story.scene && (talkable || !!held || !!heldFoe || !!liftable || !!liftableFoe) && (player.grounded || !!held || !!heldFoe));
    // (And it is drawn where he is drawn, between the game's own steps.)
    if (held && player.carrying) {
      const at = heldPlace(renderPos, (held.aabb.max.y - held.aabb.min.y) / 2);
      const m = held.mesh as unknown as THREE.Object3D | null;
      if (m) m.position.set(at.x, at.y, at.z);
    }

    collectVisuals.update(frameDt, time, camera.quaternion);
    // Grinding throws sparks from under the shield, a few at a time, as long as it lasts.
    grindSparkIn -= frameDt;
    if (player.grinding && frameDt > 0 && grindSparkIn <= 0) {
      grindSparkIn = 0.045;
      grindSparks.burst(drawnPos.x, drawnPos.y + 0.06, drawnPos.z, time * 7 % 1 < 0.5 ? 0xffd070 : 0xffa040, 2, 1.7, 0.11);
    }
    grindSparks.update(frameDt, camera.quaternion);
    if (ringAge < 0.35) {
      ringAge += frameDt;
      const k = Math.min(1, ringAge / 0.35);
      ring.visible = k < 1;
      ring.scale.setScalar(0.4 + (ringSize - 0.4) * (1 - (1 - k) * (1 - k)));
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
    } else ring.visible = false;
    hud.setHealth(player.hp);
    // A boss awake and alive: its name and health along the bottom, for as long as the fight lasts.
    let fought: { name: string; frac: number } | null = null;
    if (!story.scene && !cutscene.active && !trans.active && !menu.open) {
      for (const e of enemies) {
        if ((e instanceof Brood || e instanceof Wyrm || e instanceof Widow) && e.alive && e.awake) fought = { name: e.bossName, frac: e.hp / e.maxHp };
        // (Two Widows share one bar: what is left of both of them.)
        if (e instanceof Widow && e.awake) {
          const pack = enemies.filter((o): o is Widow => o instanceof Widow);
          if (pack.length > 1 && pack.some((o) => o.alive)) fought = { name: 'The Widows', frac: pack.reduce((a, o) => a + o.hp, 0) / pack.reduce((a, o) => a + o.maxHp, 0) };
        }
        else if (e instanceof Grimsqueak && e.alive && !e.asleep) fought = { name: 'Lord Grimsqueak', frac: e.hp / GRIM.hp };
      }
    }
    bossBar.update(frameDt, fought);
    // The Workshop's test view and its reminder of what is switched on.
    hitShapes.update(DEV.shapes && !boot.blocking, enemies as never, {
      x: player.position.x, y: player.position.y, z: player.position.z, facing: player.facing, radius: TUNING.rat.radius,
      swing: player.attackActive ? { reach: player.attackClip.reach, arc: player.attackClip.arc } : null,
      guarding: player.state === 'guard', blockArc: TUNING.health.blockArc * player.gear.blockArc,
    });
    const tag = boot.blocking ? '' : devSummary();
    if (devTag.textContent !== (tag ? `TEST  ${tag}` : '')) {
      devTag.textContent = tag ? `TEST  ${tag}` : '';
      devTag.style.display = tag ? '' : 'none';
    }

    // Stick right swings the camera round to the right and stick up looks up, so both are flipped from the arrow keys.
    const lookX = -controlSources.reduce((a, s) => a + s.lookX, 0);
    const lookY = -controlSources.reduce((a, s) => a + s.lookY, 0);
    const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));
    const turn = clamp1((input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('ArrowLeft') ? 1 : 0) + lookX);
    const pitchInput = clamp1((input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('ArrowDown') ? 1 : 0) + lookY);
    if (lockTarget) {
      // Locked on: the camera swings round behind the rat to keep the foe in view; the right stick switches foes instead of turning.
      follow.yaw += Math.atan2(Math.sin(cameraYawToward(renderPos, lockTarget) - follow.yaw), Math.cos(cameraYawToward(renderPos, lockTarget) - follow.yaw)) * (1 - Math.exp(-6 * frameDt));
      lockCool = Math.max(0, lockCool - rawDt);
      const flick = -lookX + (input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('ArrowLeft') ? 1 : 0);
      if (lockCool <= 0 && Math.abs(flick) > 0.75) {
        lockTarget = switchTarget(player.position, follow.yaw, lockTarget, enemies, flick > 0 ? 1 : -1);
        lockCool = 0.35;
      }
    }
    if (recentre > 0) {
      recentre = turn !== 0 || lockTarget ? 0 : recentre - frameDt;
      follow.yaw += Math.atan2(Math.sin(recentreTo - follow.yaw), Math.cos(recentreTo - follow.yaw)) * (1 - Math.exp(-16 * frameDt));
    }
    // On the title screen the view drifts slowly round him (the game itself is holding still).
    const drifting = boot.blocking && (boot.where === 'title' || boot.where === 'files');
    if (drifting) follow.yaw += rawDt * 0.06;
    follow.update(drifting ? rawDt : frameDt, renderPos, player.facing, !lockTarget && moving && player.state !== 'attack', lockTarget ? 0 : turn, pitchInput, chamber.colliders, player.velocity, player.riding && player.grounded ? Math.hypot(player.velocity.x, player.velocity.z) : 0);
    lockMarker.visible = !!lockTarget && !builder.open;
    if (lockTarget) {
      lockMarker.position.set(lockTarget.x, lockTarget.y + lockTarget.radius * 2 + 0.75 + 0.07 * Math.sin(time * 6), lockTarget.z);
      lockMarker.rotation.y = time * 2.5;
    }
    if (dlgCam > 0.002 && talkingTo) {
      const vs = talkingTo.spec;
      const dx = renderPos.x - vs.x;
      const dz = renderPos.z - vs.z;
      const dl = Math.hypot(dx, dz) || 1;
      // Beside the rat, a little behind his shoulder, so the villain fills the frame.
      dlgPos.set(vs.x + (dx / dl) * 5.2 - (dz / dl) * 1.3, (vs.y ?? 0) + 2.6, vs.z + (dz / dl) * 5.2 + (dx / dl) * 1.3);
      dlgLook.set(vs.x, (vs.y ?? 0) + 1.7, vs.z);
      camera.position.lerp(dlgPos, dlgCam);
      lookTmp.set(renderPos.x, renderPos.y + TUNING.camera.targetHeight, renderPos.z).lerp(dlgLook, dlgCam);
      camera.lookAt(lookTmp);
    }
    if (camBlend > 0) {
      camera.position.lerp(doorCamPos, camBlend);
      lookTmp.set(renderPos.x, renderPos.y + TUNING.camera.targetHeight, renderPos.z).lerp(doorCamLook, camBlend);
      camera.lookAt(lookTmp);
    }
    if (story.scene && storyFrame && storyFrame.camBlend > 0) {
      storyCamPos.set(...storyFrame.camPos);
      storyCamLook.set(...storyFrame.camLook);
      camera.position.lerp(storyCamPos, storyFrame.camBlend);
      lookTmp.set(renderPos.x, renderPos.y + TUNING.camera.targetHeight, renderPos.z).lerp(storyCamLook, storyFrame.camBlend);
      camera.lookAt(lookTmp);
    }
    if (shake > 0.002) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake *= Math.exp(-14 * frameDt);
    }

    chamber.update(time);
    bossDraw(time);
    // A firefly's fire, drawn as it is now; it and the fireflies' lanterns light the room round them.
    fxLights.length = 0;
    emberFx.update(time, embers, flames.list, fxLights);
    for (const e of enemies) {
      const L = e instanceof Firefly ? lanterns.get(e) : undefined;
      if (!L || !(e instanceof Firefly) || !e.alive || e.light < 0.1) continue;
      L.x = e.vent.x;
      L.y = e.vent.y;
      L.z = e.vent.z;
      L.power = 0.55 * Math.min(1.8, e.light);
      fxLights.push(L);
    }
    for (const e of enemies) {
      const L = e instanceof Scorpion ? stingLamps.get(e) : undefined;
      if (!L || !(e instanceof Scorpion) || e.light < 0.08) continue;
      const tip = e.tip;
      L.x = tip.x;
      L.y = tip.y + 0.15;
      L.z = tip.z;
      L.power = 0.5 * Math.min(1.6, e.light);
      fxLights.push(L);
    }
    chamber.updateLights(time, fly.open ? camera.position : renderPos, fxLights);
    debris.update(frameDt);
    // Each board knocks as it lands (one knock a frame at most; more boards at once make it a little louder).
    const knocks = debris.takeKnocks();
    if (knocks) audio.play('plank', { vol: Math.min(0.5, 0.2 + 0.07 * knocks), rate: roll(0.78, 1.4), priority: 3 });
    motes.update(frameDt, time, renderPos);
    pickups.update(frameDt, time);
    drops.update(frameDt, time);
    if (show && story.scene) {
      camera.position.copy(showCam.pos);
      camera.lookAt(showCam.look);
    }
    fly.applyCamera();
    photo.applyCamera();
    if (devEye) {
      camera.position.set(devEye[0], devEye[1], devEye[2]);
      camera.lookAt(devEye[3], devEye[4], devEye[5]);
    }
    if (devChase) {
      camera.position.set(renderPos.x + devChase[0], renderPos.y + devChase[1], renderPos.z + devChase[2]);
      camera.lookAt(renderPos.x, renderPos.y + 0.7, renderPos.z);
    }
    if (devOrbit) {
      if (orbitFrom < 0) orbitFrom = time;
      const a = devOrbit.length > 6 ? devOrbit[6] + (time - orbitFrom) * devOrbit[5] : time * devOrbit[5];
      camera.position.set(devOrbit[0] + Math.sin(a) * devOrbit[3], devOrbit[1] + devOrbit[4], devOrbit[2] + Math.cos(a) * devOrbit[3]);
      camera.lookAt(devOrbit[0], devOrbit[1], devOrbit[2]);
    }
    sky.follow(camera.position);
    if (!filmEvery || (film.count + 1) % filmEvery === 0) renderer.render(scene, camera);
    // A picture is read from the canvas straight after it is drawn (before the browser clears it).
    if (photo.wantShot) photo.capture();

    fpsAccum += frameDt;
    fpsFrames++;
    if (fpsAccum >= 0.5) {
      fps = Math.round(fpsFrames / fpsAccum);
      fpsAccum = 0;
      fpsFrames = 0;
    }
    if (showDebug || DEV.readout) debugEl.textContent = `${fps} fps  ${player.state}  foes:${aliveCount()}  x:${player.position.x.toFixed(1)} t:${trans.active ? trans.t.toFixed(2) : '-'}  snd:${audio.ready ? 'on' : 'off'} ${audio.stats.played}/${audio.stats.notes}  last: ${audio.recent.join(' ')}`;

    if (filmEvery && ++film.count % filmEvery === 0) {
      film.hold = true;
      filmWindow.__filmReady = true;
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (location.hash.startsWith('#view')) runViewer(canvas);
else startGame();
