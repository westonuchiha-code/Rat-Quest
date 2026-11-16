/**
 * THE MARIONETTES: the models a cutscene plays with, and the strings to each.
 *
 * `sampleCutscene` (cutscene.ts) says where each character is at a moment, which way he faces, how his head is held,
 * what he is doing. This turns that into a posed model, for EVERY kind of character the same way:
 *   - the knight (his own model: he walks, sits, and takes the story's gestures by name);
 *   - the talking characters (the mouse, the birds, the pigeon, Grimsqueak, and the Club's turtles, foxes, ferrets
 *     and owls, the off-duty ant and the beaten stag): each takes its own `doing` (stand, drink, chat, lean, cards,
 *     tend), sits, turns its head, nods and "talks";
 *   - the creatures that walk (roach, toad, ironback, guard, mantis, stag, ant, scorpion): each stands or walks in
 *     its own way.
 * What a model has no pose of its own for, it gets as a marionette gets it: its whole body tipped, bobbed or hopped
 * (a patron has no walk of his own, so he goes with a marionette's bob; an ant has no nod, so its body dips).
 *
 * NOT TAUGHT YET (said plainly): the fliers (bat, hornet, firefly) and the three great beasts (broodmother, wyrm,
 * Widow). `makePuppet` says so if one is asked for.
 *
 * A scene has its OWN cast: fresh models, made for it and thrown away after. The room's own characters of the same
 * names step out while it plays (main.ts), so nobody is in two places.
 */
import * as THREE from 'three';
import { Npc, type NpcKind, type NpcSpec } from '../npc/npc';
import { RatModel } from '../player/ratModel';
import { ScuttlerModel } from '../enemies/scuttlerModel';
import { ToadModel } from '../enemies/toadModel';
import { IronbackModel } from '../enemies/ironbackModel';
import { GuardModel } from '../enemies/guardModel';
import { MantisModel } from '../enemies/mantisModel';
import { StagModel } from '../enemies/stagModel';
import { AntModel } from '../enemies/antModel';
import { ScorpionModel } from '../enemies/scorpionModel';
import { buildMug } from '../world/tavernModels';
import { createPs1Material } from '../render/ps1Material';
import type { Gesture } from '../story/scene';
import type { ActorFrame, CastSpec, CutFrame, Cutscene } from './cutscene';

export interface Puppet {
  readonly root: THREE.Object3D;
  /** Put as the frame says. `dt`: how much time has gone by since the last (nothing, when a scene is stepped or held). */
  pose(f: ActorFrame, dt: number): void;
}

/** What a talking character can be `doing` (anything else: he stands). */
const DOINGS = new Set(['stand', 'drink', 'chat', 'lean', 'cards', 'tend']);
/** What the knight can be `doing`: the story's gestures. */
const GESTURES = new Set<string>(['touchScarf', 'reachPaw', 'hesitate', 'pickUp', 'inspect', 'stowItem', 'adjust', 'cheer', 'carry', 'sit', 'sitReach', 'sitLean']);
/** The creatures that can be cast, as a scene names them. */
export const PUPPET_FOES = ['scuttler', 'toad', 'ironback', 'guard', 'mantis', 'stag', 'ant', 'scorpion'] as const;
/** The talking characters' kinds. */
export const PUPPET_NPCS = ['mouse', 'bird', 'pigeon', 'villain', 'turtle', 'fox', 'ferret', 'owl', 'rat', 'ant', 'stag'] as const;

/**
 * The marionette's part of a pose, for any model: its root tipped (forward, and to its left), lifted by a hop, and,
 * if it has no walk of its own, bobbed and rocked as it goes. Called AFTER the model has put itself where it is.
 */
function strings(root: THREE.Object3D, f: ActorFrame, clock: number, opts: { ownWalk: boolean; ownNod: boolean }): void {
  root.rotation.order = 'YXZ';
  let fwd = f.leanFwd;
  let side = -f.leanSide;
  let lift = f.hopY;
  if (!opts.ownNod) fwd += f.headPitch * 0.45;
  if (!opts.ownWalk && f.speed > 0.15) {
    const go = Math.min(1, f.speed / 1.5);
    lift += 0.035 * go * Math.abs(Math.sin(clock * 9));
    side += 0.06 * go * Math.sin(clock * 9);
  }
  root.rotation.x = fwd;
  root.rotation.z = side;
  root.position.y += lift;
}

