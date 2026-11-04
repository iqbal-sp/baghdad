import { startJourney } from './lib/journey.js';
import { startPeriods } from './lib/periods.js';
import { startHeroInteraction } from './lib/hero-interaction.js';
import { startHeroSmoke } from './lib/hero-smoke.js';
import { startScenes } from './lib/scenes.js';
import { startCity } from './lib/city.js';
import { startCityIntro } from './lib/city-intro.js';
import { startNavbar } from './lib/navbar.js';
import { startMenu } from './lib/menu.js';
import { decodeAhead, pauseOffscreen } from './lib/offscreen.js';
import { startCapital } from './lib/capital.js';
import { startKnowledge } from './lib/knowledge.js';
import { startKnowledgeSmoke } from './lib/knowledge-smoke.js';
import { startClosing } from './lib/closing.js';
import { startPeriodMap } from './lib/period-map.js';
import { startCourtTimeline } from './lib/court-timeline.js';
import { startPeople } from './lib/people.js';
import { startIris } from './lib/iris.js';
import { startSky } from './lib/sky.js';

const heroElement = document.querySelector('.hero');
const hero = startHeroInteraction(heroElement);
const heroSmoke = startHeroSmoke(heroElement);
const { lenis, goToChapter } = startJourney(document.querySelector('#journey'), {
  onProgress(progress, width, scale) {
    hero.setProgress(progress, width, scale);
    heroSmoke.setProgress(progress);
  },
});
startPeriods(document.querySelector('#story'));
startScenes(document.querySelectorAll('.scene'), document.querySelector('#journey'));
startCityIntro(document.querySelector('.city__intro'), { explore: document.querySelector('.city__explore') });
startCity(document.querySelector('.city__explore'), { lenis });
startNavbar(document.querySelector('.navbar'), document.querySelector('#journey'), {
  returnPin: document.querySelector('.closing-pin'),
  resume: document.querySelector('.court-timeline'),
});
startMenu(document.querySelector('.navbar'), document.querySelector('#site-menu'), {
  lenis,
  places: {
    intro: () => lenis.scrollTo(0, { immediate: true, force: true }),
    foundations: () => goToChapter(true),
    // Set up below, once the closing's map exists; only called from a click.
    flourishing: () => periodMap.goToChapter?.(true),
  },
});
startCapital(document.querySelector('.scene--capital'));
startKnowledge(document.querySelector('.scene--knowledge'), { lenis });
startKnowledgeSmoke(document.querySelector('.scene--knowledge'));
startClosing(document.querySelector('.scene--closing'), { lenis });
const periodMap = startPeriodMap(document.querySelector('.closing-pin'), { lenis });
startCourtTimeline(document.querySelector('.court-timeline'), { lenis });
const people = startPeople(document.querySelector('.people'), { lenis });
startIris(document.querySelector('.court-timeline'), document.querySelector('.people'), { lenis, onOpen: people?.enter });
startSky(document.querySelector('.people'), { lenis });
decodeAhead(document.querySelectorAll('main section'), {
  menu: document.querySelector('#site-menu'),
  menuButton: document.querySelector('.navbar__menu'),
});
pauseOffscreen(document.querySelectorAll(
  '.hero__beams, .hero__mote-layer, .scroll-cue__circle, .city__cue-arrow, .city__shimmer, .city__traveller, .closing__lamp',
));
