import { renderDither } from './lib/dither-renderer.js';
import { startJourney } from './lib/journey.js';
import { startPeriods } from './lib/periods.js';

const image = document.querySelector('#panorama');
const canvas = document.querySelector('#dither');
const backdrop = document.querySelector('.backdrop');

// Wait for the load event rather than image.decode(): some browsers never settle
// decode() for an already-loaded image, which would leave the effect unrendered.
function imageLoaded(img) {
  if (img.complete) {
    return img.naturalWidth ? Promise.resolve() : Promise.reject(new Error('Panorama failed to load'));
  }
  return new Promise((resolve, reject) => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', () => reject(new Error('Panorama failed to load')), { once: true });
  });
}

// The Figma effect is static. Render once; scrolling/resizing is handled by CSS.
async function start() {
  try {
    await imageLoaded(image);
    const renderer = await renderDither(image, canvas);
    backdrop.dataset.renderer = renderer;
    backdrop.dataset.rendered = 'true';
  } catch (error) {
    // The original artwork remains visible if the browser blocks canvas access.
    backdrop.dataset.renderer = 'original-image';
    console.warn('The dither could not be rendered; the original artwork is visible.', error);
  }
}

start();
startJourney(document.querySelector('#journey'));
startPeriods(document.querySelector('#story'));