const at = new THREE.Vector3();

export function makePuppet(who: CastSpec): Puppet {
  let clock = 0;
  if (who.is === 'knight') {
    const m = new RatModel();
    let gesture: Gesture | null = null;
    let weight = 0;
    return {
      root: m.root,
      pose(f, dt) {
        clock += dt;
        const want = (f.seated && !GESTURES.has(f.doing) ? 'sit' : GESTURES.has(f.doing) ? f.doing : null) as Gesture | null;
        if (want !== gesture) {
          // (Out of one and into the next: the old one is let go before the new one is taken up.)
          weight = Math.max(0, weight - dt * 5);
          if (weight <= 0 || !gesture) gesture = want;
        } else weight = Math.min(1, weight + dt * 4);
        if (dt === 0 && want) {
          gesture = want;
          weight = 1;
        }
        m.setTransform(at.set(f.x, f.y, f.z), f.facing);
        m.update(dt, {
          state: f.hopY > 0.02 ? 'jump' : f.speed > 3.6 ? 'run' : f.speed > 0.3 ? 'walk' : 'idle',
          planarSpeed: f.speed, comboStep: 0, attackTime: 0, dodgeKind: 'roll', dodgeProgress: 0, verticalSpeed: 0, flipProgress: 0,
          armed: false, stowProgress: -1, plungeStage: 0,
          act: { headYaw: f.headYaw, headPitch: f.headPitch, gesture, weight: gesture ? weight : 0 },
        } as never);
        strings(m.root, f, clock, { ownWalk: true, ownNod: true });
      },
    };
  }
  if (who.is === 'npc') {
    if (!(PUPPET_NPCS as readonly string[]).includes(who.kind)) throw new Error(`a cutscene cannot cast a "${who.kind}": it is not a talking character's kind`);
    const npc = new Npc({ name: who.name, kind: who.kind as NpcKind, x: 0, y: 0, z: 0, facing: 0, lines: ['.'], doing: 'stand' } as NpcSpec);
    let syllable = 0;
    return {
      root: npc.root,
      pose(f, dt) {
        clock += dt;
        npc.spec.doing = (DOINGS.has(f.doing) ? f.doing : 'stand') as NpcSpec['doing'];
        npc.spec.seated = f.seated;
        npc.spec.facing = f.facing;
        npc.moveTo(f.x, f.y, f.z);
        npc.puppet = { facing: f.facing, headYaw: f.headYaw, nod: f.headPitch, talking: f.talking };
        // (Talking: his mouth goes as it does when the knight talks to him, a syllable every so often.)
        if (f.talking) {
          syllable -= dt;
          if (syllable <= 0) {
            npc.pulse();
            syllable = 0.14 + 0.1 * Math.abs(Math.sin(clock * 3.7));
          }
        }
        npc.update(dt, 1e6, 1e6, 1e6, false);
        strings(npc.root, f, clock, { ownWalk: false, ownNod: npc.nods });
      },
    };
  }
  // A creature: it stands, or walks, in its own way.
  const walk = (f: ActorFrame): number => (f.speed > 0.2 ? f.speed : 0);
  const made = ((): { root: THREE.Object3D; set(p: THREE.Vector3, facing: number): void; tick(dt: number, f: ActorFrame): void } => {
    switch (who.type) {
      case 'scuttler': {
        const m = new ScuttlerModel();
        return { root: m.root, set: (p, a) => m.setTransform(p, a), tick: (dt, f) => m.update(dt, { state: walk(f) ? 'chase' : 'idle', stateTime: clock, moving: walk(f) > 0 } as never) };
      }
      case 'toad': {
        const m = new ToadModel();
        return { root: m.root, set: (p, a) => m.setTransform(p, a), tick: (dt, f) => m.update(dt, { state: 'idle', stateTime: clock, moving: walk(f) > 0, hopY: f.hopY } as never) };
      }
      case 'ironback': {
        const m = new IronbackModel();
        return { root: m.root, set: (p, a) => m.setTransform(p, a), tick: (dt, f) => m.update(dt, { state: walk(f) ? 'chase' : 'idle', stateTime: clock, moving: walk(f) > 0 } as never) };
      }
      case 'guard': {
        const m = new GuardModel();
        return { root: m.root, set: (p, a) => m.setTransform(p, a), tick: (dt, f) => m.update(dt, { state: walk(f) ? 'chase' : 'idle', stateTime: clock, walking: walk(f), counter: false } as never) };
      }
      case 'mantis': {
        const m = new MantisModel();
        return { root: m.root, set: (p, a) => m.setTransform(p, a), tick: (dt, f) => m.update(dt, { state: walk(f) ? 'stalk' : 'idle', stateTime: clock, walking: walk(f), arm: 1, held: false, windupTime: 1, air: 0 } as never) };
      }
      case 'stag': {
        const m = new StagModel();
        return { root: m.root, set: (p, a) => m.setTransform(p, a), tick: (dt, f) => m.update(dt, { state: walk(f) ? 'chase' : 'idle', stateTime: clock, walking: walk(f) } as never) };
      }
      case 'ant': {
        const m = new AntModel();
        return { root: m.root, set: (p, a) => m.setTransform(p, a), tick: (dt, f) => m.update(dt, { state: walk(f) ? 'advance' : 'idle', stateTime: clock, walking: walk(f), tip: { x: 0, y: 0, z: 0 }, level: false, windupTime: 1 } as never) };
      }
      case 'scorpion': {
        const m = new ScorpionModel(who.color);
        return { root: m.root, set: (p, a) => m.setTransform(p, a), tick: (dt, f) => m.update(dt, { state: walk(f) ? 'stalk' : 'idle', stateTime: clock, tail: { ahead: 0.5, up: 1.5 }, light: 1, claw: 0, moving: walk(f), mark: null } as never) };
      }
      default:
        throw new Error(`a cutscene cannot cast a "${who.type}" yet: the fliers and the great beasts have not been taught (see cutscene/stage.ts)`);
    }
  })();
  return {
    root: made.root,
    pose(f, dt) {
      clock += dt;
      made.set(at.set(f.x, f.y, f.z), f.facing);
      made.tick(dt, f);
      strings(made.root, f, clock, { ownWalk: true, ownNod: false });
    },
  };
}

