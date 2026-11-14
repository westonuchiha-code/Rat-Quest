/** Small SVG icons for the menu. Gear icons use the item's own colours, so a recoloured helmet looks recoloured. */
import type { ItemDef } from '../data/equipment';

const hex = (c: number | undefined, fallback = 0x888888): string => `#${(c ?? fallback).toString(16).padStart(6, '0')}`;

function svg(inner: string, size = 40): string {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

export function helmetIcon(colors: Record<string, number>, size = 40): string {
  return svg(
    `<path d="M20 4 L22 10 H18 Z" fill="${hex(colors.spike)}"/>
     <path d="M7 27 C7 15 13 10 20 10 C27 10 33 15 33 27 Z" fill="${hex(colors.dome)}" stroke="#0007" stroke-width="1.2"/>
     <path d="M12 16 C14 13 17 12 20 12" stroke="#fff6" stroke-width="2" fill="none" stroke-linecap="round"/>
     <rect x="5" y="26" width="30" height="5" rx="2.5" fill="${hex(colors.rim)}" stroke="#0007" stroke-width="1"/>
     <rect x="18" y="29" width="4" height="8" rx="1.5" fill="${hex(colors.rim)}" stroke="#0007" stroke-width="1"/>`,
    size,
  );
}

export function swordIcon(colors: Record<string, number>, size = 40): string {
  return svg(
    `<g transform="rotate(45 20 20)">
       <path d="M20 2 L23 8 V25 H17 V8 Z" fill="${hex(colors.blade)}" stroke="#0007" stroke-width="1.2"/>
       <path d="M20 4 V24" stroke="#fff8" stroke-width="1.5"/>
       <rect x="11" y="25" width="18" height="4" rx="2" fill="${hex(colors.hilt)}" stroke="#0007" stroke-width="1"/>
       <rect x="18" y="29" width="4" height="8" rx="1.5" fill="#6e4b2c" stroke="#0007" stroke-width="1"/>
     </g>`,
    size,
  );
}

export function shieldIcon(colors: Record<string, number>, size = 40): string {
  return svg(
    `<path d="M20 3 L34 8 V19 C34 28 27 34 20 37 C13 34 6 28 6 19 V8 Z" fill="${hex(colors.trim)}" stroke="#0007" stroke-width="1.2"/>
     <path d="M20 7 L30 10.5 V19 C30 26 25 30.5 20 33 C15 30.5 10 26 10 19 V10.5 Z" fill="${hex(colors.face)}"/>
     <path d="M20 12 L24 20 L20 28 L16 20 Z" fill="#ffd96a" stroke="#0006" stroke-width="1"/>`,
    size,
  );
}

export function scarfIcon(colors: Record<string, number>, size = 40): string {
  return svg(
    `<path d="M9 14 C9 10 31 10 31 14 V20 C31 24 9 24 9 20 Z" fill="${hex(colors.cloth)}" stroke="#0007" stroke-width="1.2"/>
     <path d="M13 12.5 C18 14.5 22 14.5 27 12.5" stroke="#fff5" stroke-width="1.5" fill="none" stroke-linecap="round"/>
     <path d="M24 22 L31 22 L33 35 L27 33 L26 36 L22 24 Z" fill="${hex(colors.cloth)}" stroke="#0007" stroke-width="1.2"/>
     <path d="M26.6 31.5 L32.6 33.5" stroke="${hex(colors.trim)}" stroke-width="2.4"/>`,
    size,
  );
}

export function nachoIcon(size = 40): string {
  return svg(
    `<ellipse cx="20" cy="9" rx="9" ry="3.5" fill="#c8ced4" stroke="#0007" stroke-width="1.1"/>
     <path d="M12 7 C13 3 27 3 28 7 C30 9 26 11 22 10 L23 15 H19 L19.5 10 C15 11 10 9 12 7 Z" fill="#ffd23a" stroke="#0007" stroke-width="1"/>
     <path d="M11 9 H29 V32 C29 35 11 35 11 32 Z" fill="#9aa0a6" stroke="#0007" stroke-width="1.2"/>
     <rect x="11" y="14" width="18" height="15" fill="#f2a21e"/>
     <rect x="11" y="19" width="18" height="4" fill="#c0392b"/>
     <path d="M14 16 V28" stroke="#fff6" stroke-width="1.6" stroke-linecap="round"/>`,
    size,
  );
}

export function itemIcon(item: ItemDef, size = 40): string {
  if (item.slot === 'helmet') return helmetIcon(item.colors, size);
  if (item.slot === 'sword') return swordIcon(item.colors, size);
  if (item.slot === 'scarf') return scarfIcon(item.colors, size);
  return shieldIcon(item.colors, size);
}

/** A Golden Wedge (gold, or a pale outline for one not found yet). */
export function wedgeIcon(size = 18, got = true): string {
  const fill = got ? '#ffc93a' : 'none';
  const stroke = got ? '#9a5a10' : '#8a8a70';
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20"><path d="M10 18 L18 5 Q10 1 2 5 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"/>${got ? '<circle cx="8" cy="8" r="1.4" fill="#9a5a10"/><circle cx="12" cy="11" r="1.1" fill="#9a5a10"/>' : ''}</svg>`;
}

export function lockIcon(size = 40): string {
  return svg(`<rect x="11" y="18" width="18" height="15" rx="3" fill="#39422f"/><path d="M14 18 V13 a6 6 0 0 1 12 0 V18" stroke="#39422f" stroke-width="3.5" fill="none"/>`, size);
}

export function crumbIcon(size = 24): string {
  return svg(`<path d="M5 28 L5 14 L35 22 L35 28 Z" fill="#f2c230" stroke="#7a5a08" stroke-width="1.5"/><circle cx="14" cy="23" r="2" fill="#b98a14"/><circle cx="26" cy="25" r="1.6" fill="#b98a14"/>`, size);
}

export function capIcon(size = 24): string {
  return svg(`<circle cx="20" cy="20" r="13" fill="#9aa0a6" stroke="#4a4f55" stroke-width="1.5"/><circle cx="20" cy="20" r="8" fill="#c0392b"/><circle cx="20" cy="20" r="13" fill="none" stroke="#e5e8ea" stroke-width="1" stroke-dasharray="2 2"/>`, size);
}

export function relicIcon(size = 24): string {
  return svg(`<path d="M20 4 L33 20 L20 36 L7 20 Z" fill="#ffd23a" stroke="#8a6a08" stroke-width="1.5"/><path d="M20 4 L20 36 M7 20 H33" stroke="#fff6" stroke-width="1"/>`, size);
}

export function tabIcon(name: 'items' | 'equip' | 'quest' | 'save' | 'levels' | 'book', size = 22): string {
  const stroke = 'stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const paths: Record<string, string> = {
    items: `<path d="M8 14 H32 L30 33 H10 Z ${''}" ${stroke}/><path d="M14 14 V10 a6 6 0 0 1 12 0 V14" ${stroke}/>`,
    equip: `<path d="M20 4 L33 9 V20 C33 28 27 33 20 36 C13 33 7 28 7 20 V9 Z" ${stroke}/>`,
    quest: `<path d="M20 5 L24.5 15 L35 16 L27 23 L29.5 34 L20 28 L10.5 34 L13 23 L5 16 L15.5 15 Z" ${stroke}/>`,
    book: `<path d="M6 8 H19 a3 3 0 0 1 3 3 V33 a3 3 0 0 0 -3 -3 H6 Z M34 8 H21 a3 3 0 0 0 -3 3 V33 a3 3 0 0 1 3 -3 H34 Z" ${stroke}/>`,
    levels: `<path d="M5 34 H14 V25 H22 V16 H30 V7 H35" ${stroke}/>`,
    save: `<path d="M7 7 H29 L34 12 V33 H7 Z" ${stroke}/><path d="M13 7 V16 H26 V7 M12 33 V24 H28 V33" ${stroke}/>`,
  };
  return svg(paths[name], size);
}

