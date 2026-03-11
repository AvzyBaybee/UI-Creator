import { ColorTileData } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

export const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return { r: r / 255, g: g / 255, b: b / 255 };
};

const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const delinearize = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

export const rgbToOklch = (hex: string) => {
  let { r, g, b } = hexToRgb(hex);
  r = linearize(r); g = linearize(g); b = linearize(b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l); const m_ = Math.cbrt(m); const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(a * a + b_ * b_);
  const H = (Math.atan2(b_, a) * 180) / Math.PI;
  return { l: L, c: C, h: H < 0 ? H + 360 : H };
};

export const oklchToHex = (L: number, C: number, H: number) => {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b_ = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b_;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b_;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b_;
  const l = Math.max(0, l_ * l_ * l_); const m = Math.max(0, m_ * m_ * m_); const s = Math.max(0, s_ * s_ * s_);
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b = -0.0041960863 * l - 0.7034186147 * m + 1.707606231 * s;
  r = delinearize(Math.max(0, Math.min(1, r)));
  g = delinearize(Math.max(0, Math.min(1, g)));
  b = delinearize(Math.max(0, Math.min(1, b)));
  const toHex = (x: number) => {
    const val = Math.round(x * 255);
    return (isNaN(val) ? 0 : val).toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const getThemeColor = (baseHex: string, settings: typeof DEFAULT_SETTINGS) => {
  const oklch = rgbToOklch(baseHex);
  const newL = Math.max(0, Math.min(1, oklch.l + (settings.tagLightnessOffset / 100)));
  const satMultiplier = 1 + (settings.tagSaturationOffset / 100);
  const newC = Math.max(0, Math.min(0.4, oklch.c * Math.max(0, satMultiplier)));
  const newH = (oklch.h + settings.tagHueOffset + 360) % 360;
  const hex = oklchToHex(newL, newC, newH);
  return { hex, textColor: '#ffffff' };
};

export const hsbToHex = (h: number, s: number, b: number) => {
  s /= 100; b /= 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
};

export const hslToHex = (h: number, s: number, l: number) => {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (x: number) => Math.round(x).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const interpolateHexColor = (hex1: string, hex2: string, ratio: number) => {
  ratio = Math.max(0, Math.min(1, ratio));
  const rr1 = parseInt(hex1.slice(1, 3), 16); const gg1 = parseInt(hex1.slice(3, 5), 16); const bb1 = parseInt(hex1.slice(5, 7), 16);
  const rr2 = parseInt(hex2.slice(1, 3), 16); const gg2 = parseInt(hex2.slice(3, 5), 16); const bb2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(rr1 + (rr2 - rr1) * ratio).toString(16).padStart(2, '0');
  const g = Math.round(gg1 + (gg2 - gg1) * ratio).toString(16).padStart(2, '0');
  const b = Math.round(bb1 + (bb2 - bb1) * ratio).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
};

export const getColorHex = (tile: ColorTileData) => {
  if (tile.colorMode === 'HSB') return hsbToHex(tile.channel1, tile.channel2, tile.channel3);
  if (tile.colorMode === 'HSL') return hslToHex(tile.channel1, tile.channel2, tile.channel3);
  return rgbToHex(tile.channel1, tile.channel2, tile.channel3);
};
