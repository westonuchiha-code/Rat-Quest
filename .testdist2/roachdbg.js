import * as THREE from "three";
// src/world/collision.ts
/** How far along a ramp a point is, from its low end (0) to its high end (1); points beyond either end count as that end. */
function along(b, r, x, z) {
	const lo = r.axis === "x" ? b.min.x : b.min.z;
	const hi = r.axis === "x" ? b.max.x : b.max.z;
	const t = Math.min(1, Math.max(0, ((r.axis === "x" ? x : z) - lo) / (hi - lo)));
	return r.up > 0 ? t : 1 - t;
}
/** ...and how far ACROSS it, from its low side (0) to its high side (1), for one that is tilted across too. */
function across(b, r, x, z) {
	const lo = r.axis === "x" ? b.min.z : b.min.x;
	const hi = r.axis === "x" ? b.max.z : b.max.x;
	const t = Math.min(1, Math.max(0, ((r.axis === "x" ? z : x) - lo) / (hi - lo)));
	return (r.cross ?? 0) > 0 ? t : 1 - t;
}
/**
* The height of a solid's top at a place: a box's top is the same everywhere; a ramp's is its slope there. A place
* beside the solid (not over it) is given the height of its nearest edge.
*/
function topAt(b, x, z) {
	const r = b.ramp;
	if (!r) return b.max.y;
	const c = Math.abs(r.cross ?? 0);
	return r.low + (b.max.y - c - r.low) * along(b, r, x, z) + (c > 0 ? c * across(b, r, x, z) : 0);
}
/** How a ramp's top climbs: its rise for one unit toward +x, and for one unit toward +z. (A box: nothing.) */
function slopeXZ(b) {
	const r = b.ramp;
	if (!r) return [0, 0];
	const c = r.cross ?? 0;
	const lenX = b.max.x - b.min.x;
	const lenZ = b.max.z - b.min.z;
	const main = (b.max.y - Math.abs(c) - r.low) / (r.axis === "x" ? lenX : lenZ) * r.up;
	const tilt = c / (r.axis === "x" ? lenZ : lenX);
	return r.axis === "x" ? [main, tilt] : [tilt, main];
}
/** A ramp's steepness: how much it rises for each unit straight up it, whichever way that is (0 for a box). */
function slopeOf(b) {
	const [sx, sz] = slopeXZ(b);
	return Math.hypot(sx, sz);
}
/** The collider for a level's box (a ramp's slope goes with it). */
function aabbOf(b) {
	const a = makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0);
	if (b.ramp) a.ramp = b.ramp;
	if (b.slick) a.slick = true;
	return a;
}
/** Builds an AABB from a center point and full size. */
function makeAabb(cx, cy, cz, w, h, d) {
	return {
		min: new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
		max: new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2)
	};
}
var POOL_Y$1 = -.85;
/** Ring of rising platforms. Each one is one step higher than the last, so every jump is reachable. */
var RING = {
	count: 12,
	radius: 12.2,
	size: 3,
	step: .6
};
function extent(kind, x0, x1, y0, y1, z0, z1) {
	return {
		kind,
		x0,
		x1,
		y0,
		y1,
		z0,
		z1
	};
}
/**
* A ramp given by its ground plan, the height of its low end and of its high end, and the way it climbs
* ('n' is -z, 's' +z, 'e' +x, 'w' -x). It is solid down to `bottom` (default: its low end's height).
*/
function rampBox(kind, x0, x1, z0, z1, low, high, toward, bottom = low, cross = 0) {
	const ramp = {
		axis: toward === "e" || toward === "w" ? "x" : "z",
		up: toward === "e" || toward === "s" ? 1 : -1,
		low,
		...cross ? { cross } : {}
	};
	return {
		kind,
		x0,
		x1,
		y0: Math.min(bottom, low),
		y1: high + Math.abs(cross),
		z0,
		z1,
		ramp
	};
}
/**
* A fire bowl on its stand, as drawn (brazierModel.ts) and as solid (custom.ts): its foot's half-width, its bowl's, how
* high the bowl begins and how high its rim is, and where the coals lie in it.
*/
var BRAZIER = {
	foot: .46,
	bowl: .66,
	bowlFrom: .8,
	rim: 1.16,
	coals: 1.02
};
/** A table, as drawn (tavernModels.ts) and as solid: round, `r` across its middle, `h` high. Its collider is a square
* a little inside the circle (`solid` to a side), so he does not catch on corners that are not drawn. */
var TABLE = {
	r: .85,
	h: .74,
	solid: .66
};
/** A stool, the same way. */
var STOOL = {
	r: .24,
	h: .44,
	solid: .2
};
/** The solids of a table at (x, y, z) and of a stool. */
function tableSolids(x, y, z) {
	return [{
		...extent("plank", x - TABLE.solid, x + TABLE.solid, y, y + TABLE.h, z - TABLE.solid, z + TABLE.solid),
		hidden: true
	}];
}
function stoolSolids(x, y, z) {
	return [{
		...extent("plank", x - STOOL.solid, x + STOOL.solid, y, y + STOOL.h, z - STOOL.solid, z + STOOL.solid),
		hidden: true
	}];
}
/**
* A glowing mushroom (decor `mushroom`). One as tall as he is or taller is SOLID: its stem stops him, and its cap is a
* thing to stand on (a level adds `mushroomSolids` for each). Smaller ones he brushes through, like weeds.
* Its cap is shaped by its own width, not by how tall the mushroom is: `deep` is how far under its crown the solid cap
* begins and `top` how far under it the solid cap ends, as shares of the cap's radius; `capSolid` is how much of the
* drawn cap's radius is solid (a square in a round cap); `stemSolid` how much of the drawn stem's.
*/
var MUSHROOM = {
	solid: 1,
	deep: .32,
	top: .032,
	capSolid: .7,
	stemSolid: .92
};
/**
* How wide its cap is: its radius. Given (`cap`), or by its height and where it stands (so that no two in a stand are
* quite alike).
*/
function mushroomCap(x, z, size, cap) {
	return cap ?? size * (.42 + .1 * Math.sin(x * 3.1 + z * 1.7));
}
/** How thick its stem is at the ground: its radius there. Given (`stem`), or by its height. */
function mushroomStem(size, stem) {
	return stem ?? size * .12;
}
/** Where he stands on it: the top of its solid cap. */
function mushroomTop(x, y, z, size, cap) {
	return y + size - mushroomCap(x, z, size, cap) * MUSHROOM.top;
}
/** An ice spike (decor `iceSpike`): what of it is solid. Its tall middle spike, as a post: half its width is `ICE_SPIKE.solid` of its height. */
var ICE_SPIKE = {
	solid: .13,
	tall: .86
};
function iceSpikeSolids(x, y, z, size) {
	const s = size * ICE_SPIKE.solid;
	return [{
		...extent("stone", x - s, x + s, y, y + size * ICE_SPIKE.tall, z - s, z + s),
		hidden: true
	}];
}
function mushroomSolids(x, y, z, size, cap, stem) {
	if (size < MUSHROOM.solid) return [];
	const s = mushroomStem(size, stem) * MUSHROOM.stemSolid;
	const full = mushroomCap(x, z, size, cap);
	const r = full * MUSHROOM.capSolid;
	const under = y + size - full * MUSHROOM.deep;
	return [{
		...extent("stone", x - s, x + s, y, under, z - s, z + s),
		hidden: true
	}, {
		...extent("stone", x - r, x + r, under, y + size - full * MUSHROOM.top, z - r, z + r),
		hidden: true
	}];
}
/**
* A couch, as drawn (couchModel.ts) and as solid (custom.ts). It faces +z with its middle on x = 0: `half` its
* half-width; the back runs from `back` to `seatBack` and stands `backTop` high; the seat, `seat` high, runs from
* `seatBack` to `front` between the arms; an arm runs from `armIn` to `armOut` either side and is `armTop` high;
* the pillow lies on the seat.
*/
var COUCH = {
	half: 1.3,
	back: -.575,
	seatBack: -.225,
	front: .55,
	seat: .72,
	backTop: 1.45,
	armIn: .975,
	armOut: 1.325,
	armTop: 1,
	pillow: {
		x0: .15,
		x1: .85,
		z0: -.1,
		z1: .3,
		top: .84
	}
};
/** Clear air over the highest thing he can stand on: a double jump from it and his own height. */
var CEILING_CLEAR = 5.9;
function ceilingOf(solids) {
	const walls = solids.filter((b) => b.kind === "wall" && !b.hidden);
	if (!walls.length) return null;
	const x0 = Math.min(...walls.map((b) => b.x0));
	const x1 = Math.max(...walls.map((b) => b.x1));
	const z0 = Math.min(...walls.map((b) => b.z0));
	const z1 = Math.max(...walls.map((b) => b.z1));
	const outer = walls.filter((b) => b.x0 === x0 || b.x1 === x1 || b.z0 === z0 || b.z1 === z1);
	const outerTop = Math.max(...outer.map((b) => b.y1));
	let inside = -Infinity;
	for (const b of solids) if (!outer.includes(b)) inside = Math.max(inside, b.y1);
	const count = /* @__PURE__ */ new Map();
	for (const b of outer) count.set(b.skin, (count.get(b.skin) ?? 0) + (b.x1 - b.x0) * (b.z1 - b.z0));
	const skin = [...count.entries()].sort((a, c) => c[1] - a[1])[0][0];
	return {
		x0,
		x1,
		z0,
		z1,
		y: Math.max(outerTop, inside + CEILING_CLEAR),
		wallTop: Math.min(...outer.map((b) => b.y1)),
		skin
	};
}
function buildLayout() {
	const R = 20;
	const P = 7;
	const solids = [];
	solids.push(extent("floor", -20, R, -1, 0, -20, -7));
	solids.push(extent("floor", -20, R, -1, 0, P, R));
	solids.push(extent("floor", -20, -7, -1, 0, -7, P));
	solids.push(extent("floor", P, R, -1, 0, -7, P));
	solids.push(extent("wall", -20, R, 0, 12, -21, -20));
	solids.push(extent("wall", -20, R, 0, 12, R, 21));
	solids.push(extent("wall", R, 21, 0, 12, -21, 21));
	solids.push(extent("wall", -21, -20, 0, 12, -21, 21));
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
		const cx = sx * 17.5;
		const cz = sz * 17.5;
		solids.push(extent("pillar", cx - 1, cx + 1, 0, 8, cz - 1, cz + 1));
	}
	const h = RING.size / 2;
	for (let i = 0; i < RING.count; i++) {
		const a = i / RING.count * Math.PI * 2;
		const cx = Math.cos(a) * RING.radius;
		const cz = Math.sin(a) * RING.radius;
		const top = RING.step * (i + 1);
		solids.push(extent("platform", cx - h, cx + h, 0, top, cz - h, cz + h));
	}
	for (const [x, z] of [
		[-15.5, 4],
		[15.5, -4],
		[0, 17],
		[-4, -16.5]
	]) solids.push(extent("rubble", x - .5, x + .5, 0, 1, z - .5, z + .5));
	return {
		solids,
		pit: extent("floor", -7, P, -4, 0, -7, P),
		water: [{
			x0: -7,
			x1: P,
			z0: -7,
			z1: P,
			y: POOL_Y$1
		}]
	};
}
// src/world/collectibleLayout.ts
/**
* Where the collectibles sit in the test chamber. Positions come from the ring data where possible.
* Item coordinates are the item centre.
*/
var FLOOR_Y = .5;
var pad = (n) => String(n).padStart(2, "0");
function chamberCollectibles() {
	const items = [];
	const counters = {
		crumb: 0,
		cap: 0,
		relic: 0
	};
	const add = (kind, x, y, z) => {
		counters[kind]++;
		items.push({
			id: `chamber:${kind}:${pad(counters[kind])}`,
			kind,
			x,
			y,
			z
		});
	};
	const ringCentre = (i) => {
		const a = i / RING.count * Math.PI * 2;
		return {
			x: Math.cos(a) * RING.radius,
			z: Math.sin(a) * RING.radius,
			top: RING.step * (i + 1)
		};
	};
	for (let i = 0; i < RING.count; i++) {
		const p = ringCentre(i);
		add("crumb", p.x, p.top + .7, p.z);
	}
	for (const [x, z] of [
		[1.6, 8],
		[3.2, 8],
		[4.8, 8],
		[6.4, 8],
		[7.8, 7.2],
		[8.6, 5.4],
		[9, 3.6],
		[9.4, 2]
	]) add("crumb", x, FLOOR_Y, z);
	add("cap", 19.1, FLOOR_Y, 19.1);
	add("cap", -19.1, FLOOR_Y, -19.1);
	add("cap", -19.1, FLOOR_Y, 19.1);
	add("cap", -15.5, FLOOR_Y, 5.4);
	add("cap", -4, FLOOR_Y, -18.1);
	add("cap", -8.5, FLOOR_Y, 16.5);
	const top = ringCentre(RING.count - 1);
	add("relic", top.x, top.top + 2, top.z);
	const lo = ringCentre(5);
	const hi = ringCentre(6);
	add("relic", (lo.x + hi.x) / 2, hi.top + 2.8, (lo.z + hi.z) / 2);
	add("relic", 19.1, .7, -19.1);
	return {
		id: "chamber",
		name: "Test Chamber",
		items
	};
}
// src/world/equipmentLayout.ts
/** Gear lying around the chamber. */
function chamberPickups() {
	const at = (i, itemId) => {
		const a = i / RING.count * Math.PI * 2;
		return {
			itemId,
			x: Math.cos(a) * RING.radius,
			y: RING.step * (i + 1) + .6,
			z: Math.sin(a) * RING.radius
		};
	};
	return [at(RING.count - 1, "emberHelm"), at(Math.max(0, RING.count - 4), "mossScarf")];
}
// src/world/rooms.ts
/** A door on the inside face of a wall of a square room. `along` slides it along the wall. */
function doorOn(side, half, along = 0, halfZ = half, y = 0) {
	const size = {
		width: 2.6,
		height: 3.8,
		y
	};
	switch (side) {
		case "east": return {
			x: half - .08,
			z: along,
			yaw: -Math.PI / 2,
			...size
		};
		case "west": return {
			x: -half + .08,
			z: along,
			yaw: Math.PI / 2,
			...size
		};
		case "north": return {
			x: along,
			z: -halfZ + .08,
			yaw: 0,
			...size
		};
		case "south": return {
			x: along,
			z: halfZ - .08,
			yaw: Math.PI,
			...size
		};
	}
}
// src/data/tuning.ts
/**
* All feel-related numbers live here so they can be tuned without touching logic.
* Units: the rat is about 1 unit tall. Times are in seconds.
*/
var TUNING = {
	rat: {
		height: 1.1,
		radius: .3
	},
	move: {
		walk: 3.2,
		run: 6.2,
		groundAccel: 30,
		groundDecel: 26,
		airAccel: 14,
		turnRate: 12
	},
	jump: {
		velocity: 9.5,
		doubleVelocity: 9,
		airJumps: 1,
		flipDuration: .6,
		cutMultiplier: .5,
		coyoteTime: .1,
		buffer: .12
	},
	physics: {
		gravity: 18,
		fallGravityMultiplier: 1.25,
		maxFall: 30,
		stepHeight: .35
	},
	attack: {
		aimRange: 3.4,
		aimCone: 1.9
	},
	health: {
		max: 5,
		hurtTime: .38,
		invulnTime: 1,
		deadTime: 2,
		knockback: 6.5,
		blockPush: 3.2,
		blockArc: 1.4,
		blockStun: .22,
		recoilStun: .35,
		recoilPush: 4.8
	},
	guard: {
		moveMultiplier: .5,
		parryWindow: .16
	},
	/** A press made a moment too early is remembered, so a swing or a roll comes out as soon as it can. */
	buffer: {
		attack: .2,
		dodge: .2
	},
	dodge: {
		roll: {
			duration: .5,
			speed: 7
		},
		back: {
			duration: .3,
			speed: 5.5
		},
		cooldown: .25,
		rollSafe: [.06, .72],
		backSafe: [0, .5]
	},
	scuttler: {
		hp: 4,
		radius: .42,
		speed: 2.5,
		turnRate: 7,
		noticeRange: 8,
		attackRange: 1.75,
		windup: .62,
		lungeTime: .22,
		lungeSpeed: 9.5,
		recover: .95,
		blockedRecover: 1.3,
		stagger: .42,
		knockback: 5,
		biteReach: .6,
		biteArc: .9,
		damage: 1,
		respawn: 5,
		engageRange: 3.6,
		circleRadius: 2.7,
		circleSpeed: 2,
		circleTime: [.7, 2],
		retaliate: [.25, .7],
		bite: {
			range: 2.1,
			windup: .4,
			track: .6,
			lungeTime: .17,
			lungeSpeed: 8.5,
			recover: .75
		},
		charge: {
			windup: .85,
			track: .7,
			lungeTime: .42,
			lungeSpeed: 11.5,
			recover: 1.35
		},
		parriedRecover: 2,
		hopBack: {
			time: .24,
			speed: 7.5,
			chance: .4,
			cooldown: 2.6,
			range: 2.5
		},
		arena: {
			x0: -14,
			x1: -3,
			z0: 14,
			z1: 19
		},
		home: {
			x: -8.5,
			z: 17.2
		}
	},
	/** Extra moves for open courses: the long jump (sneak while running, then jump), the wall kick, the ledge grab. */
	moves: {
		longJumpSpeed: 12,
		longJumpUp: 7.5,
		longJumpWindow: .3,
		longJumpSteer: 3,
		wallKickUp: 10,
		wallKickPush: 7.5,
		wallKickWindow: .16,
		wallKickLock: .25,
		wallChainTime: 1.5,
		wallChainSteer: 2.5,
		wallChainHold: .3,
		climbTime: .5
	},
	/**
	* Riding his shield down a slope, like a board (the owner, 2026-11-15: "he rides it like a skateboard ... he uses
	* his tail to balance and make hard curves"). Running down a slope, SNEAK drops it under his feet; on a slope too
	* steep to stand on he has no choice. Speeds are along the ground, in units a second.
	*/
	ride: {
		minSlope: .4,
		surfDrop: 10,
		gravity: 15,
		dragSlope: .5,
		dragFlat: 1.6,
		max: 16,
		stop: 1.4,
		restSlope: .12,
		turn: 2.2,
		carve: 1.8,
		carveDrag: 3.2,
		brake: 9,
		airTurn: .5,
		ollie: 8.2,
		flipLift: 5.4,
		flipTime: .42,
		trickBoost: 2.6,
		bailSpeed: 6,
		bailTime: .5,
		again: .4
	},
	/**
	* Ice (a box that is `slick`): he keeps his momentum on it. (The owner, 2026-11-16: "not necessarily sliding the
	* same way you do on a steep slope but like a slower loss of momentum than you would normally have so you might
	* maintain a little bit of your momentum for a few seconds longer while you're on ice".)
	* `decel`: how much of his usual stopping he has, the stick let go: a tenth, so from a run he glides on for about
	* two and a half seconds, seven units or so. `accel`: how much of his usual push he has with the stick held (to
	* get going, and to turn or brake against the way he is sliding): a third, so he turns wide but is not helpless.
	* He is always on his feet and steering: it is not the slide down a steep slope. His jump, and the air, are as ever.
	*/
	ice: {
		accel: .35,
		decel: .1
	},
	/**
	* Sliding on his own hide down ground too steep to stand on (the owner, 2026-11-15: "he would basically be like
	* tripping and sliding down ... probably a little slower and you have less control"). Compare `ride`.
	*/
	slide: {
		grip: .3,
		gravity: 10,
		drag: 1.2,
		dragFlat: 7,
		max: 9.5,
		turn: .8,
		hop: 5.2,
		stop: 1
	},
	/**
	* Grinding, while he rides (the owner, 2026-11-15: "go to the edge and ... press triangle and he'll ... grind
	* alongside that edge"): STOW, which has nothing else to do on the shield, puts it across the nearest ledge or rail
	* he is going along. See world/grind.ts for what counts as one.
	*/
	grind: {
		reach: .85,
		up: .75,
		down: 2.6,
		dropSpeed: 7,
		dropPull: 45,
		dropIn: 14,
		minSpeed: 3.5,
		drop: .4,
		drag: .5,
		stop: 1.2,
		hop: 7.4,
		hopSide: 3.6,
		again: .25
	},
	/** Attacking in the air: a short hang, a straight dive, and a shockwave all round on landing. */
	plunge: {
		windup: .16,
		speed: 26,
		recover: .5,
		shockRadius: 2.3,
		shockDamage: 2,
		diveRadius: .85,
		diveDamage: 3
	},
	/** Swimming in the pit's sludge. */
	swim: {
		speed: 2,
		fast: 3,
		accel: 12,
		sink: .62,
		stiffness: 40,
		damping: 8,
		jumpGrace: .45
	},
	landTime: .12,
	pit: { respawnY: -6 },
	spawn: {
		x: 0,
		y: 0,
		z: 8
	},
	/** Combat feel: a tiny freeze on hits (see main.ts) and a short slow-motion beat on a kill. */
	feel: {
		killSlowSeconds: .45,
		/** How slow time runs at the start of the kill beat (1 = normal), easing back to normal. */
		killSlowScale: .2
	},
	camera: {
		distance: 3.5,
		targetHeight: .8,
		minPitch: .1,
		maxPitch: .9,
		/**
		* LOOKING UP (the owner, 2026-11-16: "i want to be able to pan up, look up more with the right stick. i dont want
		* to clip the floor with the camera but we could still do something"). Pushed on past its lowest place behind him,
		* the view does not go down through the floor: it sinks a little more (`lookUpDrop`, radians of its swing: to
		* about knee height), is kept `floorClear` over whatever ground is under it, and TILTS UP (`lookUpTilt`, radians)
		* with him at the foot of the picture. `lookUp`: how much further the stick goes for all of that (radians of
		* stick travel at `pitchSpeed`; 0: it stops at `minPitch`, as it used to).
		*/
		lookUp: .5,
		lookUpDrop: .2,
		lookUpTilt: .36,
		floorClear: .3,
		turnSpeed: 2.2,
		pitchSpeed: .8,
		autoFollowRate: 0,
		followRate: 12,
		/** How quickly the view follows him up and down (jumps, landings, lifts). Lower is smoother. */
		heightRate: 5,
		/** The most the view can lag behind him vertically before it is dragged along. */
		heightSlack: 1.4,
		/** The view leans toward where he is running: seconds of travel to look ahead, the most it leans, and how fast it settles. */
		lookAhead: .12,
		lookAheadMax: .9,
		lookAheadRate: 3,
		/** The camera is pulled in by a wall at this rate, and eases back out at the slower one. */
		pullInRate: 22,
		pullOutRate: 2.5,
		/**
		* Something low behind him (a brazier, a crate, a step) does not pull the view in: it rises to look over it. This
		* is the steepest it may look to do that (radians above level; he can tilt it to 0.9 himself). At or under the
		* pitch it is at, it never rises, and everything pulls it in as walls do. Then how fast it rises, and comes down.
		*/
		liftMaxPitch: 1.2,
		liftInRate: 10,
		liftOutRate: 3,
		/** What counts as low: nothing of it more than this far above his feet (two crates, one on the other, are 2). */
		liftOver: 2.4,
		/**
		* A wall right behind him still pulls the view in; but pulled in close, it goes this far up over his head and
		* looks down ahead of him, where it used to sit in the back of his head. 0: it stays level, as it used to.
		*/
		squeezeRise: 2.6,
		/** How fast it goes up there. (It comes down at `liftOutRate`.) */
		squeezeInRate: 14
	}
};
// src/levels/builders.ts
/** Small helpers for writing levels. */
/** A room: one floor slab and four walls, with inner faces at +/-halfX and +/-halfZ (a square room gives one number). */
function room(halfX, floor = true, halfZ = halfX, wallHeight = 12) {
	const X = halfX;
	const Z = halfZ;
	const out = [];
	if (floor) out.push(extent("floor", -X, X, -1, 0, -Z, Z));
	out.push(extent("wall", -X, X, 0, wallHeight, -Z - 1, -Z));
	out.push(extent("wall", -X, X, 0, wallHeight, Z, Z + 1));
	out.push(extent("wall", X, X + 1, 0, wallHeight, -Z - 1, Z + 1));
	out.push(extent("wall", -X - 1, -X, 0, wallHeight, -Z - 1, Z + 1));
	return out;
}
/** A solid block given by its extents. */
function slab(kind, x0, x1, z0, z1, top, bottom = 0) {
	return extent(kind, x0, x1, bottom, top, z0, z1);
}
/**
* A flight of steps. It starts at (x0..x1, zStart) and climbs toward `dir` (+1 or -1 along z), `count` steps,
* each `rise` high and `tread` long. `base` is the height it starts from; steps are solid down to `bottom`.
*/
function stairs(x0, x1, zStart, dir, count, rise, tread, base = 0, bottom = base) {
	const out = [];
	for (let k = 0; k < count; k++) {
		const za = zStart + dir * k * tread;
		const zb = zStart + dir * (k + 1) * tread;
		out.push(extent("stone", x0, x1, bottom, base + rise * (k + 1), Math.min(za, zb), Math.max(za, zb)));
	}
	return out;
}
/** A box given by its centre on the floor: x, z, width, depth and the height of its top. */
function block(kind, x, z, w, d, top, bottom = 0) {
	return extent(kind, x - w / 2, x + w / 2, bottom, top, z - d / 2, z + d / 2);
}
/** A one-unit wooden crate standing on the floor. */
function crate(x, z) {
	return extent("rubble", x - .5, x + .5, 0, 1, z - .5, z + .5);
}
/** Hands out collectible ids like "caps:cap:03" and collects the definitions. */
var Items = class {
	prefix;
	list = [];
	counts = {
		crumb: 0,
		cap: 0,
		relic: 0,
		hunk: 0
	};
	constructor(prefix) {
		this.prefix = prefix;
	}
	/**
	* `worth`: a crumb that counts as more than one is a hunk of cheese. Hunks are numbered by themselves (`...:hunk:01`),
	* so a level that trades its crumbs for hunks does not hand an old save the new ones already picked up.
	*/
	add(kind, x, y, z, inCrate, worth = 1) {
		const name = kind === "crumb" && worth > 1 ? "hunk" : kind;
		this.counts[name]++;
		const id = `${this.prefix}:${name}:${String(this.counts[name]).padStart(2, "0")}`;
		this.list.push({
			id,
			kind,
			x,
			y,
			z,
			...inCrate === void 0 ? {} : { crate: inCrate },
			...worth > 1 ? { worth } : {}
		});
		return id;
	}
};
var ITEM_Y = .5;
// src/levels/jumpMath.ts
/**
* How far one running jump carries him over level ground (edge to where his centre lands), from the physics numbers.
* Checked against the real controller in tests/leap.ts: the measured limit is about 6.9.
* Parkour levels use this to space platforms close to the limit.
*/
function maxRunJumpDistance() {
	const g = TUNING.physics.gravity;
	const v = TUNING.jump.velocity;
	const rise = v / g;
	const peak = v * v / (2 * g);
	const fall = Math.sqrt(2 * peak / (g * TUNING.physics.fallGravityMultiplier));
	return TUNING.move.run * (rise + fall + TUNING.jump.coyoteTime);
}
// src/levels/waterworks.ts
/**
* The Waterworks: one huge hall. A wide channel of green sludge runs down the middle with a tower island in it,
* a high plank bridge runs from the tower's top to a loft on the east wall, galleries line the walls, and a raised
* plateau at the far end holds the exit.
* It is long (100 units) and wide (76), so there is room to choose a route.
*
* Layout, looking north from the start (z runs from +50 at the start to -50 at the exit):
*   z 24..50   entry landing, crates, one roach
*   z -30..24  the channel (x -22..22), promenades on both sides (x 22..38), galleries along the walls
*   z -50..-30 the plateau, 2.4 high, with the exit door and three guards
*/
var HX$2 = 38;
var HZ$2 = 50;
var WALL$2 = 17;
var POOL_Y = -.85;
var PLATEAU$2 = 2.4;
var GALLERY$1 = 1.8;
/** The top of the pump tower, and of the bridge and loft that go with it. */
var TOWER = 8;
var BRIDGE_Z = .5;
var LOFT_X = 32;
function waterworks() {
	const solids = room(HX$2, false, HZ$2, WALL$2);
	solids.push(slab("floor", -38, HX$2, 24, HZ$2, 0, -1));
	solids.push(slab("floor", -38, -22, -22, 24, 0, -1), slab("floor", 22, HX$2, -22, 24, 0, -1));
	solids.push(slab("floor", -38, HX$2, -50, -30, PLATEAU$2, -1));
	solids.push(...stairs(-38, -22, -22, -1, 8, .3, 1, 0, -1), ...stairs(22, HX$2, -22, -1, 8, .3, 1, 0, -1));
	solids.push(...stairs(-4, 4, -22, -1, 8, .3, 1, 0, -4));
	for (const side of [-1, 1]) {
		const x0 = side < 0 ? -38 : 30;
		solids.push(slab("stone", x0, x0 + 8, -18, 19.2, GALLERY$1));
		solids.push(...stairs(x0, x0 + 8, 24, -1, 6, .3, .8, 0, 0));
	}
	solids.push(slab("stone", -9, 9, -8, 8, 0, -4));
	solids.push(extent("pillar", -1.5, 1.5, 0, TOWER, -1.5, 1.5));
	const steps = [];
	for (let i = 0; i < 5; i++) {
		const a = i / 5 * Math.PI * 2 + .6;
		const x = Math.cos(a) * 3.6;
		const z = Math.sin(a) * 3.6;
		steps.push([
			x,
			z,
			1.2 * (i + 1)
		]);
		solids.push(slab("platform", x - 1.2, x + 1.2, z - 1.2, z + 1.2, 1.2 * (i + 1)));
	}
	solids.push(slab("plank", 1.5, LOFT_X, -.5, 1.5, TOWER, 7.7));
	solids.push(slab("stone", LOFT_X, HX$2, -3, 4, TOWER, 7.7));
	solids.push(extent("pillar", 6, 7.2, 0, 7.7, -.09999999999999998, 1.1), extent("pillar", 25, 26.2, 0, 7.7, -.09999999999999998, 1.1));
	solids.push(slab("plank", -22, -9, -1, 1, 0, -.3));
	for (const [a, b] of [[11, 14], [15.5, 18.5]]) solids.push(slab("platform", a, b, -1.5, 1.5, 0, -4));
	const southSlabs = [
		[
			0,
			21.5,
			0
		],
		[
			2.5,
			17.5,
			.3
		],
		[
			-1,
			13.5,
			0
		],
		[
			1.5,
			10.5,
			.3
		]
	];
	for (const [x, z, top] of southSlabs) solids.push(slab("platform", x - 1.5, x + 1.5, z - 1.5, z + 1.5, top, -4));
	solids.push(slab("plank", -1, 1, -22, -8, 0, -.3));
	const items = new Items("works");
	const landing = [
		[-10, 38],
		[10, 38],
		[-18, 44],
		[18, 44]
	];
	const top = [
		[-20, -44],
		[20, -44],
		[-26, -38],
		[26, -38]
	];
	const crateSpots = [...landing.map(([x, z]) => [
		x,
		z,
		0
	]), ...top.map(([x, z]) => [
		x,
		z,
		PLATEAU$2
	])];
	const contents = crateSpots.map(() => null);
	crateSpots.forEach(([x, z, y]) => solids.push(extent("rubble", x - .5, x + .5, y, y + 1, z - .5, z + .5)));
	const idx = (n) => n;
	const crumb = (x, y, z) => void items.add("crumb", x, y + ITEM_Y, z);
	crumb(-6, 0, 44);
	crumb(6, 0, 44);
	for (const [x, z, t] of southSlabs) crumb(x, t, z);
	crumb(-6, 0, 4);
	crumb(6, 0, -4);
	crumb(-15, 0, 0);
	crumb(-11, 0, 0);
	crumb(12.5, 0, 0);
	crumb(17, 0, 0);
	crumb(0, 0, -16);
	crumb(-26, 0, 10);
	crumb(26, 0, -10);
	crumb(0, PLATEAU$2, -40);
	items.add("cap", -34, GALLERY$1 + ITEM_Y, 6);
	items.add("cap", 34, GALLERY$1 + ITEM_Y, -6);
	items.add("cap", 16, TOWER + ITEM_Y, BRIDGE_Z);
	contents[idx(1)] = items.add("cap", crateSpots[1][0], crateSpots[1][2] + ITEM_Y, crateSpots[1][1], idx(1));
	contents[idx(6)] = items.add("cap", crateSpots[6][0], crateSpots[6][2] + ITEM_Y, crateSpots[6][1], idx(6));
	items.add("cap", 36, GALLERY$1 + ITEM_Y, 17);
	items.add("relic", 0, 8.7, 0);
	items.add("relic", 35.5, 8.8, BRIDGE_Z);
	contents[idx(5)] = items.add("relic", crateSpots[5][0], crateSpots[5][2] + ITEM_Y, crateSpots[5][1], idx(5));
	const guard = (x, z, y, x0, x1, z0, z1) => ({
		x,
		z,
		y,
		arena: {
			x0,
			x1,
			z0,
			z1
		},
		respawn: false
	});
	const enemies = [
		guard(0, 38, 0, -16, 16, 30, 47),
		guard(-34, -4, GALLERY$1, -37, -31, -16, 17),
		guard(34, 6, GALLERY$1, 31, 37, -16, 17),
		guard(5, 3, 0, -8, 8, -7, 7),
		guard(-14, -40, PLATEAU$2, -34, 34, -48, -33),
		guard(14, -40, PLATEAU$2, -34, 34, -48, -33),
		guard(0, -36, PLATEAU$2, -34, 34, -48, -33)
	];
	const decor = [];
	for (const side of [-1, 1]) {
		const x = side * 37.5;
		decor.push({
			kind: "pipe",
			a: [
				x,
				10.5,
				-49
			],
			b: [
				x,
				10.5,
				49
			],
			r: .5
		});
		decor.push({
			kind: "pipe",
			a: [
				x,
				13,
				-49
			],
			b: [
				x,
				13,
				49
			],
			r: .35,
			color: 6974066
		});
		for (const z of [
			-40,
			-20,
			0,
			20,
			40
		]) decor.push({
			kind: "pipe",
			a: [
				x,
				0,
				z
			],
			b: [
				x,
				10.5,
				z
			],
			r: .3,
			color: 6974066
		});
		for (const z of [
			-12,
			8,
			28
		]) decor.push({
			kind: "hole",
			x: side * 37.95,
			y: 6,
			z,
			yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
			r: 2.2
		});
		for (let z = -44; z <= 44; z += 11) decor.push({
			kind: "lamp",
			x: side * 37.6,
			y: 15,
			z
		});
	}
	decor.push({
		kind: "hole",
		x: -14,
		y: 5.4,
		z: -49.95,
		yaw: 0,
		r: 2.4
	}, {
		kind: "hole",
		x: 14,
		y: 5.4,
		z: -49.95,
		yaw: 0,
		r: 2.4
	});
	decor.push({
		kind: "hole",
		x: -10,
		y: 6,
		z: 49.95,
		yaw: Math.PI,
		r: 2.6
	}, {
		kind: "hole",
		x: 10,
		y: 6,
		z: 49.95,
		yaw: Math.PI,
		r: 2.6
	});
	const tunnel = {
		x: HX$2,
		y: 0,
		z: 33
	};
	const grate = {
		x: -5,
		y: 0,
		z: 41.5
	};
	decor.push({
		kind: "hole",
		x: 37.96,
		y: 1.3,
		z: tunnel.z,
		yaw: -Math.PI / 2,
		r: 1.6,
		gap: true
	});
	decor.push({
		kind: "mark",
		glyph: "crown",
		x: 37.97,
		y: 4.1,
		z: tunnel.z,
		yaw: -Math.PI / 2,
		size: .8,
		color: 8219282
	});
	decor.push({
		kind: "mark",
		glyph: "crown",
		x: -37.97,
		y: 3.4,
		z: 36,
		yaw: Math.PI / 2,
		size: .8,
		color: 8219282
	});
	decor.push({
		kind: "grate",
		x: grate.x,
		y: 0,
		z: grate.z,
		size: 1.7
	});
	return {
		id: "waterworks",
		name: "Waterworks",
		blurb: "A huge flooded hall. Cross the sludge any way you like and find twelve crumbs.",
		solids,
		pit: extent("floor", -22, 22, -4.2, -4, -30, 24),
		water: [{
			x0: -22,
			x1: 22,
			z0: -30,
			z1: 24,
			y: POOL_Y
		}],
		decor,
		npcs: [{
			x: 4,
			z: 42,
			facing: Math.PI * .8,
			name: "FINCH",
			kind: "bird",
			lines: [
				"Chirp! A knight in the sewers? Well met! I'm Finch. I fly ahead and keep an eye out for you.",
				"This hall is flooded, but you can swim it. Jump while you swim to hop out onto the ledges.",
				"Find twelve cheese crumbs and the door opens. Smash crates and barrels for more, and for snacks!",
				"Hold SHIFT to sneak quietly. Tap jump twice in the air to flutter a little higher. Good luck!"
			]
		}],
		storySpots: {
			tunnel,
			grate
		},
		spawn: {
			x: 0,
			y: 0,
			z: 46,
			facing: Math.PI
		},
		collectibles: items.list,
		crateContents: contents,
		enemies,
		waves: [],
		gear: [],
		goals: [{
			type: "collect",
			kind: "crumb",
			count: 12,
			label: "Collect twelve cheese crumbs"
		}],
		exit: doorOn("north", HX$2, 0, HZ$2, PLATEAU$2),
		reward: "sludgeScarf"
	};
}
// src/levels/kit.ts
/**
* The level kit: ready-made pieces for building levels fast. Every function returns plain data (boxes, decor, specs)
* that a level can spread into its lists, so a level reads like a plan:
*
*   solids.push(...kit.hall(0, 0, 40, 60));
*   solids.push(...kit.bridge(-5, 0, 5, 0, 2));
*   decor.push(...kit.outflow(-20, 6, 0, ...));
*
* Surfaces ("styles") pick a family of pictures, so one word re-dresses a whole area.
*/
var FLOOR_SKIN = {
	sewer: "wetCobbles",
	tile: "ceramicTiles",
	mine: "dirt",
	cave: "mudFloor",
	rust: "rustPlate"
};
var skinned = (b, skin) => ({
	...b,
	skin
});
/** A floor slab. `style: 'sewer'` is the default look (no skin); others dress it differently. */
function floor(x0, x1, z0, z1, top = 0, style = "sewer", depth = 1) {
	const b = extent("floor", x0, x1, top - depth, top, z0, z1);
	return style === "sewer" ? b : skinned(b, FLOOR_SKIN[style]);
}
/** A mossy stepping slab. */
function stepSlab(x, z, size, top, bottom = -4) {
	return block("platform", x, z, size, size, top, bottom);
}
/** A row of stepping slabs from (x0, z0) to (x1, z1), `count` of them, each `size` wide, at height `top`. */
function steppingStones(x0, z0, x1, z1, count, size, top, bottom = -4) {
	const out = [];
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 0 : i / (count - 1);
		out.push(stepSlab(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, size, top, bottom));
	}
	return out;
}
/** A wooden plank bridge from (x0, z0) to (x1, z1) at height `top`, `width` wide. Runs along x or z, whichever is longer. */
function bridge(x0, z0, x1, z1, width, top = 0, thick = .3) {
	return Math.abs(x1 - x0) >= Math.abs(z1 - z0) ? extent("plank", Math.min(x0, x1), Math.max(x0, x1), top - thick, top, z0 - width / 2, z0 + width / 2) : extent("plank", x0 - width / 2, x0 + width / 2, top - thick, top, Math.min(z0, z1), Math.max(z0, z1));
}
/** A solid stone block from the ground up (a plinth, a stage, a ledge). */
function plinth(x0, x1, z0, z1, top, bottom = 0, skin = "concreteSlab") {
	return skinned(extent("stone", x0, x1, bottom, top, z0, z1), skin);
}
/** A wooden barrel standing on a floor at height `y`. */
function barrel(x, z, y = 0) {
	return extent("barrel", x - .5, x + .5, y, y + 1.1, z - .5, z + .5);
}
/** A stack of crates (width x high), or barrels. */
function crateStack(x, z, y = 0, high = 2) {
	const out = [];
	for (let i = 0; i < high; i++) out.push(extent("rubble", x - .5, x + .5, y + i, y + i + 1, z - .5, z + .5));
	return out;
}
/** A cluster of barrels (3 in a triangle). */
function barrelCluster(x, z, y = 0) {
	return [
		barrel(x - .55, z, y),
		barrel(x + .55, z, y),
		barrel(x, z + 1.05, y)
	];
}
/** A portcullis across a gap in a wall that runs along x, opened by bursting the pipes listed (indexes into the level's pipes). */
function portcullis(x, z, width, height, opts = {}) {
	return {
		x,
		z,
		y: opts.y,
		width,
		height,
		alongZ: opts.alongZ,
		pipes: opts.pipes,
		onGoals: opts.onGoals
	};
}
/** A wall grate pouring sludge. `yaw`: the way it faces (0 = toward +z). Falls to `bottom`. */
function outflow(x, y, z, yaw, width = 2.4, bottom = -.85) {
	return {
		kind: "fall",
		x,
		y,
		z,
		yaw,
		width,
		bottom
	};
}
/** A wall pipe that can be smashed, standing at (x, z) in front of a wall that is behind it (opposite `yaw`). */
function wallPipe(x, z, top, yaw, y = 0) {
	return {
		x,
		z,
		y,
		top,
		yaw
	};
}
/** Pipes along a wall for looks: two runs, joined by down-pipes every `gap`. `alongX` for a wall along x. */
function pipeRun$1(from, to, r = .45, color) {
	return {
		kind: "pipe",
		a: from,
		b: to,
		r,
		color
	};
}
/** A string of lamps along a wall. */
function lamps(x0, z0, x1, z1, y, count) {
	const out = [];
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? .5 : i / (count - 1);
		out.push({
			kind: "lamp",
			x: x0 + (x1 - x0) * t,
			y,
			z: z0 + (z1 - z0) * t
		});
	}
	return out;
}
/** Hanging chains at the given points. */
function chains(points, top, bottom) {
	return points.map(([x, z]) => ({
		kind: "chain",
		x,
		z,
		top,
		bottom
	}));
}
// src/levels/pumpworks.ts
/**
* The Pumpworks: a big hall with a real river. Sludge pours from grates in the walls, runs along channels, and joins a
* central river that flows toward the entrance. Three wall pipes feed the pumps; burst them and the portcullis to the
* far plateau rises. Toads guard the plateau. Pip the peddler waits by the entrance with hints.
*
*   z +40..+22  entry landing (spawn, Pip, barrels)
*   z +22..-22  the river (x -6..6) with banks both sides, two side channels, a bridge, stepping stones and an island
*   z -22..-30  grand stairs and the weir
*   z -30..-40  the plateau behind the portcullis: toads, the exit door
*/
var HX$1 = 30;
var HZ$1 = 40;
var WALL$1 = 16;
var PLATEAU$1 = 2.4;
var BED = -2.2;
var SURFACE = -.85;
var RIVER_FLOW = [0, 1.6];
var INLET_FLOW = 1.8;
function pumpworks() {
	const solids = room(HX$1, false, HZ$1, WALL$1).map((b) => ({
		...b,
		y0: -3.2
	}));
	const contents = [];
	const items = new Items("pump");
	/** Adds a breakable and returns its place in the crate list. */
	const breakable = (b) => {
		solids.push(b);
		contents.push(null);
		return contents.length - 1;
	};
	const withItem = (b, kind) => {
		const i = breakable(b);
		contents[i] = items.add(kind, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, i);
	};
	solids.push(floor(-30, HX$1, 22, HZ$1, 0));
	solids.push(floor(-30, -6, -22, -5, 0), floor(-30, -6, -1, 22, 0));
	solids.push(floor(6, HX$1, -22, 8, 0), floor(6, HX$1, 12, 22, 0));
	solids.push(floor(-30, HX$1, -40, -30, PLATEAU$1));
	solids.push(extent("wall", -18, 18, BED, PLATEAU$1, -30, -22));
	solids.push(...stairs(-30, -18, -22, -1, 8, .3, 1, 0, -1), ...stairs(18, HX$1, -22, -1, 8, .3, 1, 0, -1));
	solids.push(extent("floor", -6, 6, -3.2, BED, -22, 22));
	solids.push(extent("floor", -30, -6, -3.2, BED, -5, -1));
	solids.push(extent("floor", 6, HX$1, -3.2, BED, 8, 12));
	const water = [
		{
			x0: -6,
			x1: 6,
			z0: -22,
			z1: 22,
			y: SURFACE,
			flow: RIVER_FLOW
		},
		{
			x0: -30,
			x1: -6,
			z0: -5,
			z1: -1,
			y: SURFACE,
			flow: [INLET_FLOW, 0]
		},
		{
			x0: 6,
			x1: HX$1,
			z0: 8,
			z1: 12,
			y: SURFACE,
			flow: [-1.8, 0]
		}
	];
	solids.push(bridge(-6, 15, 6, 15, 3, 0));
	solids.push(...steppingStones(-4.4, -13, 4.4, -13, 3, 2.4, 0, BED));
	solids.push(plinth(-3, 3, -9, -3, 0, BED, "mossStone"));
	solids.push(bridge(-24, -3, -6, -3, 2.2, 0));
	solids.push(bridge(6, 10, 24, 10, 2.2, 0));
	for (const [x, z] of [
		[-24, 36],
		[24, 36],
		[-12, 28]
	]) for (const b of barrelCluster(x, z)) breakable(b);
	withItem(barrel(-27, 25), "cap");
	withItem(barrel(27, 25), "crumb");
	for (const b of crateStack(-27, 8, 0, 2)) breakable(b);
	withItem(extent("rubble", -26.5, -25.5, 0, 1, -18.5, -17.5), "cap");
	withItem(barrel(20, -18), "crumb");
	withItem(barrel(26, 2), "crumb");
	withItem(barrel(0, -6, 0), "relic");
	for (const b of crateStack(-14, -36, PLATEAU$1, 1)) breakable(b);
	withItem(extent("rubble", 13.5, 14.5, PLATEAU$1, 3.4, -37.5, -36.5), "relic");
	withItem(barrel(25, -36, PLATEAU$1), "cap");
	const crumb = (x, y, z) => void items.add("crumb", x, y + ITEM_Y, z);
	crumb(-6, 0, 33);
	crumb(6, 0, 33);
	crumb(0, 0, 15);
	crumb(-4.4, 0, -13);
	crumb(4.4, 0, -13);
	crumb(-18, 0, -3);
	crumb(18, 0, 10);
	crumb(-20, 0, 18);
	crumb(20, 0, -10);
	crumb(0, PLATEAU$1, -34);
	crumb(-8, PLATEAU$1, -36);
	items.add("cap", 2, ITEM_Y, -4.5);
	const yawIn = (side) => side < 0 ? Math.PI / 2 : -Math.PI / 2;
	const pipes = [
		wallPipe(-29.1, -12, 10, yawIn(-1)),
		wallPipe(29.1, 18, 10, yawIn(1)),
		wallPipe(-29.1, 14, 10, yawIn(-1))
	];
	const gates = [portcullis(0, -30.15, 60, 4, {
		y: PLATEAU$1,
		pipes: [
			0,
			1,
			2
		]
	})];
	const guard = (type, x, z, y, x0, x1, z0, z1) => ({
		type,
		x,
		z,
		y,
		arena: {
			x0,
			x1,
			z0,
			z1
		},
		respawn: false
	});
	const enemies = [
		guard("scuttler", -20, 26, 0, -29, -8, 22, 39),
		guard("scuttler", 20, 2, 0, 8, 29, -6, 6),
		guard("scuttler", -20, -12, 0, -29, -8, -21, -7),
		guard("toad", -14, -35, PLATEAU$1, -28, 28, -39, -31),
		guard("toad", 14, -35, PLATEAU$1, -28, 28, -39, -31),
		guard("toad", 0, -37, PLATEAU$1, -28, 28, -39, -31)
	];
	const decor = [];
	decor.push(outflow(0, 1.7, -22, 0, 4, SURFACE));
	decor.push(outflow(-30, 3.4, -3, Math.PI / 2, 3, SURFACE), outflow(HX$1, 3.4, 10, -Math.PI / 2, 3, SURFACE));
	for (const side of [-1, 1]) {
		const x = side * 29.5;
		decor.push(pipeRun$1([
			x,
			12,
			-39
		], [
			x,
			12,
			39
		], .55), pipeRun$1([
			x,
			14.5,
			-39
		], [
			x,
			14.5,
			39
		], .35, 6974066));
		for (const z of [
			-36,
			-24,
			24,
			36
		]) {
			decor.push(pipeRun$1([
				x,
				0,
				z
			], [
				x,
				12,
				z
			], .3, 6974066));
			const under = solids.filter((b) => b.x0 < x + .3 && b.x1 > x - .3 && b.z0 < z + .3 && b.z1 > z - .3 && b.y1 <= 12);
			const foot = Math.max(0, ...under.map((b) => b.y1));
			solids.push({
				...extent("stone", x - .3, x + .3, foot, 12, z - .3, z + .3),
				hidden: true
			});
		}
		for (const z of [-28, 28]) decor.push({
			kind: "hole",
			x: side * 29.95,
			y: 6,
			z,
			yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
			r: 2
		});
		decor.push(...lamps(side * 29.6, -34, side * 29.6, 34, 9.5, 7));
		decor.push({
			kind: "slime",
			x: side * 29.9,
			y: 14,
			z: side * 8,
			yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
			length: 4
		});
	}
	decor.push({
		kind: "hole",
		x: -9,
		y: 7,
		z: 39.95,
		yaw: Math.PI,
		r: 2.6
	}, {
		kind: "hole",
		x: 9,
		y: 7,
		z: 39.95,
		yaw: Math.PI,
		r: 2.6
	});
	decor.push({
		kind: "window",
		x: -12,
		y: 7.4,
		z: -39.88,
		yaw: 0
	}, {
		kind: "window",
		x: 12,
		y: 7.4,
		z: -39.88,
		yaw: 0
	});
	decor.push(...chains([
		[-10, -10],
		[10, -10],
		[-10, 20],
		[10, 20],
		[0, 0]
	], WALL$1, 8));
	const wedges = [
		{
			id: "pipes",
			name: "Burst the Pumps",
			hint: "Burst the three green wall pipes and the gate to the plateau rises.",
			x: -6,
			y: PLATEAU$1,
			z: -35,
			appears: {
				type: "burst",
				count: "all",
				label: "Burst the three pipes"
			}
		},
		{
			id: "toads",
			name: "Toads on the Plateau",
			hint: "Beat every beast in the pump room.",
			x: 6,
			y: PLATEAU$1,
			z: -35,
			appears: {
				type: "defeat",
				label: "Beat the beasts"
			}
		},
		{
			id: "island",
			name: "The River Island",
			hint: "Cross the river to the island. The current pushes back.",
			x: -2,
			y: 0,
			z: -4.5,
			appears: null
		}
	];
	return {
		id: "pumpworks",
		world: "cistern",
		returnTo: "cistern",
		wedges,
		music: "pump",
		name: "The Pump Room",
		blurb: "Inside the Great Cistern's pump house: a river hall fed by wall grates. Three Golden Wedges.",
		solids,
		pit: null,
		water,
		decor,
		pipes,
		gates,
		npcs: [{
			x: 7,
			z: 31,
			facing: Math.PI,
			name: "PIP",
			lines: [
				"Squeak! You got the pump house open! I only came for the view. And the barrels. Mostly the barrels.",
				"See those fat green pipes on the walls? Give them a good whack with your sword. The gate up north opens when all three are burst.",
				"The toads up there spit sludge. Their throats glow green first. Roll through it, or hold up your shield.",
				"The river runs against you. Take the bridge, or hop the stones if you are feeling brave. There is a prize on the island!"
			]
		}],
		spawn: {
			x: 0,
			y: 0,
			z: 33,
			facing: Math.PI
		},
		collectibles: items.list,
		crateContents: contents,
		enemies,
		waves: [],
		gear: [],
		goals: wedges.map((w) => w.appears ?? {
			type: "reach",
			x: w.x,
			y: w.y,
			z: w.z,
			radius: 1.5,
			label: w.name
		}),
		exit: doorOn("south", HX$1, 0, HZ$1, 0),
		reward: "sludgeScarf"
	};
}
// src/world/hangings.ts
/**
* Seats moving platforms on what is under them. A platform's place is the height of its TOP, and its body hangs below
* that; one put "at floor level" had its whole body inside the floor at the bottom of its run, with only its top face
* showing. Here, wherever along its run a platform's body would be inside the top of something solid under its
* middle, it is raised to sit on it. A lift (one that only goes up and down) still stops at the same height at the
* top: it just starts higher and travels less. A slider rides that much higher all the way.
*/
function seatMovers(movers, solids) {
	return movers.map((m) => {
		const thick = m.thick ?? .5;
		let raise = 0;
		for (let k = 0; k <= 8; k++) {
			const t = k / 8;
			const x = m.x + m.to[0] * t;
			const y = m.y + m.to[1] * t;
			const z = m.z + m.to[2] * t;
			for (const b of solids) {
				if (b.hidden || x <= b.x0 || x >= b.x1 || z <= b.z0 || z >= b.z1) continue;
				if (b.y1 > y - thick + .02 && b.y1 <= y + .02) raise = Math.max(raise, b.y1 - (y - thick));
			}
		}
		if (raise <= .02) return m;
		return m.to[0] === 0 && m.to[2] === 0 && m.to[1] > 0 ? {
			...m,
			y: m.y + raise,
			to: [
				0,
				Math.max(.2, m.to[1] - raise),
				0
			]
		} : {
			...m,
			y: m.y + raise
		};
	});
}
// src/levels/themes.ts
var THEMES = [
	{
		id: "sewer",
		label: "Sewer (green, wet brick)",
		fog: 726032,
		skins: {
			floor: "wetCobbles",
			tile: "ceramicTiles",
			grate: "drainGrate",
			platform: "mossStone",
			plank: "planks",
			stone: "concreteSlab",
			wall: "sewerBrick",
			pillar: "concreteSlab"
		}
	},
	{
		id: "mine",
		label: "Mine (earth and timber)",
		fog: 1840140,
		skins: {
			floor: "dirt",
			tile: "gravelRail",
			grate: "ironBars",
			platform: "dirtRoots",
			plank: "planks",
			stone: "rubbleWall",
			wall: "mineBrick",
			pillar: "beamSide"
		}
	},
	{
		id: "cave",
		label: "Cave (rock and moss)",
		fog: 922656,
		skins: {
			floor: "mudFloor",
			tile: "sandstone",
			grate: "drainGrate",
			platform: "mossRock",
			plank: "planks",
			stone: "wetRock",
			wall: "roughRock",
			pillar: "stalagmite"
		}
	},
	{
		id: "dungeon",
		label: "Dungeon (grey stone)",
		fog: 1381660,
		skins: {
			floor: "floor",
			tile: "ceramicTiles",
			grate: "ironBars",
			platform: "stone",
			plank: "planks",
			stone: "stone",
			wall: "brick",
			pillar: "stone"
		}
	},
	{
		id: "foundry",
		label: "Foundry (iron, soot and magma)",
		fog: 1969415,
		skins: {
			floor: "rustPlate",
			tile: "concreteSlab",
			grate: "ironBars",
			platform: "rustPlate",
			plank: "planks",
			stone: "magmaRock",
			wall: "mineBrick",
			pillar: "rustPlate"
		}
	},
	{
		id: "keep",
		label: "Keep (castle stone and royal carpet)",
		fog: 1248282,
		skins: {
			floor: "stone",
			tile: "royalCarpet",
			grate: "ironBars",
			platform: "keepStone",
			plank: "planks",
			stone: "keepStone",
			wall: "keepStone",
			pillar: "keepStone"
		}
	}
];
var themeById = (id) => THEMES.find((t) => t.id === id) ?? THEMES[0];
// src/levels/custom.ts
/**
* Levels made in the builder. A custom level is a short list of pieces on a grid; `compileCustom` turns it into a real
* LevelDef (walls around the edge, crates numbered, goals chosen from what is in it). Pure data, so tests can run it.
*/
/** The colours a beacon can be. */
var LIGHT_COLORS = {
	red: 16722474,
	yellow: 16764992,
	blue: 3832575,
	green: 4259696,
	purple: 11553535,
	white: 16773344
};
/** Banner cloth: deeper colours than the lights. */
var BANNER_COLORS = {
	purple: 9059008,
	red: 11545130,
	green: 3836474,
	blue: 3824312,
	black: 3024438,
	gold: 12622378
};
/** Which way a piece on a wall faces, by the wall it is on (the builder's arrow points at the wall). */
var WALL_YAW = {
	n: 0,
	s: Math.PI,
	e: -Math.PI / 2,
	w: Math.PI / 2
};
var KIND = {
	floor: "floor",
	tile: "floor",
	grate: "stone",
	platform: "platform",
	plank: "plank",
	stone: "stone",
	wall: "wall",
	pillar: "pillar"
};
var FLOW = {
	n: [0, -1.8],
	s: [0, 1.8],
	e: [1.8, 0],
	w: [-1.8, 0]
};
var lo = (a, b) => Math.min(a, b);
var hi = (a, b) => Math.max(a, b);
/** Turns a custom level into a playable one. */
function compileCustom(c, id = "custom") {
	const theme = themeById(c.theme);
	const W = c.width / 2;
	const D = c.depth / 2;
	const solids = [
		extent("wall", -W, W, 0, c.wallHeight, -D - 1, -D),
		extent("wall", -W, W, 0, c.wallHeight, D, D + 1),
		extent("wall", W, W + 1, 0, c.wallHeight, -D - 1, D + 1),
		extent("wall", -W - 1, -W, 0, c.wallHeight, -D - 1, D + 1)
	];
	if (theme.id === "foundry" || theme.id === "keep") for (let i = 0; i < 4; i++) solids[i] = {
		...solids[i],
		skin: theme.skins.wall
	};
	const water = [];
	const lava = [];
	const fire = [];
	const decor = [];
	const pipes = [];
	const gates = [];
	const movers = [];
	const npcs = [];
	const enemies = [];
	const waveSpecs = [];
	const plates = [];
	const gatePieces = [];
	const contents = [];
	const items = new Items(id);
	let spawn = {
		x: 0,
		y: 0,
		z: 0,
		facing: Math.PI
	};
	let exit = doorOn("north", W, 0, D, 0);
	const goals = [];
	let markAt = null;
	const wedgePieces = [];
	const crate = (b) => {
		solids.push(b);
		contents.push(null);
		return contents.length - 1;
	};
	for (const p of c.pieces) {
		const x0 = lo(p.x0, p.x1);
		const x1 = hi(p.x0, p.x1);
		const z0 = lo(p.z0, p.z1);
		const z1 = hi(p.z0, p.z1);
		const cx = (x0 + x1) / 2;
		const cz = (z0 + z1) / 2;
		const k = KIND[p.t];
		if (k) {
			const bottom = p.bottom ?? (k === "floor" ? p.top - 1 : k === "wall" || k === "pillar" ? 0 : p.top - .6);
			const b = extent(k, x0, Math.max(x1, x0 + .5), Math.min(bottom, p.top - .2), p.top, z0, Math.max(z1, z0 + .5));
			const themed = theme.id === "sewer" ? p.t === "tile" ? theme.skins.tile : p.t === "grate" ? theme.skins.grate : void 0 : theme.skins[p.t];
			const skin = p.skin ?? themed;
			solids.push(skin ? {
				...b,
				skin
			} : b);
			continue;
		}
		switch (p.t) {
			case "water":
			case "river": {
				const base = p.t === "river" && p.dir ? FLOW[p.dir] : void 0;
				const k = (p.props?.speed ?? 1.8) / 1.8;
				const flow = base ? [base[0] * k, base[1] * k] : void 0;
				water.push({
					x0,
					x1: Math.max(x1, x0 + 1),
					z0,
					z1: Math.max(z1, z0 + 1),
					y: p.top,
					...flow ? { flow } : {}
				});
				solids.push(extent("floor", x0, Math.max(x1, x0 + 1), p.top - 2.4, p.top - 1.35, z0, Math.max(z1, z0 + 1)));
				break;
			}
			case "lava":
				lava.push({
					x0,
					x1: Math.max(x1, x0 + 1),
					z0,
					z1: Math.max(z1, z0 + 1),
					y: p.top
				});
				solids.push(extent("stone", x0, Math.max(x1, x0 + 1), p.top - 2.4, p.top - 1.35, z0, Math.max(z1, z0 + 1)));
				break;
			case "fire":
				fire.push({
					x0,
					x1: Math.max(x1, x0 + 1),
					z0,
					z1: Math.max(z1, z0 + 1),
					y: p.top
				});
				break;
			case "bridge": {
				const alongX = x1 - x0 >= z1 - z0;
				const len = alongX ? x1 - x0 : z1 - z0;
				const wide = Math.min(Math.max(1.6, alongX ? z1 - z0 : x1 - x0), 3);
				const bx0 = alongX ? x0 : cx - wide / 2;
				const bx1 = alongX ? x1 : cx + wide / 2;
				const bz0 = alongX ? cz - wide / 2 : z0;
				const bz1 = alongX ? cz + wide / 2 : z1;
				solids.push({
					...extent("plank", bx0, bx1, p.top - .3, p.top, bz0, bz1),
					...p.skin ? { skin: p.skin } : {}
				});
				for (const side of [-1, 1]) {
					const off = (wide / 2 - .05) * side;
					const a = alongX ? [
						bx0,
						p.top + .95,
						cz + off
					] : [
						cx + off,
						p.top + .95,
						bz0
					];
					const b = alongX ? [
						bx1,
						p.top + .95,
						cz + off
					] : [
						cx + off,
						p.top + .95,
						bz1
					];
					decor.push({
						kind: "pipe",
						a,
						b,
						r: .05,
						color: 10518608
					});
					const posts = Math.max(2, Math.round(len / 4) + 1);
					for (let k = 0; k < posts; k++) {
						const f = k / (posts - 1);
						const px = alongX ? bx0 + (bx1 - bx0) * f : cx + off;
						const pz = alongX ? cz + off : bz0 + (bz1 - bz0) * f;
						decor.push({
							kind: "post",
							x: px,
							z: pz,
							y: p.top - .3,
							top: p.top + 1
						});
						solids.push({
							...extent("plank", px - .25, px + .25, p.top, p.top + 1, pz - .25, pz + .25),
							hidden: true
						});
					}
				}
				break;
			}
			case "web":
				decor.push({
					kind: "web",
					x: cx,
					y: p.top,
					z: cz,
					yaw: {
						n: 0,
						s: Math.PI,
						e: -Math.PI / 2,
						w: Math.PI / 2
					}[p.dir ?? "n"],
					r: 1.6
				});
				break;
			case "banner":
				decor.push({
					kind: "banner",
					x: cx,
					z: cz,
					top: p.top,
					yaw: WALL_YAW[p.dir ?? "n"],
					w: 1.6,
					h: 3.2,
					color: BANNER_COLORS[p.props?.color ?? "purple"] ?? BANNER_COLORS.purple
				});
				break;
			case "torch":
				decor.push({
					kind: "torch",
					x: cx,
					y: p.top,
					z: cz,
					yaw: WALL_YAW[p.dir ?? "n"]
				});
				break;
			case "gauge":
				decor.push({
					kind: "gauge",
					x: cx,
					y: p.top,
					z: cz,
					yaw: WALL_YAW[p.dir ?? "n"],
					r: .8
				});
				break;
			case "crystal":
				decor.push({
					kind: "crystal",
					x: cx,
					y: p.top,
					z: cz,
					size: 1.6,
					color: LIGHT_COLORS[p.props?.color ?? "blue"] ?? LIGHT_COLORS.blue
				});
				solids.push({
					...extent("stone", cx - .35, cx + .35, p.top, p.top + 1.2, cz - .35, cz + .35),
					hidden: true
				});
				break;
			case "roots":
				decor.push({
					kind: "roots",
					x: cx,
					z: cz,
					top: c.wallHeight,
					bottom: p.top
				});
				break;
			case "brazier":
				decor.push({
					kind: "brazier",
					x: cx,
					y: p.top,
					z: cz
				});
				solids.push({
					...extent("stone", cx - BRAZIER.foot, cx + BRAZIER.foot, p.top, p.top + BRAZIER.bowlFrom, cz - BRAZIER.foot, cz + BRAZIER.foot),
					hidden: true
				});
				solids.push({
					...extent("stone", cx - BRAZIER.bowl * .9, cx + BRAZIER.bowl * .9, p.top + BRAZIER.bowlFrom, p.top + BRAZIER.rim, cz - BRAZIER.bowl * .9, cz + BRAZIER.bowl * .9),
					hidden: true
				});
				break;
			case "light":
				decor.push({
					kind: "light",
					x: cx,
					y: p.top,
					z: cz,
					color: LIGHT_COLORS[p.props?.color ?? "red"] ?? 16722474,
					flash: p.props?.flash ?? 0,
					...p.props?.bare ? { bare: true } : {}
				});
				if (!p.props?.bare) solids.push({
					...extent("stone", cx - .17, cx + .17, p.top, p.top + .88, cz - .17, cz + .17),
					hidden: true
				});
				break;
			case "speaker":
			case "couch": {
				const yaw = {
					s: 0,
					n: Math.PI,
					e: Math.PI / 2,
					w: -Math.PI / 2
				}[p.dir ?? "s"];
				decor.push({
					kind: p.t,
					x: cx,
					y: p.top,
					z: cz,
					yaw
				});
				const cs = Math.round(Math.cos(yaw));
				const sn = Math.round(Math.sin(yaw));
				const part = (kind, lx0, lx1, y1, lz0, lz1, y0 = 0) => {
					const xs = [lx0 * cs + lz0 * sn, lx1 * cs + lz1 * sn];
					const zs = [-lx0 * sn + lz0 * cs, -lx1 * sn + lz1 * cs];
					solids.push({
						...extent(kind, cx + Math.min(...xs), cx + Math.max(...xs), p.top + y0, p.top + y1, cz + Math.min(...zs), cz + Math.max(...zs)),
						hidden: true
					});
				};
				if (p.t === "speaker") part("stone", -.85, .85, 2.9, -.6, .6);
				else {
					const K = COUCH;
					part("plank", -K.armIn, K.armIn, K.seat, K.seatBack, K.front);
					part("plank", -K.half, K.half, K.backTop, K.back, K.seatBack);
					part("plank", -K.armOut, -K.armIn, K.armTop, K.seatBack, K.front);
					part("plank", K.armIn, K.armOut, K.armTop, K.seatBack, K.front);
					part("plank", K.pillow.x0, K.pillow.x1, K.pillow.top, K.pillow.z0, K.pillow.z1, K.seat);
				}
				break;
			}
			case "crate":
			case "barrel": {
				const idx = crate(p.t === "crate" ? {
					...extent("rubble", cx - .5, cx + .5, p.top, p.top + 1, cz - .5, cz + .5),
					...p.props?.tough ? { tough: true } : {}
				} : extent("barrel", cx - .5, cx + .5, p.top, p.top + 1.1, cz - .5, cz + .5));
				if (p.props?.item) contents[idx] = items.add(p.props.item, cx, p.top + .5, cz, idx);
				break;
			}
			case "ramp": {
				const base = p.bottom ?? 0;
				const stone = p.skin ?? (theme.id === "sewer" ? void 0 : theme.skins.stone);
				if (p.top > base + .05) solids.push({
					...rampBox("stone", x0, Math.max(x1, x0 + .5), z0, Math.max(z1, z0 + .5), base, p.top, p.dir ?? "n"),
					...stone ? { skin: stone } : {}
				});
				break;
			}
			case "stairs": {
				const dir = p.dir ?? "n";
				const len = Math.max(1, Math.round(dir === "n" || dir === "s" ? z1 - z0 : x1 - x0));
				const base = p.bottom ?? 0;
				const rise = (p.top - base) / len;
				for (let k = 0; k < len; k++) {
					const a = k;
					const b = k + 1;
					const top = base + rise * (k + 1);
					if (top <= base + .05) continue;
					if (dir === "n") solids.push(extent("stone", x0, x1, base, top, z1 - b, z1 - a));
					else if (dir === "s") solids.push(extent("stone", x0, x1, base, top, z0 + a, z0 + b));
					else if (dir === "e") solids.push(extent("stone", x0 + a, x0 + b, base, top, z0, z1));
					else solids.push(extent("stone", x1 - b, x1 - a, base, top, z0, z1));
				}
				break;
			}
			case "lift": {
				const mv = p.props?.move ?? "up";
				const dist = Math.max(.5, p.props?.travel ?? 4);
				const to = mv === "up" ? [
					0,
					dist,
					0
				] : mv === "n" ? [
					0,
					0,
					-dist
				] : mv === "s" ? [
					0,
					0,
					dist
				] : mv === "e" ? [
					dist,
					0,
					0
				] : [
					-dist,
					0,
					0
				];
				const themed = theme.id === "sewer" ? void 0 : theme.skins.plank;
				movers.push({
					x: cx,
					z: cz,
					y: p.top,
					w: Math.max(1.5, x1 - x0),
					d: Math.max(1.5, z1 - z0),
					to,
					speed: p.props?.speed ?? 2,
					pause: p.props?.pause ?? 1.5,
					...p.skin ?? themed ? { skin: p.skin ?? themed } : {}
				});
				break;
			}
			case "lamp":
				decor.push({
					kind: "lamp",
					x: cx,
					y: p.top,
					z: cz
				});
				break;
			case "chain":
				decor.push({
					kind: "chain",
					x: cx,
					z: cz,
					top: c.wallHeight,
					bottom: p.top
				});
				break;
			case "window":
				decor.push({
					kind: "window",
					x: cx,
					y: p.top,
					z: cz,
					yaw: {
						n: 0,
						s: Math.PI,
						e: -Math.PI / 2,
						w: Math.PI / 2
					}[p.dir ?? "n"]
				});
				break;
			case "slime":
				decor.push({
					kind: "slime",
					x: cx,
					y: p.top,
					z: cz,
					yaw: {
						n: 0,
						s: Math.PI,
						e: -Math.PI / 2,
						w: Math.PI / 2
					}[p.dir ?? "n"],
					length: 4
				});
				break;
			case "wedge":
				wedgePieces.push(p);
				break;
			case "mark":
				markAt = {
					x: cx,
					y: p.top,
					z: cz
				};
				break;
			case "crumb":
			case "cap":
			case "relic":
				items.add(p.t, cx, p.top + .5, cz, void 0, p.t === "crumb" ? Math.max(1, Math.round(p.props?.worth ?? 1)) : 1);
				break;
			case "roach":
			case "toad":
			case "beetle":
			case "bat":
			case "guard":
			case "mantis":
			case "stag":
			case "hornet":
			case "ant":
			case "firefly":
			case "scorpion":
			case "brood":
			case "wyrm":
				{
					const type = {
						roach: "scuttler",
						toad: "toad",
						beetle: "ironback",
						bat: "bat",
						guard: "guard",
						mantis: "mantis",
						stag: "stag",
						hornet: "hornet",
						ant: "ant",
						firefly: "firefly",
						scorpion: "scorpion",
						brood: "brood",
						wyrm: "wyrm"
					}[p.t];
					const arena = p.t === "brood" ? {
						x0: -c.width / 2 + 2,
						x1: c.width / 2 - 2,
						z0: -c.depth / 2 + 2,
						z1: c.depth / 2 - 2
					} : p.t === "wyrm" ? {
						x0: -c.width / 2 + .1,
						x1: c.width / 2 - .1,
						z0: -c.depth / 2 + .1,
						z1: c.depth / 2 - .1
					} : p.t === "hornet" || p.t === "firefly" ? {
						x0: Math.max(-c.width / 2 + .5, cx - 12),
						x1: Math.min(c.width / 2 - .5, cx + 12),
						z0: Math.max(-c.depth / 2 + .5, cz - 12),
						z1: Math.min(c.depth / 2 - .5, cz + 12)
					} : p.t === "ant" || p.t === "scorpion" ? {
						x0: cx - 9,
						x1: cx + 9,
						z0: cz - 9,
						z1: cz + 9
					} : {
						x0: cx - 7,
						x1: cx + 7,
						z0: cz - 7,
						z1: cz + 7
					};
					const spec = {
						type,
						x: cx,
						z: cz,
						y: p.top,
						arena,
						respawn: p.t === "brood" || p.t === "wyrm" ? false : !!p.props?.respawn,
						...p.props?.perch ? { perch: p.props.perch } : {}
					};
					if (p.t === "guard" || p.t === "mantis" || p.t === "stag" || p.t === "hornet" || p.t === "ant" || p.t === "firefly" || p.t === "scorpion" || p.t === "brood" || p.t === "wyrm") spec.facing = {
						n: Math.PI,
						s: 0,
						e: Math.PI / 2,
						w: -Math.PI / 2
					}[p.dir ?? "s"];
					const w = Math.round(p.props?.wave ?? 0);
					if (w > 0) (waveSpecs[w - 1] ??= []).push(spec);
					else enemies.push(spec);
				}
				break;
			case "npc":
				{
					const kind = p.props?.kind ?? "mouse";
					const lines = (p.props?.lines ?? []).filter((l) => l.trim());
					npcs.push({
						x: cx,
						z: cz,
						y: p.top,
						facing: Math.PI,
						kind,
						auto: p.props?.auto,
						hidden: p.props?.hidden,
						shop: p.props?.shop,
						name: (p.props?.name || (kind === "bird" ? "FINCH" : kind === "villain" ? "LORD GRIMSQUEAK" : kind === "pigeon" ? "DIZZY DAVE" : "PIP")).toUpperCase(),
						lines: lines.length || p.props?.lines?.length === 0 ? lines : kind === "villain" ? ["Heh heh heh... a rat in my kingdom?"] : kind === "pigeon" ? ["Coo coo, daddy-o! Wanna groove with the Dave?"] : kind === "bird" ? ["Chirp! You built this place yourself? Nice work, knight."] : ["Squeak! You made this place yourself? Nice work, knight.", "Smash the pipes, beat the beasts, and find the door!"]
					});
				}
				break;
			case "pipe": {
				const dir = p.dir ?? "n";
				pipes.push({
					x: cx,
					z: cz,
					y: p.top,
					top: p.top + 8,
					yaw: {
						n: 0,
						s: Math.PI,
						e: -Math.PI / 2,
						w: Math.PI / 2
					}[dir]
				});
				break;
			}
			case "fall": {
				const dir = p.dir ?? "n";
				decor.push({
					kind: "fall",
					x: cx,
					y: p.top + 2.5,
					z: cz,
					yaw: {
						n: 0,
						s: Math.PI,
						e: -Math.PI / 2,
						w: Math.PI / 2
					}[dir],
					width: 2.6,
					bottom: p.top - .85
				});
				break;
			}
			case "gate": {
				const spec = {
					x: cx,
					z: cz,
					y: p.top,
					width: Math.max(2, x1 - x0, z1 - z0),
					height: 3.5,
					alongZ: z1 - z0 > x1 - x0
				};
				gates.push(spec);
				gatePieces.push({
					spec,
					opens: p.props?.opens ?? "goals"
				});
				break;
			}
			case "plate":
				plates.push({
					x: cx,
					z: cz,
					y: p.top
				});
				break;
			case "spawn":
				spawn = {
					x: cx,
					y: p.top,
					z: cz,
					facing: Math.PI
				};
				break;
			case "exit": {
				const dN = cz + D;
				const dS = D - cz;
				const dE = W - cx;
				const dW = cx + W;
				const m = Math.min(dN, dS, dE, dW);
				exit = m === dN ? doorOn("north", W, cx, D, p.top) : m === dS ? doorOn("south", W, cx, D, p.top) : m === dE ? doorOn("east", W, cz, D, p.top) : doorOn("west", W, cz, D, p.top);
				break;
			}
		}
	}
	for (const g of gatePieces) if (g.opens === "pipes") g.spec.pipes = pipes.map((_, i) => i);
	else if (g.opens === "plates") g.spec.plates = plates.map((_, i) => i);
	else g.spec.onGoals = true;
	const kindOne = {
		crumb: "cheese crumb",
		cap: "bottle cap",
		relic: "golden relic"
	};
	const kindName = {
		crumb: "cheese crumbs",
		cap: "bottle caps",
		relic: "golden relics"
	};
	for (const g of c.goals ?? []) if (g.type === "collect") goals.push({
		type: "collect",
		kind: g.kind,
		count: g.count,
		label: g.count === "all" ? `Collect every ${kindOne[g.kind]}` : `Collect ${g.count} ${kindName[g.kind]}`
	});
	else if (g.type === "defeat") goals.push({
		type: "defeat",
		label: "Defeat every enemy"
	});
	else if (g.type === "waves") goals.push({
		type: "waves",
		label: "Survive every wave"
	});
	else if (g.type === "burst") goals.push({
		type: "burst",
		count: "all",
		label: `Burst ${pipes.length === 1 ? "the pipe" : `the ${pipes.length} pipes`}`
	});
	else if (markAt) goals.push({
		type: "reach",
		x: markAt.x,
		y: markAt.y,
		z: markAt.z,
		radius: 1.8,
		label: "Reach the goal"
	});
	const chosen = (c.goals ?? []).length > 0;
	if (!chosen && waveSpecs.length) goals.push({
		type: "waves",
		label: "Survive every wave"
	});
	if (!chosen && pipes.length) goals.push({
		type: "burst",
		count: "all",
		label: `Burst ${pipes.length === 1 ? "the pipe" : `the ${pipes.length} pipes`}`
	});
	if (!chosen && enemies.length) goals.push({
		type: "defeat",
		label: "Defeat every enemy"
	});
	if (!goals.length) goals.push({
		type: "reach",
		x: exit.x + Math.sin(exit.yaw) * 2.2,
		y: exit.y ?? 0,
		z: exit.z + Math.cos(exit.yaw) * 2.2,
		radius: 1.8,
		label: "Reach the door"
	});
	let wedges;
	if (wedgePieces.length) {
		const label = {
			start: "",
			defeat: "Defeat every enemy",
			waves: "Survive every wave",
			burst: "Burst every pipe",
			crumb: "Collect every cheese crumb",
			cap: "Collect every bottle cap",
			relic: "Collect every golden relic",
			reach: "Reach the goal"
		};
		wedges = wedgePieces.map((p, i) => {
			const a = p.props?.appears ?? "start";
			let appears = null;
			if (a === "defeat" || a === "waves") appears = {
				type: a,
				label: label[a]
			};
			else if (a === "burst") appears = {
				type: "burst",
				count: "all",
				label: label[a]
			};
			else if (a === "crumb" || a === "cap" || a === "relic") appears = {
				type: "collect",
				kind: a,
				count: "all",
				label: label[a]
			};
			else if (a === "reach" && markAt) appears = {
				type: "reach",
				x: markAt.x,
				y: markAt.y,
				z: markAt.z,
				radius: 1.8,
				label: label[a]
			};
			const name = (p.props?.name ?? "").trim() || `Golden Wedge ${i + 1}`;
			return {
				id: `w${i + 1}`,
				name,
				hint: (p.props?.hint ?? "").trim() || (appears ? `${label[a]}, and it appears.` : "Find it and take it."),
				x: p.x0,
				y: p.top,
				z: p.z0,
				appears
			};
		});
		goals.length = 0;
		for (const w of wedges) goals.push(w.appears ?? {
			type: "reach",
			x: w.x,
			y: w.y,
			z: w.z,
			radius: 1.5,
			label: w.name
		});
	}
	const lowest = Math.min(0, ...water.map((w) => w.y - 2.4), ...lava.map((l) => l.y - 2.4));
	for (let i = 0; i < 4; i++) solids[i] = {
		...solids[i],
		y0: lowest
	};
	return {
		id,
		name: c.name || "My Level",
		blurb: c.blurb || "A level you built.",
		music: c.music,
		fog: theme.fog,
		theme: theme.id,
		solids,
		pit: null,
		water,
		lava,
		decor,
		pipes,
		gates,
		movers: seatMovers(movers, solids),
		npcs,
		spawn,
		collectibles: items.list,
		crateContents: contents,
		enemies,
		waves: waveSpecs.filter((w) => w && w.length > 0),
		plates,
		gear: [],
		goals,
		exit,
		...wedges ? { wedges } : {},
		...c.noGrab ? { noGrab: true } : {},
		...c.noLongJump ? { noLongJump: true } : {},
		...fire.length ? { fire } : {},
		...c.fallBack ? { fallBack: true } : {},
		...c.fogRange ? { fogRange: c.fogRange } : {}
	};
}
// src/levels/kingdom.ts
/**
* The first real levels, made with the same pieces the builder uses. Each one is a CustomLevel compiled into a LevelDef,
* so anything here can be opened and changed in the builder (Copy text).
* The room is x -w/2..w/2 and z -d/2..d/2; north (the far side) is -z. One jump reaches about 2.5 up and 8 across.
*/
var at$6 = (t, x, z, top = 0, extra = {}) => ({
	t,
	x0: x,
	z0: z,
	x1: x,
	z1: z,
	top,
	...extra
});
var box$6 = (t, x0, z0, x1, z1, top, extra = {}) => ({
	t,
	x0,
	z0,
	x1,
	z1,
	top,
	...extra
});
/** A toxic pool crossed by a plank bridge, stepping stones and a sliding raft. Beasts wait on the far shore. */
var plankPit = {
	name: "Plank Pit",
	blurb: "Cross the sludge on planks, stones and a sliding raft. Gather the cheese and clear the far shore.",
	width: 48,
	depth: 48,
	wallHeight: 12,
	goals: [{
		type: "collect",
		kind: "crumb",
		count: "all"
	}, { type: "defeat" }],
	pieces: [
		box$6("floor", -24, 10, 24, 24, 0),
		box$6("water", -24, -12, 24, 10, -.85),
		box$6("floor", -24, -24, 24, -12, 0),
		at$6("spawn", 0, 20),
		box$6("plank", -1.5, 4, 1.5, 10, 0),
		box$6("tile", -8, -2, 8, 4, 0),
		box$6("lift", -1.5, -5, 1.5, -2, 0, { props: {
			move: "n",
			travel: 7,
			speed: 2.2,
			pause: 2
		} }),
		box$6("stone", 8.5, 1, 10.5, 3, 0),
		box$6("stone", 8.5, -2.5, 10.5, -.5, 0),
		box$6("stone", 8.5, -6, 10.5, -4, 0),
		box$6("stone", 8.5, -9.5, 10.5, -7.5, 0),
		box$6("stairs", -3, -20, 3, -14, 3, {
			dir: "n",
			bottom: 0
		}),
		box$6("platform", -8, -24, 8, -20, 3),
		at$6("exit", 0, -24, 3),
		at$6("crate", -8, 16, 0, { props: { item: "crumb" } }),
		at$6("barrel", 8, 16, 0, { props: { item: "crumb" } }),
		at$6("crate", 14, 14, 0, { props: { item: "cap" } }),
		at$6("crumb", 0, 7),
		at$6("crumb", 0, 1),
		at$6("crumb", 9.5, 2),
		at$6("crumb", 9.5, -8.5),
		at$6("crumb", -14, -17),
		at$6("crumb", 14, -17),
		at$6("roach", -4, 0),
		at$6("toad", -12, -18),
		at$6("toad", 12, -18),
		at$6("npc", 6, 20, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: ["Watch those planks! They don't look terribly trustworthy."]
		} }),
		at$6("lamp", -12, 22, 3),
		at$6("lamp", 12, 22, 3),
		at$6("lamp", -12, -22, 3),
		at$6("lamp", 12, -22, 3),
		at$6("slime", -23.5, 14, 7, { dir: "e" }),
		at$6("window", 23.5, 18, 5, { dir: "w" }),
		at$6("fall", -24, -2, 0, { dir: "e" })
	]
};
/** A walled cellar: step on both plates to lift the gate, beat what guards them, then clear the north hall. */
var cellars = {
	name: "Cellars",
	blurb: "Two plates open the gate. Barrels, beasts and a high ledge with a prize.",
	theme: "dungeon",
	width: 44,
	depth: 44,
	wallHeight: 12,
	goals: [{ type: "defeat" }, {
		type: "collect",
		kind: "cap",
		count: "all"
	}],
	pieces: [
		box$6("floor", -22, -22, 22, 22, 0),
		at$6("spawn", 0, 18),
		box$6("wall", -9, 4, -8, 22, 6),
		box$6("wall", 8, 4, 9, 22, 6),
		at$6("plate", -15, 16),
		at$6("plate", 15, 16),
		at$6("roach", -15, 10),
		at$6("roach", 15, 10),
		at$6("toad", 0, 8),
		box$6("wall", -22, -5, -4, -4, 6),
		box$6("wall", 4, -5, 22, -4, 6),
		box$6("gate", -4, -5, 4, -4, 0, { props: { opens: "plates" } }),
		box$6("pillar", -12, -12, -10, -10, 5),
		box$6("pillar", 10, -12, 12, -10, 5),
		box$6("pillar", -2, -15, 0, -13, 5),
		at$6("exit", 0, -22),
		at$6("toad", -15, -17),
		at$6("toad", 15, -17),
		at$6("roach", 0, -9),
		at$6("barrel", -18, -8, 0, { props: { item: "cap" } }),
		at$6("barrel", -18, -10),
		at$6("crate", 18, -8, 0, { props: { item: "crumb" } }),
		at$6("crate", 18, -10),
		box$6("stairs", 16, -18, 19, -12, 3, {
			dir: "n",
			bottom: 0
		}),
		box$6("platform", 14, -22, 22, -18, 3),
		at$6("cap", 18, -20, 3),
		at$6("cap", -20, 20),
		at$6("cap", 20, 20),
		at$6("lamp", -6, 20, 3),
		at$6("lamp", 6, 20, 3),
		at$6("chain", -3, 10, 7),
		at$6("chain", 3, 10, 7),
		at$6("window", -21.5, 0, 5, { dir: "e" }),
		at$6("window", 21.5, 0, 5, { dir: "w" }),
		at$6("npc", 6.6, 20.2, 0, { props: {
			name: "Pip",
			kind: "mouse",
			lines: [
				"Squeak! Both plates, then the gate lifts.",
				"The roaches guard the left and right bays. The toad is in the middle: watch for spit!",
				"Caps hide in the corners and on the high ledge up the stairs."
			]
		} })
	]
};
/** A climb through an old shaft: a lift, a sliding platform, pillars to hop and a plank bridge to the door. Falling means starting over. */
var liftShaft = {
	name: "Lift Shaft",
	blurb: "Ride the lifts, hop the pillars and cross the planks to the door. There is nothing under you.",
	theme: "mine",
	width: 44,
	depth: 44,
	wallHeight: 26,
	goals: [{
		type: "collect",
		kind: "crumb",
		count: "all"
	}],
	pieces: [
		box$6("floor", -8, 10, 8, 20, 0),
		at$6("spawn", 0, 16),
		box$6("lift", -1.5, 7, 1.5, 10, 0, { props: {
			move: "up",
			travel: 5,
			speed: 2,
			pause: 2
		} }),
		box$6("platform", -5, 1, 5, 7, 5),
		box$6("lift", 5, 2, 8, 5, 5, { props: {
			move: "e",
			travel: 9,
			speed: 2.5,
			pause: 2
		} }),
		box$6("platform", 17, -1, 22, 6, 5),
		box$6("pillar", 19, -5, 21, -3, 6.5),
		box$6("pillar", 19, -9, 21, -7, 8),
		box$6("pillar", 19, -13, 21, -11, 9.5),
		box$6("platform", 16, -22, 22, -15, 9.5),
		box$6("lift", 13, -22, 16, -19, 9.5, { props: {
			move: "up",
			travel: 6,
			speed: 2,
			pause: 2
		} }),
		box$6("platform", 4, -22, 13, -19, 15.5),
		box$6("plank", -20, -22, 4, -19, 15.5),
		at$6("exit", -19, -20.5, 15.5),
		at$6("crumb", 0, 4, 5),
		at$6("crumb", 20, 3, 5),
		at$6("crumb", 20, -4, 6.5),
		at$6("crumb", 20, -12, 9.5),
		at$6("crumb", 20, -18, 9.5),
		at$6("crumb", 8, -20.5, 15.5),
		at$6("crumb", -8, -20.5, 15.5),
		at$6("roach", 0, 4, 5),
		at$6("toad", 8, -20.5, 15.5),
		at$6("lamp", -6, 18, 3),
		at$6("lamp", 6, 18, 3),
		at$6("lamp", 0, 2, 8),
		at$6("lamp", 20, 4, 8),
		at$6("lamp", 8, -21, 18),
		at$6("chain", -3, 3, 9),
		at$6("chain", 12, -4, 14),
		at$6("npc", 4, 16, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp! This shaft is old. The lifts still work, mostly.",
				"Step on, ride up, and step off when it stops. Do not fall!",
				"The door is at the very top, along the planks."
			]
		} })
	]
};
/** A furnace hall: a lake of lava crossed by a rope bridge, a sliding platform and stepping stones. Touching lava hurts and sends you back. */
var furnace = {
	name: "Furnace",
	blurb: "Cross the lava by rope bridge, sliding platform or stepping stones. One touch of the lava and you pay for it.",
	theme: "dungeon",
	width: 44,
	depth: 44,
	wallHeight: 14,
	goals: [{
		type: "collect",
		kind: "crumb",
		count: "all"
	}, { type: "defeat" }],
	pieces: [
		box$6("floor", -10, 12, 10, 22, 0),
		box$6("lava", -22, -14, 22, 12, -.6),
		box$6("floor", -22, 12, -10, 22, 0),
		box$6("floor", 10, 12, 22, 22, 0),
		at$6("spawn", 0, 18),
		box$6("bridge", -1.5, 2, 1.5, 12, 0),
		box$6("tile", -6, -4, 6, 2, 0),
		box$6("lift", 6, -3, 9, 0, 0, { props: {
			move: "e",
			travel: 7,
			speed: 2,
			pause: 2
		} }),
		box$6("tile", 16, -10, 22, 0, 0),
		box$6("stone", -9, -2, -7, 0, 0),
		box$6("stone", -12.5, -6, -10.5, -4, 0),
		box$6("stone", -16, -10, -14, -8, 0),
		box$6("stone", -19, -13, -17, -11, 0),
		box$6("stone", 18, -13, 20, -11, 0),
		box$6("floor", -22, -22, 22, -14, 0),
		box$6("stairs", -3, -20, 3, -14, 3, {
			dir: "n",
			bottom: 0
		}),
		box$6("platform", -8, -22, 8, -20, 3),
		at$6("exit", 0, -22, 3),
		at$6("crumb", 0, 8),
		at$6("crumb", 0, -1),
		at$6("crumb", -11.5, -5),
		at$6("crumb", 19, -5),
		at$6("crumb", 19, -12),
		at$6("crumb", -14, -18),
		at$6("crumb", 14, -18),
		at$6("roach", 3, -1),
		at$6("roach", 19, -3),
		at$6("toad", -10, -18),
		at$6("toad", 10, -18),
		at$6("crate", -16, 18, 0, { props: { item: "cap" } }),
		at$6("barrel", 16, 18, 0, { props: { item: "crumb" } }),
		at$6("brazier", -8, 13),
		at$6("brazier", 8, 13),
		at$6("brazier", -18, -20),
		at$6("brazier", 18, -20),
		at$6("chain", -8, 8, 8),
		at$6("chain", 8, 8, 8),
		at$6("window", -21.5, 4, 6, { dir: "e" }),
		at$6("window", 21.5, 4, 6, { dir: "w" }),
		at$6("npc", 6, 18, 0, { props: {
			name: "Pip",
			kind: "mouse",
			lines: [
				"Squeak! That is real lava. Touch it and it burns, then tosses you back to where you last stood.",
				"Cross by the rope bridge, ride the sliding platform east, or hop the stones to the west.",
				"The beasts on the north shore guard the stair to the door."
			]
		} })
	]
};
/** A cave strung with cobwebs: rope bridges over a drop, stairs up the side, beasts on the ledges. */
var webHollow = {
	name: "Web Hollow",
	blurb: "Rope bridges over the dark, cobwebs on the walls and beasts on every ledge. A fall sends you back to the start.",
	theme: "cave",
	width: 44,
	depth: 44,
	wallHeight: 16,
	goals: [{
		type: "collect",
		kind: "crumb",
		count: "all"
	}],
	pieces: [
		box$6("floor", -8, 14, 8, 22, 0),
		at$6("spawn", 0, 18),
		box$6("bridge", -1.5, 4, 1.5, 14, 0),
		box$6("floor", -8, -4, 8, 4, 0),
		box$6("bridge", -16, -1.5, -8, 1.5, 0),
		box$6("floor", -22, -8, -16, 6, 0),
		box$6("stairs", -21, -14, -17, -8, 4, {
			dir: "n",
			bottom: 0
		}),
		box$6("platform", -22, -22, -10, -14, 4),
		box$6("bridge", -10, -19.5, 6, -16.5, 4),
		box$6("platform", 6, -22, 22, -10, 4),
		at$6("exit", 14, -22, 4),
		at$6("crumb", 0, 9),
		at$6("crumb", 0, 0),
		at$6("crumb", -12, 0),
		at$6("crumb", -19, -3),
		at$6("crumb", -16, -18, 4),
		at$6("crumb", -2, -18, 4),
		at$6("crumb", 12, -14, 4),
		at$6("crumb", 18, -18, 4),
		at$6("roach", 0, 0),
		at$6("roach", -19, 1),
		at$6("toad", -16, -18, 4),
		at$6("roach", 14, -14, 4),
		at$6("web", -21.9, 10, 3, { dir: "e" }),
		at$6("web", 21.9, 6, 4, { dir: "w" }),
		at$6("web", -21.9, -18, 8, { dir: "e" }),
		at$6("web", 0, -21.9, 8, { dir: "s" }),
		at$6("web", 10, -21.9, 7, { dir: "s" }),
		at$6("slime", 21.9, 14, 8, { dir: "w" }),
		at$6("lamp", -6, 20, 3),
		at$6("lamp", 6, 20, 3),
		at$6("lamp", 0, 2, 3),
		at$6("brazier", -20, 4),
		at$6("brazier", 20, -12, 4),
		at$6("npc", 5, 18, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp! Spiders have been busy down here.",
				"Cross the rope bridge, then take the west bridge to the stairs.",
				"Mind the drop: there is no floor under the bridges."
			]
		} })
	]
};
/** Dizzy Dave's hangout: a stage at the back with a busted speaker blasting a boom-bap beat, a couch, and a few chill creatures. */
var daveSpot = {
	name: "Dizzy Dave's Spot",
	blurb: "The hangout. Dave, Mort, Wren, Pip and Finch. Walk up and press JUMP to talk.",
	theme: "dungeon",
	music: "groove",
	width: 40,
	depth: 40,
	wallHeight: 10,
	goals: [{ type: "reach" }],
	pieces: [
		box$6("floor", -20, -20, 20, 20, 0),
		at$6("spawn", 0, 16),
		box$6("platform", -9, -20, 9, -12, .8),
		box$6("stairs", -3, -12, 3, -9, .8, {
			dir: "n",
			bottom: 0
		}),
		at$6("speaker", -7, -18, .8, { dir: "s" }),
		at$6("speaker", 7, -18, .8, { dir: "s" }),
		at$6("exit", 0, -20, .8),
		at$6("npc", 0, -14.5, .8, { props: {
			name: "Dizzy Dave",
			kind: "pigeon",
			auto: 11,
			lines: [
				"Coo coo, daddy-o! Welcome to the Dave Zone. Pull up a crumb.",
				"Name is Dizzy Dave. Dizzy on account of the dancing, dig?",
				"That busted speaker? Found it in a drain. Only plays one beat, but what a beat, man.",
				"Hang out, meet the crew. Down in these tunnels you gotta keep a rhythm or you lose your head.",
				"Heh, stay groovy, knight. Boom, tss, boom boom tss!"
			]
		} }),
		at$6("couch", -13, -3, 0, { dir: "e" }),
		at$6("npc", -12, -3, 0, { props: {
			name: "Mellow Mort",
			kind: "mouse",
			lines: [
				"Squeak... oh. Hey. Did not see you there. I have been on this couch since Tuesday.",
				"The beat is good, right? Better than the drips. Way better than the drips.",
				"If you are headed out, the door is past Dave. Take it slow, knight. Take it slow."
			]
		} }),
		at$6("npc", 12, 4, 0, { props: {
			name: "Wren",
			kind: "bird",
			lines: ["Chirp! Dave never stops. I have been trying to sing over that beat for a week.", "He says he is dizzy from dancing. I say he is dizzy from the speaker."]
		} }),
		at$6("npc", 14, -9, 0, { props: {
			name: "Lord Grimsqueak",
			kind: "villain",
			hidden: true,
			lines: []
		} }),
		at$6("npc", -14, 8, 0, { props: {
			name: "Pip",
			kind: "mouse",
			lines: ["Squeak! Pip the peddler, at your service. Soon I will sell you things.", "For now I just give hints. Smash the pipes, beat the beasts, find the door!"]
		} }),
		at$6("npc", -8, 12, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: ["Chirp! Finch the goldfinch. Watch your step down in the sludge, knight.", "Stay on the planks, and the beasts will not get you. Probably."]
		} }),
		at$6("barrel", 15, 8, 0, { props: { item: "crumb" } }),
		at$6("barrel", 16, 6, 0, { props: { item: "crumb" } }),
		at$6("crate", 15, 3, 0, { props: { item: "cap" } }),
		at$6("brazier", -15, -12),
		at$6("brazier", 15, -12),
		at$6("brazier", -15, 10),
		at$6("brazier", 8, 12),
		at$6("lamp", -10, 14, 4),
		at$6("lamp", 10, 14, 4),
		at$6("lamp", -14, 0, 4),
		at$6("lamp", 14, 0, 4),
		at$6("crumb", -6, 8),
		at$6("crumb", 6, 10),
		at$6("crumb", 0, 2),
		at$6("crumb", -9, -8),
		at$6("slime", -19.5, -6, 6, { dir: "e" }),
		at$6("window", 19.5, -8, 5, { dir: "w" }),
		at$6("light", -4, -19, .8, { props: { color: "blue" } }),
		at$6("light", 4, -19, .8, { props: { color: "yellow" } }),
		at$6("light", -7, -18, 3.7, { props: {
			color: "red",
			flash: 1.5
		} }),
		at$6("light", 7, -18, 3.7, { props: {
			color: "red",
			flash: 1.5
		} }),
		at$6("light", -17, 14, 0, { props: { color: "purple" } }),
		at$6("light", 17, 14, 0, { props: { color: "blue" } })
	]
};
/** Story dressing added to a compiled level: things the builder has no piece for, and the places scenes are staged around. */
function dressed(def, extra) {
	return {
		...def,
		solids: [...def.solids, ...extra.solids ?? []],
		decor: [...def.decor, ...extra.decor ?? []],
		storySpots: extra.storySpots
	};
}
function kingdomLevels() {
	const pit = dressed(compileCustom(plankPit, "plankpit"), { storySpots: { keepsake: {
		x: -2.6,
		y: 0,
		z: 12.4
	} } });
	const cellar = dressed(compileCustom(cellars, "cellars"), {
		decor: [{
			kind: "shelf",
			x: 4.4,
			y: 0,
			z: 21.97,
			yaw: Math.PI,
			width: 3.4,
			height: 2.5
		}, {
			kind: "shelf",
			x: -4.4,
			y: 0,
			z: 21.97,
			yaw: Math.PI,
			width: 3.4,
			height: 2.5
		}],
		solids: [-4.4, 4.4].map((x) => ({
			...extent("plank", x - 1.75, x + 1.75, 0, 2.5, 21.5, 22),
			hidden: true
		})),
		storySpots: {
			shelf: {
				x: 4.4,
				y: 0,
				z: 22
			},
			pip: {
				x: 6.6,
				y: 0,
				z: 20.2
			}
		}
	});
	const shaft = dressed(compileCustom(liftShaft, "liftshaft"), {
		decor: [{
			kind: "engine",
			x: 2,
			y: -46,
			z: 0,
			r: 17
		}],
		storySpots: {
			landing: {
				x: 19.5,
				y: 5,
				z: 3
			},
			edge: {
				x: 17.9,
				y: 5,
				z: 4.6
			},
			engine: {
				x: 2,
				y: -46,
				z: 0
			}
		}
	});
	return [
		pit,
		cellar,
		dressed(compileCustom(furnace, "furnace"), {
			decor: [{
				kind: "machine",
				x: 21.95,
				y: 0,
				z: 16.5,
				yaw: -Math.PI / 2
			}, {
				kind: "mark",
				glyph: "crown",
				x: 21.97,
				y: 5.6,
				z: 19.6,
				yaw: -Math.PI / 2,
				size: .7,
				color: 8219282
			}],
			solids: [
				{
					...extent("stone", 20.3, 22, 0, 3.4, 14.6, 18.4),
					hidden: true
				},
				{
					...extent("stone", 19.5, 20.3, 1.6, 2.4, 17.6, 18.4),
					hidden: true
				},
				{
					...extent("stone", 20.35, 21.95, 3.4, 5.5, 15.3, 16.9),
					hidden: true
				}
			],
			storySpots: { machine: {
				x: 21.2,
				y: 0,
				z: 16.5
			} }
		}),
		dressed(compileCustom(webHollow, "webhollow"), {
			decor: [{
				kind: "web",
				x: 18,
				y: 5.3,
				z: -21.9,
				yaw: 0,
				r: 1.5
			}, {
				kind: "portrait",
				x: 6.7,
				y: 6.3,
				z: -21.98,
				yaw: 0,
				size: 1.5
			}],
			storySpots: {
				keepsake: {
					x: 18,
					y: 4.95,
					z: -21.55
				},
				portrait: {
					x: 6.7,
					y: 6.3,
					z: -22
				}
			}
		}),
		shaft,
		dressed(compileCustom(daveSpot, "davespot"), { storySpots: {
			dave: {
				x: 0,
				y: .8,
				z: -14.5
			},
			mort: {
				x: -12,
				y: 0,
				z: -3
			},
			wren: {
				x: 12,
				y: 0,
				z: 4
			}
		} })
	];
}
// src/levels/foundry.ts
/**
* World Two: the Foundry. Where the cheese is melted down and fed to the machines. Iron, soot and a lake of lava.
* The old Furnace is folded into the main hall (lava, braziers, a machine); the old Lift Shaft and Cellars are side areas.
*
*   SOUTH  The Gantry. He comes in high on an iron walkway over the dock and sees the whole hall. A cage lift and a stair
*          go down. Under the gantry, in the dark, a bottle cap. Over the west end of the dock, a hornet lancer.
*   MIDDLE The Crucible: a great iron pot on an island in the lava. Its rim is crawling with beasts (beat them all for a
*          wedge). Pistons pump up and down its sides; ride them shelf to shelf to the top.
*          A sliding cart runs from the dock to the island; stepping stones cross from the west bank.
*   NORTH  The Slag Run: iron beams hung over the lava, a full double jump apart, from the Hopper (a tower on the west bank)
*          to the Ladle (a block on the east side). Fall and the lava throws you back. Under it, over the north
*          floor, a firefly bomber.
*   EAST   The Storehouse, shut. Burst the three steam pipes on the walls and its gate lifts. Inside: the door to the Coal
*          Cellars. The Slag Heaps (piles to hop) stand in the north-east corner.
*   WEST   The door to the Lift Shaft.
*
* Room: x -48..48, z -48..48; north is -z. A flat double jump carries about 10; a jump, double jump and grab climbs about 5.8.
*/
var at$5 = (t, x, z, top = 0, extra = {}) => ({
	t,
	x0: x,
	z0: z,
	x1: x,
	z1: z,
	top,
	...extra
});
var box$5 = (t, x0, z0, x1, z1, top, extra = {}) => ({
	t,
	x0,
	z0,
	x1,
	z1,
	top,
	...extra
});
var collect$4 = (kind, label) => ({
	type: "collect",
	kind,
	count: "all",
	label
});
var GANTRY = 10;
var SHELF1 = 7;
var SHELF2 = 14;
var STORE_ROOF = 7;
/** The crucible: an iron block on the island. Its faces: west x -5, east x 5, north z -11, south z -1. */
var POT = {
	x0: -5,
	x1: 5,
	z0: -11,
	z1: -1
};
/** The Slag Run's beams, west to east. Each gap is a little wider than the last (8, 8.5, 9, 9). */
var BEAMS = [
	{
		x0: -25,
		x1: -22
	},
	{
		x0: -13.5,
		x1: -10.5
	},
	{
		x0: -1.5,
		x1: 1.5
	},
	{
		x0: 10.5,
		x1: 13.5
	}
];
var BEAM_Z = {
	z0: -30,
	z1: -25
};
/** The Furnace Mouth: 21 out from the Crucible's east face and 13.5 below its top (only a royal long jump makes it). */
var MOUTH$1 = {
	x0: 26,
	x1: 30,
	z0: -8,
	z1: -4,
	top: 6.5
};
/** The Hopper (start of the run) and the Ladle (the end). */
var HOPPER = {
	x0: -42,
	x1: -33,
	z0: -32,
	z1: -25
};
var LADLE = {
	x0: 22,
	x1: 30,
	z0: -31,
	z1: -24
};
/** The island the Crucible stands on: the Slag Crew are the beasts on it. */
var ISLAND = {
	x0: -12,
	x1: 12,
	z0: -17,
	z1: 5
};
/** Where the hornet hangs, over the west end of the dock. */
var DOCK_HORNET = {
	x: -36,
	z: 37
};
/**
* The north floor's firefly, and its air: the north floor and out over the lava beside it, under the Slag Run (it
* flies lower than the beams, and round the Hopper and the Ladle, which stand in it).
*/
var NORTH_FIREFLY = {
	x: -10,
	z: -41
};
var NORTH_AIR = {
	x0: -46,
	x1: 31,
	z0: -47,
	z1: -26
};
var hall = {
	name: "The Foundry",
	blurb: "A hall of iron round a lake of lava, with the great Crucible in the middle. Six Golden Wedges here (one a secret), more in the Lift Shaft and the Coal Cellars.",
	theme: "foundry",
	music: "pump",
	width: 96,
	depth: 96,
	wallHeight: 36,
	pieces: [
		box$5("floor", -48, 24, 48, 48, 0),
		box$5("floor", -48, -48, 48, -34, 0),
		box$5("floor", -48, -34, -30, 24, 0),
		box$5("floor", 30, -34, 48, 24, 0),
		box$5("tile", -12, -17, 12, 5, 0),
		box$5("lava", -30, 5, 30, 24, -.6),
		box$5("lava", -30, -34, 30, -17, -.6),
		box$5("lava", -30, -17, -12, 5, -.6),
		box$5("lava", 12, -17, 30, 5, -.6),
		box$5("platform", -16, 40, 16, 48, GANTRY, { bottom: 9 }),
		box$5("pillar", -16, 40, -14, 42, 9),
		box$5("pillar", 14, 40, 16, 42, 9),
		box$5("pillar", -16, 46, -14, 48, 9),
		box$5("pillar", 14, 46, 16, 48, 9),
		box$5("lift", -1.5, 37, 1.5, 40, 0, { props: {
			move: "up",
			travel: GANTRY,
			speed: 2.5,
			pause: 2
		} }),
		box$5("stairs", 16, 41, 28, 47, GANTRY, {
			dir: "w",
			bottom: 0
		}),
		at$5("spawn", 0, 44, GANTRY),
		at$5("exit", 0, 48, GANTRY),
		box$5("lift", -1.5, 21, 1.5, 24, 0, { props: {
			move: "n",
			travel: 16,
			speed: 2.2,
			pause: 2
		} }),
		box$5("stone", -26, -7, -24, -5, .3),
		box$5("stone", -18, -7, -16, -5, .3),
		box$5("pillar", POT.x0, POT.z0, POT.x1, POT.z1, 20),
		box$5("lift", -4, -.9, -1, 2.1, 0, { props: {
			move: "up",
			travel: 6,
			speed: 1.6,
			pause: 1.5
		} }),
		box$5("platform", -8, -6, POT.x0, 0, SHELF1, { bottom: 6.5 }),
		box$5("lift", -8, -10, POT.x0, -7, SHELF1, { props: {
			move: "up",
			travel: 6,
			speed: 1.6,
			pause: 1.5
		} }),
		box$5("platform", -8, -14, 0, POT.z0, SHELF2, { bottom: 13.5 }),
		box$5("lift", 1, -14, 4, POT.z0 - .1, SHELF2, { props: {
			move: "up",
			travel: 5,
			speed: 1.6,
			pause: 1.5
		} }),
		at$5("roach", -9, 3),
		at$5("stag", 9, 3, 0, { dir: "w" }),
		at$5("beetle", 2, -14),
		at$5("roach", -10, -15),
		at$5("toad", 9, -6),
		at$5("toad", -9, -9),
		box$5("platform", HOPPER.x0, HOPPER.z0, HOPPER.x1, HOPPER.z1, 8, { bottom: 0 }),
		box$5("stairs", -40, -25, -34, -15, 8, {
			dir: "n",
			bottom: 0
		}),
		...BEAMS.map((b) => box$5("platform", b.x0, BEAM_Z.z0, b.x1, BEAM_Z.z1, 8, { bottom: 7.5 })),
		box$5("platform", LADLE.x0, LADLE.z0, LADLE.x1, LADLE.z1, 8, { bottom: 0 }),
		at$5("firefly", NORTH_FIREFLY.x, NORTH_FIREFLY.z, 0, { dir: "s" }),
		box$5("wall", 38, 4, 48, 5, 6.5),
		box$5("wall", 38, 15, 48, 16, 6.5),
		box$5("wall", 38, 5, 39, 8, 6.5),
		box$5("wall", 38, 12, 39, 15, 6.5),
		box$5("platform", 38, 8, 39, 12, 6.5, { bottom: 3.5 }),
		box$5("platform", 38, 4, 48, 16, STORE_ROOF, { bottom: 6.5 }),
		box$5("gate", 38, 8, 39, 12, 0, { props: { opens: "pipes" } }),
		at$5("pipe", -20, 47.5, 0, { dir: "n" }),
		at$5("pipe", 10, -47.5, 0, { dir: "s" }),
		at$5("pipe", -47.5, -10, 0, { dir: "e" }),
		box$5("pillar", 33, -43, 35, -41, 2),
		box$5("pillar", 37, -46, 39, -44, 3.5),
		box$5("pillar", 41, -42, 43, -40, 5),
		box$5("pillar", 44, -46, 46, -44, 6.5),
		at$5("hornet", DOCK_HORNET.x, DOCK_HORNET.z, 0, { dir: "e" }),
		at$5("crate", -30, 34),
		at$5("crate", -29, 34),
		at$5("crate", -30, 34, 1),
		at$5("crate", -26, 38, 0, { props: { item: "cap" } }),
		at$5("crate", -25, 38),
		at$5("barrel", -36, 30),
		at$5("barrel", -37, 30),
		at$5("barrel", -36, 31, 0, { props: { item: "crumb" } }),
		at$5("crate", 34, 30),
		at$5("crate", 34, 30, 1),
		at$5("barrel", 38, 34),
		box$5("pillar", MOUTH$1.x0, MOUTH$1.z0, MOUTH$1.x1, MOUTH$1.z1, MOUTH$1.top, {
			bottom: -1.9,
			skin: "magmaRock"
		}),
		at$5("brazier", MOUTH$1.x0 + .8, MOUTH$1.z0 + .8, MOUTH$1.top),
		at$5("light", MOUTH$1.x1 - .6, MOUTH$1.z1 - .6, MOUTH$1.top, { props: {
			color: "red",
			flash: .5
		} }),
		at$5("cap", -12, 46, 0),
		at$5("cap", -7, -4, SHELF1),
		at$5("cap", -40, -30, 8),
		at$5("cap", -12, -27.5, 8),
		at$5("cap", -17, -6, .3),
		at$5("cap", 45, -45, 6.5),
		at$5("cap", 44, 7, 0),
		at$5("crumb", 0, 30),
		at$5("crumb", 22, 36),
		at$5("crumb", 0, 3),
		at$5("crumb", 6, -15),
		at$5("crumb", -6.5, -12.5, SHELF2),
		at$5("crumb", -38, 0),
		at$5("crumb", -25, -6, .3),
		at$5("crumb", -37, -20.5, 4.8),
		at$5("crumb", -23.5, -27.5, 8),
		at$5("crumb", 0, -27.5, 8),
		at$5("crumb", 12, -27.5, 8),
		at$5("crumb", -10, -40),
		at$5("crumb", 20, -40),
		at$5("crumb", 34, -42, 2),
		at$5("crumb", 36, -10),
		at$5("crumb", 36, 20),
		at$5("crumb", -40, 40),
		at$5("crumb", 40, 40),
		at$5("npc", -5, 43, GANTRY, { props: {
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp! The Foundry! Smell that? Burnt cheese. They melt it down here for the machines.",
				"The big pot in the middle is the Crucible. Those pistons on its sides go up and down, up and down. Ride them.",
				"And the lava, well. Do not touch the lava. It will not kill you, but it will make you wish it had.",
				"See the little ledge out by the east bank, past the Crucible? Nobody has ever jumped that far. Nobody in a plain scarf, anyway."
			]
		} }),
		at$5("npc", 34, 10, 0, { props: {
			name: "Wren",
			kind: "bird",
			lines: ["Chirp! The storehouse is shut tight. There is a door to the coal cellars in there.", "Hear that hissing? Three steam pipes on the walls. Burst them all and the pressure lifts the gate. I think."]
		} }),
		at$5("light", -4, -10, 20, { props: { color: "yellow" } }),
		at$5("light", 29, -30, 8, { props: { color: "blue" } }),
		at$5("light", -41, -31, 8, { props: { color: "purple" } }),
		at$5("light", 43, 10, STORE_ROOF, { props: { color: "green" } }),
		at$5("light", -11, -16, 0, { props: {
			color: "red",
			flash: 1
		} }),
		at$5("light", 11, -16, 0, { props: {
			color: "red",
			flash: 1
		} }),
		at$5("brazier", -20, 27),
		at$5("brazier", 20, 27),
		at$5("brazier", -11, 4),
		at$5("brazier", 11, 4),
		at$5("brazier", -33, 22),
		at$5("brazier", 33, -32),
		at$5("lamp", -9, 42, 12.5),
		at$5("lamp", 9, 42, 12.5),
		at$5("lamp", -6, 44, 3),
		at$5("lamp", 6, 44, 3),
		at$5("lamp", 39, 6, 4),
		at$5("lamp", 39, 14, 4),
		at$5("chain", -20, -10, 12),
		at$5("chain", 20, -10, 12),
		at$5("chain", -20, 14, 12),
		at$5("chain", 20, 14, 12),
		at$5("chain", 0, -6, 24),
		at$5("window", -47.5, 30, 12, { dir: "e" }),
		at$5("window", 47.5, -20, 12, { dir: "w" }),
		at$5("gauge", -16.5, -47.7, 4.2, { dir: "n" }),
		at$5("gauge", 1.5, -47.7, 4.2, { dir: "n" }),
		at$5("gauge", -6, -47.7, 3.2, { dir: "n" }),
		at$5("gauge", -17, 47.7, 3.4, { dir: "s" }),
		at$5("gauge", -47.7, -7, 3.4, { dir: "w" }),
		at$5("gauge", 13, -47.7, 3.4, { dir: "n" }),
		at$5("gauge", 37.7, 6, 4.4, { dir: "e" }),
		at$5("gauge", 37.7, 14, 4.4, { dir: "e" })
	]
};
var FOUNDRY_WEDGES = [
	{
		id: "crucible",
		name: "Top of the Crucible",
		hint: "Ride the pistons up the sides of the great pot, shelf to shelf.",
		x: 0,
		y: 20,
		z: -6,
		appears: null
	},
	{
		id: "crew",
		name: "The Slag Crew",
		hint: "Beat every beast on the Crucible's island.",
		x: 6,
		y: 0,
		z: 2,
		appears: {
			type: "defeat",
			label: "Beat the Slag Crew"
		}
	},
	{
		id: "run",
		name: "The Slag Run",
		hint: "From the Hopper, double-jump beam to beam over the lava to the Ladle.",
		x: 26,
		y: 8,
		z: -27.5,
		appears: null
	},
	{
		id: "steam",
		name: "Let Off Steam",
		hint: "Burst the three steam pipes on the walls, then look in the storehouse.",
		x: 43,
		y: 0,
		z: 12,
		appears: {
			type: "burst",
			count: "all",
			label: "Burst the steam pipes"
		}
	},
	{
		id: "mouth",
		name: "The Furnace Mouth",
		hint: "A ledge by the east bank, far out and far below the top of the Crucible. A plain long jump falls short. A royal one might not.",
		x: 28,
		y: MOUTH$1.top,
		z: -6,
		appears: null,
		gear: "royalScarf"
	},
	{
		id: "caps",
		name: "Eight Bottle Caps",
		hint: "Under the gantry, in a crate, on the pot, on the Hopper, on a beam, on a stone, on the heaps, in the store.",
		x: 6,
		y: GANTRY,
		z: 44,
		appears: collect$4("cap", "Find all the caps")
	}
];
/**
* A boiler machine against a wall, facing `yaw` (0 = facing south, +z; only quarter turns). The decor, and boxes that
* match its shape so he bumps into it (the body, the hopper on its front, the boiler on top).
*/
function machine(x, z, yaw) {
	const cs = Math.round(Math.cos(yaw));
	const sn = Math.round(Math.sin(yaw));
	const part = (lx0, lx1, y0, y1, lz0, lz1) => {
		const xs = [x + lx0 * cs + lz0 * sn, x + lx1 * cs + lz1 * sn];
		const zs = [z - lx0 * sn + lz0 * cs, z - lx1 * sn + lz1 * cs];
		return {
			...extent("stone", Math.min(...xs), Math.max(...xs), y0, y1, Math.min(...zs), Math.max(...zs)),
			hidden: true
		};
	};
	return {
		decor: {
			kind: "machine",
			x,
			y: 0,
			z,
			yaw
		},
		solids: [
			part(-1.9, 1.9, 0, 3.4, 0, 1.6),
			part(.65, 1.45, 1.6, 2.4, 1.6, 2.4),
			part(-1.2, .4, 3.4, 5.5, 0, 1.6)
		]
	};
}
function foundry() {
	const def = compileCustom(hall, "foundry");
	const machines = [machine(-20, -47.95, 0), machine(-2, -47.95, 0)];
	return {
		...def,
		world: "foundry",
		enemies: def.enemies.map((e) => e.x > ISLAND.x0 && e.x < ISLAND.x1 && e.z > ISLAND.z0 && e.z < ISLAND.z1 ? e : e.type === "firefly" ? {
			...e,
			uncounted: true,
			arena: NORTH_AIR
		} : {
			...e,
			uncounted: true
		}),
		solids: [...def.solids, ...machines.flatMap((m) => m.solids)],
		decor: [
			...def.decor,
			...machines.map((m) => m.decor),
			{
				kind: "mark",
				glyph: "crown",
				x: -11,
				y: 6,
				z: -47.97,
				yaw: 0,
				size: .8,
				color: 8219282
			},
			{
				kind: "pipe",
				a: [
					-44,
					7.5,
					-47.5
				],
				b: [
					44,
					7.5,
					-47.5
				],
				r: .4,
				color: 6969930
			},
			{
				kind: "pipe",
				a: [
					-20.4,
					7.5,
					-47.5
				],
				b: [
					-20.4,
					5.4,
					-47.5
				],
				r: .3,
				color: 6969930
			},
			{
				kind: "pipe",
				a: [
					-2.4,
					7.5,
					-47.5
				],
				b: [
					-2.4,
					5.4,
					-47.5
				],
				r: .3,
				color: 6969930
			},
			{
				kind: "pipe",
				a: [
					-44,
					9,
					-47.5
				],
				b: [
					44,
					9,
					-47.5
				],
				r: .25,
				color: 5921378
			},
			{
				kind: "pipe",
				a: [
					-44,
					6,
					47.5
				],
				b: [
					-17,
					6,
					47.5
				],
				r: .35,
				color: 6969930
			},
			{
				kind: "pipe",
				a: [
					17,
					6,
					47.5
				],
				b: [
					44,
					6,
					47.5
				],
				r: .35,
				color: 6969930
			},
			{
				kind: "pipe",
				a: [
					47.5,
					7,
					-30
				],
				b: [
					47.5,
					7,
					30
				],
				r: .35,
				color: 6969930
			}
		],
		courseDoors: [{
			to: "shaft",
			name: "The Lift Shaft",
			need: 0,
			door: doorOn("west", 48, 14, 48, 0)
		}, {
			to: "coalcellars",
			name: "The Coal Cellars",
			need: 0,
			door: doorOn("east", 48, 10, 48, 0)
		}],
		fogRange: [40, 150],
		wedges: FOUNDRY_WEDGES,
		goals: FOUNDRY_WEDGES.map((w) => w.appears ?? {
			type: "reach",
			x: w.x,
			y: w.y,
			z: w.z,
			radius: 1.5,
			label: w.name
		})
	};
}
var shaftArea = {
	name: "The Lift Shaft",
	blurb: "An old shaft off the Foundry. Ride the lifts, hop the pillars and cross the planks at the top. There is nothing under you.",
	theme: "foundry",
	width: 44,
	depth: 44,
	wallHeight: 26,
	pieces: [
		box$5("floor", -8, 10, 8, 22, 0),
		at$5("spawn", 0, 18),
		at$5("exit", 0, 22),
		box$5("lift", -1.5, 7, 1.5, 10, 0, { props: {
			move: "up",
			travel: 5,
			speed: 2,
			pause: 2
		} }),
		box$5("platform", -5, 1, 5, 7, 5),
		box$5("lift", 5, 2, 8, 5, 5, { props: {
			move: "e",
			travel: 9,
			speed: 2.5,
			pause: 2
		} }),
		box$5("platform", 17, -1, 22, 6, 5),
		box$5("pillar", 19, -5, 21, -3, 6.5),
		box$5("pillar", 19, -9, 21, -7, 8),
		box$5("pillar", 19, -13, 21, -11, 9.5),
		box$5("platform", 16, -22, 22, -15, 9.5),
		box$5("lift", 13, -22, 16, -19, 9.5, { props: {
			move: "up",
			travel: 6,
			speed: 2,
			pause: 2
		} }),
		box$5("platform", 4, -22, 13, -19, 15.5),
		box$5("plank", -20, -22, 4, -19, 15.5),
		box$5("platform", -22, -22, -20, -14, 15.5),
		at$5("crumb", 0, 4, 5),
		at$5("crumb", 20, 3, 5),
		at$5("crumb", 20, -4, 6.5),
		at$5("crumb", 20, -12, 9.5),
		at$5("crumb", 20, -18, 9.5),
		at$5("crumb", 8, -20.5, 15.5),
		at$5("crumb", -8, -20.5, 15.5),
		at$5("crumb", -21, -16, 15.5),
		at$5("roach", 0, 4, 5),
		at$5("toad", 8, -20.5, 15.5),
		at$5("lamp", -6, 18, 3),
		at$5("lamp", 6, 18, 3),
		at$5("lamp", 0, 2, 8),
		at$5("lamp", 20, 4, 8),
		at$5("lamp", 8, -21, 18),
		at$5("chain", -3, 3, 9),
		at$5("chain", 12, -4, 14),
		at$5("light", -21, -21, 15.5, { props: { color: "yellow" } }),
		at$5("npc", 4, 16, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp! This shaft is old. The lifts still work, mostly.",
				"Step on, ride up, and step off when it stops. Do not fall!",
				"Something shiny is up at the very top, past the planks."
			]
		} })
	]
};
var SHAFT_WEDGES = [{
	id: "top",
	name: "Top of the Shaft",
	hint: "Lifts, pillars, another lift, then all the way along the planks.",
	x: -21,
	y: 15.5,
	z: -18,
	appears: null
}, {
	id: "crumbs",
	name: "Every Crumb in the Shaft",
	hint: "Cheese on every landing, all the way up.",
	x: -4,
	y: 0,
	z: 14,
	appears: collect$4("crumb", "Find every crumb")
}];
function foundryShaft() {
	return {
		...compileCustom(shaftArea, "shaft"),
		world: "foundry",
		returnTo: "foundry",
		wedges: SHAFT_WEDGES,
		goals: SHAFT_WEDGES.map((w) => w.appears ?? {
			type: "reach",
			x: w.x,
			y: w.y,
			z: w.z,
			radius: 1.5,
			label: w.name
		})
	};
}
/**
* The Coal Bin (a gear secret: the Cleaver). The north-west corner behind the gate is walled off to the roof; the only
* way in is a doorway filled by one crate twice the usual size, bound in iron. A plain sword, a plunge and its blast
* all ring off it; only a blade that hits twice as hard breaks it.
*/
var BIN = {
	x0: -22,
	x1: -19,
	z0: -22,
	wallZ: -19.5,
	doorX0: -21,
	crate: 2
};
var BIN_CRATE = {
	...extent("rubble", BIN.doorX0, BIN.x1, 0, BIN.crate, BIN.wallZ - .5, BIN.wallZ + 1.5),
	tough: true
};
var cellarArea = {
	name: "The Coal Cellars",
	blurb: "Under the storehouse. Two plates open the gate. Beasts, coal barrels and a high ledge.",
	theme: "foundry",
	width: 44,
	depth: 44,
	wallHeight: 12,
	pieces: [
		box$5("floor", -22, -22, 22, 22, 0),
		at$5("spawn", 0, 18),
		at$5("exit", 0, 22),
		box$5("wall", -9, 4, -8, 22, 6),
		box$5("wall", 8, 4, 9, 22, 6),
		at$5("plate", -15, 16),
		at$5("plate", 15, 16),
		at$5("stag", -15, 10, 0, { dir: "s" }),
		at$5("roach", 15, 10),
		at$5("toad", 0, 8),
		box$5("wall", -22, -5, -4, -4, 6),
		box$5("wall", 4, -5, 22, -4, 6),
		box$5("gate", -4, -5, 4, -4, 0, { props: { opens: "plates" } }),
		box$5("pillar", -12, -12, -10, -10, 5),
		box$5("pillar", 10, -12, 12, -10, 5),
		box$5("pillar", -2, -15, 0, -13, 5),
		at$5("toad", -15, -17),
		at$5("toad", 15, -17),
		at$5("beetle", 0, -9),
		at$5("barrel", -18, -8, 0, { props: { item: "cap" } }),
		at$5("barrel", -18, -10),
		at$5("crate", 18, -8, 0, { props: { item: "crumb" } }),
		at$5("crate", 18, -10),
		box$5("stairs", 16, -18, 19, -12, 3, {
			dir: "n",
			bottom: 0
		}),
		box$5("platform", 14, -22, 22, -18, 3),
		at$5("cap", -20, 20),
		at$5("cap", 20, 20),
		at$5("cap", -6, -20),
		at$5("crumb", 0, 14),
		at$5("crumb", -15, 6),
		at$5("crumb", 15, 6),
		at$5("crumb", -10, -18),
		at$5("crumb", 10, -18),
		at$5("lamp", -6, 20, 3),
		at$5("lamp", 6, 20, 3),
		at$5("chain", -3, 10, 7),
		at$5("chain", 3, 10, 7),
		box$5("wall", BIN.x1, BIN.z0, BIN.x1 + 1, BIN.wallZ + 1, 12),
		box$5("wall", BIN.x0, BIN.wallZ, BIN.doorX0, BIN.wallZ + 1, 12),
		box$5("wall", BIN.doorX0, BIN.wallZ, BIN.x1, BIN.wallZ + 1, 12, { bottom: BIN.crate }),
		at$5("brazier", -13, -21),
		at$5("light", 20, -21, 3, { props: { color: "yellow" } }),
		at$5("window", -21.5, 0, 5, { dir: "e" }),
		at$5("window", 21.5, 0, 5, { dir: "w" }),
		at$5("npc", 5, 19, 0, { props: {
			name: "Wren",
			kind: "bird",
			lines: [
				"Chirp! It is dark down here. Stand on both plates and the gate lifts.",
				"The roaches guard the side bays. The toad in the middle spits, so mind it. Behind the gate there is an ironback: its shell turns a sword, so go round behind it, or let it run into a wall.",
				"Caps in the corners, and something up on the ledge in the far corner."
			]
		} })
	]
};
var CELLAR_WEDGES = [
	{
		id: "crew",
		name: "Clear the Cellars",
		hint: "Beat every beast, in the bays and behind the gate.",
		x: 0,
		y: 0,
		z: -18,
		appears: {
			type: "defeat",
			label: "Beat every beast"
		}
	},
	{
		id: "ledge",
		name: "The Coal Ledge",
		hint: "Up the stair in the far corner, behind the gate.",
		x: 19,
		y: 3,
		z: -20,
		appears: null
	},
	{
		id: "caps",
		name: "Four Caps in the Coal",
		hint: "One in each bay's corner, one in a barrel, one by the back wall.",
		x: -4,
		y: 0,
		z: 14,
		appears: collect$4("cap", "Find every cap")
	},
	{
		id: "bin",
		name: "The Coal Bin",
		hint: "Behind the gate, a walled corner shut with a crate bound in iron. A rat sword rings off it. Something that hits twice as hard would not.",
		x: -20.5,
		y: 0,
		z: -21.2,
		appears: null,
		gear: "cleaver"
	}
];
function foundryCellars() {
	const def = compileCustom(cellarArea, "coalcellars");
	const shelves = [-4.4, 4.4].map((x) => ({
		...extent("plank", x - 1.75, x + 1.75, 0, 2.5, -22, -21.5),
		hidden: true
	}));
	return {
		...def,
		world: "foundry",
		returnTo: "foundry",
		solids: [
			...def.solids,
			...shelves,
			BIN_CRATE
		],
		crateContents: [...def.crateContents, null],
		decor: [
			...def.decor,
			{
				kind: "shelf",
				x: 4.4,
				y: 0,
				z: -21.97,
				yaw: 0,
				width: 3.4,
				height: 2.5
			},
			{
				kind: "shelf",
				x: -4.4,
				y: 0,
				z: -21.97,
				yaw: 0,
				width: 3.4,
				height: 2.5
			}
		],
		wedges: CELLAR_WEDGES,
		goals: CELLAR_WEDGES.map((w) => w.appears ?? {
			type: "reach",
			x: w.x,
			y: w.y,
			z: w.z,
			radius: 1.5,
			label: w.name
		})
	};
}
// src/levels/hollows.ts
/**
* World Three: the Hollows. A vast cave under the roots, split by a chasm with no bottom. Where the Cistern climbs and the
* Foundry burns, the Hollows drops: most of it is about getting down, and across, without falling into the dark.
* A fall costs a heart and puts him back on the last ground he stood on (fallBack). The old Web Hollow and Leap of Faith
* are its side areas.
*
*   SOUTH  The Mouth: he comes in high up. The Lip, a stone tongue, juts out over the chasm. Stairs go down the east side
*          to the Undershelf, the ground below.
*   MIDDLE Spider Rock, standing up out of the chasm, 13.5 out from the end of the Lip and 6 below it: a long jump lands
*          it easily, a double jump only if timed just right. Or ride the slider out from the Root Shelf and jump the last gap. Off the rock you drop to the Faith Stones.
*   ACROSS The Faith Stones: a line of narrow pillars over the chasm, a double jump apart, from the Undershelf to the north.
*   WEST   The Webbed Gallery: three ledges over the drop joined by rope bridges, crawling with beasts. The door to Web
*          Hollow is on the middle ledge.
*   NORTH  The Mushroom Climb: giant caps, each a double jump higher than the last, up to the High Hollow in the wall.
*          The ways there are held: a hornet lancer over the east bank, two ant pikemen where the west path comes out.
*          And over the west end of the Undershelf a firefly bomber flies, dropping fire.
*   NE     The Crystal Grotto, lit by crystals; the door to Leap of Faith is inside. Its roof is worth a look.
*   Three golden relics are hidden round the cave; find all three and a wedge appears in the grotto.
*
* Room: x -48..48, z -48..48; north is -z. A flat double jump carries about 10; down 6, a long jump carries about 13.6.
*/
var at$4 = (t, x, z, top = 0, extra = {}) => ({
	t,
	x0: x,
	z0: z,
	x1: x,
	z1: z,
	top,
	...extra
});
var box$4 = (t, x0, z0, x1, z1, top, extra = {}) => ({
	t,
	x0,
	z0,
	x1,
	z1,
	top,
	...extra
});
var collect$3 = (kind, label) => ({
	type: "collect",
	kind,
	count: "all",
	label
});
var goalsOf$2 = (ws) => ws.map((w) => w.appears ?? {
	type: "reach",
	x: w.x,
	y: w.y,
	z: w.z,
	radius: 1.5,
	label: w.name
});
/** The room's own walls in cave rock (the older themes show sewer brick there). */
var rockWalls = (def) => def.solids.map((b, i) => i < 4 ? {
	...b,
	skin: "roughRock"
} : b);
var MOUTH = 16;
var SHELF = 10;
var GALLERY = 4;
var DEEP$2 = -24;
/** Spider Rock. The Lip ends at z 22, 13.5 short of it: a long jump lands it easily, a double jump only if timed just right. */
var ROCK_BOX = {
	x0: -6,
	x1: 6,
	z0: -4,
	z1: 8.5
};
var LIP$1 = {
	x0: -3,
	x1: 3,
	z0: 22,
	z1: 38
};
/** The Faith Stones (2 x 2 tops), south to north. */
var STONES = [
	23.5,
	14,
	4.5,
	-5,
	-14.5,
	-24
].map((z) => ({
	x0: -11,
	x1: -9,
	z0: z - 1,
	z1: z + 1
}));
/** The mushroom caps, each 3.5 higher than the last, then the High Hollow. */
var CAPS = [
	{
		x: 16,
		z: -34,
		top: 3
	},
	{
		x: 21,
		z: -40,
		top: 6.5
	},
	{
		x: 16,
		z: -45,
		top: 10
	},
	{
		x: 9,
		z: -41,
		top: 13
	},
	{
		x: 3,
		z: -36,
		top: 16.5
	}
];
var GALLERY_LEDGES = [
	{
		x0: -48,
		x1: -34,
		z0: 14,
		z1: 32
	},
	{
		x0: -48,
		x1: -34,
		z0: -8,
		z1: 8
	},
	{
		x0: -48,
		x1: -34,
		z0: -28,
		z1: -14
	}
];
/** The east bank's hornet, and the north floor's two pikemen with the floor they keep to (its west end). */
var BANK_HORNET = {
	x: 32,
	z: -16
};
/** (Well back from the mouth of the west path, so that he is out on the open floor before they see him, clear of the brazier there.) */
var NORTH_ANTS = [{
	x: -28,
	z: -45
}, {
	x: -24,
	z: -45
}];
var NORTH_WEST_FLOOR = {
	x0: -48,
	x1: -4,
	z0: -48,
	z1: -30
};
/**
* The Undershelf's firefly: over its west end, where the ways to the gallery, the west path and the Faith Stones part.
* Its air: that end of the shelf and out over the chasm beside it (clear of Spider Rock and the pillars under the Mouth).
*/
var SHELF_FIREFLY = {
	x: -30,
	z: 40
};
var FIREFLY_AIR = {
	x0: -47,
	x1: -13,
	z0: 22,
	z1: 47
};
var cave = {
	name: "The Hollows",
	blurb: "A cave split by a chasm with no bottom. Spider Rock, the Faith Stones, a gallery of webs and a climb up giant mushrooms.",
	theme: "cave",
	music: "echo",
	width: 96,
	depth: 96,
	wallHeight: 40,
	pieces: [
		box$4("floor", -48, 32, 48, 48, 0),
		box$4("floor", -48, -48, 48, -30, 0),
		box$4("floor", -30, -30, -22, 32, 0),
		box$4("floor", 22, -30, 48, 32, 0),
		box$4("platform", -12, 38, 12, 48, MOUTH, {
			bottom: 15,
			skin: "wetRock"
		}),
		box$4("pillar", -12, 38, -10, 40, 15),
		box$4("pillar", 10, 38, 12, 40, 15),
		box$4("pillar", -12, 46, -10, 48, 15),
		box$4("pillar", 10, 46, 12, 48, 15),
		box$4("platform", LIP$1.x0, LIP$1.z0, LIP$1.x1, LIP$1.z1, MOUTH, {
			bottom: 15,
			skin: "wetRock"
		}),
		box$4("stairs", 12, 41, 32, 47, MOUTH, {
			dir: "w",
			bottom: 0
		}),
		at$4("spawn", 0, 43, MOUTH),
		at$4("exit", 0, 48, MOUTH),
		box$4("pillar", ROCK_BOX.x0, ROCK_BOX.z0, ROCK_BOX.x1, ROCK_BOX.z1, 10, { bottom: DEEP$2 }),
		box$4("platform", -2, ROCK_BOX.z1, 2, 11, 3, {
			bottom: 2.5,
			skin: "wetRock"
		}),
		box$4("platform", 36, -4, 48, 8, SHELF, { bottom: 0 }),
		box$4("stairs", 38, 8, 46, 20, SHELF, {
			dir: "n",
			bottom: 0
		}),
		box$4("lift", 33, 0, 36, 3, SHELF, { props: {
			move: "w",
			travel: 20,
			speed: 2.4,
			pause: 1.5
		} }),
		...STONES.map((s) => box$4("pillar", s.x0, s.z0, s.x1, s.z1, 0, {
			bottom: DEEP$2,
			skin: "wetRock"
		})),
		...GALLERY_LEDGES.map((g) => box$4("platform", g.x0, g.z0, g.x1, g.z1, GALLERY, {
			bottom: DEEP$2,
			skin: "wetRock"
		})),
		box$4("stairs", -46, 32, -38, 37, GALLERY, {
			dir: "n",
			bottom: 0
		}),
		box$4("bridge", -43, 8, -40, 14, GALLERY),
		box$4("bridge", -43, -14, -40, -8, GALLERY),
		at$4("roach", -40, 26, GALLERY),
		at$4("roach", -44, -18, GALLERY),
		at$4("mantis", -40, -1, GALLERY, { dir: "s" }),
		at$4("toad", -44, 2, GALLERY),
		at$4("toad", -39, -24, GALLERY),
		at$4("bat", -44, 19, GALLERY),
		at$4("bat", -39, 23, GALLERY),
		at$4("hornet", BANK_HORNET.x, BANK_HORNET.z, 0, { dir: "s" }),
		at$4("ant", NORTH_ANTS[0].x, NORTH_ANTS[0].z, 0, { dir: "s" }),
		at$4("ant", NORTH_ANTS[1].x, NORTH_ANTS[1].z, 0, { dir: "s" }),
		at$4("firefly", SHELF_FIREFLY.x, SHELF_FIREFLY.z, 0, { dir: "e" }),
		...CAPS.flatMap((c) => [box$4("platform", c.x - 2, c.z - 2, c.x + 2, c.z + 2, c.top, {
			bottom: c.top - .6,
			skin: "mushroomPatch"
		}), box$4("pillar", c.x - .6, c.z - .6, c.x + .6, c.z + .6, c.top - .6, { skin: "stalagmite" })]),
		box$4("platform", -4, -48, 2, -44, 20, {
			bottom: 19,
			skin: "wetRock"
		}),
		box$4("wall", 30, -48, 31, -43, 6, { skin: "crystalRock" }),
		box$4("wall", 30, -39, 31, -34, 6, { skin: "crystalRock" }),
		box$4("wall", 30, -34, 48, -33, 6, { skin: "crystalRock" }),
		box$4("platform", 30, -48, 48, -33, 6.5, { bottom: 6 }),
		at$4("relic", 35, -45, 6.5),
		at$4("relic", -46, -26, GALLERY),
		at$4("relic", 0, 9.8, 3),
		at$4("cap", -10, 46, MOUTH),
		at$4("cap", 46, 6, SHELF),
		at$4("cap", 16, -45, 10),
		at$4("cap", -26, -20),
		at$4("cap", 44, 44),
		at$4("crumb", 0, 42),
		at$4("crumb", 20, 36),
		at$4("crumb", -20, 36),
		at$4("crumb", 0, 26, MOUTH),
		at$4("crumb", -26, 10),
		at$4("crumb", -26, -10),
		at$4("crumb", -40, 20, GALLERY),
		at$4("crumb", -41, -4, GALLERY),
		at$4("crumb", -41, -22, GALLERY),
		at$4("crumb", -10, -36),
		at$4("crumb", 16, -34, 3),
		at$4("crumb", 9, -41, 13),
		at$4("crumb", 28, 0),
		at$4("crumb", 28, 20),
		at$4("crumb", 40, 2, SHELF),
		at$4("crumb", -10, 14),
		at$4("crumb", -10, -24),
		at$4("npc", -5, 43, MOUTH, { props: {
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp! The Hollows. Listen... hear that? Nothing. That is how deep the chasm goes.",
				"Spider Rock, down there in the middle. Run off the end of the Lip, let go of RUN and jump: a long jump. You might just land on it.",
				"Fall in and you lose a heart, but you climb back out where you were. Do not make a habit of it.",
				"There is a door under the Mouth that goes somewhere very dark. You would want a lamp. I am not going in there."
			]
		} }),
		at$4("npc", 26, -38, 0, { props: {
			name: "Wren",
			kind: "bird",
			lines: [
				"Chirp! The crystals in that grotto sing if you listen. Well, hum.",
				"There are three golden relics hidden in the Hollows. Find them all and the grotto gives something back.",
				"Someone left a door in there too. It goes to a place with a lot of very small floors."
			]
		} }),
		at$4("light", 4, -2, 10, { props: { color: "purple" } }),
		at$4("light", 0, -45, 20, { props: { color: "yellow" } }),
		at$4("light", 35, -36, 0, { props: { color: "blue" } }),
		at$4("light", 46, -46, 0, { props: { color: "purple" } }),
		at$4("light", 33, -47, 0, { props: { color: "blue" } }),
		at$4("light", 46, 0, SHELF, { props: { color: "green" } }),
		at$4("light", 12, -37, 0, { props: { color: "green" } }),
		at$4("light", 25, -35, 0, { props: { color: "blue" } }),
		at$4("brazier", -16, 34),
		at$4("brazier", 16, 34),
		at$4("brazier", -26, -28),
		at$4("brazier", 26, -28),
		at$4("lamp", -9, 42, 18.5),
		at$4("lamp", 9, 42, 18.5),
		at$4("lamp", 0, 30, 18.5),
		at$4("lamp", -41, 30, 6.5),
		at$4("lamp", -41, -12, 6.5),
		...[
			[-16, -10],
			[14, 18],
			[18, -16],
			[-14, 20],
			[0, -20]
		].map(([x, z]) => box$4("pillar", x - 1, z - 1, x + 1, z + 1, 40, {
			bottom: 31,
			skin: "stalagmite"
		})),
		box$4("pillar", 26, 24, 28, 26, 3, { skin: "stalagmite" }),
		box$4("pillar", 30, -22, 32, -20, 2.5, { skin: "stalagmite" }),
		at$4("web", -47.5, 24, 7, { dir: "e" }),
		at$4("web", -47.5, -4, 8, { dir: "e" }),
		at$4("web", -47.5, -22, 7, { dir: "e" }),
		at$4("web", 6.1, 2, 6, { dir: "e" }),
		at$4("web", -6.1, 6, 5, { dir: "w" }),
		at$4("web", -6, -47.5, 18, { dir: "s" }),
		at$4("slime", 47.5, 26, 9, { dir: "w" }),
		at$4("slime", -20, 47.5, 10, { dir: "n" }),
		at$4("crystal", 34, -46, 0, { props: { color: "blue" } }),
		at$4("crystal", 40, -46.5, 0, { props: { color: "purple" } }),
		at$4("crystal", 46.5, -40, 0, { props: { color: "blue" } }),
		at$4("crystal", 43.5, -47, 0, { props: { color: "purple" } }),
		at$4("crystal", 33, -36, 0, { props: { color: "blue" } }),
		at$4("crystal", -2.5, -47, 20, { props: { color: "purple" } }),
		at$4("crystal", -46.5, 30, GALLERY, { props: { color: "blue" } }),
		at$4("crystal", -45, 46, 0, { props: { color: "blue" } }),
		at$4("crystal", 46, 30, 0, { props: { color: "purple" } }),
		at$4("crystal", 46.5, -6, SHELF, { props: { color: "blue" } }),
		...[
			[
				-18,
				0,
				26
			],
			[
				14,
				-10,
				24
			],
			[
				8,
				16,
				27
			],
			[
				-14,
				-22,
				25
			],
			[
				20,
				6,
				28
			],
			[
				0,
				36,
				22
			],
			[
				-41,
				18,
				10
			],
			[
				-41,
				-18,
				10
			],
			[
				-40,
				-2,
				11
			],
			[
				30,
				-18,
				9
			],
			[
				16,
				-30,
				21
			]
		].map(([x, z, b]) => at$4("roots", x, z, b)),
		at$4("torch", -3, 47.7, 18.5, { dir: "s" }),
		at$4("torch", 3, 47.7, 18.5, { dir: "s" })
	]
};
var HOLLOWS_WEDGES = [
	{
		id: "rock",
		name: "Spider Rock",
		hint: "A running leap off the end of the Lip (a long jump, or a double jump timed just right), or the slider from the Root Shelf.",
		x: 0,
		y: 10,
		z: 3,
		appears: null
	},
	{
		id: "faith",
		name: "The Faith Stones",
		hint: "Out along the stones over the chasm. Each one is a double jump.",
		x: -10,
		y: 0,
		z: -5,
		appears: null
	},
	{
		id: "gallery",
		name: "The Webbed Gallery",
		hint: "Beat every beast on the gallery ledges.",
		x: -41,
		y: GALLERY,
		z: 0,
		appears: {
			type: "defeat",
			label: "Clear the gallery"
		}
	},
	{
		id: "high",
		name: "The High Hollow",
		hint: "Up the giant mushrooms, each a double jump higher, to the nook in the north wall.",
		x: -1,
		y: 20,
		z: -46,
		appears: null
	},
	{
		id: "relics",
		name: "Three Relics",
		hint: "One on a roof, one in the gallery, one in the spider's larder.",
		x: 40,
		y: 0,
		z: -40,
		appears: collect$3("relic", "Find the three relics")
	}
];
function hollows() {
	const def = compileCustom(cave, "hollows");
	const enemies = def.enemies.map((e) => {
		const g = GALLERY_LEDGES.find((l) => e.x > l.x0 && e.x < l.x1 && e.z > l.z0 && e.z < l.z1);
		if (g) return {
			...e,
			arena: {
				x0: g.x0 + 1.5,
				x1: g.x1 - 1,
				z0: g.z0 + 1,
				z1: g.z1 - 1
			}
		};
		const F = NORTH_WEST_FLOOR;
		if (e.type === "firefly") return {
			...e,
			uncounted: true,
			arena: FIREFLY_AIR
		};
		return e.type === "ant" ? {
			...e,
			uncounted: true,
			arena: {
				x0: F.x0 + 1,
				x1: F.x1 - 1,
				z0: F.z0 + 1,
				z1: F.z1 - 1
			}
		} : {
			...e,
			uncounted: true
		};
	});
	return {
		...def,
		world: "hollows",
		fallBack: true,
		solids: rockWalls(def),
		enemies,
		courseDoors: [
			{
				to: "webs",
				name: "Web Hollow",
				need: 0,
				door: doorOn("west", 48, 0, 48, GALLERY)
			},
			{
				to: "brood",
				name: "The Brood Pit",
				need: 0,
				door: doorOn("west", 48, -21, 48, GALLERY)
			},
			{
				to: "faith",
				name: "Leap of Faith",
				need: 0,
				door: doorOn("east", 48, -41, 48, 0)
			},
			{
				to: "dark",
				name: "The Lightless Way",
				need: 0,
				door: doorOn("south", 48, -24, 48, 0)
			}
		],
		fogRange: [30, 125],
		wedges: HOLLOWS_WEDGES,
		goals: goalsOf$2(HOLLOWS_WEDGES)
	};
}
var websArea = {
	name: "Web Hollow",
	blurb: "Rope bridges over the dark, cobwebs on the walls and beasts on every ledge. A fall sends you back to the start.",
	theme: "cave",
	music: "echo",
	width: 44,
	depth: 44,
	wallHeight: 16,
	pieces: [
		box$4("floor", -8, 14, 8, 22, 0),
		at$4("spawn", 0, 18),
		at$4("exit", 0, 22),
		box$4("bridge", -1.5, 4, 1.5, 14, 0),
		box$4("floor", -8, -4, 8, 4, 0),
		box$4("bridge", -16, -1.5, -8, 1.5, 0),
		box$4("floor", -22, -8, -16, 6, 0),
		box$4("stairs", -21, -14, -17, -8, 4, {
			dir: "n",
			bottom: 0
		}),
		box$4("platform", -22, -22, -10, -14, 4),
		box$4("bridge", -10, -19.5, 6, -16.5, 4),
		box$4("platform", 6, -22, 22, -10, 4),
		at$4("crumb", 0, 9),
		at$4("crumb", 0, 0),
		at$4("crumb", -12, 0),
		at$4("crumb", -19, -3),
		at$4("crumb", -16, -18, 4),
		at$4("crumb", -2, -18, 4),
		at$4("crumb", 12, -14, 4),
		at$4("crumb", 18, -18, 4),
		at$4("mantis", 0, -1, 0, { dir: "s" }),
		at$4("roach", -19, 1),
		at$4("toad", -16, -18, 4),
		at$4("roach", 14, -14, 4),
		at$4("bat", -19, -4),
		at$4("web", -21.9, 10, 3, { dir: "e" }),
		at$4("web", 21.9, 6, 4, { dir: "w" }),
		at$4("web", -21.9, -18, 8, { dir: "e" }),
		at$4("web", 0, -21.9, 8, { dir: "s" }),
		at$4("web", 10, -21.9, 7, { dir: "s" }),
		at$4("slime", 21.9, 14, 8, { dir: "w" }),
		at$4("lamp", -6, 20, 3),
		at$4("lamp", 6, 20, 3),
		at$4("lamp", 0, 2, 3),
		at$4("brazier", -20, 4),
		at$4("brazier", 20, -12, 4),
		at$4("light", 21, -21, 4, { props: { color: "purple" } }),
		at$4("npc", 5, 18, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp! Spiders have been busy down here.",
				"Cross the rope bridge, then take the west bridge to the stairs.",
				"Mind the drop: there is no floor under the bridges. Fall and you start again from here."
			]
		} })
	]
};
var WEBS_WEDGES = [
	{
		id: "far",
		name: "The Far Ledge",
		hint: "Over both bridges, up the stairs and across the last bridge.",
		x: 18,
		y: 4,
		z: -14,
		appears: null
	},
	{
		id: "crumbs",
		name: "Every Crumb in the Webs",
		hint: "Eight crumbs, on the bridges and the ledges.",
		x: -4,
		y: 0,
		z: 18,
		appears: collect$3("crumb", "Find every crumb")
	},
	{
		id: "hush",
		name: "The Sleeper's Wedge",
		hint: "On the west shelf, by the roach. It is gone the moment the roach stirs, and gone for good if the roach dies. You would have to be as quiet as moss.",
		x: -19.5,
		y: 0,
		z: -4.2,
		appears: {
			type: "unseen",
			radius: 7,
			label: "Let the roach sleep"
		},
		gear: "mossScarf"
	}
];
function hollowsWebs() {
	const def = compileCustom(websArea, "webs");
	return {
		...def,
		world: "hollows",
		returnTo: "hollows",
		solids: rockWalls(def),
		wedges: WEBS_WEDGES,
		goals: goalsOf$2(WEBS_WEDGES)
	};
}
/** The floor she fights on (she and her pounces stay inside it; it is a little inside the walls). */
var PIT_ARENA = {
	x0: -17,
	x1: 17,
	z0: -19,
	z1: 17
};
var pitArea = {
	name: "The Brood Pit",
	blurb: "A round pit hung with webs, and the Broodmother in the middle of it. Watch which leg goes up.",
	theme: "cave",
	music: "march",
	width: 40,
	depth: 46,
	wallHeight: 18,
	pieces: [
		box$4("floor", -20, -23, 20, 23, 0),
		at$4("spawn", 0, 20),
		at$4("exit", 0, 23),
		box$4("pillar", -20, -23, -16.5, -19.5, 18),
		box$4("pillar", 16.5, -23, 20, -19.5, 18),
		box$4("pillar", -20, 19.5, -16.5, 23, 18),
		box$4("pillar", 16.5, 19.5, 20, 23, 18),
		...[
			-12,
			0,
			12
		].flatMap((z) => [at$4("web", -19.9, z, 5, { dir: "e" }), at$4("web", 19.9, z, 6, { dir: "w" })]),
		...[
			-10,
			0,
			10
		].map((x) => at$4("web", x, -22.9, 6, { dir: "s" })),
		at$4("web", -9, 22.9, 7, { dir: "n" }),
		at$4("web", 9, 22.9, 7, { dir: "n" }),
		at$4("slime", -19.9, 6, 9, { dir: "e" }),
		at$4("slime", 19.9, -6, 9, { dir: "w" }),
		at$4("crystal", -14, -21.3, 0, { props: { color: "purple" } }),
		at$4("crystal", 14, -21.3, 0, { props: { color: "purple" } }),
		at$4("crystal", -18.9, 2, 0, { props: { color: "blue" } }),
		at$4("crystal", 18.9, -3, 0, { props: { color: "blue" } }),
		at$4("lamp", -8, 21, 4),
		at$4("lamp", 8, 21, 4),
		at$4("brazier", -18.9, 12),
		at$4("brazier", 18.9, 12),
		at$4("brazier", -18.9, -12),
		at$4("brazier", 18.9, -12),
		at$4("light", 0, -22, 0, { props: { color: "red" } }),
		at$4("light", -15.3, 22, 0, { props: { color: "purple" } }),
		at$4("light", 15.3, 22, 0, { props: { color: "purple" } }),
		at$4("roots", -6, -22.5, 10),
		at$4("roots", 7, -22.5, 11)
	]
};
var PIT_WEDGES$1 = [{
	id: "brood",
	name: "The Broodmother",
	hint: "Beat her. Step out from under the leg that goes up, jump the scissor, run from the pounce, and get out of her shadow when the thread twangs. Hit her while her spikes are stuck.",
	x: 0,
	y: 0,
	z: -4,
	appears: {
		type: "defeat",
		label: "Beat the Broodmother"
	}
}];
function hollowsPit() {
	const def = compileCustom(pitArea, "brood");
	return {
		...def,
		world: "hollows",
		returnTo: "hollows",
		solids: rockWalls(def),
		enemies: [...def.enemies, {
			type: "brood",
			x: 0,
			y: 0,
			z: -4,
			facing: 0,
			arena: PIT_ARENA,
			respawn: false
		}],
		fogRange: [26, 90],
		wedges: PIT_WEDGES$1,
		goals: goalsOf$2(PIT_WEDGES$1)
	};
}
function hollowsFaith() {
	const H = 36;
	const gap = Math.round(maxRunJumpDistance() * .9 * 100) / 100;
	const solids = room(H, false).map((b) => ({
		...b,
		skin: "roughRock"
	}));
	const items = new Items("faith");
	const startZ = 28;
	solids.push({
		...extent("platform", -2, 2, -1, 0, 26, H),
		skin: "wetRock"
	});
	let front = 26;
	const lengths = 2.4;
	const centres = [];
	const fronts = [];
	for (let i = 0; i < 6; i++) {
		fronts.push(front);
		const zc = front - gap - lengths / 2;
		const xc = i % 2 === 0 ? .8 : -.8;
		solids.push({
			...block("platform", xc, zc, 2.6, lengths, 0, -1),
			skin: "wetRock"
		});
		centres.push([xc, zc]);
		front = zc - lengths / 2;
	}
	const farZ = front - gap - 2.5;
	solids.push({
		...block("platform", 0, farZ, 5, 5, 0, -1),
		skin: "wetRock"
	});
	for (const i of [
		1,
		3,
		5
	]) items.add("relic", centres[i][0], .9, centres[i][1]);
	for (const i of [
		0,
		2,
		4
	]) items.add("crumb", ((i === 0 ? 0 : centres[i - 1][0]) + centres[i][0]) / 2, 2.3, fronts[i] - gap / 2);
	const wedges = [{
		id: "far",
		name: "The Far Side",
		hint: "Six leaps, each at the very edge of a running jump.",
		x: 0,
		y: 0,
		z: farZ,
		appears: null
	}, {
		id: "relics",
		name: "Relics Over the Dark",
		hint: "Take the three relics on the way across.",
		x: -1.4,
		y: 0,
		z: 30,
		appears: collect$3("relic", "Take the three relics")
	}];
	return {
		id: "faith",
		name: "Leap of Faith",
		blurb: "Gaps at the limit of a running jump, over nothing. No grabbing, no long jump. Time every leap.",
		theme: "cave",
		music: "echo",
		fog: 922656,
		world: "hollows",
		returnTo: "hollows",
		noGrab: true,
		noLongJump: true,
		solids,
		pit: extent("floor", -36, H, -8.2, -8, -36, H),
		water: [],
		waves: [],
		gear: [],
		enemies: [],
		crateContents: [],
		decor: [{
			kind: "web",
			x: -35.9,
			y: 4,
			z: 0,
			yaw: Math.PI / 2,
			r: 2
		}, {
			kind: "web",
			x: 35.9,
			y: 5,
			z: -12,
			yaw: -Math.PI / 2,
			r: 1.8
		}],
		spawn: {
			x: 0,
			y: 0,
			z: startZ,
			facing: Math.PI
		},
		collectibles: items.list,
		wedges,
		goals: goalsOf$2(wedges),
		exit: doorOn("south", H)
	};
}
/** How far he can see in here (the fog). A lamp on his helmet pushes it back. */
var DARK_FOG = [1, 5];
/** The stones, south to north: [x, top, z]. Evenly spaced (7.2 apart) but turning, so he must see where the next one is. */
var DARK_STONES = [
	[
		0,
		0,
		33.8
	],
	[
		4.1,
		.5,
		27.9
	],
	[
		1.1,
		1,
		21.4
	],
	[
		-3.5,
		1,
		15.9
	],
	[
		-9,
		1.5,
		11.3
	],
	[
		-6.5,
		2,
		4.5
	],
	[
		-1.4,
		2,
		-.6
	],
	[
		2.2,
		2.5,
		-6.8
	],
	[
		-1.9,
		3,
		-12.7
	],
	[
		-5.5,
		3,
		-18.9
	]
];
/** Where he comes in, and the far side. */
var DARK_START = {
	x0: -4,
	x1: 4,
	z0: 40,
	z1: 48,
	top: 0
};
var DARK_END = {
	x0: -11.5,
	x1: .5,
	z0: -29.1,
	z1: -23.1,
	top: 3.5
};
var darkArea = {
	name: "The Lightless Way",
	blurb: "A path of stones over a drop, in the dark. You can hardly see the next one. A lamp would help.",
	theme: "cave",
	music: "echo",
	width: 40,
	depth: 96,
	wallHeight: 16,
	pieces: [
		box$4("platform", DARK_START.x0, DARK_START.z0, DARK_START.x1, DARK_START.z1, DARK_START.top, {
			bottom: DEEP$2,
			skin: "wetRock"
		}),
		at$4("spawn", 0, 44),
		at$4("exit", 0, 48),
		...DARK_STONES.map(([x, top, z]) => box$4("pillar", x - 1.1, z - 1.1, x + 1.1, z + 1.1, top, {
			bottom: DEEP$2,
			skin: "wetRock"
		})),
		box$4("platform", DARK_END.x0, DARK_END.z0, DARK_END.x1, DARK_END.z1, DARK_END.top, {
			bottom: DEEP$2,
			skin: "wetRock"
		}),
		...[
			1,
			3,
			5,
			7,
			9
		].map((i) => at$4("crumb", DARK_STONES[i][0], DARK_STONES[i][2], DARK_STONES[i][1])),
		at$4("crumb", -2, -24.5, DARK_END.top),
		at$4("crystal", DARK_END.x0 + 1, DARK_END.z0 + 1, DARK_END.top, { props: { color: "purple" } }),
		at$4("crystal", DARK_END.x1 - 1, DARK_END.z0 + 1, DARK_END.top, { props: { color: "blue" } }),
		at$4("torch", -2.5, 47.7, 2.5, { dir: "s" }),
		at$4("torch", 2.5, 47.7, 2.5, { dir: "s" })
	]
};
var DARK_WEDGES = [{
	id: "dark",
	name: "The Lightless Way",
	hint: "Over the stones in the dark to the far side. Wear a lamp, or jump where you think the next one is.",
	x: -5.5,
	y: DARK_END.top,
	z: -26.1,
	appears: null
}];
function hollowsDark() {
	const def = compileCustom(darkArea, "dark");
	return {
		...def,
		world: "hollows",
		returnTo: "hollows",
		fallBack: true,
		fogRange: DARK_FOG,
		solids: rockWalls(def),
		wedges: DARK_WEDGES,
		goals: goalsOf$2(DARK_WEDGES)
	};
}
// src/levels/keep.ts
/**
* The last world: Grimsqueak's Keep. A castle built over the pit where the Deep Engine turns, far below. Everything the
* other worlds taught comes back here, one after another, on the way up to his throne.
* A fall into the pit costs a heart and puts him back on the last ground he stood on (fallBack).
*
*   SOUTH  The courtyard. Two guards, and a portcullis in the gatehouse wall: stand on both plates and it lifts.
*          Behind it, the inner ward, a ledge along the wall over the pit, held by two ant pikemen; and over its
*          west end, where a bottle cap lies, a firefly bomber.
*   EAST   The Burning Walk: the ledge along the east wall turns to lava. Stones across it, a double jump apart at the
*          end, with two toads spitting from the far side.
*   NORTH  The Broken Stair: steps along the north wall rising west over the pit, some a hop apart, some a double jump.
*   NW     The landing. A chimney between the north wall and a free-standing wall: wall-kick up it to the Throne Ledge
*          and the door to his throne room.
*   WEST   The battlements, off the landing: guards behind the crenels, and a slider out to the Engine Stack, a column in
*          the middle of the pit with a wedge on top.
*   Beyond the throne door, the throne room (id 'lair'): Lord Grimsqueak himself. Win, take the wedge, and go home.
*
* Room: x -48..48, z -48..48; north is -z.
*/
var at$3 = (t, x, z, top = 0, extra = {}) => ({
	t,
	x0: x,
	z0: z,
	x1: x,
	z1: z,
	top,
	...extra
});
var box$3 = (t, x0, z0, x1, z1, top, extra = {}) => ({
	t,
	x0,
	z0,
	x1,
	z1,
	top,
	...extra
});
var collect$2 = (kind, label) => ({
	type: "collect",
	kind,
	count: "all",
	label
});
var goalsOf$1 = (ws) => ws.map((w) => w.appears ?? {
	type: "reach",
	x: w.x,
	y: w.y,
	z: w.z,
	radius: 1.5,
	label: w.name
});
var WALL = 12;
var DEEP$1 = -30;
/** The Broken Stair, east to west: 3 wide, 8 deep against the north wall, each 1.5 higher; gaps of 3 and 6 by turns. */
var STAIR = [
	{
		x0: 23,
		x1: 26,
		top: 1.5
	},
	{
		x0: 17,
		x1: 20,
		top: 3
	},
	{
		x0: 8,
		x1: 11,
		top: 4.5
	},
	{
		x0: 2,
		x1: 5,
		top: 6
	},
	{
		x0: -7,
		x1: -4,
		top: 7.5
	},
	{
		x0: -13,
		x1: -10,
		top: 9
	},
	{
		x0: -22,
		x1: -19,
		top: 10.5
	}
];
var STAIR_Z = {
	z0: -48,
	z1: -40
};
var LANDING = {
	x0: -48,
	x1: -26,
	z0: -48,
	z1: -36
};
/** The chimney: between the north wall (z -48) and a free wall whose face is at z -44, over the landing. */
var CHIMNEY_WALL$1 = {
	x0: -42,
	x1: -32,
	z0: -44,
	z1: -43
};
var THRONE_LEDGE = {
	x0: -32,
	x1: -22,
	z0: -48,
	z1: -42
};
var STACK_BOX = {
	x0: -6,
	x1: 6,
	z0: -18,
	z1: -6
};
var BATTLEMENTS = {
	x0: -48,
	x1: -38,
	z0: -36,
	z1: 14
};
var EAST_FAR = {
	x0: 38,
	x1: 48,
	z0: -38,
	z1: -20
};
var COURTYARD = {
	x0: -48,
	x1: 48,
	z0: 28,
	z1: 48
};
/** The inner ward: a ledge behind the gatehouse wall, the pit along its north side. */
var WARD = {
	x0: -48,
	x1: 48,
	z0: 18,
	z1: 26
};
/**
* The west ward's firefly, and its air: the west half of the ward and out over the pit beside it (short of the Engine
* Stack; the battlements stand in its north-west corner and the gatehouse wall along its south side).
*/
var WARD_FIREFLY = {
	x: -28,
	z: 22
};
var WARD_AIR = {
	x0: -47,
	x1: -8,
	z0: 6,
	z1: 25.4
};
var keepArea = {
	name: "Grimsqueak's Keep",
	blurb: "His castle, over the pit where the Engine turns. Lava, a broken stair, a chimney to climb, and his throne at the top.",
	theme: "keep",
	music: "march",
	width: 96,
	depth: 96,
	wallHeight: 44,
	pieces: [
		box$3("floor", COURTYARD.x0, COURTYARD.z0, COURTYARD.x1, COURTYARD.z1, 0),
		at$3("spawn", 0, 42),
		at$3("exit", 0, 48),
		box$3("wall", -48, 26, -4, 28, WALL),
		box$3("wall", 4, 26, 48, 28, WALL),
		box$3("platform", -4, 26, 4, 28, WALL, { bottom: 3.5 }),
		box$3("gate", -4, 26, 4, 28, 0, { props: { opens: "plates" } }),
		at$3("plate", -30, 36),
		at$3("plate", 30, 36),
		at$3("guard", -8, 31, 0, { dir: "s" }),
		at$3("guard", 8, 31, 0, { dir: "s" }),
		at$3("beetle", -30, 31),
		at$3("hornet", 30, 33, 0, { dir: "s" }),
		at$3("crate", -40, 44, 0, { props: { item: "cap" } }),
		at$3("crate", -41, 44),
		at$3("crate", -40, 44, 1),
		at$3("barrel", 40, 44),
		at$3("barrel", 41, 43, 0, { props: { item: "crumb" } }),
		box$3("floor", WARD.x0, WARD.z0, WARD.x1, WARD.z1, 0),
		at$3("ant", 22, 22, 0, { dir: "w" }),
		at$3("ant", 26, 22, 0, { dir: "w" }),
		at$3("firefly", WARD_FIREFLY.x, WARD_FIREFLY.z, 0, { dir: "e" }),
		box$3("floor", 38, 10, 48, 18, 0),
		box$3("lava", 38, -20, 48, 10, -.6),
		box$3("stone", 40, 4, 42, 6, .3),
		box$3("stone", 44, -3, 46, -1, .3),
		box$3("stone", 40, -10, 42, -8, .3),
		box$3("stone", 44, -17, 46, -15, .3),
		box$3("floor", EAST_FAR.x0, EAST_FAR.z0, EAST_FAR.x1, EAST_FAR.z1, 0),
		box$3("floor", 30, -48, 48, -38, 0),
		at$3("toad", 43, -30),
		at$3("toad", 46, -35),
		...STAIR.map((s) => box$3("platform", s.x0, STAIR_Z.z0, s.x1, STAIR_Z.z1, s.top, { bottom: DEEP$1 })),
		box$3("platform", LANDING.x0, LANDING.z0, LANDING.x1, LANDING.z1, WALL, { bottom: DEEP$1 }),
		box$3("wall", CHIMNEY_WALL$1.x0, CHIMNEY_WALL$1.z0, CHIMNEY_WALL$1.x1, CHIMNEY_WALL$1.z1, 24, { bottom: WALL }),
		box$3("platform", THRONE_LEDGE.x0, THRONE_LEDGE.z0, THRONE_LEDGE.x1, THRONE_LEDGE.z1, 24, { bottom: 23 }),
		box$3("platform", BATTLEMENTS.x0, BATTLEMENTS.z0, BATTLEMENTS.x1, BATTLEMENTS.z1, WALL, { bottom: DEEP$1 }),
		...[
			-32,
			-24,
			-18,
			-6,
			2,
			10
		].map((z) => box$3("wall", -38.8, z, -38, z + 2, 13.4, { bottom: WALL })),
		at$3("roach", -43, -26, WALL),
		at$3("guard", -43, 4, WALL, { dir: "n" }),
		at$3("toad", -44, -10, WALL),
		at$3("bat", -43, -17, WALL, { props: { perch: "chain" } }),
		at$3("bat", -43, 9, WALL, { props: { perch: "chain" } }),
		box$3("lift", -38, -13, -35, -10, WALL, { props: {
			move: "e",
			travel: 26,
			speed: 2.2,
			pause: 1.5
		} }),
		box$3("pillar", STACK_BOX.x0, STACK_BOX.z0, STACK_BOX.x1, STACK_BOX.z1, 14, { bottom: DEEP$1 }),
		at$3("cap", -46, 22),
		at$3("cap", 41, -9, .3),
		at$3("cap", 46, -46),
		at$3("cap", 9.5, -44, 4.5),
		at$3("cap", -11.5, -44, 9),
		at$3("cap", -46, -46, WALL),
		at$3("cap", -46, 12, WALL),
		at$3("crumb", -20, 40),
		at$3("crumb", 20, 40),
		at$3("crumb", -20, 22),
		at$3("crumb", 20, 22),
		at$3("crumb", 43, 14),
		at$3("crumb", 45, -2, .3),
		at$3("crumb", 45, -16, .3),
		at$3("crumb", 41, -34),
		at$3("crumb", 36, -44),
		at$3("crumb", 24.5, -44, 1.5),
		at$3("crumb", 18.5, -44, 3),
		at$3("crumb", 3.5, -44, 6),
		at$3("crumb", -5.5, -44, 7.5),
		at$3("crumb", -20.5, -44, 10.5),
		at$3("crumb", -30, -38, WALL),
		at$3("crumb", -43, -20, WALL),
		at$3("crumb", -43, 8, WALL),
		at$3("npc", -6, 42, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp... this is it. His keep. They built it right over the pit where the Engine turns.",
				"The portcullis wants both plates down. Then east, along the wall, and do not look at the lava too long.",
				"His throne is at the top, in the north-west. You will have to climb the chimney. Kick off one wall, then the other."
			]
		} }),
		at$3("npc", -29, -38, WALL, { props: {
			name: "Wren",
			kind: "bird",
			lines: ["Chirp! The chimney is behind that wall. Jump at one side, kick off it, kick off the other. Up and up.", "The battlements are south of here. Guards, and a lift out to the column in the middle. Something shines on it."]
		} }),
		...[
			-38,
			-24,
			-10,
			10,
			24,
			38
		].map((x) => at$3("banner", x, 28.3, 6, {
			dir: "n",
			props: { color: "purple" }
		})),
		...[-16, 16].map((x) => at$3("banner", x, 47.7, 6.5, {
			dir: "s",
			props: { color: "purple" }
		})),
		at$3("torch", -6, 28.3, 3.5, { dir: "n" }),
		at$3("torch", 6, 28.3, 3.5, { dir: "n" }),
		at$3("torch", -8, 47.7, 3, { dir: "s" }),
		at$3("torch", 8, 47.7, 3, { dir: "s" }),
		...[
			-30,
			-10,
			10,
			30
		].map((x) => at$3("torch", x, 25.7, 3, { dir: "s" })),
		...[
			14,
			-26,
			-34
		].map((z) => at$3("torch", 47.7, z, 3, { dir: "e" })),
		at$3("torch", 18.5, -47.7, 6, { dir: "n" }),
		at$3("torch", 3.5, -47.7, 9, { dir: "n" }),
		at$3("torch", -11.5, -47.7, 12, { dir: "n" }),
		at$3("banner", -31.2, -47.7, 29, {
			dir: "n",
			props: { color: "purple" }
		}),
		at$3("banner", -22.8, -47.7, 29, {
			dir: "n",
			props: { color: "purple" }
		}),
		at$3("torch", -29.4, -47.7, 26.5, { dir: "n" }),
		at$3("torch", -24.6, -47.7, 26.5, { dir: "n" }),
		...[
			-28,
			-12,
			8
		].map((z) => at$3("banner", -47.7, z, 18, {
			dir: "w",
			props: { color: "purple" }
		})),
		at$3("torch", -47.7, -20, 14.5, { dir: "w" }),
		at$3("torch", -47.7, 0, 14.5, { dir: "w" }),
		at$3("light", -6, 29, 0, { props: { color: "purple" } }),
		at$3("light", 6, 29, 0, { props: { color: "purple" } }),
		at$3("light", -24, -47, 24, { props: {
			color: "red",
			flash: 1
		} }),
		at$3("light", -30, -47, 24, { props: {
			color: "red",
			flash: 1
		} }),
		at$3("light", 4, -8, 14, { props: { color: "yellow" } }),
		at$3("light", 47, -37, 0, { props: { color: "purple" } }),
		at$3("light", -47, -35, WALL, { props: { color: "blue" } }),
		at$3("brazier", -10, 30),
		at$3("brazier", 10, 30),
		at$3("brazier", -36, 46),
		at$3("brazier", 36, 46),
		at$3("brazier", 46, 16),
		at$3("brazier", 40, -22),
		at$3("brazier", -46, -12, WALL),
		at$3("lamp", -8, 44, 4),
		at$3("lamp", 8, 44, 4),
		at$3("lamp", 0, 22, 4),
		at$3("lamp", -27, -44, 27),
		at$3("lamp", -37, -40, 15),
		...[
			[-20, -2],
			[20, -2],
			[-20, -28],
			[20, -26],
			[0, 6]
		].map(([x, z]) => at$3("chain", x, z, 6)),
		at$3("chain", -4, -16, 20),
		at$3("chain", 4, -8, 20),
		at$3("window", -47.5, 36, 9, { dir: "e" }),
		at$3("window", 47.5, 36, 9, { dir: "w" }),
		at$3("window", 47.5, -8, 14, { dir: "w" }),
		at$3("window", -47.5, -24, 20, { dir: "e" })
	]
};
/**
* The Pyre (a gear secret: the Ember Helm). A square of fire in the north-east ward, with a wedge standing in the heart
* of it, further in than anyone can reach from outside. Fire burns whoever is not fireproof and throws him back.
*/
var PYRE = {
	x0: 39.5,
	x1: 44.5,
	z0: -47.5,
	z1: -42.5,
	y: 0
};
var KEEP_WEDGES = [
	{
		id: "walk",
		name: "The Burning Walk",
		hint: "Through the portcullis, east, and over the lava on the stones.",
		x: 44,
		y: 0,
		z: -24,
		appears: null
	},
	{
		id: "chimney",
		name: "Up the Chimney",
		hint: "Up the Broken Stair to the landing, then wall-kick up the chimney to the Throne Ledge.",
		x: -24,
		y: 24,
		z: -46,
		appears: null
	},
	{
		id: "stack",
		name: "The Engine Stack",
		hint: "From the battlements, ride the slider out over the pit to the column.",
		x: 0,
		y: 14,
		z: -12,
		appears: null
	},
	{
		id: "guard",
		name: "The Keep's Guard",
		hint: "Beat every guard: the courtyard, the two pikemen in the ward behind the gate, the far end of the Burning Walk, the battlements.",
		x: 0,
		y: 0,
		z: 22,
		appears: {
			type: "defeat",
			label: "Beat every guard"
		}
	},
	{
		id: "caps",
		name: "Eight Bottle Caps",
		hint: "In a crate, at the end of the ward, on the lava, in the corner, on the stair, on the landing, on the battlements.",
		x: 8,
		y: 0,
		z: 40,
		appears: collect$2("cap", "Find all the caps")
	},
	{
		id: "pyre",
		name: "The Heart of the Pyre",
		hint: "A fire burns in the north-east ward, past the Burning Walk, and something gold stands in the middle of it. Only what was forged in fire walks through fire.",
		x: (PYRE.x0 + PYRE.x1) / 2,
		y: 0,
		z: (PYRE.z0 + PYRE.z1) / 2,
		appears: null,
		gear: "emberHelm"
	}
];
/** Enemies keep to the floor they started on (there is a pit round most of it). */
var FLOORS = [
	COURTYARD,
	WARD,
	EAST_FAR,
	BATTLEMENTS
];
function keep() {
	const def = compileCustom(keepArea, "keep");
	const enemies = def.enemies.map((e) => {
		if (e.type === "firefly") return {
			...e,
			uncounted: true,
			arena: WARD_AIR
		};
		const f = FLOORS.find((l) => e.x > l.x0 && e.x < l.x1 && e.z > l.z0 && e.z < l.z1);
		return f ? {
			...e,
			arena: {
				x0: f.x0 + 1,
				x1: f.x1 - 1,
				z0: f.z0 + 1,
				z1: f.z1 - 1
			}
		} : e;
	});
	return {
		...def,
		world: "keep",
		fallBack: true,
		enemies,
		decor: [
			...def.decor,
			{
				kind: "engine",
				x: 0,
				y: -50,
				z: -12,
				r: 20
			},
			{
				kind: "mark",
				glyph: "crown",
				x: -34.5,
				y: 28,
				z: -47.97,
				yaw: 0,
				size: 1.1,
				color: 8219282
			},
			{
				kind: "mark",
				glyph: "crown",
				x: -19.5,
				y: 28,
				z: -47.97,
				yaw: 0,
				size: 1.1,
				color: 8219282
			},
			{
				kind: "mark",
				glyph: "crown",
				x: 0,
				y: 8,
				z: 47.97,
				yaw: Math.PI,
				size: 1.4,
				color: 8219282
			}
		],
		courseDoors: [{
			to: "lair",
			name: "Grimsqueak's Throne",
			need: 0,
			door: doorOn("north", 48, -27, 48, 24)
		}],
		fogRange: [35, 140],
		fire: [PYRE],
		wedges: KEEP_WEDGES,
		goals: goalsOf$1(KEEP_WEDGES)
	};
}
var throneRoom = {
	name: "Grimsqueak's Throne",
	blurb: "A cold, high hall. He floats over the dais. Dodge the light he throws, and strike when he sinks.",
	theme: "keep",
	music: "march",
	width: 40,
	depth: 52,
	wallHeight: 16,
	pieces: [
		box$3("floor", -20, -26, -2.5, 26, 0),
		box$3("tile", -2.5, -11, 2.5, 26, 0),
		box$3("floor", 2.5, -26, 20, 26, 0),
		at$3("spawn", 0, 22),
		box$3("platform", -8, -26, -2.5, -16, 1.5),
		box$3("tile", -2.5, -26, 2.5, -16, 1.5, { bottom: 0 }),
		box$3("platform", 2.5, -26, 8, -16, 1.5),
		box$3("stairs", -3, -16, 3, -11, 1.5, {
			dir: "n",
			bottom: 0
		}),
		at$3("exit", 0, -26, 1.5),
		at$3("npc", 0, -17, 1.5, { props: {
			name: "Lord Grimsqueak",
			kind: "villain",
			lines: []
		} }),
		...[
			-14,
			-2,
			10,
			25
		].flatMap((z) => [box$3("pillar", -20, z - 1, -19, z + 1, 16), box$3("pillar", 19, z - 1, 20, z + 1, 16)]),
		at$3("brazier", -6, -18, 1.5),
		at$3("brazier", 6, -18, 1.5),
		at$3("brazier", -10, -12),
		at$3("brazier", 10, -12),
		at$3("brazier", -12, 14),
		at$3("brazier", 12, 14),
		at$3("lamp", -14, 18, 5),
		at$3("lamp", 14, 18, 5),
		at$3("lamp", -14, -4, 5),
		at$3("lamp", 14, -4, 5),
		at$3("chain", -6, 0, 9),
		at$3("chain", 6, 0, 9),
		at$3("chain", -6, 12, 9),
		at$3("chain", 6, 12, 9),
		at$3("light", -7.5, -25.5, 1.5, { props: { color: "purple" } }),
		at$3("light", 7.5, -25.5, 1.5, { props: { color: "purple" } }),
		at$3("light", -18.4, 25, 0, { props: {
			color: "red",
			flash: 1
		} }),
		at$3("light", 18.4, 25, 0, { props: {
			color: "red",
			flash: 1
		} }),
		at$3("window", -19.5, -8, 9, { dir: "e" }),
		at$3("window", 19.5, -8, 9, { dir: "w" }),
		...[
			-8,
			4,
			16
		].flatMap((z) => [at$3("banner", -19.7, z, 7, {
			dir: "w",
			props: { color: "purple" }
		}), at$3("banner", 19.7, z, 7, {
			dir: "e",
			props: { color: "purple" }
		})]),
		...[
			-8,
			4,
			16
		].flatMap((z) => [at$3("torch", -19.7, z + 4, 3.5, { dir: "w" }), at$3("torch", 19.7, z + 4, 3.5, { dir: "e" })]),
		at$3("banner", -10, -25.7, 6.8, {
			dir: "n",
			props: { color: "purple" }
		}),
		at$3("banner", 10, -25.7, 6.8, {
			dir: "n",
			props: { color: "purple" }
		}),
		at$3("crumb", -8, 12),
		at$3("crumb", 8, 12),
		at$3("crumb", -14, 0),
		at$3("crumb", 14, 0)
	]
};
var THRONE_WEDGES = [{
	id: "boss",
	name: "Lord Grimsqueak",
	hint: "Beat him. Keep moving when he throws, step aside when he dives, jump the ring, and hit the orb back.",
	x: 0,
	y: 0,
	z: -3,
	appears: {
		type: "defeat",
		label: "Beat Lord Grimsqueak"
	}
}];
function throne() {
	const def = compileCustom(throneRoom, "lair");
	return {
		...def,
		world: "keep",
		enemies: [...def.enemies, {
			type: "grimsqueak",
			x: 0,
			y: 0,
			z: -3
		}],
		decor: [
			...def.decor,
			{
				kind: "mark",
				glyph: "crown",
				x: -5,
				y: 7,
				z: -25.97,
				yaw: 0,
				size: 1.6,
				color: 8219282
			},
			{
				kind: "mark",
				glyph: "crown",
				x: 5,
				y: 7,
				z: -25.97,
				yaw: 0,
				size: 1.6,
				color: 8219282
			}
		],
		storySpots: {
			throne: {
				x: 0,
				y: 1.5,
				z: -17
			},
			arena: {
				x: 0,
				y: 0,
				z: -3
			}
		},
		wedges: THRONE_WEDGES,
		goals: goalsOf$1(THRONE_WEDGES)
	};
}
// src/levels/cisternHalls.ts
/**
* The Great Cistern's other two side halls (beside the Pump Room), made from two of the old flooded levels.
* Both open off the Cistern and lead back to it; the door back is beside where he comes in.
*
*   The Waterworks (off the north-west corner): the old Waterworks hall, huge and flooded. A pump tower in the channel
*       with steps spiralling up it, galleries along the walls, a high bridge, guards on the plateau at the far end.
*   The Sludge Pit (off the east wall, by the crate yard): the old Plank Pit. Planks, stones and a raft over the sludge,
*       toads on the far shore.
*
* Their ids are new ('works', 'sludgepit'): the old levels' story scenes stay with the old ids.
*/
var at$2 = (t, x, z, top = 0, extra = {}) => ({
	t,
	x0: x,
	z0: z,
	x1: x,
	z1: z,
	top,
	...extra
});
var box$2 = (t, x0, z0, x1, z1, top, extra = {}) => ({
	t,
	x0,
	z0,
	x1,
	z1,
	top,
	...extra
});
var collect$1 = (kind, label) => ({
	type: "collect",
	kind,
	count: "all",
	label
});
var goalsOf = (ws) => ws.map((w) => w.appears ?? {
	type: "reach",
	x: w.x,
	y: w.y,
	z: w.z,
	radius: 1.5,
	label: w.name
});
var WORKS_WEDGES = [
	{
		id: "tower",
		name: "Top of the Pump Tower",
		hint: "Out to the island in the channel, then up the steps that spiral round the tower.",
		x: 0,
		y: 8,
		z: 0,
		appears: null
	},
	{
		id: "guards",
		name: "Clear the Waterworks",
		hint: "Beat every guard: the landing, both galleries, the island and the plateau.",
		x: 0,
		y: 2.4,
		z: -44,
		appears: {
			type: "defeat",
			label: "Beat every guard"
		}
	},
	{
		id: "crumbs",
		name: "Sixteen Crumbs",
		hint: "On the slabs, the island, the planks, the promenades and the plateau.",
		x: 8,
		y: 0,
		z: 42,
		appears: collect$1("crumb", "Find every crumb")
	},
	{
		id: "duel",
		name: "The Fencer's Wedge",
		hint: "Turn three bites aside with a perfect guard: raise your shield at the very last moment, three times in one visit. A quick little shield gives you twice as long.",
		x: -8,
		y: 0,
		z: 42,
		appears: {
			type: "parry",
			count: 3,
			label: "Turn three bites aside"
		}
	}
];
function cisternWorks() {
	const base = waterworks();
	const rename = (id) => id.replace(/^works:/, "cworks:");
	const collectibles = base.collectibles.filter((c) => !(c.kind === "relic" && Math.abs(c.x) < .5 && Math.abs(c.z) < .5)).map((c) => ({
		...c,
		id: rename(c.id)
	}));
	const HX = 38;
	const HZ = 50;
	return {
		...base,
		id: "works",
		name: "The Waterworks",
		blurb: "A huge flooded hall off the Cistern: a pump tower in the channel, galleries, a high bridge, and guards on the plateau.",
		world: "cistern",
		returnTo: "cistern",
		reward: void 0,
		collectibles,
		crateContents: base.crateContents.map((id) => id ? rename(id) : id),
		npcs: [{
			x: 4,
			z: 42,
			facing: Math.PI * .8,
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp! The Waterworks. The whole Cistern drains through here.",
				"You can swim the channel, but the slabs and planks are quicker. Jump while you swim to hop out.",
				"There are steps right up the pump tower in the middle, and from its top a bridge to the loft on the east wall.",
				"Guards on the galleries, and more on the plateau."
			]
		}],
		storySpots: void 0,
		exit: doorOn("south", HX, 0, HZ, 0),
		wedges: WORKS_WEDGES,
		goals: goalsOf(WORKS_WEDGES)
	};
}
/** The floor it fights on: the whole room, right up to the walls (running its head into one is what stuns it). */
/** A square ring of floor round the middle of a room, from `outer` in to `inner`, as four strips that do not overlap. */
function ringOf(kind, outer, inner) {
	return [
		box$2(kind, -outer, -outer, outer, -inner, 0),
		box$2(kind, -outer, inner, outer, outer, 0),
		box$2(kind, -outer, -inner, -inner, inner, 0),
		box$2(kind, inner, -inner, outer, inner, 0)
	];
}
var SUMP_ARENA = {
	x0: -21.9,
	x1: 21.9,
	z0: -21.9,
	z1: 21.9
};
var sump = {
	name: "The Sump",
	blurb: "The lowest room of the works: a wide wet floor, drains in every wall, and the thing that lives in them.",
	theme: "sewer",
	music: "march",
	width: 44,
	depth: 44,
	wallHeight: 18,
	pieces: [
		...ringOf("floor", 22, 9),
		...ringOf("grate", 9, 6),
		box$2("tile", -6, -6, 6, 6, 0),
		at$2("spawn", 0, 19),
		at$2("exit", 0, 22),
		...[
			-14,
			0,
			14
		].flatMap((v) => [
			at$2("slime", -21.9, v, 9, { dir: "e" }),
			at$2("slime", 21.9, v, 10, { dir: "w" }),
			at$2("slime", v, -21.9, 9, { dir: "s" })
		]),
		at$2("gauge", -8, 21.7, 3, { dir: "s" }),
		at$2("gauge", 8, 21.7, 3, { dir: "s" }),
		at$2("lamp", -12, -12, 7),
		at$2("lamp", 12, -12, 7),
		at$2("lamp", -12, 12, 7),
		at$2("lamp", 12, 12, 7),
		at$2("lamp", 0, 0, 9),
		at$2("chain", -16, 0, 10),
		at$2("chain", 16, 0, 10),
		at$2("chain", 0, -16, 10),
		at$2("chain", -7, 16, 10),
		at$2("chain", 7, 16, 10)
	]
};
var SUMP_WEDGES = [{
	id: "wyrm",
	name: "The Sump Wyrm",
	hint: "Beat it. Hit any of it, but its head is where it hurts. Get out of the line of its charge and let it run into the wall; jump the lash of its tail; and when it winds a ring round you, jump out over its body.",
	x: 0,
	y: 0,
	z: -8,
	appears: {
		type: "defeat",
		label: "Beat the Sump Wyrm"
	}
}];
function cisternSump() {
	const def = compileCustom(sump, "sump");
	const decor = [...def.decor];
	for (const v of [-11, 11]) {
		decor.push({
			kind: "hole",
			x: v,
			y: 4.2,
			z: -21.95,
			yaw: 0,
			r: 2.6
		});
		decor.push({
			kind: "hole",
			x: -21.95,
			y: 4.2,
			z: v,
			yaw: Math.PI / 2,
			r: 2.6
		});
		decor.push({
			kind: "hole",
			x: 21.95,
			y: 4.2,
			z: v,
			yaw: -Math.PI / 2,
			r: 2.6
		});
	}
	for (const side of [-1, 1]) decor.push({
		kind: "pipe",
		a: [
			side * 21.5,
			11.5,
			-21
		],
		b: [
			side * 21.5,
			11.5,
			21
		],
		r: .45
	});
	decor.push({
		kind: "pipe",
		a: [
			-21,
			12.6,
			-21.5
		],
		b: [
			21,
			12.6,
			-21.5
		],
		r: .45
	});
	return {
		...def,
		world: "cistern",
		returnTo: "cistern",
		decor,
		enemies: [...def.enemies, {
			type: "wyrm",
			x: 0,
			y: 0,
			z: -8,
			facing: 0,
			arena: SUMP_ARENA,
			respawn: false
		}],
		fogRange: [28, 100],
		wedges: SUMP_WEDGES,
		goals: goalsOf(SUMP_WEDGES)
	};
}
var pit = {
	name: "The Sludge Pit",
	blurb: "Off the Cistern: planks, stones and a sliding raft over the sludge, and toads on the far shore.",
	width: 48,
	depth: 48,
	wallHeight: 12,
	pieces: [
		box$2("floor", -24, 10, 24, 24, 0),
		box$2("water", -24, -12, 24, 10, -.85),
		box$2("floor", -24, -24, 24, -12, 0),
		at$2("spawn", 0, 20),
		at$2("exit", 0, 24),
		box$2("plank", -1.5, 4, 1.5, 10, 0),
		box$2("tile", -8, -2, 8, 4, 0),
		box$2("lift", -1.5, -5, 1.5, -2, 0, { props: {
			move: "n",
			travel: 7,
			speed: 2.2,
			pause: 2
		} }),
		box$2("stone", 8.5, 1, 10.5, 3, 0),
		box$2("stone", 8.5, -2.5, 10.5, -.5, 0),
		box$2("stone", 8.5, -6, 10.5, -4, 0),
		box$2("stone", 8.5, -9.5, 10.5, -7.5, 0),
		box$2("stone", -18, 3, -16, 5, 0),
		box$2("stone", -18, -4, -16, -2, 0),
		box$2("stone", -18, -10, -16, -8, 0),
		box$2("stairs", -3, -20, 3, -14, 3, {
			dir: "n",
			bottom: 0
		}),
		box$2("platform", -8, -24, 8, -20, 3),
		at$2("crate", -8, 16, 0, { props: { item: "crumb" } }),
		at$2("barrel", 8, 16, 0, { props: { item: "crumb" } }),
		at$2("crate", 14, 14, 0, { props: { item: "cap" } }),
		at$2("crumb", 0, 7),
		at$2("crumb", 0, 1),
		at$2("crumb", 9.5, 2),
		at$2("crumb", 9.5, -8.5),
		at$2("crumb", -17, 4),
		at$2("crumb", -17, -9),
		at$2("crumb", -14, -17),
		at$2("crumb", 14, -17),
		at$2("crumb", 4, -22, 3),
		at$2("cap", -6, -23, 3),
		at$2("roach", -4, 0),
		at$2("toad", -12, -18),
		at$2("toad", 12, -18),
		at$2("npc", 6, 20, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: ["Watch those planks! They don't look terribly trustworthy.", "The stones on the west side are further apart. Double jump, and do not look down. It is only sludge, but still."]
		} }),
		at$2("lamp", -12, 22, 3),
		at$2("lamp", 12, 22, 3),
		at$2("lamp", -12, -22, 3),
		at$2("lamp", 12, -22, 3),
		at$2("slime", -23.5, 14, 7, { dir: "e" }),
		at$2("window", 23.5, 18, 5, { dir: "w" }),
		at$2("fall", -24, -2, 0, { dir: "e" }),
		at$2("light", -7, -23, 3, { props: { color: "green" } }),
		at$2("light", 7, -23, 3, { props: { color: "green" } })
	]
};
var PIT_WEDGES = [{
	id: "crew",
	name: "Clear the Sludge Pit",
	hint: "The roach on the island and the two toads on the far shore.",
	x: 0,
	y: 3,
	z: -22,
	appears: {
		type: "defeat",
		label: "Beat every beast"
	}
}, {
	id: "crumbs",
	name: "Every Crumb in the Sludge",
	hint: "On the planks, the island, both rows of stones and the lookout. Two more in the crates.",
	x: -4,
	y: 0,
	z: 18,
	appears: collect$1("crumb", "Find every crumb")
}];
function sludgePit() {
	return {
		...compileCustom(pit, "sludgepit"),
		world: "cistern",
		returnTo: "cistern",
		wedges: PIT_WEDGES,
		goals: goalsOf(PIT_WEDGES)
	};
}
// src/levels/cistern.ts
/**
* The Great Cistern: the first proper open course. One big flooded hall with five landmarks, each seen from the start,
* each its own little challenge, and linked to each other. Six Golden Wedges, taken in any order; the first opens the door.
*
*   SOUTH  The entrance balcony. He starts high up, looking out over the whole cistern; grand stairs lead down.
*          Underneath it, in its shade, is the Undercroft (a secret wedge right under his feet).
*   MIDDLE The Tower on its moated island. A spiral of slabs climbs to a chimney behind the tower; wall-kick up it
*          to a perch, then onto the top. A light burns up there.
*   WEST   The Bastion: a walled fort full of beasts. In through the gate, or grab the wall top and drop in.
*          Beat them all and a wedge appears.
*   NORTH  The Drain Cliffs: three tiers up the north wall (jumps and grabs), then a jump-and-grab up to the High Drain.
*   EAST   The Pump House, shut. Its gate opens when both floor plates are pressed: one on its roof (ride the lift),
*          one up on the cliffs.
*   NW     The Cleft: two tall walls close together, standing by themselves. Wall-kick up between them from the floor.
*   NE     The Winch: a lift up to a perch, and from the perch a slider that carries him north to a ledge on the wall.
*
*   THINGS TO FIND (the owner, 2026-11-15: fewer of them, each one earned by a piece of movement, none on a trail):
*   five bottle caps and three hunks of cheese (each worth 8 crumbs: what the 24 crumbs that used to lie about were).
*     caps:  the tallest of the Teeth (pillars to hop); the perch at the top of the tower's chimney (wall kicks); the
*            keep in the Bastion (a fight); the top of the Cleft (wall kicks, from the floor); the Flue on the pump
*            house roof (wall kicks, wall to wall across four units).
*     hunks: the Outrigger (a slab nine units out from the spiral's last: a full double jump); the roof of the old
*            drain's room (along the top of the Bastion's wall and a hop off its end); the ledge at the end of the
*            Winch's slider.
*   tests/cistern.ts plays each route with the real controller, and takes each route's key piece away to see that
*   the thing cannot then be got. Keep both when anything here moves.
*
* Room: x -48..48, z -48..48; north is -z. One jump climbs about 2.5, the double jump about 4.75, and a ledge grab adds
* about 1 more. A wall kick climbs between two walls close together.
*/
var at$1 = (t, x, z, top = 0, extra = {}) => ({
	t,
	x0: x,
	z0: z,
	x1: x,
	z1: z,
	top,
	...extra
});
var box$1 = (t, x0, z0, x1, z1, top, extra = {}) => ({
	t,
	x0,
	z0,
	x1,
	z1,
	top,
	...extra
});
/** Faster than he swims (3), slower than the Sludge Scarf (4.5). */
var DRAIN_CURRENT = 3.2;
var BALCONY = 8;
var TIER1 = 3.2;
var TIER2 = 7;
var TIER3 = 11.5;
var DRAIN = 17;
var FORT = 3;
var FORT_WALL = 6.5;
var PUMP_ROOF = 8.5;
/** The Cleft (north-west): two walls 2.2 apart, standing by themselves, this high. The cap is on the north one. */
var CLEFT = {
	x0: -39.5,
	x1: -34.5,
	northZ0: -32.5,
	northZ1: -30,
	southZ0: -27.8,
	southZ1: -26.6,
	top: 10
};
/** The Flue, on the pump house roof: a wall four units in from the hall's east wall, this high. The cap is on it. */
var FLUE = {
	x0: 41.6,
	x1: 44,
	z0: -6,
	z1: -1,
	top: 15.5
};
/**
* The Outrigger: a slab by itself out over the north moat, level with the spiral's last slab (11 up) and nine north of
* it. (It was first hung off the seventh slab, over the bridge: but from the lower steps of the grand stairs a running
* double jump and a grab reached it, with no need of the spiral at all.)
*/
var OUTRIGGER = {
	x0: -5.43,
	x1: -2.23,
	z0: -19.17,
	z1: -15.97,
	top: 11
};
/** The Winch (north-east): a lift up to a perch, a slider from beside the perch north to under a ledge on the east wall. */
var WINCH = {
	lift: {
		x0: 36,
		x1: 39,
		z0: -25,
		z1: -22,
		travel: 9
	},
	perch: {
		x0: 40.5,
		x1: 43.5,
		z0: -25,
		z1: -22,
		top: 9
	},
	slider: {
		x0: 40.5,
		x1: 43.5,
		z0: -30,
		z1: -27,
		top: 9,
		travel: 10
	},
	ledge: {
		x0: 43,
		x1: 48,
		z0: -47,
		z1: -42,
		top: 12
	}
};
/** The old drain's sealed room: its roof (the hunk is on it), reached along the Bastion's south wall. */
var DRAIN_ROOF = {
	x: -45.5,
	z: 19.5,
	top: 7
};
/**
* The spiral round the tower: floating slabs, each a little higher, winding round so the last one sits just west of the
* chimney on the north side.
*/
var SPIRAL = (() => {
	const out = [];
	const n = 11;
	const step = .62;
	const end = 3 * Math.PI / 2 - .62;
	const r = 6.6;
	for (let i = 0; i < n; i++) {
		const a = end - (10 - i) * step;
		out.push({
			x: +(r * Math.cos(a)).toFixed(2),
			z: +(r * Math.sin(a)).toFixed(2),
			top: +(1 + i * 1).toFixed(2)
		});
	}
	return out;
})();
/** The chimney behind the tower: the tower's north face (z = -3) and a free-standing wall 2.2 north of it. */
var CHIMNEY = {
	x0: -2.5,
	x1: 2.5,
	wallZ0: -7.2,
	wallZ1: -5.2
};
var course = {
	name: "The Great Cistern",
	blurb: "An open course: a tower, a fort, cliffs and a locked pump house. Six Golden Wedges here (one a secret), more in its three side halls.",
	width: 96,
	depth: 96,
	wallHeight: 34,
	music: "drift",
	pieces: [
		box$1("floor", -42.5, 18, 48, 48, 0),
		box$1("floor", -48, -48, 48, -18, 0),
		box$1("floor", -42.5, -18, -18, 18, 0),
		box$1("floor", -48, -18, -42.5, 15, 0),
		box$1("river", -48, 19, -43, 44, -.85, {
			dir: "s",
			props: { speed: DRAIN_CURRENT }
		}),
		box$1("floor", -48, 44, -42.5, 48, 0),
		box$1("floor", -48, 24, -43, 38, 0, { bottom: -.1 }),
		box$1("wall", -43, 15, -42.5, 44, 0, { bottom: -3.5 }),
		box$1("floor", -48, 15, -43, 19, 0),
		box$1("wall", -48, 14.5, -42.5, 15, 6),
		box$1("wall", -48, 24, -42.5, 24.5, 6),
		box$1("wall", -43, 15, -42.5, 24, 6),
		box$1("platform", -48, 14.5, -42.5, 24.5, DRAIN_ROOF.top, { bottom: 6 }),
		at$1("lamp", -45.5, 18, 5),
		box$1("floor", 18, -18, 48, 18, 0),
		box$1("tile", -10, -10, 10, 10, 0),
		box$1("water", -18, 10, 18, 18, -.85),
		box$1("water", -18, -18, 18, -10, -.85),
		box$1("water", -18, -10, -10, 10, -.85),
		box$1("water", 10, -10, 18, 10, -.85),
		box$1("bridge", -1.5, 10, 1.5, 18, 0),
		box$1("stone", 13, -1, 15, 1, .3),
		box$1("platform", -14, 36, 14, 48, BALCONY, { bottom: 7 }),
		box$1("pillar", -14, 36, -12, 38, 7),
		box$1("pillar", 12, 36, 14, 38, 7),
		box$1("pillar", -14, 46, -12, 48, 7),
		box$1("pillar", 12, 46, 14, 48, 7),
		box$1("stairs", -3, 26, 3, 36, BALCONY, {
			dir: "s",
			bottom: 0
		}),
		at$1("spawn", 0, 39, BALCONY),
		at$1("exit", 0, 48, BALCONY),
		box$1("pillar", -3, -3, 3, 3, 22),
		...SPIRAL.map((s) => box$1("platform", s.x - 1.6, s.z - 1.6, s.x + 1.6, s.z + 1.6, s.top, { bottom: s.top - .5 })),
		box$1("platform", CHIMNEY.x0, CHIMNEY.wallZ1, CHIMNEY.x1, -3, 12, { bottom: 11.5 }),
		box$1("pillar", CHIMNEY.x0, CHIMNEY.wallZ0, CHIMNEY.x1, CHIMNEY.wallZ1, 20, { bottom: 12 }),
		box$1("platform", -48, -12, -26, 12, FORT, { bottom: 0 }),
		box$1("wall", -48, -12, -26, -11, FORT_WALL, { bottom: FORT }),
		box$1("wall", -48, 11, -26, 12, FORT_WALL, { bottom: FORT }),
		box$1("wall", -27, -11, -26, -2, FORT_WALL, { bottom: FORT }),
		box$1("wall", -27, 2, -26, 11, FORT_WALL, { bottom: FORT }),
		box$1("stairs", -26, -2, -22, 2, FORT, {
			dir: "w",
			bottom: 0
		}),
		box$1("platform", -46, -4, -40, 4, 6, { bottom: FORT }),
		box$1("stairs", -40, -1, -37, 1, 6, {
			dir: "w",
			bottom: FORT
		}),
		at$1("roach", -32, -7, FORT),
		at$1("roach", -32, 7, FORT),
		at$1("roach", -36, -5, FORT),
		at$1("roach", -36, 6, FORT),
		at$1("toad", -43, 0, 6),
		at$1("toad", -30, 0, FORT),
		box$1("platform", -24, -48, 24, -38, TIER1, { bottom: 0 }),
		box$1("stairs", 24, -46, 30, -40, TIER1, {
			dir: "w",
			bottom: 0
		}),
		box$1("platform", -24, -48, 24, -43, TIER2, { bottom: TIER1 }),
		box$1("platform", -8, -48, 24, -45.5, TIER3, { bottom: TIER2 }),
		box$1("platform", -21, -48, -14, -45, DRAIN, { bottom: 16 }),
		box$1("wall", 28, -8, 48, -7, 8),
		box$1("wall", 28, 11, 48, 12, 8),
		box$1("wall", 28, -7, 29, 0, 8),
		box$1("wall", 28, 4, 29, 11, 8),
		box$1("platform", 28, 0, 29, 4, 8, { bottom: 3.5 }),
		box$1("platform", 28, -8, 48, 12, PUMP_ROOF, { bottom: 8 }),
		box$1("gate", 28, 0, 29, 4, 0, { props: { opens: "plates" } }),
		at$1("pipe", 47.5, 6, 0, { dir: "w" }),
		at$1("pipe", 47.5, -3, 0, { dir: "w" }),
		box$1("lift", 31, -12, 34, -9, 0, { props: {
			move: "up",
			travel: PUMP_ROOF,
			speed: 2,
			pause: 2
		} }),
		at$1("plate", 40, 8, PUMP_ROOF),
		at$1("plate", 18, -45, TIER2),
		box$1("pillar", -40, 34, -38, 36, 2),
		box$1("pillar", -35, 31, -33, 33, 3.5),
		box$1("pillar", -31, 33, -29, 35, 5),
		box$1("pillar", -27, 28, -25, 30, 6.5),
		box$1("pillar", -22, 32, -20, 34, 8),
		box$1("pillar", -26, 23, -24, 25, 9.5),
		at$1("crate", 26, 26),
		at$1("crate", 27, 26),
		at$1("crate", 26, 26, 1),
		at$1("crate", 30, 30),
		at$1("crate", 31, 30),
		at$1("crate", 34, 25),
		at$1("crate", 34, 25, 1),
		at$1("crate", 34, 25, 2),
		at$1("barrel", 38, 33),
		at$1("barrel", 39, 33),
		at$1("barrel", 38, 34),
		box$1("wall", CLEFT.x0, CLEFT.northZ0, CLEFT.x1, CLEFT.northZ1, CLEFT.top),
		box$1("wall", CLEFT.x0, CLEFT.southZ0, CLEFT.x1, CLEFT.southZ1, CLEFT.top),
		at$1("lamp", (CLEFT.x0 + CLEFT.x1) / 2, (CLEFT.northZ1 + CLEFT.southZ0) / 2, CLEFT.top + 3),
		box$1("wall", FLUE.x0, FLUE.z0, FLUE.x1, FLUE.z1, FLUE.top, { bottom: PUMP_ROOF }),
		box$1("platform", OUTRIGGER.x0, OUTRIGGER.z0, OUTRIGGER.x1, OUTRIGGER.z1, OUTRIGGER.top, { bottom: OUTRIGGER.top - .5 }),
		at$1("chain", (OUTRIGGER.x0 + OUTRIGGER.x1) / 2, (OUTRIGGER.z0 + OUTRIGGER.z1) / 2, OUTRIGGER.top + 6),
		box$1("lift", WINCH.lift.x0, WINCH.lift.z0, WINCH.lift.x1, WINCH.lift.z1, 0, { props: {
			move: "up",
			travel: WINCH.lift.travel,
			speed: 2.5,
			pause: 2
		} }),
		box$1("platform", WINCH.perch.x0, WINCH.perch.z0, WINCH.perch.x1, WINCH.perch.z1, WINCH.perch.top, { bottom: WINCH.perch.top - .5 }),
		box$1("lift", WINCH.slider.x0, WINCH.slider.z0, WINCH.slider.x1, WINCH.slider.z1, WINCH.slider.top, { props: {
			move: "n",
			travel: WINCH.slider.travel,
			speed: 2.2,
			pause: 1.2
		} }),
		box$1("platform", WINCH.ledge.x0, WINCH.ledge.z0, WINCH.ledge.x1, WINCH.ledge.z1, WINCH.ledge.top, { bottom: WINCH.ledge.top - .5 }),
		at$1("chain", 42, -23.5, WINCH.perch.top + 6),
		at$1("lamp", 45.5, -44.5, WINCH.ledge.top + 3),
		at$1("cap", -25, 24, 9.5),
		at$1("cap", -43, 2, 6),
		at$1("cap", 0, -6.2, 20),
		at$1("cap", (CLEFT.x0 + CLEFT.x1) / 2, (CLEFT.northZ0 + CLEFT.northZ1) / 2, CLEFT.top),
		at$1("cap", (FLUE.x0 + FLUE.x1) / 2, (FLUE.z0 + FLUE.z1) / 2, FLUE.top),
		at$1("crumb", (OUTRIGGER.x0 + OUTRIGGER.x1) / 2, (OUTRIGGER.z0 + OUTRIGGER.z1) / 2, OUTRIGGER.top, { props: { worth: 8 } }),
		at$1("crumb", DRAIN_ROOF.x, DRAIN_ROOF.z, DRAIN_ROOF.top, { props: { worth: 8 } }),
		at$1("crumb", 45.5, -44.5, WINCH.ledge.top, { props: { worth: 8 } }),
		at$1("torch", -3.5, 47.7, 10.5, { dir: "s" }),
		at$1("torch", 3.5, 47.7, 10.5, { dir: "s" }),
		at$1("gauge", 27.7, -4, 4, { dir: "e" }),
		at$1("gauge", 27.7, 8, 4, { dir: "e" }),
		at$1("npc", -5, 39.5, BALCONY, { props: {
			name: "Pip",
			kind: "mouse",
			lines: [
				"Squeak! The Great Cistern! See it all from up here? Golden Wedges are hidden all over down there.",
				"One on top of the tower, one in the fort, one up the north cliffs, and more behind the locked pump house...",
				"And some are closer than you think. Three more doors lead off the Cistern, too: the Pump Room, the Waterworks and the Sludge Pit.",
				"Take any wedge and the door behind me opens.",
				"Oh, and the old drain past the Teeth? The water runs too hard for me. Somebody slicker might make it."
			]
		} }),
		at$1("npc", -2, -36, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp! These cliffs go all the way up to the old drain.",
				"Too high to jump onto? Jump anyway, and as you fall past the edge, grab it!",
				"The plate up on the second ledge works something in the pump house, I think.",
				"See those two walls standing by themselves in the corner, west of here? Jump at one and kick off it. Then off the other. Up and up."
			]
		} }),
		at$1("light", 0, 0, 24.5, { props: { color: "yellow" } }),
		at$1("light", -36, 0, 8, { props: { color: "red" } }),
		at$1("light", -17, -46, 19.5, { props: { color: "blue" } }),
		at$1("light", 38, 2, 4, { props: { color: "green" } }),
		at$1("lamp", -9, 40, 10.5),
		at$1("lamp", 9, 40, 10.5),
		at$1("lamp", -6, 44, 3),
		at$1("lamp", 6, 44, 3),
		at$1("lamp", -9, 9, 2.5),
		at$1("lamp", 9, 9, 2.5),
		at$1("lamp", -9, -9, 2.5),
		at$1("lamp", 9, -9, 2.5),
		at$1("lamp", -27, -12, 7.5),
		at$1("lamp", -27, 12, 7.5),
		at$1("lamp", -20, -38, 5.7),
		at$1("lamp", 20, -38, 5.7),
		at$1("lamp", 29, 3.5, 5),
		at$1("lamp", 29, -.5, 5),
		at$1("chain", -14, -14, 8),
		at$1("chain", 14, -14, 8),
		at$1("chain", -14, 14, 8),
		at$1("chain", 14, 14, 8),
		at$1("fall", -17.5, -48, DRAIN, { dir: "s" }),
		at$1("slime", 0, -47.5, 14, { dir: "s" }),
		at$1("window", -47.5, 30, 10, { dir: "e" }),
		at$1("window", 47.5, 30, 10, { dir: "w" }),
		at$1("web", -47.5, -11, 5, { dir: "e" })
	]
};
var collect = (kind, label) => ({
	type: "collect",
	kind,
	count: "all",
	label
});
var CISTERN_WEDGES = [
	{
		id: "summit",
		name: "Top of the Tower",
		hint: "Climb the spiral, then wall-kick up the chimney behind the tower.",
		x: 0,
		y: 22,
		z: 0,
		appears: null
	},
	{
		id: "bastion",
		name: "Beasts of the Bastion",
		hint: "Beat every beast in the west fort.",
		x: -34,
		y: FORT,
		z: 0,
		appears: {
			type: "defeat",
			label: "Beat the beasts"
		}
	},
	{
		id: "drain",
		name: "The High Drain",
		hint: "Climb the north cliffs. The last one is a jump and a grab.",
		x: -17.5,
		y: DRAIN,
		z: -46.5,
		appears: null
	},
	{
		id: "caps",
		name: "Five Bottle Caps",
		hint: "On the tallest of the Teeth, at the top of the tower's chimney, in the keep of the fort, up the Cleft in the north-west corner, and up the Flue on the pump house roof.",
		x: 6,
		y: BALCONY,
		z: 40,
		appears: collect("cap", "Find all five caps")
	},
	{
		id: "under",
		name: "The Undercroft",
		hint: "Sometimes the best view hides what is underneath you.",
		x: 0,
		y: 0,
		z: 44,
		appears: null
	},
	{
		id: "current",
		name: "Against the Current",
		hint: "The old drain past the Teeth runs too hard to swim. Something slick round your neck might help.",
		x: -45.5,
		y: 0,
		z: 18,
		appears: null
	}
];
function cistern() {
	return {
		...compileCustom(course, "cistern"),
		theme: "sewer",
		world: "cistern",
		courseDoors: [
			{
				to: "pumpworks",
				name: "The Pump Room",
				need: 0,
				door: doorOn("east", 48, 2, 48, 0)
			},
			{
				to: "works",
				name: "The Waterworks",
				need: 0,
				door: doorOn("north", 48, -36, 48, 0)
			},
			{
				to: "sludgepit",
				name: "The Sludge Pit",
				need: 0,
				door: doorOn("east", 48, 40, 48, 0)
			},
			{
				to: "sump",
				name: "The Sump",
				need: 0,
				door: doorOn("east", 48, -32, 48, 0)
			}
		],
		fogRange: [40, 150],
		wedges: CISTERN_WEDGES,
		goals: CISTERN_WEDGES.map((w) => w.appears ?? {
			type: "reach",
			x: w.x,
			y: w.y,
			z: w.z,
			radius: 1.5,
			label: w.name
		})
	};
}
// src/data/balance.ts
/**
* The game's balance in one place: how many Golden Wedges each Club door wants, and what Pip charges.
* All of it is on sliders in Tweaks (the "Doors and prices" group), so it can be tuned in the game; "Copy settings" there
* gives the changes as text to make them the defaults.
*
* How the defaults were picked (there are 47 wedges: Cistern 16, Foundry 12, Hollows 12, Keep 7):
*   Each door asks for well under the wedges a player could have by then, so no single hard wedge is ever required.
*   The Foundry wants 5 of the Cistern's 16 (about a third); the Hollows 12 of the 28 open by then (under half); the Keep,
*   the last door, 25 of 40 (just under two thirds; Super Mario 64's last door asks for about 58% of every star).
*   They were 4, 10 and 20 when there were 38 wedges (13, 10, 9, 6), and were left there while nine more were added
*   (gear secrets and the two bosses), which made every door a little easier than it was meant to be. On 2026-11-15
*   they were put back to the same shares. tests/balance.ts holds the shares: add wedges and it will say so.
*   A door he has already been through stays open whatever it asks now (main.ts, `doorOpen`): raising a door must
*   not shut a world on a save that had got there.
*   The shop: seven pieces of gear, each a trade (something gained, something given up). All of it costs about four
*   fifths of the game's crumbs (117 of 147) and three fifths of its caps (25 of 42), so a thorough player can have
*   everything, but not out of the first world alone.
*   "Crumbs" here is what the cheese is WORTH. Since 2026-11-15 the Great Cistern's cheese is three hunks worth eight
*   each in place of twenty-four crumbs (the owner: fewer things, each one earned), so the prices did not have to move.
*   When another world's crumbs are traded for hunks, keep what they are worth the same and nothing here changes. Caps
*   are one each: the Cistern has five now where it had eight; cut many more and the caps prices will want looking at.
*/
var BALANCE = {
	doors: {
		foundry: 5,
		hollows: 12,
		keep: 25
	},
	prices: {
		nachoCheese: {
			crumbs: 8,
			caps: 0
		},
		mossScarf: {
			crumbs: 10,
			caps: 0
		},
		minerHelm: {
			crumbs: 12,
			caps: 2
		},
		sludgeScarf: {
			crumbs: 15,
			caps: 2
		},
		buckler: {
			crumbs: 15,
			caps: 3
		},
		emberHelm: {
			crumbs: 20,
			caps: 5
		},
		cleaver: {
			crumbs: 20,
			caps: 5
		},
		royalScarf: {
			crumbs: 25,
			caps: 8
		}
	}
};
// src/levels/junction.ts
/**
* The Club: home. The safe haven he comes back to after every world, Dizzy Dave's hangout grown into a hub.
* A fire in the middle to rest at (heals, saves), friends hanging out, Pip's counter, and the doors to the worlds.
* Each world door opens once he has enough Golden Wedges; a sign over it says what it is and what it wants.
* Leaving a world brings him back here, in front of its door. The south door leads to the old tunnels (the first levels).
*
* Room: 48 x 44 (x -24..24, z -22..22); north is -z.
*   North: Dave's stage and speakers.   Middle: the fire, with couches round it.
*   West: Pip's counter, and the door to the Great Cistern.   East: Mort's couch and Wren, and the World Two door.
*   North wall, east of the stage: the Hollows. West of the stage: Grimsqueak's Keep (the last world).
*   After the Keep, the ending plays here (STORY.hub), and Grimsqueak stays, by the fire.
*/
var at = (t, x, z, top = 0, extra = {}) => ({
	t,
	x0: x,
	z0: z,
	x1: x,
	z1: z,
	top,
	...extra
});
var box = (t, x0, z0, x1, z1, top, extra = {}) => ({
	t,
	x0,
	z0,
	x1,
	z1,
	top,
	...extra
});
var HX = 24;
var HZ = 22;
/** The fire in the middle: rest here. */
var FIRE = {
	x: 0,
	y: .4,
	z: 0
};
var club = {
	name: "The Club",
	blurb: "Home. Rest by the fire, see your friends, and take a door out into the worlds. Golden Wedges open more doors.",
	theme: "dungeon",
	music: "groove",
	width: 48,
	depth: 44,
	wallHeight: 12,
	pieces: [
		box("floor", -24, -22, HX, HZ, 0),
		at("spawn", 0, 16),
		at("exit", 0, HZ),
		box("tile", -2, -2, 2, 2, FIRE.y, { bottom: 0 }),
		at("brazier", 0, 0, FIRE.y),
		at("couch", -5, 0, 0, { dir: "e" }),
		at("couch", 5, 0, 0, { dir: "w" }),
		at("couch", 0, -5, 0, { dir: "s" }),
		box("platform", -9, -22, 9, -14, .8, { bottom: 0 }),
		box("stairs", -3, -14, 3, -11, .8, {
			dir: "n",
			bottom: 0
		}),
		at("speaker", -7, -20, .8, { dir: "s" }),
		at("speaker", 7, -20, .8, { dir: "s" }),
		at("npc", 0, -16.5, .8, { props: {
			name: "Dizzy Dave",
			kind: "pigeon",
			lines: [
				"Coo coo, daddy-o! Welcome home. The Club never closes.",
				"Out there it is all drips and beasts. In here it is one beat, forever. Boom, tss, boom boom tss!",
				"Sit by the fire a while, man. You look like you have been wall-kicking."
			]
		} }),
		box("platform", -17.5, -6, -16.5, 6, .9, { bottom: 0 }),
		box("platform", -22, -6, -17.5, 6, .5, { bottom: 0 }),
		at("npc", -18.2, 0, .5, { props: {
			name: "Pip",
			kind: "mouse",
			shop: true,
			lines: ["Squeak! Welcome to Pip's, finest counter in the Kingdom Below. Only counter, really. Crumbs and caps, I take both!"]
		} }),
		at("barrel", -21.5, -4, .5),
		at("barrel", -21.5, -2.5, .5),
		at("barrel", -21.5, 4, .5),
		at("lamp", -17, -5, 3.5),
		at("lamp", -17, 5, 3.5),
		at("couch", 18, 8, 0, { dir: "w" }),
		at("npc", 17, 8, 0, { props: {
			name: "Mellow Mort",
			kind: "mouse",
			lines: ["Squeak... oh. Hey. You came back. Most do not, you know. Back to the couch, I mean.", "The fire is warm. The beat is good. The drips are far away. This is the life, knight."]
		} }),
		at("npc", 13, -6, 0, { props: {
			name: "Wren",
			kind: "bird",
			lines: [
				"Chirp! I have almost got a tune that fits Dave's beat. Almost.",
				"Every time you bring back a Golden Wedge, Dave says he turns the beat up. I cannot hear a difference. Can you?",
				"The north door goes down to the Hollows. It is so quiet down there you can hear your own whiskers.",
				"The other north door, by the stage... that one goes to his keep. It wants the most wedges of all. Dave stops dancing when he looks at it."
			]
		} }),
		at("npc", -13, 14, 0, { props: {
			name: "Finch",
			kind: "bird",
			lines: [
				"Chirp! The Cistern is through the west door. Big place. Mind the moat.",
				"If you cannot reach a ledge, jump at it and grab the edge as you fall. Works for me. Well, I fly. But still.",
				"The east door goes to the Foundry. Bring a few Golden Wedges, and something for the heat."
			]
		} }),
		at("npc", 14, -12, 0, { props: {
			name: "Lord Grimsqueak",
			kind: "villain",
			hidden: true,
			lines: []
		} }),
		at("torch", -23.7, 9, 3.2, { dir: "w" }),
		at("torch", -23.7, 15, 3.2, { dir: "w" }),
		at("torch", 23.7, -13, 3.2, { dir: "e" }),
		at("torch", 23.7, -7, 3.2, { dir: "e" }),
		at("torch", 13, -21.7, 3.2, { dir: "n" }),
		at("torch", 19, -21.7, 3.2, { dir: "n" }),
		at("torch", -19, -21.7, 3.2, { dir: "n" }),
		at("torch", -13, -21.7, 3.2, { dir: "n" }),
		at("light", 0, 0, 2.5, { props: {
			color: "yellow",
			bare: true
		} }),
		at("light", -4, -21, .8, { props: { color: "blue" } }),
		at("light", 4, -21, .8, { props: { color: "purple" } }),
		at("light", -7, -20, 3.7, { props: {
			color: "red",
			flash: 1.5
		} }),
		at("light", 7, -20, 3.7, { props: {
			color: "red",
			flash: 1.5
		} }),
		at("brazier", -21, -18),
		at("brazier", 21, -18),
		at("brazier", -21, 18),
		at("brazier", 21, 18),
		at("lamp", -8, 18, 4),
		at("lamp", 8, 18, 4),
		at("lamp", 22, 0, 4),
		at("chain", -10, -6, 9),
		at("chain", 10, -6, 9),
		at("chain", -10, 8, 9),
		at("chain", 10, 8, 9),
		at("window", -23.5, -14, 5, { dir: "e" }),
		at("window", 23.5, 16, 5, { dir: "w" }),
		at("slime", -23.5, 18, 6, { dir: "e" })
	]
};
var HUB_DOORS = [
	{
		to: "cistern",
		name: "The Great Cistern",
		need: 0,
		door: doorOn("west", HX, 12, HZ, 0)
	},
	{
		to: "foundry",
		name: "The Foundry",
		get need() {
			return BALANCE.doors.foundry;
		},
		door: doorOn("east", HX, -10, HZ, 0)
	},
	{
		to: "hollows",
		name: "The Hollows",
		get need() {
			return BALANCE.doors.hollows;
		},
		door: doorOn("north", HX, 16, HZ, 0)
	},
	{
		to: "keep",
		name: "Grimsqueak's Keep",
		get need() {
			return BALANCE.doors.keep;
		},
		door: doorOn("north", HX, -16, HZ, 0)
	}
];
doorOn("south", HX, -12, HZ, 0), doorOn("south", HX, 12, HZ, 0);
/**
* The Club's tables and the regulars at them. (The owner, 2026-11-15: more props, and characters who are DOING
* something, "like have maybe two characters drinking at a table"; "I want it to feel pretty alive regardless ...
* a full world that gains extras over time".) Everyone here is here from the first minute, except those marked
* `when`, who turn up as the world is cleared: the room is full without them.
*
* A table is at (x, z); a seat is a stool beside it, `out` from its middle at an angle (0 is south of it, +z).
*/
var SEAT_OUT = 1.25;
var TABLES = [
	{
		x: 11,
		z: 14,
		top: {
			mugs: [[Math.PI / 2, .6], [-Math.PI / 2, .6]],
			candle: true
		},
		seats: [
			{
				at: Math.PI / 2,
				who: {
					name: "Mossback Mo",
					kind: "turtle",
					doing: "drink",
					turn: 0,
					lines: [
						"Hmm? Oh. A knight. We had one of those once. Before the drips.",
						"I was old when this pipe was new, young fellow. Slow down. The cheese is not going anywhere.",
						"Pebble here thinks the moat in the Cistern is deep. I have seen DEEP. Sit a while and I might tell you."
					]
				}
			},
			{
				at: -Math.PI / 2,
				who: {
					name: "Pebble",
					kind: "turtle",
					doing: "chat",
					turn: 1,
					lines: ["Do not get him started on the moat. Please. I have heard about the moat since Tuesday.", "I would go adventuring myself, you know. I have the shell for it. I just have not finished my drink."]
				}
			},
			{ at: 0 }
		]
	},
	{
		x: 17,
		z: -1,
		top: {
			cards: true,
			mugs: [[2.4, .7]]
		},
		seats: [
			{
				at: Math.PI / 2,
				who: {
					name: "Vix",
					kind: "fox",
					doing: "cards",
					turn: 0,
					lines: ["Pull up a cork, knight. Crumbs are stakes, caps are trumps, and Ash deals from the bottom.", "You have the look of someone who jumps off walls for a living. I respect a trade."]
				}
			},
			{
				at: -Math.PI / 2,
				who: {
					name: "Ash",
					kind: "fox",
					doing: "cards",
					turn: 1,
					lines: ["I do NOT deal from the bottom. I deal from the middle. There is an art to it.", "Lost the eye to a hornet, since you are staring. Kept the hornet's lance. It is over the bar. There is no bar. It is somewhere."]
				}
			},
			{ at: Math.PI }
		]
	},
	{
		x: -11,
		z: 6,
		top: {
			mugs: [[.3, .55]],
			candle: true
		},
		seats: [
			{
				at: 0,
				who: {
					name: "Corporal Nib",
					kind: "ant",
					doing: "drink",
					when: { beaten: ["ant", 8] },
					lines: [
						"Stand easy, knight. I am OFF the line. The pike is in the rack. This is my thimble.",
						"No hard feelings about the Hollows. You came through the wall of us fair and square. Mostly square.",
						"The lads say you fight like a rat who has read the manual. From an ant, that is high praise."
					]
				}
			},
			{ at: Math.PI * .75 },
			{ at: -Math.PI * .75 }
		]
	}
];
/**
* The bar, in the south-east corner against the east wall: a plank counter, a step behind it for whoever keeps it,
* a keg and a row of thimbles on it, three stools in front. And the wall by the Cistern door, to lean on.
*/
var BAR = {
	x0: 20,
	x1: 21,
	z0: 10.6,
	z1: 16.6,
	top: 1,
	step: .45,
	back: 24,
	stoolX: 19.2
};
var EAST = Math.PI / 2;
var WEST = -Math.PI / 2;
function clubBar() {
	const midZ = (BAR.z0 + BAR.z1) / 2;
	const keeper = [BAR.x1 + .7, midZ];
	const solids = [extent("plank", BAR.x0, BAR.x1, 0, BAR.top, BAR.z0, BAR.z1), extent("platform", BAR.x1, BAR.back, 0, BAR.step, BAR.z0, BAR.z1)];
	const decor = [{
		kind: "mugs",
		x: (BAR.x0 + BAR.x1) / 2,
		y: BAR.top,
		z: midZ - 1.2,
		yaw: EAST,
		count: 5,
		gap: .42
	}, {
		kind: "keg",
		x: (BAR.x0 + BAR.x1) / 2,
		y: BAR.top,
		z: BAR.z1 - .7,
		yaw: WEST
	}];
	const seats = [
		BAR.z0 + 1.1,
		midZ,
		BAR.z1 - 1.1
	];
	for (const z of seats) {
		decor.push({
			kind: "stool",
			x: BAR.stoolX,
			y: 0,
			z
		});
		solids.push(...stoolSolids(BAR.stoolX, 0, z));
	}
	return {
		decor,
		solids,
		npcs: [
			{
				name: "Madam Tawny",
				kind: "owl",
				x: keeper[0],
				z: keeper[1],
				y: BAR.step,
				facing: WEST,
				doing: "tend",
				lines: [
					"Whoo is it now? Ah. The knight. Wipe your feet, you are dripping Cistern on my floor.",
					"I have kept this bar since before Dave found his speaker. It was quieter. I will not say it was better.",
					"They all come back here in the end, dear. Even the ones you have had words with. A thimble mends most things."
				]
			},
			{
				name: "Slink",
				kind: "ferret",
				x: BAR.stoolX,
				z: seats[0],
				y: 0,
				facing: EAST,
				seated: true,
				doing: "drink",
				partner: keeper,
				lines: ["Psst. Knight. You did not see me here. I am in the Foundry, working. Officially.", "There is a way through every wall if you are thin enough. You are not thin enough. No offence."]
			},
			{
				name: "Professor Snow",
				kind: "owl",
				x: BAR.stoolX,
				z: seats[2],
				y: 0,
				facing: EAST,
				seated: true,
				doing: "drink",
				partner: keeper,
				when: { cleared: "foundry" },
				lines: ["Remarkable. You went INTO the Foundry and came out again. I have a paper on why that cannot be done.", "I shall have to revise the paper. Madam Tawny, another thimble. For science."]
			},
			{
				name: "Biscuit",
				kind: "ferret",
				x: -23.45,
				z: 7.5,
				y: 0,
				facing: EAST,
				doing: "lean",
				when: { cleared: "cistern" },
				lines: ["You drained the moat? YOU drained the moat. I lived in that moat. Well. Next to it.", "It is all right. It is warmer in here, and nobody is spitting at me. I am leaning now. This is my wall."]
			}
		]
	};
}
/**
* The rest of the room's dressing, all of it only drawn: a rug under each table and a runner in from the door, a
* dance floor before Dave's stage, strings of little lights overhead, bottles on the wall behind the bar, a
* dartboard by the card table. And the doorman.
*/
function clubDressing() {
	const rugs = [
		[
			8006186,
			10111546,
			14200928
		],
		[
			2771562,
			3828362,
			14208172
		],
		[
			3824186,
			5929546,
			14200928
		]
	];
	const decor = TABLES.map((t, i) => ({
		kind: "rug",
		x: t.x,
		y: 0,
		z: t.z,
		yaw: i * .4,
		r: 2.3,
		colors: rugs[i % rugs.length]
	}));
	decor.push({
		kind: "rug",
		x: 0,
		y: 0,
		z: 12.6,
		yaw: 0,
		w: 2.4,
		d: 8.4,
		colors: [
			6957626,
			9058890,
			14200928
		]
	});
	decor.push({
		kind: "dancefloor",
		x: 0,
		y: 0,
		z: -8.6,
		nx: 8,
		nz: 3,
		tile: 1.4,
		colors: [8006250, 2058866]
	});
	const midBar = (BAR.z0 + BAR.z1) / 2;
	decor.push({
		kind: "bulbs",
		x: -10,
		y: 5.2,
		z: -6,
		x1: 10,
		z1: -6,
		sag: 1.2,
		count: 12
	}, {
		kind: "bulbs",
		x: -10,
		y: 5.2,
		z: 8,
		x1: 10,
		z1: 8,
		sag: 1.2,
		count: 12
	}, {
		kind: "bulbs",
		x: 10,
		y: 5.2,
		z: 8,
		x1: 23.6,
		z1: midBar,
		sag: .9,
		count: 8
	}, {
		kind: "bulbs",
		x: -10,
		y: 5.2,
		z: 8,
		x1: -23.6,
		z1: 0,
		sag: .9,
		count: 8
	}, {
		kind: "bottles",
		x: 23.98,
		y: 1.9,
		z: midBar,
		yaw: WEST,
		width: 4.6
	}, {
		kind: "bottles",
		x: 23.98,
		y: 2.8,
		z: midBar,
		yaw: WEST,
		width: 4.6
	}, {
		kind: "dartboard",
		x: 23.98,
		y: 2.4,
		z: 3.2,
		yaw: WEST
	});
	return {
		decor,
		npcs: [{
			name: "Sir Hobnail",
			kind: "stag",
			x: 4.4,
			z: 20.2,
			y: 0,
			facing: Math.atan2(-.5, -1),
			doing: "stand",
			when: { beaten: ["stag", 1] },
			lines: [
				"HALT. Oh. It is you. In you go. You are on the list. You ARE the list.",
				"You put me on my back in front of my own gate, little knight. I have thought about it a great deal.",
				"I mind the door now. Nobody swings a hammer at a door. It is restful."
			]
		}]
	};
}
/** Everything the tables add to the room: what is drawn, what is solid, and who is sitting there. */
function clubTables() {
	const decor = [];
	const solids = [];
	const npcs = [];
	for (const t of TABLES) {
		decor.push({
			kind: "table",
			x: t.x,
			y: 0,
			z: t.z,
			yaw: 0,
			...t.top
		});
		solids.push(...tableSolids(t.x, 0, t.z));
		const place = (at) => [t.x + Math.sin(at) * SEAT_OUT, t.z + Math.cos(at) * SEAT_OUT];
		const taken = t.seats.filter((s) => s.who);
		for (const s of t.seats) {
			const [x, z] = place(s.at);
			const sits = s.who?.kind !== "ant";
			if (sits) {
				decor.push({
					kind: "stool",
					x,
					y: 0,
					z
				});
				solids.push(...stoolSolids(x, 0, z));
			}
			if (!s.who) continue;
			const other = taken.find((o) => o !== s);
			npcs.push({
				...s.who,
				x,
				z,
				y: 0,
				facing: s.at + Math.PI,
				seated: sits,
				partner: other ? place(other.at) : [t.x, t.z]
			});
		}
	}
	return {
		decor,
		solids,
		npcs
	};
}
function junction() {
	const base = compileCustom(club, "hub");
	const t = clubTables();
	const bar = clubBar();
	const dress = clubDressing();
	const tables = {
		decor: [
			...dress.decor,
			...t.decor,
			...bar.decor
		],
		solids: [...t.solids, ...bar.solids],
		npcs: [
			...t.npcs,
			...bar.npcs,
			...dress.npcs
		]
	};
	return {
		...base,
		decor: [...base.decor, ...tables.decor],
		solids: [...base.solids, ...tables.solids],
		npcs: [...base.npcs ?? [], ...tables.npcs],
		theme: "dungeon",
		hub: true,
		courseDoors: HUB_DOORS,
		restSpot: FIRE,
		storySpots: {
			dave: {
				x: 0,
				y: .8,
				z: -16.5
			},
			mort: {
				x: 17,
				y: 0,
				z: 8
			},
			wren: {
				x: 13,
				y: 0,
				z: -6
			}
		}
	};
}
// src/levels/garden.ts
/**
* The Move Garden: a test room for feeling the jump numbers, not part of the game.
*
* Mario 64's makers got the hero's movement right in a bare room of blocks before they built a course
* (reports/Super Mario 64 design research.md). This is that room for the knight: ledges at the heights that matter,
* chimneys of four widths, three ramps, a run to ride the shield down, a pole and a strip to measure against, and a board on everything saying what it is (two
* lines at most, in big letters: the game is drawn coarsely, and small writing cannot be read from where he stands). The
* numbers on the boards are the heights and widths of the things themselves (tests/garden.ts holds them to that);
* what he can DO with them depends on the jump numbers, which are on the Tweaks sliders, with a few sets to try at
* the top of "Jumping".
*
* Nothing here can be climbed by a wall kick that is not meant to be: whatever he could kick between is either
* joined on (no gap) or nine or more apart (a kick carries him a little over eight across before he is back down
* to where he kicked from).
*/
/** Half the room, east to west and north to south; and how high its walls are. North is -z. */
var GARDEN = {
	halfX: 36,
	halfZ: 24,
	wall: 16
};
/** Each is 2.6 square and joined to the wall; five clear between one and the next. */
var STEP_SIZE = 2.6;
var STEPS = [
	{
		top: 2.3,
		z: 12,
		move: "ONE JUMP"
	},
	{
		top: 3.4,
		z: 4.4,
		move: "JUMP, GRAB"
	},
	{
		top: 4.5,
		z: -3.2,
		move: "DOUBLE JUMP"
	},
	{
		top: 5.6,
		z: -10.8,
		move: "DOUBLE, GRAB"
	}
];
/** How thick a chimney's walls are (the least he can land on from a kick), and how far they stand out from the wall. */
var CHIMNEY_WALL = 2.4;
var CHIMNEYS = (() => {
	const list = [
		{
			id: "narrow",
			gap: 2.2,
			westTop: 10,
			eastTop: 10,
			lines: ["2.2 WIDE", "10 UP"]
		},
		{
			id: "wide",
			gap: 4,
			westTop: 10,
			eastTop: 10,
			lines: ["4 WIDE", "10 UP"]
		},
		{
			id: "widest",
			gap: 6,
			westTop: 8,
			eastTop: 8,
			lines: ["6 WIDE", "8 UP"]
		},
		{
			id: "one",
			gap: 3.5,
			westTop: 12,
			eastTop: 6,
			lines: ["6 UP", "ONE KICK"]
		}
	];
	let x = -GARDEN.halfX;
	return list.map((c) => {
		const at = x;
		x += CHIMNEY_WALL * 2 + c.gap + 9;
		return {
			...c,
			x: at
		};
	});
})();
/** The inner faces of a chimney, west and east, and the middle of its mouth. */
function chimneyFaces(c) {
	const west = c.x + CHIMNEY_WALL;
	return {
		west,
		east: west + c.gap,
		mid: west + c.gap / 2,
		z0: -GARDEN.halfZ,
		z1: -GARDEN.halfZ + 5
	};
}
/** The pole to jump beside (only drawn: he passes through it), and the strip on the floor to jump along. */
var POLE = {
	x: -12,
	z: 8,
	height: 9
};
/** The strip runs north from its line; he runs up from the south and jumps at the line. */
var STRIP = {
	x: 10,
	z: 12,
	length: 16,
	width: 1.6
};
var RAMP_LANDING = {
	x0: 27,
	x1: GARDEN.halfX,
	z0: -6,
	z1: -2,
	top: 3
};
var RAMPS = [
	{
		x0: 27,
		x1: 30,
		length: 12,
		lines: ["1 UP IN 4", "A GENTLE SLOPE"]
	},
	{
		x0: 30,
		x1: 33,
		length: 6,
		lines: ["1 UP IN 2", "A HILL"]
	},
	{
		x0: 33,
		x1: GARDEN.halfX,
		length: 3,
		lines: ["1 UP IN 1", "THE STEEPEST"]
	}
];
/** The creatures by the ramps, and the patch they keep to: the ramps, the landing, and a few steps of floor before them. */
var RAMP_PATCH = {
	x0: RAMP_LANDING.x0,
	x1: GARDEN.halfX,
	z0: RAMP_LANDING.z0,
	z1: RAMP_LANDING.z1 + 15
};
var RAMP_FOES = [{
	type: "scuttler",
	x: 28.5,
	y: RAMP_LANDING.top,
	z: -4,
	arena: { ...RAMP_PATCH },
	respawn: true,
	uncounted: true
}, {
	type: "guard",
	x: 31.5,
	y: 0,
	z: 11.5,
	facing: 0,
	arena: { ...RAMP_PATCH },
	respawn: true,
	uncounted: true
}];
/**
* The run, for riding the shield: along the south wall. A platform in the south-east corner, eight up; a walkable
* ramp up to it from the north, against the east wall; the RUN itself, a long slope west from it down to the floor
* (one up in two), with the whole length of the room to roll out along, a kicker on the way to jump from, and past
* that a rail and a kerb to grind; and the
* CHUTE, north off the platform, too steep to stand on (two up for one along): on that he slides whether he will or no.
*/
var RUN = {
	top: {
		x0: 30,
		x1: GARDEN.halfX,
		z0: 19,
		z1: GARDEN.halfZ,
		y: 8
	},
	/** The way up: it climbs south to the platform. */
	up: {
		x0: 33,
		x1: GARDEN.halfX,
		z0: 11,
		z1: 19
	},
	/** The run: it is high at its east end. */
	slope: {
		x0: 14,
		x1: 30,
		z0: 19,
		z1: GARDEN.halfZ
	},
	/** The chute: it is high at its south end. */
	chute: {
		x0: 30,
		x1: 33,
		z0: 15,
		z1: 19
	},
	/** The kicker: a little ramp across the roll-out, high at its west end. It stands before the door, so a rider is in the air past it. */
	kicker: {
		x0: 4,
		x1: 7,
		z0: 19.5,
		z1: 23.5,
		y: 1.2
	},
	/**
	* Things to grind, further along the roll-out, one to each side of the way: a RAIL (an iron bar a quarter wide,
	* half a unit high) and a KERB against the south wall, whose edge is a ledge. Riding straight down the middle he
	* is in reach of neither: he has to go to one. (They stop ten short of the west wall: room to brake in.)
	*/
	rail: {
		x0: -26,
		x1: -12,
		z: 20.5,
		wide: .24,
		y: .5
	},
	kerb: {
		x0: -26,
		x1: -12,
		z0: 22.4,
		z1: GARDEN.halfZ,
		y: .7
	}
};
/**
* The pipe: a half-pipe down the middle of the room, running north and south, to see how the shield takes a floor
* that CURVES across his way (the owner, 2026-11-15, of the level to come: "a circular level design with an
* interesting curved slope ... it'll be interesting to see how the board slide mechanics deal with that").
* Its floor is the room's own, three wide; either side of that a wall curves up, a quarter of a circle four in
* radius, to a deck three up. The curve is FACETS: ramps side by side, each steeper than the last (the ground here
* is boxes and ramps along x or z, and a curve is made of those). The top facet is far too steep to stand on.
* A ramp at the south end of each deck is the way up. He drops in from a deck: a jump out over the wall, and ATTACK.
*/
var PIPE = {
	/** Its middle line, and half the width of its flat floor. */
	x: -1.5,
	flat: 1.5,
	radius: 4,
	/** How many facets a wall is cut into, and how much of the quarter circle each takes (degrees). */
	facets: 5,
	turn: 15,
	deck: 2,
	z0: -14,
	z1: 8,
	/** The ramps up to the decks: this long, south from the pipe's south end. */
	way: 4
};
/** One wall's facets, from the floor outward: how far out each starts and ends, and how high. */
function pipeFacets() {
	const at = (i) => {
		const a = i * PIPE.turn * Math.PI / 180;
		return [PIPE.radius * Math.sin(a), PIPE.radius * (1 - Math.cos(a))];
	};
	return Array.from({ length: PIPE.facets }, (_, i) => {
		const [d0, h0] = at(i);
		const [d1, h1] = at(i + 1);
		return {
			d0,
			d1,
			h0,
			h1
		};
	});
}
/** How high its decks are, and how far out from its middle line a wall ends and a deck begins. */
var pipeDeck = () => {
	const f = pipeFacets();
	const last = f[f.length - 1];
	return {
		y: last.h1,
		out: PIPE.flat + last.d1
	};
};
/**
* The downhill pipe: a short length of pipe that RUNS DOWNHILL, by the north wall east of the strip, to try ramps
* tipped two ways. (The owner's level to come is a pipe like this the whole way: "a really long steep decline that's
* like a sewer pipe going down".) It falls five in twelve, from a platform at its north end to the floor at its
* south end; its floor is a narrow flat, and either side of that a wall curves up, cut into facets as the level
* pipe's are. Every piece of it is ONE plane tipped two ways: down the pipe, and (the facets) up across it.
* A ramp west of the platform is the way up. He drops in from the platform: a hop out over it, and ATTACK.
*/
var DROP = {
	/** Its middle line, and half the width of its flat floor. */
	x: 16.8,
	flat: .6,
	radius: 2.5,
	facets: 4,
	turn: 18.75,
	/** Its high end (north) and its low end (south), and how far it falls between them. */
	z0: -16,
	z1: -4,
	rise: 5,
	/** The platform at its top runs back to here; the way up to that starts here (and climbs east). */
	back: -19,
	wayFrom: 8.6
};
/** One wall's facets, from its floor outward: how far out each starts and ends, and how high (above the pipe's floor there). */
function dropFacets() {
	const at = (i) => {
		const a = i * DROP.turn * Math.PI / 180;
		return [DROP.radius * Math.sin(a), DROP.radius * (1 - Math.cos(a))];
	};
	return Array.from({ length: DROP.facets }, (_, i) => {
		const [d0, h0] = at(i);
		const [d1, h1] = at(i + 1);
		return {
			d0,
			d1,
			h0,
			h1
		};
	});
}
/** How far out from its middle line its walls end. */
var dropHalf = () => DROP.flat + dropFacets()[DROP.facets - 1].d1;
function garden() {
	const W = -GARDEN.halfX;
	const N = -GARDEN.halfZ;
	const solids = [...room(GARDEN.halfX, true, GARDEN.halfZ, GARDEN.wall)];
	const decor = [];
	const east = Math.PI / 2;
	const south = 0;
	for (const s of STEPS) {
		solids.push(extent("stone", W, W + STEP_SIZE, 0, s.top, s.z - STEP_SIZE / 2, s.z + STEP_SIZE / 2));
		const h = Math.min(1.5, s.top - .5);
		decor.push({
			kind: "sign",
			x: W + STEP_SIZE,
			y: s.top - .2 - h / 2,
			z: s.z,
			yaw: east,
			w: 2.5,
			h,
			lines: [`${s.top} UP`, s.move]
		});
	}
	for (let i = 0; i + 1 < STEPS.length; i++) decor.push({
		kind: "ruler",
		x: W,
		y: 0,
		z: (STEPS[i].z + STEPS[i + 1].z) / 2,
		yaw: east,
		length: 8,
		width: 1
	});
	for (const c of CHIMNEYS) {
		const f = chimneyFaces(c);
		solids.push(extent("stone", c.x, f.west, 0, c.westTop, f.z0, f.z1));
		solids.push(extent("stone", f.east, f.east + CHIMNEY_WALL, 0, c.eastTop, f.z0, f.z1));
		decor.push({
			kind: "ruler",
			x: f.mid,
			y: 0,
			z: N,
			yaw: south,
			length: Math.max(c.westTop, c.eastTop) + 1,
			width: Math.min(1.6, c.gap - .4)
		});
		const onEast = c.eastTop <= c.westTop;
		decor.push({
			kind: "sign",
			x: onEast ? f.east + CHIMNEY_WALL / 2 : c.x + CHIMNEY_WALL / 2,
			y: 1.9,
			z: f.z1,
			yaw: south,
			w: 2.3,
			h: 1.6,
			lines: c.lines
		});
	}
	const L = RAMP_LANDING;
	solids.push(extent("stone", L.x0, L.x1, 0, L.top, L.z0, L.z1));
	for (const r of RAMPS) {
		solids.push(rampBox("stone", r.x0, r.x1, L.z1, L.z1 + r.length, 0, L.top, "n"));
		decor.push({
			kind: "sign",
			x: r.x0 + .75,
			y: 1.5,
			z: L.z1 + r.length + .6,
			yaw: south,
			w: 1.4,
			h: .9,
			lines: r.lines,
			post: 0
		});
	}
	const T = RUN.top;
	solids.push(extent("stone", T.x0, T.x1, 0, T.y, T.z0, T.z1));
	solids.push(rampBox("stone", RUN.up.x0, RUN.up.x1, RUN.up.z0, RUN.up.z1, 0, T.y, "s"));
	solids.push(rampBox("stone", RUN.slope.x0, RUN.slope.x1, RUN.slope.z0, RUN.slope.z1, 0, T.y, "e"));
	solids.push(rampBox("stone", RUN.chute.x0, RUN.chute.x1, RUN.chute.z0, RUN.chute.z1, 0, T.y, "s"));
	solids.push(rampBox("stone", RUN.kicker.x0, RUN.kicker.x1, RUN.kicker.z0, RUN.kicker.z1, 0, RUN.kicker.y, "w"));
	solids.push({
		...extent("stone", RUN.rail.x0, RUN.rail.x1, 0, RUN.rail.y, RUN.rail.z - RUN.rail.wide / 2, RUN.rail.z + RUN.rail.wide / 2),
		skin: "rustPlate"
	});
	solids.push(extent("stone", RUN.kerb.x0, RUN.kerb.x1, 0, RUN.kerb.y, RUN.kerb.z0, RUN.kerb.z1));
	decor.push({
		kind: "sign",
		x: (RUN.kerb.x0 + RUN.kerb.x1) / 2,
		y: 2.6,
		z: GARDEN.halfZ,
		yaw: Math.PI,
		w: 3.2,
		h: 1.5,
		lines: ["GRIND", "JUMP, THEN STOW"]
	});
	decor.push({
		kind: "sign",
		x: T.x1,
		y: T.y + 1.6,
		z: (T.z0 + T.z1) / 2,
		yaw: -Math.PI / 2,
		w: 2.6,
		h: 1.4,
		lines: ["THE RUN", "JUMP, ATTACK"]
	});
	decor.push({
		kind: "sign",
		x: (RUN.chute.x0 + RUN.chute.x1) / 2,
		y: T.y + 1.6,
		z: T.z1,
		yaw: Math.PI,
		w: 2.6,
		h: 1.4,
		lines: ["TOO STEEP", "HE SLIDES"]
	});
	decor.push({
		kind: "sign",
		x: RUN.kicker.x1 + 1.6,
		y: 1.5,
		z: RUN.kicker.z0 - .8,
		yaw: Math.PI / 2,
		w: 2.4,
		h: 1.3,
		lines: ["JUMP", "THEN JUMP AGAIN"],
		post: 0
	});
	decor.push({
		kind: "lamp",
		x: 22,
		y: 11,
		z: 21.5
	}, {
		kind: "lamp",
		x: 8,
		y: 7,
		z: 21.5
	}, {
		kind: "lamp",
		x: -18,
		y: 7,
		z: 21.5
	});
	{
		const deck = pipeDeck();
		for (const side of [-1, 1]) {
			for (const f of pipeFacets()) {
				const a = PIPE.x + side * (PIPE.flat + f.d0);
				const b = PIPE.x + side * (PIPE.flat + f.d1);
				solids.push(rampBox("stone", Math.min(a, b), Math.max(a, b), PIPE.z0, PIPE.z1, f.h0, f.h1, side > 0 ? "e" : "w", 0));
			}
			const in0 = PIPE.x + side * deck.out;
			const out0 = PIPE.x + side * (deck.out + PIPE.deck);
			solids.push(extent("stone", Math.min(in0, out0), Math.max(in0, out0), 0, deck.y, PIPE.z0, PIPE.z1));
			solids.push(rampBox("stone", Math.min(in0, out0), Math.max(in0, out0), PIPE.z1, PIPE.z1 + PIPE.way, 0, deck.y, "n"));
		}
		decor.push({
			kind: "sign",
			x: PIPE.x + PIPE.flat + 1.7,
			y: 1.5,
			z: PIPE.z1 + .8,
			yaw: south,
			w: 2.8,
			h: 1.4,
			lines: ["THE PIPE", "DROP IN FROM TOP"],
			post: 0
		});
	}
	{
		const half = dropHalf();
		solids.push(rampBox("stone", DROP.x - DROP.flat, DROP.x + DROP.flat, DROP.z0, DROP.z1, 0, DROP.rise, "n", 0));
		for (const side of [-1, 1]) for (const f of dropFacets()) {
			const a = DROP.x + side * (DROP.flat + f.d0);
			const b = DROP.x + side * (DROP.flat + f.d1);
			solids.push(rampBox("stone", Math.min(a, b), Math.max(a, b), DROP.z0, DROP.z1, f.h0, f.h0 + DROP.rise, "n", 0, side * (f.h1 - f.h0)));
		}
		solids.push(extent("stone", DROP.x - half, DROP.x + half, 0, DROP.rise, DROP.back, DROP.z0));
		solids.push(rampBox("stone", DROP.wayFrom, DROP.x - half, DROP.back, DROP.z0, 0, DROP.rise, "e"));
		decor.push({
			kind: "sign",
			x: DROP.x + half + 1.2,
			y: 1.5,
			z: DROP.z1 + .6,
			yaw: south,
			w: 2.8,
			h: 1.4,
			lines: ["DOWNHILL PIPE", "BRAKE AT ITS END"],
			post: 0
		});
	}
	decor.push({
		kind: "ruler",
		x: POLE.x,
		y: 0,
		z: POLE.z,
		yaw: south,
		length: POLE.height,
		width: 1,
		pole: true
	});
	decor.push({
		kind: "sign",
		x: POLE.x + 2.2,
		y: 1.6,
		z: POLE.z,
		yaw: south,
		w: 2.8,
		h: 1.4,
		lines: ["HOW HIGH", "JUMP BESIDE IT"],
		post: 0
	});
	decor.push({
		kind: "ruler",
		x: STRIP.x,
		y: 0,
		z: STRIP.z,
		yaw: Math.PI,
		length: STRIP.length,
		width: STRIP.width,
		flat: true
	});
	decor.push({
		kind: "sign",
		x: STRIP.x - 3.4,
		y: 1.6,
		z: STRIP.z + 1,
		yaw: south,
		w: 2.8,
		h: 1.4,
		lines: ["HOW FAR", "JUMP AT THE LINE"],
		post: 0
	});
	for (let u = 2; u <= STRIP.length; u += 2) {
		const side = u / 2 % 2 === 1 ? 1 : -1;
		decor.push({
			kind: "sign",
			x: STRIP.x + side * (STRIP.width / 2 + .6 + u * .06),
			y: .8,
			z: STRIP.z - u,
			yaw: south,
			w: 1,
			h: .8,
			lines: [String(u)],
			post: 0
		});
	}
	for (const [x, z] of [
		[-24, 14],
		[-24, -6],
		[0, -10],
		[0, 10],
		[24, -10],
		[24, 10],
		[-10, -16],
		[12, -16]
	]) decor.push({
		kind: "lamp",
		x,
		y: 9,
		z
	});
	return {
		id: "garden",
		name: "The Move Garden",
		blurb: "A test room: ledges, chimneys and rulers for feeling the jump numbers.",
		theme: "dungeon",
		fogRange: [40, 150],
		solids,
		pit: null,
		water: [],
		decor,
		spawn: {
			x: 0,
			y: 0,
			z: 16,
			facing: Math.PI
		},
		collectibles: [],
		crateContents: [],
		enemies: RAMP_FOES,
		waves: [],
		gear: [],
		goals: [],
		exit: doorOn("south", GARDEN.halfX, 0, GARDEN.halfZ),
		returnTo: "hub",
		courseDoors: [
			{
				to: "longdrop",
				name: "The Long Drop",
				need: 0,
				door: doorOn("west", GARDEN.halfX, -15.6, GARDEN.halfZ, 0)
			},
			{
				to: "glowcave",
				name: "The Glow Cave",
				need: 0,
				door: doorOn("south", GARDEN.halfX, -6, GARDEN.halfZ, 0)
			},
			{
				to: "coldmain",
				name: "The Cold Main",
				need: 0,
				door: doorOn("south", GARDEN.halfX, 10.5, GARDEN.halfZ, 0)
			}
		]
	};
}
// src/levels/pipes.ts
/**
* Lengths of pipe to ride down: a narrow flat floor, and either side of it a wall that curves up, cut into facets
* (ramps side by side, each steeper than the last). A length that FALLS is planes tipped two ways (collision.ts,
* `Ramp.cross`): down the pipe, and up across it. Lengths run along z, high at their north end.
*
* (The Move Garden's two pipes were built by hand to try the idea; the downhill level is built from this.)
*/
/** An old sewer main, wide enough to carve in: about six across, its rim nearly two above its floor. */
var SEWER_PIPE = {
	flat: .6,
	radius: 2.5,
	facets: 4,
	turn: 18.75
};
/** One wall's facets, from the floor outward: how far out each starts and ends, and how high above the floor. */
function facetsOf(s) {
	const at = (i) => {
		const a = i * s.turn * Math.PI / 180;
		return [s.radius * Math.sin(a), s.radius * (1 - Math.cos(a))];
	};
	return Array.from({ length: s.facets }, (_, i) => {
		const [d0, h0] = at(i);
		const [d1, h1] = at(i + 1);
		return {
			d0,
			d1,
			h0,
			h1
		};
	});
}
/** How far out from its middle line a pipe's walls end, and how high its rim is above its floor. */
var pipeHalf = (s) => s.flat + facetsOf(s)[s.facets - 1].d1;
var pipeRim = (s) => facetsOf(s)[s.facets - 1].h1;
/**
* A length of pipe down the line x = `x`, from z0 (north) to z1: its floor is `top` up at z0 and `bottom` at z1 (the
* same, for a level length). Everything is solid down to `base` (the ground, y = 0, unless given). `shoulder`: either side, level with the
* rim, a shelf out to that far from the middle line, falling as the pipe does: somewhere to land for one who comes
* out of the trough.
*/
function pipeRun(kind, s, x, z0, z1, top, bottom, shoulder = 0, base = 0) {
	const out = [];
	const fall = top - bottom;
	const level = Math.abs(fall) < 1e-9;
	out.push(level ? extent(kind, x - s.flat, x + s.flat, base, top, z0, z1) : rampBox(kind, x - s.flat, x + s.flat, z0, z1, bottom, top, "n", base));
	for (const side of [-1, 1]) {
		for (const f of facetsOf(s)) {
			const a = x + side * (s.flat + f.d0);
			const b = x + side * (s.flat + f.d1);
			const x0 = Math.min(a, b);
			const x1 = Math.max(a, b);
			out.push(level ? rampBox(kind, x0, x1, z0, z1, top + f.h0, top + f.h1, side > 0 ? "e" : "w", base) : rampBox(kind, x0, x1, z0, z1, bottom + f.h0, top + f.h0, "n", base, side * (f.h1 - f.h0)));
		}
		if (shoulder > pipeHalf(s)) {
			const a = x + side * pipeHalf(s);
			const b = x + side * shoulder;
			const rim = pipeRim(s);
			out.push(level ? extent(kind, Math.min(a, b), Math.max(a, b), base, top + rim, z0, z1) : rampBox(kind, Math.min(a, b), Math.max(a, b), z0, z1, bottom + rim, top + rim, "n", base));
		}
	}
	return out;
}
/** How high a pipe's wall stands over its floor, that far out from its middle line (its rim's height, beyond its walls). */
function wallAt(s, out) {
	const d = Math.abs(out) - s.flat;
	if (d <= 0) return 0;
	for (const f of facetsOf(s)) if (d <= f.d1) return f.h0 + (f.h1 - f.h0) * (d - f.d0) / (f.d1 - f.d0);
	return pipeRim(s);
}
// src/levels/longdrop.ts
var S = SEWER_PIPE;
var RIM = pipeRim(S);
/** How wide the course is, from its middle to each wall; how high the walls stand over it; how deep it is built. */
var HALF = 8;
var WALL_UP = 9;
var DEEP = 8;
/** What is solid of a weed: this far out from its stem each way, and this high above where it grows. */
var WEED = {
	half: .22,
	high: 1.1
};
/** A kicker on a shoulder (on a flat) and one on a bed: how long, and how much higher its lip is than its foot. */
var SHOULDER_KICKER = {
	x0: 4,
	x1: 7,
	len: 3,
	rise: 1,
	back: 7
};
var BED_KICKER = {
	len: 3,
	rise: .5
};
var RAIL = {
	x: 1.4,
	wide: .24,
	high: .3
};
/**
* The giant ramp is a ski jump: a long steep in-run, a short level table at its foot, and a lip that turns up in two
* pieces, the second steeper. (Climbing costs him speed, and his speed has a top: a lip that climbed far would
* throw him less. What is giant is the in-run, and the fall.) `over`: how far the table is above the arena's floor.
*/
var LIP = {
	table: 3,
	len1: 3,
	rise1: 1.05,
	len2: 2.4,
	rise2: 1.8,
	over: 46,
	speed: 12.6
};
/** The arena: how wide its light is, how far past the lip its middle is, and how high he would have to be to be over its edge. */
var ARENA = {
	r: 13,
	ahead: 36,
	clear: 6
};
/** How far past the edge of the light the Widow's place is. */
var WIDOW_OUT = .8;
var WEEDS_A = [
	[1.7, 9],
	[-1.9, 16],
	[2.2, 24],
	[-.2, 29],
	[1.2, 37]
];
var WEEDS_B = [
	[-2.1, 8],
	[1.6, 16],
	[.3, 23],
	[-1.8, 30],
	[.9, 38]
];
var gate = (at, side) => side > 0 ? [
	[-1.6, at],
	[-.8, at],
	[0, at]
] : [
	[.2, at],
	[1, at],
	[1.8, at]
];
var SLALOM = [
	...gate(26, 1),
	...gate(40, -1),
	...gate(54, 1),
	...gate(68, -1)
];
var SLALOM_LANE = [
	[0, -1],
	[14, -1],
	[23, 1],
	[28, 1],
	[38, -.9],
	[42, -.9],
	[52, 1],
	[56, 1],
	[66, -.9],
	[74, -1]
];
var FIELD = [
	[-1.2, 26],
	[-.4, 26],
	[.4, 26],
	[1.2, 26],
	[1.8, 40],
	[2.6, 40],
	[3.4, 40],
	[4.2, 40]
];
var FIELD_LANE = [
	[0, 0],
	[14, 0],
	[23, 2.4],
	[28, 2.4],
	[36, .4],
	[42, .4],
	[50, 0]
];
var BOTH_RAILS = (from, to) => [[
	-RAIL.x,
	from,
	to
], [
	RAIL.x,
	from,
	to
]];
/** A bed that ends in a kicker down its middle, over a ledge: the steps. */
var STEP = {
	kind: "bed",
	len: 36,
	fall: 15,
	kickers: [[
		-1.5,
		1.5,
		33
	]]
};
/** The course, top to bottom. */
var COURSE = [
	{
		kind: "pipe",
		len: 48,
		fall: 20,
		crumbs: [8, 8]
	},
	{
		kind: "pipe",
		len: 48,
		fall: 24,
		weeds: WEEDS_A,
		crumbs: [4, 6]
	},
	{
		kind: "flat",
		len: 14
	},
	{
		kind: "pipe",
		len: 44,
		fall: 20,
		weeds: WEEDS_B,
		crumbs: [6, 6]
	},
	{
		kind: "bed",
		len: 64,
		fall: 27,
		rails: BOTH_RAILS(4, 64)
	},
	{
		kind: "ledge",
		drop: 4
	},
	{
		kind: "bed",
		len: 48,
		fall: 20,
		kickers: [[
			-6,
			-3,
			26
		], [
			3,
			6,
			26
		]],
		crumbs: [16, 4]
	},
	{
		kind: "ledge",
		drop: 5
	},
	{
		kind: "pipe",
		len: 78,
		fall: 38,
		weeds: SLALOM,
		lane: SLALOM_LANE,
		crumbs: [20, 13]
	},
	{
		kind: "flat",
		len: 14
	},
	{
		kind: "pipe",
		len: 48,
		fall: 22,
		weeds: WEEDS_A,
		crumbs: [4, 6]
	},
	{
		kind: "pipe",
		len: 48,
		fall: 24,
		weeds: WEEDS_B,
		crumbs: [6, 6]
	},
	STEP,
	{
		kind: "ledge",
		drop: 6
	},
	STEP,
	{
		kind: "ledge",
		drop: 6
	},
	STEP,
	{
		kind: "ledge",
		drop: 6
	},
	{
		kind: "bed",
		len: 84,
		fall: 36,
		rails: [[
			-RAIL.x,
			26,
			52
		], [
			RAIL.x,
			56,
			82
		]]
	},
	{
		kind: "pipe",
		len: 64,
		fall: 32,
		weeds: [
			...WEEDS_A,
			[-2, 46],
			[1.5, 52],
			[.2, 58]
		],
		crumbs: [42, 5]
	},
	{
		kind: "flat",
		len: 14
	},
	{
		kind: "pipe",
		len: 48,
		fall: 24,
		weeds: WEEDS_B,
		crumbs: [6, 6]
	},
	{
		kind: "bed",
		len: 60,
		fall: 25,
		rails: BOTH_RAILS(4, 60),
		kickers: [[
			-6,
			-3,
			30
		], [
			3,
			6,
			30
		]]
	},
	{
		kind: "ledge",
		drop: 5
	},
	{
		kind: "bed",
		len: 54,
		fall: 23,
		weeds: FIELD,
		lane: FIELD_LANE,
		crumbs: [14, 9]
	},
	{
		kind: "pipe",
		len: 78,
		fall: 39,
		weeds: SLALOM,
		lane: SLALOM_LANE,
		crumbs: [20, 13]
	},
	{
		kind: "flat",
		len: 14
	},
	{
		kind: "pipe",
		len: 48,
		fall: 22,
		weeds: WEEDS_A,
		crumbs: [4, 6]
	},
	STEP,
	{
		kind: "ledge",
		drop: 6
	},
	STEP,
	{
		kind: "ledge",
		drop: 6
	},
	{
		kind: "bed",
		len: 96,
		fall: 41,
		rails: [
			[
				RAIL.x,
				26,
				46
			],
			[
				-RAIL.x,
				50,
				70
			],
			[
				RAIL.x,
				74,
				94
			]
		]
	},
	{
		kind: "pipe",
		len: 64,
		fall: 32,
		weeds: [
			...WEEDS_B,
			[-.3, 46],
			[1.9, 52],
			[-1.9, 58]
		],
		crumbs: [42, 5]
	},
	{
		kind: "pipe",
		len: 56,
		fall: 26,
		weeds: WEEDS_A,
		crumbs: [42, 3]
	},
	{
		kind: "bed",
		len: 64,
		fall: 36,
		crumbs: [10, 12]
	}
];
/** How far up (or down) of where he left the ground he is after `seconds` in the air, thrown up at `up`. */
function flight(up, seconds) {
	const P = TUNING.physics;
	let vy = up;
	let y = 0;
	for (let i = 0; i < Math.round(seconds * 60); i++) {
		vy = Math.max(-P.maxFall, vy - (vy < 0 ? P.gravity * P.fallGravityMultiplier : P.gravity) / 60);
		y += vy / 60;
	}
	return y;
}
var laneAt = (lane, d) => {
	if (typeof lane === "number") return lane;
	if (d <= lane[0][0]) return lane[0][1];
	for (let i = 0; i + 1 < lane.length; i++) if (d <= lane[i + 1][0]) return lane[i][1] + (lane[i + 1][1] - lane[i][1]) * (d - lane[i][0]) / (lane[i + 1][0] - lane[i][0]);
	return lane[lane.length - 1][1];
};
var built$1 = null;
function build() {
	let fallen = RIM;
	for (const s of COURSE) fallen += s.kind === "ledge" ? s.drop : s.kind === "flat" ? 0 : s.fall;
	COURSE.forEach((s, i) => {
		const before = COURSE.slice(0, i).reverse().find((p) => p.kind !== "ledge");
		if (i > 0 && (s.kind === "pipe" || s.kind === "flat") && before?.kind === "bed") fallen += RIM;
	});
	const headY = LIP.over + fallen;
	const placed = [];
	const solids = [];
	const decor = [];
	const collectibles = [];
	const launches = [];
	const rails = [];
	const lineCrumbs = [];
	const weeds = [];
	const crumb = (x, y, z) => {
		const id = `drop-crumb-${collectibles.length}`;
		collectibles.push({
			id,
			kind: "crumb",
			x,
			y,
			z
		});
		return id;
	};
	/** Crumbs along the way a throw sends him: at his middle, at these times after he leaves the lip. */
	const arc = (x, z, y, speed, up, times) => times.map((t) => crumb(x, y + flight(up, t) + .55, z + speed * t));
	const walls = (z0, z1, base, top) => {
		solids.push(extent("wall", -9, -8, base, top, z0, z1), extent("wall", HALF, 9, base, top, z0, z1));
	};
	const weed = (x, y, z) => {
		solids.push({
			...extent("stone", x - WEED.half, x + WEED.half, y - .6, y + WEED.high, z - WEED.half, z + WEED.half),
			hidden: true
		});
		decor.push({
			kind: "weed",
			x,
			y: y - .1,
			z,
			size: .95
		});
		weeds.push([
			x,
			y,
			z
		]);
	};
	const torches = (z0, z1, at) => {
		for (let z = Math.ceil(z0 / 16) * 16; z < z1; z += 16) {
			const side = z / 16 % 2 === 0 ? -1 : 1;
			decor.push({
				kind: "torch",
				x: side * 7.98,
				y: at(z) + 5.4,
				z,
				yaw: -side * Math.PI / 2
			});
		}
	};
	const head = {
		z0: -10,
		z1: 0,
		y: headY
	};
	solids.push(extent("stone", -8, HALF, headY - DEEP, headY, head.z0, head.z1));
	solids.push(extent("wall", -8, HALF, headY - DEEP, headY + WALL_UP + 2, head.z0 - 1, head.z0));
	walls(head.z0 - 1, head.z1, headY - DEEP, headY + WALL_UP + 2);
	placed.push({
		kind: "head",
		z0: head.z0,
		z1: head.z1,
		y0: headY,
		y1: headY,
		trough: false,
		lane: 0,
		spec: null
	});
	let z = 0;
	let y = headY;
	let trough = false;
	for (const s of COURSE) {
		if (s.kind === "ledge") {
			y -= s.drop;
			continue;
		}
		const z0 = z;
		const z1 = z + s.len;
		const isTrough = s.kind !== "bed";
		if (isTrough && !trough) y -= RIM;
		const y0 = y;
		const y1 = s.kind === "flat" ? y : y - s.fall;
		const base = y1 - DEEP;
		const floor = (zz) => y0 + (y1 - y0) * (zz - z0) / (z1 - z0);
		const lane = s.kind === "flat" ? -1 : s.lane ?? (s.kind === "pipe" ? -1 : 0);
		placed.push({
			kind: s.kind,
			z0,
			z1,
			y0,
			y1,
			trough: isTrough,
			lane,
			spec: s
		});
		walls(z0, z1, base, y0 + (isTrough ? RIM : 0) + WALL_UP);
		torches(z0, z1, (zz) => floor(zz) + (isTrough ? RIM : 0));
		if (s.kind === "pipe" || s.kind === "flat") {
			solids.push(...pipeRun("stone", S, 0, z0, z1, y0, y1, HALF, base));
			decor.push({
				kind: "runnel",
				x: 0,
				z0,
				z1,
				y0,
				y1,
				w: S.flat * 1.5
			});
		} else solids.push(rampBox("stone", -8, HALF, z0, z1, y1, y0, "n", base));
		if (s.kind === "flat") {
			const K = SHOULDER_KICKER;
			const zk = z1 - K.back;
			for (const side of [-1, 1]) {
				const a = Math.min(side * K.x0, side * K.x1);
				const speed = TUNING.ride.max - .7;
				const up = speed * K.rise / K.len;
				solids.push(rampBox("stone", a, a + (K.x1 - K.x0), zk, zk + K.len, y + RIM, y + RIM + K.rise, "s"));
				const x = a + (K.x1 - K.x0) / 2;
				launches.push({
					kind: "shoulder",
					x,
					x0: a,
					x1: a + (K.x1 - K.x0),
					z0: zk,
					z: zk + K.len,
					y: y + RIM + K.rise,
					speed,
					up,
					crumbs: arc(x, zk + K.len, y + RIM + K.rise, speed, up, [
						.15,
						.4,
						.65,
						.9
					])
				});
			}
		}
		if (s.kind === "bed") {
			for (const [x, from, to] of s.rails ?? []) {
				const top = (zz) => floor(zz) + RAIL.high;
				solids.push({
					...rampBox("stone", x - RAIL.wide / 2, x + RAIL.wide / 2, z0 + from, z0 + to, top(z0 + to), top(z0 + from), "n", floor(z0 + to)),
					skin: "rustPlate"
				});
				const ids = [];
				for (let d = from + 5; d < to - 1; d += 6) ids.push(crumb(x, top(z0 + d) + .55, z0 + d));
				rails.push({
					x,
					z0: z0 + from,
					z1: z0 + to,
					crumbs: ids
				});
			}
			if (s.rails?.length) {
				const from = Math.min(...s.rails.map((r) => r[1]));
				const to = Math.max(...s.rails.map((r) => r[2]));
				decor.push({
					kind: "sleepers",
					x: 0,
					z0: z0 + from,
					z1: z0 + to,
					y0: floor(z0 + from),
					y1: floor(z0 + to),
					w: 4.2,
					gap: 1.5
				});
			}
			for (const [x0, x1, at] of s.kickers ?? []) {
				const K = BED_KICKER;
				const zk = z0 + at;
				const foot = floor(zk);
				const speed = TUNING.ride.max;
				const up = speed * K.rise / K.len;
				solids.push(rampBox("stone", x0, x1, zk, zk + K.len, foot, foot + K.rise, "s", floor(Math.min(z1, zk + K.len)) - .3));
				const x = (x0 + x1) / 2;
				launches.push({
					kind: "bed",
					x,
					x0,
					x1,
					z0: zk,
					z: zk + K.len,
					y: foot + K.rise,
					speed,
					up,
					crumbs: arc(x, zk + K.len, foot + K.rise, speed, up, [
						.2,
						.45,
						.7,
						.95
					])
				});
			}
		}
		if (s.kind !== "flat") {
			for (const [x, d] of s.weeds ?? []) weed(x, floor(z0 + d) + (isTrough ? wallAt(S, x) : 0), z0 + d);
			const [from, count] = s.crumbs ?? [0, 0];
			for (let i = 0; i < count; i++) {
				const d = from + i * 4;
				const x = laneAt(lane, d);
				lineCrumbs.push(crumb(x, floor(z0 + d) + (isTrough ? wallAt(S, x) : 0) + .55, z0 + d));
			}
		}
		z = z1;
		y = y1;
		trough = isTrough;
	}
	const tableY = y;
	const base = tableY - DEEP;
	solids.push(extent("stone", -8, HALF, base, tableY, z, z + LIP.table));
	placed.push({
		kind: "table",
		z0: z,
		z1: z + LIP.table,
		y0: tableY,
		y1: tableY,
		trough: false,
		lane: 0,
		spec: null
	});
	const lz0 = z + LIP.table;
	const lzm = lz0 + LIP.len1;
	const lz1 = lzm + LIP.len2;
	const lipY = tableY + LIP.rise1 + LIP.rise2;
	solids.push(rampBox("stone", -8, HALF, lz0, lzm, tableY, tableY + LIP.rise1, "s", base));
	solids.push(rampBox("stone", -8, HALF, lzm, lz1, tableY + LIP.rise1, lipY, "s", base));
	placed.push({
		kind: "lip",
		z0: lz0,
		z1: lz1,
		y0: tableY,
		y1: lipY,
		trough: false,
		lane: 0,
		spec: null
	});
	walls(z, lz1, base, lipY + WALL_UP);
	decor.push({
		kind: "torch",
		x: -7.98,
		y: lipY + 3,
		z: lz1 - .6,
		yaw: Math.PI / 2
	}, {
		kind: "torch",
		x: 7.98,
		y: lipY + 3,
		z: lz1 - .6,
		yaw: -Math.PI / 2
	});
	const lip = {
		z: lz1,
		y: lipY
	};
	{
		const speed = LIP.speed;
		const up = speed * LIP.rise2 / LIP.len2;
		launches.push({
			kind: "giant",
			x: 0,
			x0: -8,
			x1: HALF,
			z0: lz0,
			z: lz1,
			y: lip.y,
			speed,
			up,
			crumbs: arc(0, lz1, lip.y, speed, up, [
				.2,
				.45,
				.7,
				.95,
				1.2,
				1.45
			])
		});
	}
	const arena = {
		x: 0,
		z: lip.z + ARENA.ahead,
		r: ARENA.r
	};
	solids.push({
		...extent("floor", arena.x - arena.r - 4, arena.x + arena.r + 4, -1, 0, arena.z - arena.r - 4, arena.z + arena.r + 4),
		hidden: true
	});
	solids.push({
		...extent("wall", arena.x - 2.2, arena.x + 2.2, 0, 4.6, arena.z + arena.r + .15, arena.z + arena.r + .85),
		hidden: true
	});
	decor.push({
		kind: "arena",
		x: arena.x,
		y: 0,
		z: arena.z,
		r: arena.r
	});
	decor.push({
		kind: "eyes",
		x: arena.x,
		y: 0,
		z: arena.z,
		r0: arena.r + 4,
		r1: arena.r + 17,
		high: 8,
		count: 52
	});
	const top = base - 1;
	const well = {
		x: arena.x,
		z: arena.z,
		y: 0,
		r: arena.r,
		clear: ARENA.clear,
		top,
		flare: (ARENA.ahead + 1.5 - arena.r) / (top - ARENA.clear)
	};
	decor.push({
		kind: "sign",
		x: -4.6,
		y: headY + 1.5,
		z: -2.2,
		yaw: Math.PI,
		w: 2.8,
		h: 1.4,
		lines: ["THE LONG DROP", "JUMP, ATTACK"],
		post: 0
	});
	const firstRails = placed.find((p) => p.spec?.kind === "bed" && p.spec.rails?.length);
	if (firstRails) decor.push({
		kind: "sign",
		x: -7.98,
		y: firstRails.y0 + 2.2,
		z: firstRails.z0 + 4,
		yaw: Math.PI / 2,
		w: 2.8,
		h: 1.4,
		lines: ["THE RAILS", "RIDE NEAR, STOW"]
	});
	return {
		placed,
		solids,
		decor,
		collectibles,
		launches,
		rails,
		lineCrumbs,
		weeds,
		head,
		lip,
		arena,
		well
	};
}
/** Everything about how the course lies (built once). */
function longDropPlan() {
	return built$1 ??= build();
}
pipeHalf(S);
function longDrop() {
	const B = longDropPlan();
	return {
		id: "longdrop",
		name: "The Long Drop",
		blurb: "A minute and a half downhill on the shield: pipes, rails and ramps, and a long fall into the dark at the end.",
		theme: "sewer",
		music: "pump",
		fogRange: [30, 110],
		solids: B.solids.map((b) => ({ ...b })),
		pit: null,
		water: [],
		decor: B.decor.map((d) => ({ ...d })),
		spawn: {
			x: 0,
			y: B.head.y,
			z: -6,
			facing: 0
		},
		collectibles: B.collectibles.map((c) => ({ ...c })),
		crateContents: [],
		waves: [],
		gear: [],
		enemies: [1, -1].map((side) => ({
			type: "widow",
			x: B.arena.x + side * (B.arena.r + WIDOW_OUT),
			y: 0,
			z: B.arena.z,
			respawn: false,
			arena: {
				x0: B.arena.x - B.arena.r,
				x1: B.arena.x + B.arena.r,
				z0: B.arena.z - B.arena.r,
				z1: B.arena.z + B.arena.r
			}
		})),
		goals: [{
			type: "defeat",
			label: "Beat the Widows"
		}],
		well: { ...B.well },
		exit: {
			x: B.arena.x,
			z: B.arena.z + B.arena.r - .35,
			yaw: Math.PI,
			width: 2.6,
			height: 3.8,
			y: 0
		},
		returnTo: "garden"
	};
}
// src/levels/glowcave.ts
var GLOWCAVE = {
	halfX: 14,
	halfZ: 11,
	wall: 9
};
var PINK = 16730792;
var ORANGE = 16747050;
var BLUE = 4905215;
var MOSS = 1619184;
var LICHEN = 1351800;
var GREEN = 7012202;
var YELLOW = 16769098;
var AMBER = 16756794;
/**
* The Cap Walk: five tall yellow mushrooms, each cap a jump from the one before and higher: from the low step by
* the east wall, round the south of the cave, to the tallest in the north-west. [x, z, the height of its top]
* He jumps a long way (a running jump lands eight off and two up; the second jump, fourteen), so they stand well
* apart: the first four are each a good running jump from the last, and the fifth is across a gap that only the
* second jump crosses. From the third on they are higher than he can get from the floor by any jump, and the last is
* higher than he can get from anything else in the cave: what is on them is earned by the walk.
* (Their caps are clear of the height the glow bugs fly at, where the bugs fly.)
*/
var CAP_WALK = [
	[
		11.5,
		4,
		3
	],
	[
		7,
		8.2,
		4.9
	],
	[
		1.6,
		5.6,
		6.8
	],
	[
		-4.4,
		3.4,
		8.7
	],
	[
		-8,
		-6.6,
		10.1
	]
];
/** Where the bottle cap over the long gap hangs: this share of the way across, this far above the fourth cap. */
var GAP_PRIZE = {
	along: .5,
	up: 3.7
};
/** A walk mushroom's cap and stem: wide enough to land on and take a step, slender for its height. */
var WALK_CAP = 1.5;
var WALK_STEM = .34;
/** What the walk gives: a bottle cap on the fourth mushroom, one in the air over the long gap, a relic on the last. */
var WALK_PRIZES = {
	fourth: "cave-cap-fourth",
	gap: "cave-cap-gap",
	last: "cave-relic-last"
};
function glowCave() {
	const G = GLOWCAVE;
	const solids = [];
	const decor = [];
	const skinned = (b, skin) => ({
		...b,
		skin
	});
	solids.push(skinned(extent("floor", -G.halfX - 1, G.halfX + 1, -1, 0, -G.halfZ - 1, G.halfZ + 1), "caveFloor"));
	for (const [x0, x1, z0, z1] of [
		[
			-G.halfX - 1,
			-G.halfX,
			-G.halfZ - 1,
			G.halfZ + 1
		],
		[
			G.halfX,
			G.halfX + 1,
			-G.halfZ - 1,
			G.halfZ + 1
		],
		[
			-G.halfX,
			G.halfX,
			-G.halfZ - 1,
			-G.halfZ
		],
		[
			-G.halfX,
			G.halfX,
			G.halfZ,
			G.halfZ + 1
		]
	]) solids.push(skinned(extent("wall", x0, x1, 0, G.wall, z0, z1), "caveRock"));
	const ledges = [
		[
			-G.halfX,
			-9.5,
			-G.halfZ,
			2,
			1.1
		],
		[
			-9.5,
			-6.5,
			-G.halfZ,
			-7.5,
			1.1
		],
		[
			5,
			8.5,
			-G.halfZ,
			-7,
			1.2
		],
		[
			8.5,
			G.halfX,
			-G.halfZ,
			-5,
			2.4
		],
		[
			10.5,
			G.halfX,
			-5,
			-1,
			1.2
		]
	];
	for (const [x0, x1, z0, z1, top] of ledges) solids.push(skinned(extent("stone", x0, x1, 0, top, z0, z1), "caveRock"));
	const stands = [
		[
			-11.6,
			-7.6,
			1.1,
			2.6,
			PINK
		],
		[
			-12.4,
			-5.9,
			1.1,
			1.3,
			PINK
		],
		[
			-10.6,
			-6.4,
			1.1,
			.8,
			ORANGE
		],
		[
			-12.2,
			-2.2,
			1.1,
			1.7,
			BLUE
		],
		[
			-11.2,
			.4,
			1.1,
			.9,
			PINK
		],
		[
			-4.2,
			-9.4,
			0,
			2.2,
			ORANGE
		],
		[
			-2.9,
			-8.8,
			0,
			1.2,
			ORANGE
		],
		[
			-5.3,
			-8.3,
			0,
			.7,
			PINK
		],
		[
			-3.4,
			-7.3,
			0,
			.6,
			BLUE
		],
		[
			2.2,
			-2.2,
			0,
			1.6,
			BLUE
		],
		[
			3.3,
			-1.3,
			0,
			.9,
			BLUE
		],
		[
			1.4,
			-.9,
			0,
			.6,
			PINK
		],
		[
			11.8,
			-8.4,
			2.4,
			2.2,
			PINK
		],
		[
			10.2,
			-9.6,
			2.4,
			1.5,
			ORANGE
		],
		[
			12.8,
			-6.3,
			2.4,
			1.1,
			BLUE
		],
		[
			12.4,
			-2.8,
			1.2,
			1.6,
			ORANGE
		],
		[
			11.5,
			-1.6,
			1.2,
			.8,
			PINK
		],
		[
			-8.4,
			7.6,
			0,
			1.9,
			PINK
		],
		[
			-9.6,
			8.6,
			0,
			1,
			BLUE
		],
		[
			-7.3,
			8.9,
			0,
			.7,
			ORANGE
		],
		[
			8.2,
			3.6,
			0,
			.9,
			BLUE
		],
		[
			13.2,
			8.6,
			0,
			.8,
			PINK
		],
		[
			7.2,
			10,
			0,
			.7,
			ORANGE
		],
		[
			-1.2,
			5.2,
			0,
			.9,
			ORANGE
		],
		[
			6.6,
			-8.2,
			1.2,
			1.2,
			BLUE
		]
	];
	for (const [x, z, y, size, color] of stands) {
		decor.push({
			kind: "mushroom",
			x,
			y,
			z,
			size,
			color
		});
		solids.push(...mushroomSolids(x, y, z, size));
	}
	const collectibles = [];
	for (const [x, z, top] of CAP_WALK) {
		const size = top + WALK_CAP * .032;
		decor.push({
			kind: "mushroom",
			x,
			y: 0,
			z,
			size,
			color: YELLOW,
			cap: WALK_CAP,
			stem: WALK_STEM
		});
		solids.push(...mushroomSolids(x, 0, z, size, WALK_CAP, WALK_STEM));
	}
	{
		const [x4, z4] = CAP_WALK[3];
		const [x5, z5] = CAP_WALK[4];
		const top4 = mushroomTop(x4, 0, z4, CAP_WALK[3][2] + WALK_CAP * .032, WALK_CAP);
		const top5 = mushroomTop(x5, 0, z5, CAP_WALK[4][2] + WALK_CAP * .032, WALK_CAP);
		collectibles.push({
			id: WALK_PRIZES.fourth,
			kind: "cap",
			x: x4,
			y: top4 + .7,
			z: z4
		});
		collectibles.push({
			id: WALK_PRIZES.gap,
			kind: "cap",
			x: x4 + (x5 - x4) * GAP_PRIZE.along,
			y: top4 + GAP_PRIZE.up,
			z: z4 + (z5 - z4) * GAP_PRIZE.along
		});
		collectibles.push({
			id: WALK_PRIZES.last,
			kind: "relic",
			x: x5,
			y: top5 + .8,
			z: z5
		});
	}
	const N = 0;
	const S = Math.PI;
	const E = Math.PI / 2;
	const W = -Math.PI / 2;
	const clumps = [
		[
			-1.5,
			3.3,
			-G.halfZ,
			N,
			1.7,
			7,
			true
		],
		[
			-7.8,
			2.7,
			-G.halfZ,
			N,
			1,
			4,
			false
		],
		[
			3.4,
			5.2,
			-G.halfZ,
			N,
			1.2,
			5,
			false
		],
		[
			7,
			3.6,
			-G.halfZ,
			N,
			.8,
			3,
			false
		],
		[
			-G.halfX,
			3.9,
			-4.5,
			E,
			1.5,
			6,
			true
		],
		[
			-G.halfX,
			2.5,
			5.6,
			E,
			1.1,
			4,
			false
		],
		[
			-G.halfX,
			5.6,
			.6,
			E,
			.9,
			3,
			false
		],
		[
			G.halfX,
			5.4,
			-3.2,
			W,
			1.3,
			5,
			false
		],
		[
			G.halfX,
			2.7,
			4.6,
			W,
			1.6,
			6,
			true
		],
		[
			G.halfX,
			6.4,
			8.2,
			W,
			1.1,
			4,
			false
		],
		[
			G.halfX,
			7.6,
			1.2,
			W,
			1.2,
			5,
			false
		],
		[
			-7,
			3.1,
			G.halfZ,
			S,
			1.4,
			5,
			true
		],
		[
			6.6,
			3.8,
			G.halfZ,
			S,
			1.1,
			4,
			false
		],
		[
			-9.5,
			.55,
			-3,
			E,
			.5,
			0,
			false
		],
		[
			8.5,
			1.8,
			-8.6,
			W,
			.5,
			2,
			false
		],
		[
			12.3,
			.6,
			-1,
			N,
			.55,
			0,
			false
		],
		[
			-8,
			.55,
			-7.5,
			N,
			.5,
			0,
			false
		]
	];
	for (const [x, y, z, yaw, size, threads, light] of clumps) decor.push({
		kind: "moss",
		x,
		y,
		z,
		yaw,
		size,
		color: MOSS,
		threads,
		light
	});
	for (const [x, y, z, yaw, size] of [
		[
			-3.9,
			0,
			-8.3,
			.4,
			1.4
		],
		[
			2.4,
			0,
			-1.6,
			1.9,
			1.2
		],
		[
			-8.5,
			0,
			8.1,
			2.6,
			1.2
		],
		[
			11.3,
			0,
			4.3,
			.9,
			1.1
		],
		[
			6.8,
			0,
			8.4,
			2.1,
			1
		],
		[
			-7.8,
			0,
			-6.2,
			.4,
			.9
		],
		[
			-11.8,
			1.1,
			-6.6,
			1.2,
			1
		],
		[
			11.6,
			2.4,
			-8,
			2.2,
			1
		],
		[
			5.2,
			0,
			2.6,
			.2,
			.8
		],
		[
			-5.2,
			0,
			1.4,
			1.5,
			.9
		],
		[
			-1,
			0,
			5.4,
			2.9,
			.7
		],
		[
			12.2,
			1.2,
			-2.4,
			.7,
			.8
		],
		[
			-12,
			1.1,
			-1,
			2,
			.9
		]
	]) decor.push({
		kind: "moss",
		x,
		y,
		z,
		yaw,
		size,
		color: LICHEN,
		flat: true
	});
	const roof = ceilingOf(solids).y;
	for (const [x, z, tip, r] of [
		[
			-12.2,
			7.6,
			9.1,
			.8
		],
		[
			-12.8,
			9.4,
			10.6,
			.5
		],
		[
			7.4,
			-2.6,
			9.2,
			.8
		],
		[
			6.6,
			-3.8,
			10.8,
			.5
		],
		[
			12.5,
			9.5,
			11.2,
			.6
		],
		[
			3.5,
			-9.5,
			9,
			.75
		],
		[
			2.6,
			-8.7,
			10.6,
			.5
		]
	]) decor.push({
		kind: "stalactite",
		x,
		z,
		length: roof - tip,
		r
	});
	decor.push({
		kind: "crystal",
		x: -13.2,
		y: 0,
		z: 9.4,
		size: 1.6,
		color: 7002367
	}, {
		kind: "crystal",
		x: 13,
		y: 0,
		z: 9.6,
		size: 1.2,
		color: 11565823
	}, {
		kind: "crystal",
		x: .6,
		y: 0,
		z: -10.2,
		size: 1.9,
		color: 6279360
	});
	/** The air the glow bugs keep to: the west and the middle of the room, in from its walls (the Cap Walk's first two caps, which are at their height, are east of it). */
	const air = {
		x0: -G.halfX + 2,
		x1: 2.5,
		z0: -G.halfZ + 2,
		z1: G.halfZ - 2
	};
	/** The floor the scorpions keep to: the room. (Ledges, stems and walls stop them of themselves.) */
	const ground = {
		x0: -G.halfX + .5,
		x1: G.halfX - .5,
		z0: -G.halfZ + .5,
		z1: G.halfZ - .5
	};
	return {
		id: "glowcave",
		name: "The Glow Cave",
		blurb: "A try-out of a theme: a cave lit only by what grows in it.",
		theme: "cave",
		music: "echo",
		fog: 197898,
		fogRange: [14, 52],
		ambient: .4,
		solids,
		pit: null,
		water: [],
		decor,
		spawn: {
			x: 0,
			y: 0,
			z: 8,
			facing: Math.PI
		},
		collectibles,
		crateContents: [],
		enemies: [
			{
				type: "firefly",
				x: -6,
				z: -3.6,
				arena: air,
				color: PINK
			},
			{
				type: "firefly",
				x: 1.5,
				z: -4.2,
				arena: air,
				color: BLUE
			},
			{
				type: "firefly",
				x: 0,
				z: -8,
				arena: air,
				color: GREEN
			},
			{
				type: "scorpion",
				x: -7.5,
				z: -1.5,
				arena: ground
			},
			{
				type: "scorpion",
				x: 4.6,
				z: -5.4,
				arena: ground,
				color: AMBER
			}
		],
		waves: [],
		gear: [],
		goals: [],
		exit: doorOn("south", G.halfX, 4, G.halfZ, 0),
		returnTo: "garden"
	};
}
// src/world/gusts.ts
/** How fast a jet's gas runs out along it. */
var JET_SPEED = 3.4;
// src/levels/coldmain.ts
var COLDMAIN = {
	halfX: 15,
	halfZ: 11,
	wall: 8,
	channel: 4
};
/**
* The blocks of ice in the channel: [x, z, the height of its top]. Each is `ICE_BLOCK` square. The first is a jump up
* from the bank; the last is higher than he can get from the floor by any jump.
*/
var ICE_BLOCKS = [
	[
		-9,
		.4,
		1.6
	],
	[
		-3.4,
		-.8,
		3.2
	],
	[
		2.4,
		.9,
		4.8
	],
	[
		9.4,
		-.2,
		6.4
	]
];
var ICE_BLOCK = 2.6;
/** Where the spikes of ice stand: [x, z, how tall]. Those in the channel are what the bottle caps hide among. */
var ICE_SPIKES = [
	[
		-6.6,
		3.1,
		1.7
	],
	[
		-5.3,
		3.4,
		2.2
	],
	[
		-4,
		3.1,
		1.6
	],
	[
		-6.9,
		1.8,
		1.3
	],
	[
		-3.7,
		1.8,
		1.4
	],
	[
		5.2,
		-3.3,
		1.5
	],
	[
		6.5,
		-3.5,
		2.1
	],
	[
		7.8,
		-3.2,
		1.7
	],
	[
		8.1,
		-1.9,
		1.4
	],
	[
		5.4,
		-.9,
		1.2
	],
	[
		6.8,
		-.7,
		1.5
	],
	[
		-12.6,
		-8.6,
		2.6
	],
	[
		-11.2,
		-9.6,
		1.5
	],
	[
		12.4,
		8.8,
		2.4
	],
	[
		11,
		9.7,
		1.4
	],
	[
		-13,
		6.2,
		1.8
	],
	[
		13.2,
		-6.6,
		2
	],
	[
		.8,
		-9.8,
		1.6
	],
	[
		-2.2,
		9.6,
		1.3
	]
];
/**
* Where the pipes have burst: [x, a gust every so many seconds, each so long]. From each a jet of gas comes down to the
* foot of its bank and then runs low across the ice to the far bank: that low run is a GUST (world/gusts.ts), and
* carries him across with it. None crosses a block of ice (gas does not go through one), and no two keep the same time.
*/
var NORTH_BURSTS = [[
	-6.2,
	5.2,
	1.9
], [
	6.5,
	6.6,
	2.3
]];
var SOUTH_BURSTS = [[
	-12.6,
	5.9,
	2.1
], [
	-.5,
	4.7,
	1.7
]];
/** The fall of gas from a pipe to the floor, and the gust across the ice: how long, how wide at its end, how high off the ice, how fast it carries him. */
var FALL = { length: 7.4 };
var GUST = {
	length: 8.6,
	width: 2.8,
	y: .9,
	push: 4.6
};
var ICE_PRIZES = {
	south: "cold-cap-south",
	north: "cold-cap-north",
	top: "cold-relic-top"
};
var COLD = 13625599;
function coldMain() {
	const G = COLDMAIN;
	const solids = [];
	const decor = [];
	const skinned = (b, skin) => ({
		...b,
		skin
	});
	solids.push(skinned(extent("floor", -G.halfX - 1, G.halfX + 1, -1, 0, -G.halfZ - 1, -G.channel), "frostCobbles"));
	solids.push(skinned(extent("floor", -G.halfX - 1, G.halfX + 1, -1, 0, G.channel, G.halfZ + 1), "frostCobbles"));
	solids.push({
		...skinned(extent("floor", -G.halfX - 1, G.halfX + 1, -1, 0, -G.channel, G.channel), "iceSheet"),
		slick: true
	});
	for (const [x0, x1, z0, z1] of [
		[
			-G.halfX - 1,
			-G.halfX,
			-G.halfZ - 1,
			G.halfZ + 1
		],
		[
			G.halfX,
			G.halfX + 1,
			-G.halfZ - 1,
			G.halfZ + 1
		],
		[
			-G.halfX,
			G.halfX,
			-G.halfZ - 1,
			-G.halfZ
		],
		[
			-G.halfX,
			G.halfX,
			G.halfZ,
			G.halfZ + 1
		]
	]) solids.push(skinned(extent("wall", x0, x1, 0, G.wall, z0, z1), "iceBrick"));
	const h = ICE_BLOCK / 2;
	for (const [x, z, top] of ICE_BLOCKS) solids.push({
		...skinned(extent("stone", x - h, x + h, 0, top, z - h, z + h), "iceBlock"),
		slick: true
	});
	for (const [x, z, size] of ICE_SPIKES) {
		decor.push({
			kind: "iceSpike",
			x,
			y: 0,
			z,
			size
		});
		solids.push(...iceSpikeSolids(x, 0, z, size));
	}
	const PIPE_Y = 5.2;
	const PIPE_R = .34;
	for (const side of [-1, 1]) {
		const z = side * (G.halfZ - .45);
		decor.push({
			kind: "pipe",
			a: [
				-G.halfX,
				PIPE_Y,
				z
			],
			b: [
				G.halfX,
				PIPE_Y,
				z
			],
			r: PIPE_R,
			color: 8293526
		});
		for (const [x, every, on] of side < 0 ? NORTH_BURSTS : SOUTH_BURSTS) {
			decor.push({
				kind: "jet",
				x,
				y: 5,
				z: z - side * .3,
				dir: [
					0,
					-.85,
					-side
				],
				length: FALL.length,
				width: 3.2,
				color: COLD,
				every,
				on
			});
			decor.push({
				kind: "jet",
				x,
				y: GUST.y,
				z: side * (G.channel + .4),
				dir: [
					0,
					0,
					-side
				],
				length: GUST.length,
				width: GUST.width,
				color: COLD,
				every,
				on,
				delay: FALL.length / JET_SPEED,
				push: GUST.push
			});
		}
		for (let x = -G.halfX + 1; x < G.halfX - .5; x += .62) {
			const k = Math.sin(x * 2.3 + side) * Math.sin(x * .71 - side * 2);
			if (k < .05) continue;
			decor.push({
				kind: "icicle",
				x,
				z,
				length: .3 + k * .85,
				r: .06 + k * .07,
				top: PIPE_Y - PIPE_R * .9
			});
		}
	}
	for (const [x, z, length] of [
		[
			-12,
			7,
			2.6
		],
		[
			-11.2,
			7.9,
			1.4
		],
		[
			-13.2,
			-6.5,
			2.2
		],
		[
			-12.4,
			-7.6,
			1.2
		],
		[
			13,
			7.4,
			2.4
		],
		[
			12.2,
			8.6,
			1.3
		],
		[
			-1,
			8.6,
			1.9
		],
		[
			-.2,
			9.4,
			1
		],
		[
			.6,
			-8.8,
			2
		],
		[
			13.2,
			-8.4,
			1.6
		]
	]) decor.push({
		kind: "icicle",
		x,
		z,
		length,
		r: .12 + length * .07
	});
	for (const [x, z] of [
		[-11, -G.channel - .5],
		[0, -G.channel - .5],
		[11, -G.channel - .5],
		[-11, G.channel + .5],
		[11, G.channel + .5],
		[-5, G.halfZ - .6],
		[5, -G.halfZ + .6]
	]) decor.push({
		kind: "light",
		x,
		y: 0,
		z,
		color: COLD,
		flash: 0
	});
	const collectibles = [
		{
			id: ICE_PRIZES.south,
			kind: "cap",
			x: -5.3,
			y: .6,
			z: 2.1
		},
		{
			id: ICE_PRIZES.north,
			kind: "cap",
			x: 6.6,
			y: .6,
			z: -2.1
		},
		{
			id: ICE_PRIZES.top,
			kind: "relic",
			x: ICE_BLOCKS[3][0],
			y: ICE_BLOCKS[3][2] + .8,
			z: ICE_BLOCKS[3][1]
		}
	];
	return {
		id: "coldmain",
		name: "The Cold Main",
		blurb: "A try-out of a theme: a length of the sewer, frozen.",
		theme: "sewer",
		motes: "ice",
		music: "echo",
		fog: 1186856,
		fogRange: [18, 62],
		ambient: .62,
		solids,
		pit: null,
		water: [],
		decor,
		spawn: {
			x: 0,
			y: 0,
			z: 8.4,
			facing: Math.PI
		},
		collectibles,
		crateContents: [],
		enemies: [],
		waves: [],
		gear: [],
		goals: [],
		exit: doorOn("south", G.halfX, 3, G.halfZ, 0),
		returnTo: "garden"
	};
}
// src/levels/campaign.ts
/**
* The campaign: the fourteen rooms of the story, in the order he plays them, and the rule for which ones are open.
* Plain data, so tests can check it in node.
*/
var CAMPAIGN = [
	"sewer",
	"caps",
	"hunt",
	"waves",
	"leap",
	"crates",
	"waterworks",
	"plankpit",
	"cellars",
	"liftshaft",
	"furnace",
	"webhollow",
	"lair",
	"davespot"
];
// src/story/scenes.ts
/** The sewer chamber: the tunnel mouth he arrives by (on the south wall) and where he stops to look about. */
var SEWER = {
	tunnel: {
		x: 5,
		z: 20
	},
	stop: {
		x: 4.2,
		z: 14.6
	},
	/** The old adventuring mark, on the east wall beside where the door appears. */
	mark: {
		x: 20,
		y: 1.7,
		z: 3.6
	}
};
// src/levels/levels.ts
/**
* The levels. Each one is a LevelDef built from small pieces. The first is the original sewer chamber;
* the rest are test levels, one for each kind of goal.
*/
/** Fresh empty parts for a level, so no two levels share an array. */
var empty = () => ({
	waves: [],
	gear: [],
	enemies: [],
	crateContents: [],
	water: [],
	pit: null,
	decor: []
});
/** A guard that roams the whole room and does not come back. */
function hunter(x, z, half) {
	const a = half - 1;
	return {
		x,
		z,
		arena: {
			x0: -a,
			x1: a,
			z0: -a,
			z1: a
		},
		respawn: false
	};
}
function sewer() {
	const layout = buildLayout();
	const chamber = chamberCollectibles();
	return {
		...empty(),
		id: "sewer",
		name: "Sewer Chamber",
		blurb: "Gather every cheese crumb. Caps and relics are bonus.",
		solids: layout.solids,
		pit: layout.pit,
		water: layout.water,
		decor: [{
			kind: "hole",
			x: SEWER.tunnel.x,
			y: 1.25,
			z: SEWER.tunnel.z - .03,
			yaw: Math.PI,
			r: 1.35,
			gap: true
		}, {
			kind: "mark",
			x: SEWER.mark.x,
			y: SEWER.mark.y,
			z: SEWER.mark.z,
			yaw: -Math.PI / 2,
			size: .42
		}],
		spawn: {
			x: TUNING.spawn.x,
			y: TUNING.spawn.y,
			z: TUNING.spawn.z,
			facing: 0
		},
		collectibles: chamber.items,
		crateContents: layout.solids.filter((b) => b.kind === "rubble").map(() => null),
		enemies: [{
			x: TUNING.scuttler.home.x,
			z: TUNING.scuttler.home.z
		}],
		gear: chamberPickups(),
		goals: [{
			type: "collect",
			kind: "crumb",
			count: "all",
			label: "Collect the cheese crumbs"
		}],
		exit: doorOn("east", 20),
		reward: "royalScarf"
	};
}
function caps() {
	const H = 14;
	const items = new Items("caps");
	for (const [x, z] of [
		[10.6, 10.6],
		[-10.6, 10.6],
		[10.6, -10.6],
		[-10.6, -10.6],
		[-3, -12.8]
	]) items.add("cap", x, ITEM_Y, z);
	const keepsake = {
		x: 12.3,
		y: 0,
		z: 0
	};
	const capInCrate = items.add("cap", keepsake.x, ITEM_Y, keepsake.z, 0);
	items.add("cap", -10, 1.2 + ITEM_Y, 3.2);
	items.add("cap", 8, 3 + ITEM_Y, -8);
	for (const [x, z] of [
		[0, 8],
		[0, 5.5],
		[0, 3],
		[0, .5],
		[0, -2]
	]) items.add("crumb", x, ITEM_Y, z);
	return {
		...empty(),
		id: "caps",
		name: "Cap Collector",
		blurb: "Find all eight bottle caps. One is on top of a pillar, one is in a crate.",
		solids: [
			...room(H),
			block("pillar", 8, 8, 2, 2, 3),
			block("pillar", -8, 8, 2, 2, 3),
			block("pillar", 8, -8, 2, 2, 3),
			block("pillar", -8, -8, 2, 2, 3),
			block("platform", -10, 0, 3, 3, .6),
			block("platform", -10, 3.2, 3, 3, 1.2),
			crate(keepsake.x, keepsake.z),
			crate(12.4, 1.3),
			crate(11.1, 1)
		],
		crateContents: [
			capInCrate,
			null,
			null
		],
		storySpots: { keepsake },
		spawn: {
			x: 0,
			y: 0,
			z: 10,
			facing: Math.PI
		},
		collectibles: items.list,
		goals: [{
			type: "collect",
			kind: "cap",
			count: "all",
			label: "Collect the bottle caps"
		}],
		exit: doorOn("north", H)
	};
}
function hunt() {
	const H = 14;
	const items = new Items("hunt");
	for (const [x, z] of [
		[12.5, 12.5],
		[-12.5, 12.5],
		[-12.5, -12.5]
	]) items.add("cap", x, ITEM_Y, z);
	const crates = [
		[-5, 2],
		[5, -2],
		[-2, -6],
		[3, 6]
	];
	return {
		...empty(),
		id: "hunt",
		name: "Roach Hunt",
		blurb: "Five sewer roaches. Beat every one.",
		solids: [...room(H), ...crates.map(([x, z]) => crate(x, z))],
		crateContents: crates.map(() => null),
		spawn: {
			x: 0,
			y: 0,
			z: 11,
			facing: Math.PI
		},
		collectibles: items.list,
		enemies: [
			hunter(-8, -8, H),
			hunter(8, -8, H),
			hunter(-9, 2, H),
			hunter(9, 3, H),
			hunter(0, -11, H)
		],
		goals: [{
			type: "defeat",
			label: "Defeat the roaches"
		}],
		exit: doorOn("west", H)
	};
}
function waves() {
	const H = 12;
	const items = new Items("waves");
	for (const [x, z] of [
		[10.4, 10.4],
		[-10.4, 10.4],
		[10.4, -10.4],
		[-10.4, -10.4]
	]) items.add("cap", x, ITEM_Y, z);
	items.add("relic", 0, .6 + 1.1, 0);
	const crates = [
		[-5, 5],
		[5, 5],
		[-5, -5],
		[5, -5]
	];
	return {
		...empty(),
		id: "waves",
		name: "Endurance",
		blurb: "Three waves of roaches. Heal from the crates.",
		solids: [
			...room(H),
			block("platform", 0, 0, 3, 3, .6),
			...crates.map(([x, z]) => crate(x, z))
		],
		crateContents: crates.map(() => null),
		decor: [{
			kind: "mark",
			glyph: "crown",
			x: 0,
			y: 3.2,
			z: -11.97,
			yaw: 0,
			size: 1,
			color: 8219282
		}],
		storySpots: { royal: {
			x: 0,
			y: 3.2,
			z: -12
		} },
		spawn: {
			x: 0,
			y: 0,
			z: 8,
			facing: Math.PI
		},
		collectibles: items.list,
		waves: [
			[hunter(-8, -9, H), hunter(8, -9, H)],
			[
				hunter(-9, 0, H),
				hunter(9, 0, H),
				hunter(0, -9, H)
			],
			[
				hunter(-8, -9, H),
				hunter(8, -9, H),
				hunter(-9, 3, H),
				hunter(9, 3, H)
			]
		],
		goals: [{
			type: "waves",
			label: "Survive the waves"
		}],
		exit: doorOn("east", H)
	};
}
function leap() {
	const H = 36;
	const max = maxRunJumpDistance();
	const gap = Math.round(max * .9 * 100) / 100;
	const solids = room(H, false);
	const items = new Items("leap");
	const startZ = 28;
	solids.push(block("platform", 0, startZ, 4, 4, 0, -1));
	let front = 26;
	const lengths = 2.4;
	const centres = [];
	const fronts = [];
	for (let i = 0; i < 6; i++) {
		fronts.push(front);
		const zc = front - gap - lengths / 2;
		const xc = i % 2 === 0 ? .8 : -.8;
		solids.push(block("platform", xc, zc, 2.6, lengths, 0, -1));
		centres.push([xc, zc]);
		front = zc - lengths / 2;
	}
	const goalZ = front - gap - 2.5;
	solids.push(block("platform", 0, goalZ, 5, 5, 0, -1));
	const stone = {
		x: -1.95,
		y: 0,
		z: Math.max(goalZ - 1.95, -35.55)
	};
	solids.push(block("pillar", stone.x, stone.z, .8, .8, 1.7));
	for (const i of [
		1,
		3,
		5
	]) items.add("relic", centres[i][0], .9, centres[i][1]);
	for (const i of [
		0,
		2,
		4
	]) items.add("crumb", ((i === 0 ? 0 : centres[i - 1][0]) + centres[i][0]) / 2, 2.3, fronts[i] - gap / 2);
	return {
		...empty(),
		id: "leap",
		noGrab: true,
		noLongJump: true,
		name: "Leap of Faith",
		blurb: "Gaps at the limit of a running jump. Time every leap.",
		solids,
		pit: extent("floor", -36, H, -8.2, -8, -36, H),
		decor: [{
			kind: "mark",
			x: stone.x,
			y: 1.15,
			z: stone.z + .4,
			yaw: 0,
			size: .27
		}],
		storySpots: { stone },
		spawn: {
			x: 0,
			y: 0,
			z: startZ,
			facing: Math.PI
		},
		collectibles: items.list,
		goals: [{
			type: "reach",
			x: 0,
			y: 0,
			z: goalZ,
			radius: 2.2,
			label: "Reach the far platform"
		}],
		exit: doorOn("north", H)
	};
}
function crates() {
	const H = 14;
	const items = new Items("crates");
	const spots = [];
	for (const z of [
		-9,
		-3,
		3,
		9
	]) for (const x of [
		-9,
		-3,
		3,
		9
	]) spots.push([x, z]);
	const contents = spots.map(() => null);
	[
		1,
		4,
		6,
		9,
		11,
		14
	].forEach((i) => contents[i] = items.add("crumb", spots[i][0], ITEM_Y, spots[i][1], i));
	[
		0,
		7,
		15
	].forEach((i) => contents[i] = items.add("cap", spots[i][0], ITEM_Y, spots[i][1], i));
	return {
		...empty(),
		id: "crates",
		name: "Crate Search",
		blurb: "Sixteen crates. Smash them to find six crumbs.",
		solids: [...room(H), ...spots.map(([x, z]) => crate(x, z))],
		crateContents: contents,
		storySpots: { keepsake: {
			x: spots[9][0],
			y: 0,
			z: spots[9][1]
		} },
		spawn: {
			x: 0,
			y: 0,
			z: 12,
			facing: Math.PI
		},
		collectibles: items.list,
		goals: [{
			type: "collect",
			kind: "crumb",
			count: "all",
			label: "Find the hidden crumbs"
		}],
		exit: doorOn("north", H)
	};
}
var built = [
	sewer(),
	caps(),
	hunt(),
	waves(),
	leap(),
	crates(),
	waterworks(),
	...kingdomLevels(),
	pumpworks(),
	junction(),
	cistern(),
	foundry(),
	foundryShaft(),
	foundryCellars(),
	hollows(),
	hollowsWebs(),
	hollowsFaith(),
	hollowsDark(),
	hollowsPit(),
	keep(),
	throne(),
	cisternWorks(),
	sludgePit(),
	cisternSump()
];
var rank = (l) => {
	const i = CAMPAIGN.indexOf(l.id);
	return i < 0 ? CAMPAIGN.length : i;
};
/** Every level, in the order he plays them: the fourteen campaign rooms, then any bonus rooms. */
/** Every level there is, in the old campaign order, the archive included. */
var ALL_LEVELS = built.map((l, i) => ({
	l,
	i
})).sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i).map((e) => e.l);
ALL_LEVELS.filter((l) => l.hub || !!l.world);
ALL_LEVELS.filter((l) => !l.hub && !l.world);
/**
* Test rooms: not part of the game, its counts or its menus. They are for feeling the numbers in (the Move Garden),
* opened from the Workshop's list of places, by #level=<id>, or by the file the delivery script makes for them.
*/
var TEST_ROOMS = [
	garden(),
	longDrop(),
	glowCave(),
	coldMain()
];
// src/enemies/footing.ts
/**
* WHERE A CREATURE CAN PUT ITS FEET: floors, walls, and slopes.
*
* A creature that walks has a height of its own (`y`) and asks, of each place it would step to, "can I stand there?"
* Until 2026-11-16 a ramp was its whole box to every creature: a block in the way. (The owner's list: "enemies
* walking on ramps".) Now a slope the knight can walk is ground to them too: solid only UNDER its surface, floor ON
* it. And since a creature on a slope is no longer at the height it was made at, it is told the height of the floor
* under it after every step (`floorUnder`, used by `keepOnFloor` in foe.ts).
*
* What they still do not do: fall. A creature never steps off an edge higher than a step; it stops there, as it
* always has. Nor does it walk a slope too steep for the knight (over `MAX_WALK_SLOPE`): that is still a wall.
*/
/** How high a step a creature takes without noticing: up onto a kerb, down off one. */
var FOOT_STEP = .25;
/** How much of its body must be clear above its feet: anything solid between a step up and this is a wall. */
var BODY = .7;
/** A slope a creature can walk on. */
var walkable = (b) => !!b.ramp && slopeOf(b) <= 1 + 1e-6;
/** The top of a solid where a creature would be: a walkable slope's surface there (beside it: at its nearest edge); a box's top. */
var topFor = (b, x, z) => walkable(b) ? topAt(b, x, z) : b.max.y;
/**
* How steep the ground is under a place, for a creature whose feet are at `y`: the rise for one unit toward +x and
* for one unit toward +z. Level ground: [0, 0].
*/
function slopeUnder(colliders, x, y, z) {
	for (const b of colliders) {
		if (!walkable(b) || x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
		if (Math.abs(topAt(b, x, z) - y) <= .35) return slopeXZ(b);
	}
	return [0, 0];
}
/**
* Whether a creature of radius `r` can stand at (x, z) with its feet at `y`: there is floor under its middle within
* a step of its feet, and nothing solid at body height anywhere under it.
*/
function standsOn(colliders, x, y, z, r) {
	const [sx, sz] = slopeUnder(colliders, x, y, z);
	const step = FOOT_STEP + Math.hypot(sx, sz) * r;
	let floor = false;
	for (const b of colliders) {
		if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
		const top = topFor(b, x, z);
		if (top > y + step && b.min.y < y + BODY) return false;
		if (Math.abs(top - y) <= step && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) floor = true;
	}
	return floor;
}
/**
* The height of the floor under a place, for a creature whose feet are at about `y`: the highest top within a step
* of them (the same step `standsOn` allows a creature of radius `r` there: more on a slope). Null if there is none:
* it is over a drop, or in a wall.
*/
function floorUnder(colliders, x, y, z, r = 0) {
	const [sx, sz] = r > 0 ? slopeUnder(colliders, x, y, z) : [0, 0];
	const step = Math.max(.5, FOOT_STEP + Math.hypot(sx, sz) * r + .02);
	let best = null;
	for (const b of colliders) {
		if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
		const top = topFor(b, x, z);
		if (Math.abs(top - y) > step) continue;
		if (best === null || top > best) best = top;
	}
	return best;
}
// src/enemies/foe.ts
/**
* Keeps a creature out of the scenery. It has just moved from (fromX, fromZ); if where it is now is no good,
* it slides along whichever way is still free, or stays where it was. (If it was somehow already stuck, it is left
* alone so it can walk out.) Enemies used to be held only by the rectangle of their patch, so they could hop or be
* knocked into a wall or a raised block, where they could still spit at the rat but could not be hit.
*/
function keepOnFloor(e, fromX, fromZ) {
	const ok = e.canStand;
	if (!ok || Math.hypot(e.x - fromX, e.z - fromZ) > 2) return;
	if (!ok(e.x, e.y, e.z, e.radius) && ok(fromX, e.y, fromZ, e.radius)) {
		if (ok(e.x, e.y, fromZ, e.radius)) e.z = fromZ;
		else if (ok(fromX, e.y, e.z, e.radius)) e.x = fromX;
		else {
			e.x = fromX;
			e.z = fromZ;
		}
	}
	const floor = e.floorUnder?.(e.x, e.y, e.z, e.radius);
	if (floor !== null && floor !== void 0) e.y = floor;
}
/**
* Whether the rat is on ground a creature can WALK to in a straight line: at about its own height, or up or down a
* slope from it. (Until creatures could walk slopes it was only "within 0.9 of my height": on a slope that lost him
* as soon as he was two steps further up it.) It walks the line a pace at a time, its feet following the floor; a
* drop, a wall or a ledge on the way and he is not reachable that way.
*/
function sameGround(e, px, py, pz) {
	if (Math.abs(py - e.y) < .9) return true;
	const floor = e.floorUnder;
	if (!floor || Math.abs(py - e.y) > 8) return false;
	const dx = px - e.x;
	const dz = pz - e.z;
	const steps = Math.ceil(Math.hypot(dx, dz) / .4);
	if (steps > 80) return false;
	let y = e.y;
	for (let i = 1; i <= steps; i++) {
		const g = floor(e.x + dx * i / steps, y, e.z + dz * i / steps);
		if (g === null) return false;
		y = g;
	}
	return Math.abs(py - y) < .9;
}
/** What the beasts can sense, changed by what he wears (a quiet scarf, a lamp on his helmet). */
/** `quiet`: he is sneaking (the game sets it each tick); a roosting bat only hears him from close by. */
var SENSES = {
	notice: 1,
	quiet: false
};
// src/enemies/scuttler.ts
function turnToward(current, target, maxStep) {
	const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
	return current + Math.max(-maxStep, Math.min(maxStep, d));
}
var Scuttler = class {
	kind = "scuttler";
	x;
	z;
	y = 0;
	facing = 0;
	hp = TUNING.scuttler.hp;
	state = "idle";
	stateTime = 0;
	/** The last player swing that hit it, so one swing cannot hit twice. */
	lastSwing = -1;
	/** Counts up from 0 after each spawn, for the pop-in. */
	age = 0;
	radius = TUNING.scuttler.radius;
	velX = 0;
	velZ = 0;
	lungeSpent = false;
	recoverTime = TUNING.scuttler.recover;
	/** What it is doing while it is in the 'chase' state: running in, circling, or hopping back. */
	mode = "approach";
	/** Which attack the current wind-up and lunge belong to. */
	attack = "bite";
	/** Set by the director: whether it may start an attack now. Alone, it always may. */
	mayAttack = true;
	/** Random numbers, 0..1. Tests swap this for something fixed. */
	rng = Math.random;
	circleDir = 1;
	circleLeft = 0;
	hopLeft = 0;
	hopCooldown = 0;
	sawThreat = false;
	/** It has circled long enough and wants to attack. */
	get ready() {
		return this.state === "chase" && this.mode === "circle" && this.circleLeft <= 0;
	}
	/** It is in the middle of an attack. */
	get attacking() {
		return this.state === "windup" || this.state === "lunge";
	}
	/** How long the wind-up it is in lasts. */
	get windupTime() {
		return TUNING.scuttler[this.attack].windup;
	}
	between([lo, hi]) {
		return lo + (hi - lo) * this.rng();
	}
	/** Where it stands guard, the patch of floor it never leaves, and whether it comes back after dying. */
	home;
	/** Always comes for the rat, wherever it is (wave enemies). */
	hunt;
	arena;
	respawns;
	constructor(spec) {
		this.home = spec ? {
			x: spec.x,
			z: spec.z
		} : { ...TUNING.scuttler.home };
		this.hunt = !!spec?.hunt;
		this.arena = spec?.hunt ? {
			x0: -500,
			x1: 500,
			z0: -500,
			z1: 500
		} : spec?.arena ?? { ...TUNING.scuttler.arena };
		this.respawns = spec?.respawn ?? true;
		this.x = this.home.x;
		this.z = this.home.z;
		this.y = this.homeY;
		this.y = spec?.y ?? 0;
		this.homeY = this.y;
	}
	get alive() {
		return this.state !== "dead";
	}
	/** True while its bite can hurt. */
	get attackActive() {
		return this.state === "lunge" && !this.lungeSpent;
	}
	enter(state) {
		this.state = state;
		this.stateTime = 0;
	}
	/** The player's sword connects. Returns true if this kills it. */
	takeHit(damage, fromX, fromZ) {
		if (!this.alive) return false;
		const S = TUNING.scuttler;
		this.hp -= damage;
		const dx = this.x - fromX;
		const dz = this.z - fromZ;
		const len = Math.hypot(dx, dz) || 1;
		this.velX = dx / len * S.knockback;
		this.velZ = dz / len * S.knockback;
		if (this.hp <= 0) {
			this.hp = 0;
			this.enter("dead");
			return true;
		}
		this.enter("stagger");
		this.mode = "circle";
		this.circleLeft = this.between(S.retaliate);
		return false;
	}
	/** Its lunge landed (on the rat or on his shield), so the bite is used up. A block leaves it open for longer. */
	lungeLanded(blocked, parried = false) {
		this.lungeSpent = true;
		if (blocked || parried) {
			const S = TUNING.scuttler;
			const k = parried ? 1.3 : .7;
			this.velX = -Math.sin(this.facing) * S.knockback * k;
			this.velZ = -Math.cos(this.facing) * S.knockback * k;
			this.recoverTime = parried ? S.parriedRecover : S.blockedRecover;
			this.enter("recover");
		}
	}
	/** Pushes it out of the way without hurting it, so it and the rat never stand inside each other. */
	nudge(dx, dz) {
		this.fromX = this.x;
		this.fromZ = this.z;
		this.x += dx;
		this.z += dz;
		this.clamp();
	}
	/** How it tells floor from wall; the game sets this. */
	canStand = null;
	floorUnder = null;
	/** The height it was made at: it goes back to it when it comes back. (Its `y` follows the floor now.) */
	homeY = 0;
	/** Where it stood before this move, to go back to if the move ends inside something. */
	fromX = 0;
	fromZ = 0;
	clamp() {
		const A = this.arena;
		this.x = Math.max(A.x0 + this.radius, Math.min(A.x1 - this.radius, this.x));
		this.z = Math.max(A.z0 + this.radius, Math.min(A.z1 - this.radius, this.z));
		keepOnFloor(this, this.fromX, this.fromZ);
	}
	/** `threat`: the rat is swinging his sword right now. */
	update(dt, playerX, playerY, playerZ, playerAlive, threat = false) {
		const S = TUNING.scuttler;
		this.fromX = this.x;
		this.fromZ = this.z;
		this.stateTime += dt;
		this.age += dt;
		this.hopCooldown = Math.max(0, this.hopCooldown - dt);
		const dx = playerX - this.x;
		const dz = playerZ - this.z;
		const dist = Math.hypot(dx, dz);
		const toPlayer = Math.atan2(dx, dz);
		const A = this.arena;
		const margin = 1.5;
		const inArena = playerX > A.x0 - margin && playerX < A.x1 + margin && playerZ > A.z0 - margin && playerZ < A.z1 + margin;
		const reachable = playerAlive && inArena && sameGround(this, playerX, playerY, playerZ);
		const newThreat = threat && !this.sawThreat;
		this.sawThreat = threat;
		let speed = 0;
		let moveX = 0;
		let moveZ = 0;
		const engage = () => {
			this.enter("chase");
			this.mode = dist < S.engageRange ? "circle" : "approach";
			if (this.mode === "circle") this.startCircle();
		};
		switch (this.state) {
			case "idle":
				if (reachable && (this.hunt || dist < S.noticeRange * SENSES.notice)) engage();
				break;
			case "chase": {
				if (!reachable) {
					this.enter("return");
					break;
				}
				if (this.mode === "hop") {
					this.facing = turnToward(this.facing, toPlayer, S.turnRate * dt);
					moveX = -Math.sin(toPlayer) * S.hopBack.speed;
					moveZ = -Math.cos(toPlayer) * S.hopBack.speed;
					this.hopLeft -= dt;
					if (this.hopLeft <= 0) this.startCircle();
					break;
				}
				this.facing = turnToward(this.facing, toPlayer, S.turnRate * dt);
				if (this.mode === "approach") {
					if (dist < S.engageRange) this.startCircle();
					else speed = S.speed;
					break;
				}
				if (newThreat && dist < S.hopBack.range && this.hopCooldown <= 0 && this.rng() < S.hopBack.chance) {
					this.mode = "hop";
					this.hopLeft = S.hopBack.time;
					this.hopCooldown = S.hopBack.cooldown;
					break;
				}
				if (dist > S.engageRange * 1.5) {
					this.mode = "approach";
					break;
				}
				this.circleLeft -= dt;
				if (this.circleLeft <= 0 && this.mayAttack) {
					this.attack = dist <= S.bite.range ? "bite" : "charge";
					this.enter("windup");
					break;
				}
				const drift = Math.max(-1, Math.min(1, (dist - S.circleRadius) * 1.6));
				moveX = Math.cos(toPlayer) * S.circleSpeed * this.circleDir + Math.sin(toPlayer) * S.circleSpeed * drift;
				moveZ = -Math.sin(toPlayer) * S.circleSpeed * this.circleDir + Math.cos(toPlayer) * S.circleSpeed * drift;
				break;
			}
			case "windup": {
				const W = S[this.attack];
				if (this.stateTime < W.windup * W.track) this.facing = turnToward(this.facing, toPlayer, S.turnRate * dt);
				if (this.stateTime >= W.windup) {
					this.lungeSpent = false;
					this.enter("lunge");
				}
				break;
			}
			case "lunge": {
				const W = S[this.attack];
				speed = W.lungeSpeed;
				if (this.stateTime >= W.lungeTime) {
					this.recoverTime = W.recover;
					this.enter("recover");
				}
				break;
			}
			case "recover":
				if (this.stateTime >= this.recoverTime) {
					if (reachable) engage();
					else this.enter("return");
				}
				break;
			case "stagger":
				if (this.stateTime >= S.stagger) {
					if (!reachable) this.enter("return");
					else {
						const fuse = this.circleLeft;
						this.enter("chase");
						this.mode = "circle";
						this.circleDir = this.rng() < .5 ? 1 : -1;
						this.circleLeft = fuse;
					}
				}
				break;
			case "return": {
				if (reachable && (this.hunt || dist < S.noticeRange * SENSES.notice)) {
					engage();
					break;
				}
				const hx = this.home.x - this.x;
				const hz = this.home.z - this.z;
				if (Math.hypot(hx, hz) < .2) this.enter("idle");
				else {
					this.facing = turnToward(this.facing, Math.atan2(hx, hz), S.turnRate * dt);
					speed = S.speed * .7;
				}
				break;
			}
			case "dead": if (this.respawns && this.stateTime >= S.respawn) {
				this.x = this.home.x;
				this.z = this.home.z;
				this.y = this.homeY;
				this.hp = S.hp;
				this.velX = 0;
				this.velZ = 0;
				this.age = 0;
				this.lastSwing = -1;
				this.mode = "approach";
				this.enter("idle");
			}
		}
		const drag = Math.exp(-9 * dt);
		this.velX *= drag;
		this.velZ *= drag;
		const wantX = (Math.sin(this.facing) * speed + moveX + this.velX) * dt;
		const wantZ = (Math.cos(this.facing) * speed + moveZ + this.velZ) * dt;
		this.x += wantX;
		this.z += wantZ;
		this.clamp();
		if (this.state === "chase" && this.mode === "circle" && Math.hypot(this.x - this.fromX, this.z - this.fromZ) < Math.hypot(wantX, wantZ) * .4) this.circleDir = -this.circleDir;
	}
	startCircle() {
		this.mode = "circle";
		this.circleDir = this.rng() < .5 ? 1 : -1;
		this.circleLeft = this.between(TUNING.scuttler.circleTime);
	}
};
// ../../../tmp/claude-0/-home-user-Rat-Quest/2ffa7237-6e6a-5bd6-842d-59a41ab9b731/scratchpad/roachdbg.ts
var cs = TEST_ROOMS.find((l) => l.id === "garden").solids.map((b) => aabbOf(b));
var L = RAMP_LANDING;
var r = RAMPS[0];
var foot = L.z1 + r.length;
var x = (r.x0 + r.x1) / 2;
var on = (z) => Math.max(0, Math.min(L.top, (foot - z) / (foot - L.z1) * L.top));
for (let seed = 1; seed <= 12; seed++) {
	let s = seed * 7919;
	Math.random = () => (s = s * 1103515245 + 12345 & 2147483647) / 2147483647;
	const e = new Scuttler({
		x,
		y: 0,
		z: foot + 1.5,
		arena: { ...RAMP_PATCH },
		respawn: true,
		hunt: true
	});
	e.canStand = (a, b, c, d) => standsOn(cs, a, b, c, d);
	e.floorUnder = (a, b, c, d) => floorUnder(cs, a, b, c, d);
	let top = 0;
	const log = [];
	for (let f = 0; f < 960; f++) {
		const pz = Math.max(L.z1 - 2, Math.min(foot - .5, e.z - 2.2));
		const py = pz < L.z1 ? L.top : on(pz);
		e.update(1 / 60, x, py, pz, true);
		top = Math.max(top, e.y);
		if (f % 120 === 0) log.push(`${e.state}@${e.x.toFixed(1)},${e.y.toFixed(2)},${e.z.toFixed(1)}`);
	}
	console.log(seed, "top", top.toFixed(2), top < 1.2 ? log.join(" | ") : "");
}
export {};
