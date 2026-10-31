import { startJourney } from './lib/journey.js';
import { startPeriods } from './lib/periods.js';
import { startHeroInteraction } from './lib/hero-interaction.js';
import { startHeroSmoke } from './lib/hero-smoke.js';

const heroElement = document.querySelector('.hero');
const hero = startHeroInteraction(heroElement);
const heroSmoke = startHeroSmoke(heroElement);
startJourney(document.querySelector('#journey'), {
  onProgress(progress, width, scale) {
    hero.setProgress(progress, width, scale);
    // The hero is fully off screen once the story has settled.
    heroSmoke.setActive(progress < .999);
  },
});
startPeriods(document.querySelector('#story'));
