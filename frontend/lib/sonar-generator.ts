/**
 * Procedural side-scan sonar waterfall generator.
 * Creates authentic acoustic backscatter patterns, water column nadir blanking,
 * port/starboard separation, seafloor ripple textures, specular highlights,
 * acoustic shadows, and target returns.
 */

export interface WaterfallOptions {
  width: number;
  height: number;
  seed?: number;
  preset?: 'pass01' | 'pass02' | 'pass03' | 'default';
  colormap?: 'sonar-amber' | 'cyan-tactical' | 'phosphor-green' | 'thermal-jet' | 'grayscale';
  channelMode?: 'split' | 'port' | 'starboard';
}

// Pseudo-random deterministic generator
function pseudoNoise(x: number, y: number, seed = 42): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 137.5) * 43758.5453123;
  return n - Math.floor(n);
}

export function drawSonarWaterfall(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WaterfallOptions = { width, height }
) {
  const { preset = 'pass03', colormap = 'sonar-amber', channelMode = 'split' } = options;

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const centerX = width / 2;
  const nadirHalfWidth = Math.max(12, Math.floor(width * 0.04)); // water column blank

  // Colormap palettes
  const getRGB = (val: number, cmap: string): [number, number, number] => {
    const v = Math.min(255, Math.max(0, val));
    const norm = v / 255;

    if (cmap === 'cyan-tactical') {
      // Deep navy #070d1e to bright cyan #22d3ee to white highlight
      if (norm < 0.2) return [Math.floor(7 * (norm / 0.2)), Math.floor(13 * (norm / 0.2)), Math.floor(30 * (norm / 0.2))];
      if (norm < 0.7) {
        const t = (norm - 0.2) / 0.5;
        return [Math.floor(6 * (1 - t) + 6 * t), Math.floor(40 * (1 - t) + 182 * t), Math.floor(80 * (1 - t) + 212 * t)];
      }
      const t = (norm - 0.7) / 0.3;
      return [Math.floor(6 + (255 - 6) * t), Math.floor(182 + (255 - 182) * t), Math.floor(212 + (255 - 212) * t)];
    }

    if (cmap === 'phosphor-green') {
      // Classic defense CRT radar green
      return [Math.floor(10 * norm), Math.floor(220 * norm + (norm > 0.8 ? 35 : 0)), Math.floor(40 * norm)];
    }

    if (cmap === 'thermal-jet') {
      // Jet heatmap
      const four = 4 * norm;
      const r = Math.min(four - 1.5, -four + 4.5);
      const g = Math.min(four - 0.5, -four + 3.5);
      const b = Math.min(four + 0.5, -four + 2.5);
      return [
        Math.floor(Math.max(0, Math.min(1, r)) * 255),
        Math.floor(Math.max(0, Math.min(1, g)) * 255),
        Math.floor(Math.max(0, Math.min(1, b)) * 255),
      ];
    }

    if (cmap === 'grayscale') {
      return [v, v, v];
    }

    // Default: Realistic acoustic amber/copper (MoES Side-Scan standard)
    if (norm < 0.15) {
      const t = norm / 0.15;
      return [Math.floor(12 * t), Math.floor(8 * t), Math.floor(4 * t)];
    }
    if (norm < 0.6) {
      const t = (norm - 0.15) / 0.45;
      return [Math.floor(12 + (190 - 12) * t), Math.floor(8 + (120 - 8) * t), Math.floor(4 + (40 - 4) * t)];
    }
    const t = (norm - 0.6) / 0.4;
    return [Math.floor(190 + (255 - 190) * t), Math.floor(120 + (235 - 120) * t), Math.floor(40 + (180 - 40) * t)];
  };

  const seedOffset = preset === 'pass01' ? 101 : preset === 'pass02' ? 202 : 303;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const distFromCenter = Math.abs(x - centerX);

      // Channel filters
      if (channelMode === 'port' && x > centerX) {
        data[idx] = 4;
        data[idx + 1] = 6;
        data[idx + 2] = 12;
        data[idx + 3] = 255;
        continue;
      }
      if (channelMode === 'starboard' && x < centerX) {
        data[idx] = 4;
        data[idx + 1] = 6;
        data[idx + 2] = 12;
        data[idx + 3] = 255;
        continue;
      }

      // Water column nadir (low backscatter / dark band in center)
      if (distFromCenter < nadirHalfWidth) {
        const edgeFactor = distFromCenter / nadirHalfWidth;
        const nadirNoise = pseudoNoise(x * 0.5, y * 0.5, seedOffset) * 15 * edgeFactor;
        const [r, g, b] = getRGB(nadirNoise, colormap);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
        continue;
      }

      // Seabed backscatter with grazing angle TVG (time-varied gain) & sand ripples
      const normalizedRange = (distFromCenter - nadirHalfWidth) / (centerX - nadirHalfWidth);
      const tvgFactor = Math.cos(normalizedRange * 0.9) * 0.8 + 0.3;

      // Base acoustic speckle & ripple frequency
      const rippleWave = Math.sin(y * 0.08 + x * 0.02 + pseudoNoise(x * 0.05, y * 0.05, seedOffset) * 4) * 22;
      const fineNoise = (pseudoNoise(x * 0.4, y * 0.4, seedOffset) - 0.5) * 45;
      const mediumNoise = (pseudoNoise(x * 0.1, y * 0.1, seedOffset + 12) - 0.5) * 35;

      let intensity = (110 + rippleWave + fineNoise + mediumNoise) * tvgFactor;

      // Specific acoustic target returns and acoustic shadows
      if (preset === 'pass03') {
        // Shipwreck at x: 240-430, y: 310-395
        if (x >= 240 && x <= 430 && y >= 310 && y <= 395) {
          const hullForm = Math.sin((x - 240) / 190 * Math.PI) * Math.sin((y - 310) / 85 * Math.PI);
          intensity = 210 + hullForm * 45 + pseudoNoise(x, y, 77) * 40;
        }
        // Shipwreck shadow: extends down-range (away from center, i.e. x: 430 to 530)
        if (x > 430 && x <= 535 && y >= 315 && y <= 390) {
          const decay = (x - 430) / 105;
          if (decay < 0.8) intensity = 12 + pseudoNoise(x, y, 99) * 10;
        }

        // Ghost net at x: 520-650, y: 580-675
        if (x >= 520 && x <= 650 && y >= 580 && y <= 675) {
          const fibrous = Math.sin(x * 0.4) * Math.cos(y * 0.4) * 35;
          intensity = 180 + fibrous + pseudoNoise(x * 0.8, y * 0.8, 88) * 60;
        }
        // Ghost net shadow
        if (x > 650 && x <= 715 && y >= 590 && y <= 665) {
          intensity = 15 + pseudoNoise(x, y, 66) * 8;
        }

        // Subsea pipeline linear return at x: 80-500, y: 840-885
        if (x >= 80 && x <= 500 && Math.abs(y - (855 + (x - 80) * 0.04)) < 12) {
          intensity = 235 + pseudoNoise(x, y, 55) * 20;
        }
        // Pipeline shadow
        if (x >= 80 && x <= 500 && y >= 870 && y <= 895) {
          intensity = 14 + pseudoNoise(x, y, 33) * 10;
        }

        // Mine / UXO at x: 610-675, y: 1120-1180
        if (x >= 610 && x <= 675 && y >= 1120 && y <= 1180) {
          const d = Math.hypot(x - 642, y - 1150);
          if (d < 24) intensity = 245 + pseudoNoise(x, y, 22) * 10;
        }
        if (x > 675 && x <= 725 && y >= 1130 && y <= 1170) {
          intensity = 10 + pseudoNoise(x, y, 11) * 8;
        }

        // Shipping container at x: 290-450, y: 1420-1490
        if (x >= 290 && x <= 450 && y >= 1420 && y <= 1490) {
          intensity = 220 + pseudoNoise(x, y, 44) * 25;
        }
        if (x > 450 && x <= 535 && y >= 1430 && y <= 1485) {
          intensity = 12 + pseudoNoise(x, y, 14) * 9;
        }
      }

      const [r, g, b] = getRGB(intensity, colormap);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Overlay subtle waterfall nadir line and range lines
  ctx.save();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Center nadir trace
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, height);
  ctx.stroke();

  // Lateral range markers every 100px
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.setLineDash([2, 8]);
  for (let x = 100; x < width; x += 100) {
    if (Math.abs(x - centerX) > nadirHalfWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  ctx.restore();
}
