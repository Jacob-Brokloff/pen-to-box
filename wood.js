import * as THREE from 'three';

// Deterministic synthetic grain; no photographic or recorded-image assets.
export function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    const u = x / 1024, v = y / 1024;
    const bend = 5 * Math.sin(v * 8 + u * 10) + 2 * Math.sin(v * 23 + u * 8);
    const grain = Math.sin(x * .34 + bend) * .5 + Math.sin(x * .83 + bend * 1.8) * .2;
    const broad = Math.sin(x * .065 + Math.sin(v * 3.8) * 1.5);
    const pore = Math.pow(Math.max(0, Math.sin(x * .56 + bend)), 18);
    const noise = ((Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1) * 3;
    const seam = x % 256 < 2 ? -17 : 0;
    const variation = grain * 13 + broad * 11 - pore * 18 + noise + seam;
    const i = (y * 1024 + x) * 4;
    image.data[i] = 86 + variation;
    image.data[i + 1] = 39 + variation * .58;
    image.data[i + 2] = 21 + variation * .33;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
