import { startJourney } from './lib/journey.js';
import { startPeriods } from './lib/periods.js';
import { startHeroInteraction } from './lib/hero-interaction.js';
import { startHeroSmoke } from './lib/hero-smoke.js';
import { startHeroLayout } from './lib/hero-layout.js';
import { startScenes } from './lib/scenes.js';
import { startCity } from './lib/city.js';
import { startCityIntro } from './lib/city-intro.js';
import { startNavbar } from './lib/navbar.js';
import { startNextPeriod } from './lib/next-period.js';

const heroElement = document.querySelector('.hero');
const heroLayout = startHeroLayout(heroElement);
const hero = startHeroInteraction(heroElement);
const heroSmoke = startHeroSmoke(heroElement);
const storyElement = document.querySelector('#story');
const periods = startPeriods(storyElement);
const { lenis } = startJourney(document.querySelector('#journey'), {
  onProgress(progress, width, scale) {
    // Compact (portrait) screens scale the hero art on its own (lib/hero-layout.js).
    hero.setProgress(progress, width, heroLayout.scale || scale);
    // The hero is fully off screen once the story has settled.
    heroSmoke.setActive(progress < .999);
    // Portrait screens: period I becomes the active card once the story has nearly arrived.
    periods.select(progress >= .9 ? 0 : null);
  },
});
startScenes(document.querySelectorAll('.scene'), document.querySelector('#journey'));
startCityIntro(document.querySelector('.city__intro'), { explore: document.querySelector('.city__explore') });
startCity(document.querySelector('.city__explore'), { lenis });
startNavbar(document.querySelector('.navbar'), document.querySelector('#journey'));
startNextPeriod(document.querySelector('.next-period'), storyElement);
