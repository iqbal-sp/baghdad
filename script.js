import { startJourney } from './lib/journey.js';
import { startPeriods } from './lib/periods.js';
import { startHeroInteraction } from './lib/hero-interaction.js';

startJourney(document.querySelector('#journey'));
startPeriods(document.querySelector('#story'));
startHeroInteraction(document.querySelector('.hero'));