/** Everything a scene puts in the room: its cast and its things. */
export class CutStage {
  readonly group = new THREE.Group();
  readonly cast: Record<string, Puppet> = {};
  readonly props: Record<string, THREE.Object3D> = {};

  constructor(readonly scene: Cutscene) {
    for (const [name, c] of Object.entries(scene.def.cast)) {
      const p = makePuppet(c.who);
      p.root.name = `cast:${name}`;
      this.cast[name] = p;
      this.group.add(p.root);
    }
    const mat = createPs1Material({ lit: true });
    for (const [name, p] of Object.entries(scene.def.props ?? {})) {
      // (A thing is turned and tipped about its own foot: an outer part for where it is and which way round, an
      // inner for how far it is tipped.)
      const outer = new THREE.Group();
      const inner = new THREE.Group();
      if (p.kind === 'mug') inner.add(buildMug({ wood: mat, plain: mat, glow: mat }));
      inner.scale.setScalar(p.size ?? 1);
      outer.add(inner);
      outer.name = `prop:${name}`;
      this.props[name] = outer;
      this.group.add(outer);
    }
  }

  /** Puts everyone and everything as the frame says. */
  apply(f: CutFrame, dt: number): void {
    for (const [name, p] of Object.entries(this.cast)) {
      const a = f.cast[name];
      p.root.visible = !!a?.visible;
      if (a) p.pose(a, dt);
    }
    for (const [name, o] of Object.entries(this.props)) {
      const a = f.props[name];
      o.visible = !!a?.visible;
      if (!a) continue;
      o.position.set(a.x, a.y, a.z);
      o.rotation.y = a.yaw;
      o.children[0].rotation.x = a.tip;
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry?.dispose();
    });
    this.group.removeFromParent();
  }
}
