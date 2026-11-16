import * as THREE from 'three';

/**
 * PS1-style material.
 *  - Vertex snapping: clip-space XY is quantized to the low-res pixel grid.
 *  - Vertex-color lighting (Gouraud): colors are baked per vertex, no per-pixel lighting.
 *  - Linear depth fog tinted per region.
 * Affine texture warping and dithering are added in later milestones behind toggles.
 */

export interface Ps1Options {
  color?: THREE.ColorRepresentation;
  snap?: boolean;
  tex?: THREE.Texture | null; // albedo texture; omit for plain vertex color
  /** Light each vertex in the shader from its normal (Gouraud). Use for characters, whose parts rotate. */
  lit?: boolean;
  side?: THREE.Side;
  /**
   * With `lit`: how brightly a face flashes when it turns to catch the light (0 none). For things that turn and should
   * glint as they do: cheese, bottle caps, gold.
   */
  shine?: number;
}

let whiteTexture: THREE.DataTexture | null = null;

/** A 1x1 white texture, so materials without art still have something to sample. */
function white(): THREE.DataTexture {
  if (!whiteTexture) {
    whiteTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    whiteTexture.needsUpdate = true;
  }
  return whiteTexture;
}

export interface Ps1Uniforms {
  resolution: { value: THREE.Vector2 };
  snapEnabled: { value: number };
  fogColor: { value: THREE.Color };
  fogNear: { value: number };
  fogFar: { value: number };
  /** Coloured point lights near the rat: xyz position, w radius; and each one's colour (already scaled by its brightness). */
  lightPos: { value: THREE.Vector4[] };
  lightCol: { value: THREE.Vector3[] };
  /** 0 turns the coloured lights off. */
  lightsOn: { value: number };
  /**
   * How much plain light there is in the place: 1 everywhere, unless a level says less (`LevelDef.ambient`). In a dark
   * place what is seen is what the coloured lights fall on, and what glows of itself.
   */
  ambient: { value: number };
}

export const MAX_LIGHTS = 8;

export const ps1Uniforms: Ps1Uniforms = {
  resolution: { value: new THREE.Vector2(320, 240) },
  snapEnabled: { value: 1 },
  fogColor: { value: new THREE.Color(0x0b1410) },
  fogNear: { value: 18 },
  fogFar: { value: 90 },
  lightPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4(0, 0, 0, 0)) },
  lightCol: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3(0, 0, 0)) },
  lightsOn: { value: 1 },
  ambient: { value: 1 },
};

const vertexShader = /* glsl */ `
  uniform vec2 resolution;
  uniform float snapEnabled;
  uniform vec2 uvOffset;
  uniform float lit;
  uniform float shine;
  uniform vec3 lightDir;
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vFogDepth;
  varying vec3 vWorld;

  void main() {
    vColor = color;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    if (lit > 0.5) {
      // Per-vertex lighting in view space, with a soft wrap so the shadow side keeps some shape.
      vec3 n = normalize(normalMatrix * normal);
      vec3 l = normalize(mat3(viewMatrix) * lightDir);
      float d = dot(n, l);
      vColor *= 0.56 + 0.5 * clamp(d * 0.6 + 0.4, 0.0, 1.0);
      // A glint: a face square to the half-way between the light and the eye flashes (whole faces, since they are flat).
      vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
      vColor += shine * pow(max(dot(n, h), 0.0), 9.0) * vec3(1.0, 0.96, 0.82);
    }
    vUv = uv + uvOffset;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mvPosition.z;
    vec4 clip = projectionMatrix * mvPosition;

    if (snapEnabled > 0.5) {
      // Snap in NDC to the low-res pixel grid, then restore w so the perspective divide still works.
      vec2 ndc = clip.xy / clip.w;
      vec2 halfRes = resolution * 0.5;
      ndc = floor(ndc * halfRes + 0.5) / halfRes;
      clip.xy = ndc * clip.w;
    }
    gl_Position = clip;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 tint;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  uniform sampler2D tex;
  uniform vec3 flash;
  uniform vec4 lightPos[${MAX_LIGHTS}];
  uniform vec3 lightCol[${MAX_LIGHTS}];
  uniform float lightsOn;
  uniform float ambient;
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vFogDepth;
  varying vec3 vWorld;

  void main() {
    vec3 albedo = texture2D(tex, vUv).rgb;
    // Coloured lights: a soft falloff from each, added in steps (banded, like a console's limited colour depth).
    vec3 glow = vec3(0.0);
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      float a = clamp(1.0 - length(vWorld - lightPos[i].xyz) / max(lightPos[i].w, 0.001), 0.0, 1.0);
      glow += lightCol[i] * a * a;
    }
    glow = floor(glow * 6.0 + 0.5) / 6.0 * lightsOn;
    vec3 base = albedo * tint * (vColor * ambient + glow * 0.7) + flash;
    float fogAmount = clamp((vFogDepth - fogNear) / (fogFar - fogNear), 0.0, 1.0);
    gl_FragColor = vec4(mix(base, fogColor, fogAmount), 1.0);
  }
`;

export function createPs1Material(options: Ps1Options = {}): THREE.ShaderMaterial {
  const tint = new THREE.Color(options.color ?? 0xffffff);
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    vertexColors: true,
    uniforms: {
      resolution: ps1Uniforms.resolution,
      snapEnabled: ps1Uniforms.snapEnabled,
      fogColor: ps1Uniforms.fogColor,
      fogNear: ps1Uniforms.fogNear,
      fogFar: ps1Uniforms.fogFar,
      lightPos: ps1Uniforms.lightPos,
      lightCol: ps1Uniforms.lightCol,
      lightsOn: ps1Uniforms.lightsOn,
      ambient: ps1Uniforms.ambient,
      tint: { value: tint },
      tex: { value: options.tex ?? white() },
      uvOffset: { value: new THREE.Vector2(0, 0) },
      lit: { value: options.lit ? 1 : 0 },
      shine: { value: options.shine ?? 0 },
      lightDir: { value: BAKE_LIGHT },
      flash: { value: new THREE.Color(0, 0, 0) }, // added on top of the color, for hit flashes
    },
    side: options.side ?? THREE.FrontSide,
  });
}

/** Single fixed light direction used for baked, per-vertex shading. */
const BAKE_LIGHT = new THREE.Vector3(0.45, 1, 0.3).normalize();

/**
 * Bakes vertex colors onto a geometry so the PS1 material can light it.
 * With shade=true, each vertex is darkened by its normal against one fixed light direction,
 * so faces read differently without any runtime lights.
 */
export function bakeVertexColor(
  geometry: THREE.BufferGeometry,
  color: THREE.ColorRepresentation,
  shade = true,
): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const count = position.count;
  const colors = new Float32Array(count * 3);
  const n = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    let k = 1;
    if (shade && normal) {
      n.fromBufferAttribute(normal, i);
      k = 0.45 + 0.55 * Math.max(0, n.dot(BAKE_LIGHT));
    }
    colors[i * 3] = c.r * k;
    colors[i * 3 + 1] = c.g * k;
    colors[i * 3 + 2] = c.b * k;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}
