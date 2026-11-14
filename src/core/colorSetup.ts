import * as THREE from 'three';

// Colors are used as raw sRGB-style values in the PS1 shader, not converted to linear space.
// Import this module before any other module that creates THREE.Color values.
THREE.ColorManagement.enabled = false;
