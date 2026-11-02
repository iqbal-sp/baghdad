import { startJourney } from './lib/journey.js';
import { startPeriods } from './lib/periods.js';
import { startHeroInteraction } from './lib/hero-interaction.js';
import { startHeroSmoke } from './lib/hero-smoke.js';
import { startScenes } from './lib/scenes.js';
import { startCity } from './lib/city.js';
import { startCityIntro } from './lib/city-intro.js';
import { startNavbar } from './lib/navbar.js';
import { startCapital } from './lib/capital.js';
import { startKnowledge } from './lib/knowledge.js';
import { startClosing } from './lib/closing.js';
import { startPeriodMap } from './lib/period-map.js';

const heroElement = document.querySelector('.hero');
const hero = startHeroInteraction(heroElement);
const heroSmoke = startHeroSmoke(heroElement);
const { lenis } = startJourney(document.querySelector('#journey'), {
  onProgress(progress, width, scale) {
    hero.setProgress(progress, width, scale);
    // The hero is fully off screen once the story has settled.
    heroSmoke.setActive(progress < .999);
  },
});
startPeriods(document.querySelector('#story'));
startScenes(document.querySelectorAll('.scene'), document.querySelector('#journey'));
startCityIntro(document.querySelector('.city__intro'), { explore: document.querySelector('.city__explore') });
startCity(document.querySelector('.city__explore'), { lenis });
startNavbar(document.querySelector('.navbar'), document.querySelector('#journey'));
startCapital(document.querySelector('.scene--capital'));
startKnowledge(document.querySelector('.scene--knowledge'), { lenis });
startClosing(document.querySelector('.scene--closing'), { lenis });
startPeriodMap(document.querySelector('.closing-pin'), { lenis });