export function heartIcon(full: boolean, size = 16): string {
  return svg(`<path d="M20 35 C5 24 4 14 9 10 C14 6 19 9 20 13 C21 9 26 6 31 10 C36 14 35 24 20 35 Z" fill="${full ? '#e0443a' : '#3a2522'}" stroke="#0008" stroke-width="2"/>`, size);
}

/** Small round-faced pictures for the sticker book. */
export function stickerIcon(name: string, size = 48): string {
  const eye = (x: number, y: number): string => `<circle cx="${x}" cy="${y}" r="2.2" fill="#1a1410"/>`;
  const mouseHead = (fur: string, ear: string): string =>
    `<circle cx="9" cy="10" r="7" fill="${fur}" stroke="#0008" stroke-width="1.5"/><circle cx="9" cy="10" r="4" fill="${ear}"/><circle cx="31" cy="10" r="7" fill="${fur}" stroke="#0008" stroke-width="1.5"/><circle cx="31" cy="10" r="4" fill="${ear}"/><ellipse cx="20" cy="23" rx="13" ry="12" fill="${fur}" stroke="#0008" stroke-width="1.5"/>${eye(15, 21)}${eye(25, 21)}<circle cx="20" cy="27" r="2" fill="#c0607a"/>`;
  const art: Record<string, string> = {
    knight: `${mouseHead('#a89484', '#d8a0a8')}<path d="M7 17 A13 11 0 0 1 33 17 Z" fill="#a8adb4" stroke="#0008" stroke-width="1.5"/><rect x="18.5" y="4" width="3" height="5" fill="#c04040"/><path d="M8 33 Q20 40 32 33 L32 37 Q20 44 8 37 Z" fill="#c8362e"/>`,
    pip: `${mouseHead('#c8b090', '#e0b0b0')}<path d="M10 33 L30 33 L28 38 L12 38 Z" fill="#7a5a3a"/>`,
    mort: `${mouseHead('#9a8aa0', '#c8a0b8')}<path d="M12 21 H18 M22 21 H28" stroke="#1a1410" stroke-width="2.4" stroke-linecap="round"/><rect x="13" y="19" width="6" height="4" fill="#9a8aa0"/><rect x="21" y="19" width="6" height="4" fill="#9a8aa0"/><path d="M12 21 H18 M22 21 H28" stroke="#1a1410" stroke-width="2" stroke-linecap="round"/>`,
    grimsqueak: `${mouseHead('#7a6a96', '#6e3a52')}<path d="M10 14 L12 5 L16 11 L20 3 L24 11 L28 5 L30 14 Z" fill="#d4a634" stroke="#0008" stroke-width="1.2"/><circle cx="15" cy="21" r="2.6" fill="#ff7a3a"/><circle cx="25" cy="21" r="2.6" fill="#ff7a3a"/><path d="M14 31 H26 L24 36 H16 Z" fill="#241a38"/>`,
    dave: `<ellipse cx="20" cy="24" rx="13" ry="12" fill="#8c93a3" stroke="#0008" stroke-width="1.5"/><circle cx="20" cy="12" r="9" fill="#a0a8b8" stroke="#0008" stroke-width="1.5"/><path d="M29 12 L37 15 L29 17 Z" fill="#e6b440"/><rect x="11" y="9" width="16" height="5" rx="2" fill="#15151c"/><path d="M12 31 Q20 40 28 31" stroke="#d4a634" stroke-width="2.2" fill="none"/><circle cx="20" cy="37" r="2.4" fill="#d4a634"/>`,
    guard: `${mouseHead('#7a7480', '#b89aa8')}<path d="M7 17 A13 11 0 0 1 33 17 Z" fill="#4a4458" stroke="#0008" stroke-width="1.5"/><rect x="18.5" y="4" width="3" height="5" fill="#9a6ac0"/><path d="M8 33 Q20 40 32 33 L32 37 Q20 44 8 37 Z" fill="#4a2f6a"/><path d="M36 9 V39" stroke="#8a6a42" stroke-width="2"/><path d="M36 1 L38.6 9 L33.4 9 Z" fill="#d8dee6" stroke="#0008" stroke-width="0.8"/>`,
    wren: `<ellipse cx="20" cy="24" rx="12" ry="11" fill="#b27a4a" stroke="#0008" stroke-width="1.5"/><circle cx="20" cy="12" r="8" fill="#c8905a" stroke="#0008" stroke-width="1.5"/>${eye(17, 11)}${eye(24, 11)}<path d="M27 12 L35 14 L27 16 Z" fill="#f0c040"/><path d="M13 5 L16 1 L18 6 Z" fill="#e06a8a"/>`,
    finch: `<ellipse cx="20" cy="24" rx="12" ry="11" fill="#e8c84a" stroke="#0008" stroke-width="1.5"/><circle cx="20" cy="12" r="8" fill="#f0d860" stroke="#0008" stroke-width="1.5"/>${eye(17, 11)}${eye(24, 11)}<path d="M27 12 L35 14 L27 16 Z" fill="#e07a3a"/><path d="M10 22 Q4 28 10 33 Z" fill="#2a2a2a"/>`,
    mantis: `<path d="M7 30 Q3 18 9 8 L12 10 Q8 19 11 29 Z" fill="#f2bccb" stroke="#0008" stroke-width="1.2"/><path d="M33 30 Q37 18 31 8 L28 10 Q32 19 29 29 Z" fill="#f2bccb" stroke="#0008" stroke-width="1.2"/><path d="M8 13 L32 13 L20 35 Z" fill="#f2e8dc" stroke="#0008" stroke-width="1.5" stroke-linejoin="round"/><path d="M20 17 V31" stroke="#dc6a9a" stroke-width="2"/><ellipse cx="10" cy="14" rx="5.5" ry="6.5" fill="#7a44b8" stroke="#0008" stroke-width="1.2"/><ellipse cx="30" cy="14" rx="5.5" ry="6.5" fill="#7a44b8" stroke="#0008" stroke-width="1.2"/><circle cx="11.5" cy="15" r="1.6" fill="#120816"/><circle cx="28.5" cy="15" r="1.6" fill="#120816"/><path d="M17 8 Q14 3 10 2 M23 8 Q26 3 30 2" stroke="#8e3c5e" stroke-width="1.2" fill="none"/>`,
    stag: `<path d="M13 16 Q6 10 8 2 L11 3 Q10 9 16 13 Z" fill="#1a2226" stroke="#0008" stroke-width="1"/><path d="M27 16 Q34 10 32 2 L29 3 Q30 9 24 13 Z" fill="#1a2226" stroke="#0008" stroke-width="1"/><path d="M8 3 L10 2 M32 3 L30 2" stroke="#e0763a" stroke-width="2.2"/><path d="M5 24 Q5 13 20 13 Q35 13 35 24 Q35 37 20 37 Q5 37 5 24 Z" fill="#24404a" stroke="#0008" stroke-width="1.5"/><path d="M20 14 V37" stroke="#b0683a" stroke-width="1.6"/><path d="M8 19 Q20 15 32 19" stroke="#b0683a" stroke-width="1.6" fill="none"/><ellipse cx="20" cy="15" rx="6" ry="4.5" fill="#16282e" stroke="#0008" stroke-width="1.2"/><circle cx="17.5" cy="15.5" r="1.5" fill="#ffa040"/><circle cx="22.5" cy="15.5" r="1.5" fill="#ffa040"/>`,
    brood: `<path d="M14 20 L6 12 L2 22 M14 23 L4 22 L1 32 M15 26 L7 30 L6 38 M26 20 L34 12 L38 22 M26 23 L36 22 L39 32 M25 26 L33 30 L34 38" stroke="#2a1d33" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M13 15 L8 3 L5 9 M27 15 L32 3 L35 9" stroke="#e8dcc0" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="20" cy="28" rx="9.5" ry="10" fill="#2a1d33" stroke="#0008" stroke-width="1.5"/><path d="M17 22 L23 22 L20.8 28 L23 34 L17 34 L19.2 28 Z" fill="#ddd2b4"/><circle cx="20" cy="28" r="1.7" fill="#b02a3a"/><ellipse cx="20" cy="15" rx="7.5" ry="6" fill="#3a2a48" stroke="#0008" stroke-width="1.5"/><circle cx="17" cy="14.5" r="1.7" fill="#ff3040"/><circle cx="23" cy="14.5" r="1.7" fill="#ff3040"/><circle cx="14" cy="12.5" r="1" fill="#ff3040"/><circle cx="26" cy="12.5" r="1" fill="#ff3040"/><path d="M18 20 L17.2 23.5 M22 20 L22.8 23.5" stroke="#e8dcc0" stroke-width="1.6" stroke-linecap="round"/>`,
    scuttler: `<ellipse cx="20" cy="24" rx="11" ry="13" fill="#7a4a24" stroke="#0008" stroke-width="1.5"/><path d="M20 12 V36" stroke="#4a2a14" stroke-width="2"/><circle cx="20" cy="9" r="6" fill="#5a3418" stroke="#0008" stroke-width="1.5"/><path d="M16 5 Q10 0 6 3 M24 5 Q30 0 34 3 M9 20 L2 17 M9 27 L2 30 M31 20 L38 17 M31 27 L38 30" stroke="#3a2010" stroke-width="1.8" fill="none" stroke-linecap="round"/>${eye(17, 9)}${eye(23, 9)}`,
    toad: `<ellipse cx="20" cy="26" rx="16" ry="11" fill="#6a8a3a" stroke="#0008" stroke-width="1.5"/><circle cx="12" cy="14" r="6" fill="#7a9a46" stroke="#0008" stroke-width="1.5"/><circle cx="28" cy="14" r="6" fill="#7a9a46" stroke="#0008" stroke-width="1.5"/>${eye(12, 14)}${eye(28, 14)}<path d="M10 28 Q20 34 30 28" stroke="#2a3a14" stroke-width="2" fill="none"/>`,
    ironback: `<ellipse cx="20" cy="25" rx="14" ry="12" fill="#4a5058" stroke="#0008" stroke-width="1.5"/><path d="M20 13 V37" stroke="#2c3036" stroke-width="2"/><circle cx="12" cy="20" r="1.6" fill="#c0823e"/><circle cx="28" cy="20" r="1.6" fill="#c0823e"/><circle cx="11" cy="28" r="1.6" fill="#c0823e"/><circle cx="29" cy="28" r="1.6" fill="#c0823e"/><ellipse cx="20" cy="36" rx="7" ry="3" fill="#d8987a"/><ellipse cx="20" cy="11" rx="7" ry="5" fill="#26282d" stroke="#0008" stroke-width="1.5"/><path d="M18 8 Q19 1 25 2 Q21 4 22 8 Z" fill="#c8823a" stroke="#0008" stroke-width="1"/><circle cx="16" cy="11" r="1.8" fill="#ff9a2a"/><circle cx="24" cy="11" r="1.8" fill="#ff9a2a"/><path d="M7 20 L2 17 M7 27 L2 30 M33 20 L38 17 M33 27 L38 30" stroke="#1f2024" stroke-width="2.4" stroke-linecap="round"/>`,
    bat: `<path d="M20 20 L3 12 L6 18 L2 22 L8 23 L7 29 L16 25 Z M20 20 L37 12 L34 18 L38 22 L32 23 L33 29 L24 25 Z" fill="#3b2a33" stroke="#0008" stroke-width="1.2"/><ellipse cx="20" cy="23" rx="6" ry="7" fill="#5c4a52" stroke="#0008" stroke-width="1.5"/><path d="M15 17 L14 8 L18 14 Z M25 17 L26 8 L22 14 Z" fill="#7a5f68" stroke="#0008" stroke-width="1"/><circle cx="18" cy="19" r="1.6" fill="#ff6a8a"/><circle cx="22" cy="19" r="1.6" fill="#ff6a8a"/><path d="M18.5 24 L19 26.5 L19.5 24 M20.5 24 L21 26.5 L21.5 24" stroke="#f2ead8" stroke-width="0.9" fill="none"/>`,
    crumb: crumbIcon(40).replace(/^<svg[^>]*>|<\/svg>$/g, ''),
    cap: capIcon(40).replace(/^<svg[^>]*>|<\/svg>$/g, ''),
    relic: relicIcon(40).replace(/^<svg[^>]*>|<\/svg>$/g, ''),
    place: `<path d="M8 36 V18 A12 12 0 0 1 32 18 V36 Z" fill="#5a5048" stroke="#0008" stroke-width="1.5"/><path d="M13 36 V19 A7 7 0 0 1 27 19 V36 Z" fill="#2a2018"/>`,
  };
  return svg(art[name] ?? art.place, size);
}
