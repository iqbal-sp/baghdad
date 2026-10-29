import { setup, render } from './custom-effects/dither.js';

// These are the authored parameters on Figma node 37:647, not new defaults.
export const DITHER_PARAMS = Object.freeze({
  algorithm: 'Bayer 16x16',
  monoColor: { r: 1, g: 1, b: 1, a: 1 },
  contrast: 1,
  levels: 5,
  mono: false,
  brightness: 100,
  pixelSize: 1,
});

/**
 * Vanilla-JavaScript host for the unmodified Figma setup/render shader exports.
 * Its input is a single static image, so a normal GPU texture suffices:
 * no React or experimental HTML-in-Canvas DOM capture is needed.
 */
async function renderGPU(image, canvas) {
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
  if (!adapter) throw new Error('No WebGPU adapter available');
  const device = await adapter.requestDevice();
  const state = {};
  let input;
  let output;
  let readback;
  try {
    device.pushErrorScope('validation');
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    input = device.createTexture({
      size: [width, height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: image },
      { texture: input, premultipliedAlpha: true },
      [width, height],
    );
    output = device.createTexture({
      size: [width, height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const frame = { input, output, state, params: DITHER_PARAMS, renderScale: 1 };
    setup(device, frame);
    render(device, frame);

    // Read back once to a regular canvas; it survives idle tabs and device loss.
    const bytesPerRow = Math.ceil(width * 4 / 256) * 256;
    readback = device.createBuffer({
      size: bytesPerRow * height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const commands = device.createCommandEncoder();
    commands.copyTextureToBuffer(
      { texture: output },
      { buffer: readback, bytesPerRow },
      [width, height],
    );
    device.queue.submit([commands.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const validationError = await device.popErrorScope();
    if (validationError) throw new Error(validationError.message);
    const source = new Uint8Array(readback.getMappedRange());
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      pixels.set(source.subarray(y * bytesPerRow, y * bytesPerRow + width * 4), y * width * 4);
    }
    readback.unmap();
    presentPixels(pixels, width, height, canvas);
  } finally {
    readback?.destroy();
    input?.destroy();
    output?.destroy();
    // destroy() releases all remaining shader-owned GPU resources as well.
    device.destroy();
  }
}

function bayerMatrix(size) {
  if (size === 1) return [[0]];
  const small = bayerMatrix(size / 2);
  const half = size / 2;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const right = x >= half;
      const bottom = y >= half;
      const offset = bottom ? (right ? 1 : 3) : (right ? 2 : 0);
      return small[y % half][x % half] * 4 + offset;
    }),
  );
}

/**
 * Present the texture with the sampling measured in Figma's node export.
 * The separable 1/8, 6/8, 1/8 kernel corresponds to bilinear 2× presentation
 * followed by area sampling back to 1×. The authored shader stays unchanged.
 */
function presentPixels(pixels, width, height, canvas) {
  const horizontal = new Float32Array(pixels.length);
  const sampled = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const left = x > 0 ? i - 4 : i;
      const right = x < width - 1 ? i + 4 : i;
      for (let c = 0; c < 4; c++) {
        horizontal[i + c] = (pixels[left + c] + pixels[i + c] * 6 + pixels[right + c]) / 8;
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const top = y > 0 ? i - width * 4 : i;
      const bottom = y < height - 1 ? i + width * 4 : i;
      for (let c = 0; c < 4; c++) {
        sampled[i + c] = (horizontal[top + c] + horizontal[i + c] * 6 + horizontal[bottom + c]) / 8;
      }
    }
  }
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(sampled, width, height), 0, 0);
}

/**
 * Exact CPU evaluation of the authored Bayer kernel for non-WebGPU browsers.
 * For this design: pixelSize=1, contrast=1, brightness=100, mono=false.
 * round((channel + (threshold - .5) / 4) * 4) / 4 is the WGSL equation.
 * No random noise, CSS filter, or approximate texture replaces the effect.
 */
export async function renderCPU(image, canvas) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height);
  const tile = bayerMatrix(16);
  const levels = DITHER_PARAMS.levels - 1;
  // Small lookup tables avoid repeating millions of floating-point operations.
  const lookup = Array.from({ length: 256 }, (_, rank) => {
    const threshold = (rank + .5) / 256;
    return Uint8ClampedArray.from({ length: 256 }, (_, value) => {
      const q = Math.max(0, Math.min(1, Math.round(value / 255 * levels + threshold - .5) / levels));
      return Math.round(q * 255);
    });
  });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const table = lookup[tile[y % 16][x % 16]];
      for (let channel = 0; channel < 3; channel++) {
        pixels.data[offset + channel] = table[pixels.data[offset + channel]];
      }
    }
    // Yield during fallback rendering so mobile input and painting remain responsive.
    if (y % 128 === 127) await new Promise(resolve => setTimeout(resolve, 0));
  }
  presentPixels(pixels.data, width, height, canvas);
}

export async function renderDither(image, canvas) {
  if (navigator.gpu && window.isSecureContext) {
    try {
      await renderGPU(image, canvas);
      return 'webgpu';
    } catch (error) {
      console.info('Using the equivalent Bayer canvas renderer:', error.message);
    }
  }
  await renderCPU(image, canvas);
  return 'canvas-bayer';
}
