/**
 * Menu (Figma 218:375): the navbar's "Menu" lets the chapters down over the page as a sheet,
 * whose own top row carries "Close" into the spot where "Menu" was; the navbar itself is left as
 * it is, beneath. While open the page is held (Lenis stopped, the scrolling keys ignored, the
 * rest inert) and Escape closes it. Choosing a chapter jumps there behind the sheet, then the
 * sheet lifts away onto it. Pointing at a chapter marks it (.is-pointed), brings its painting
 * into the frame and its name in very large behind (.is-in), sending the last ones on up and
 * away (.is-out). The motion lives in styles.css (.menu.is-open).
 */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

export function startMenu(navbar, menu, { lenis, places = {} } = {}) {
  if (!navbar || !menu) return;
  const button = navbar.querySelector('.navbar__menu');
  const close = menu.querySelector('.menu__close');
  const sheet = menu.querySelector('.menu__sheet');
  const list = menu.querySelector('.menu__list');
  const links = [...menu.querySelectorAll('.menu__link')];
  const page = document.querySelector('main');
  const echo = menu.querySelector('.menu__echo');
  const pictures = new Map([...menu.querySelectorAll('.menu__picture img[data-for]')].map(img => [img.dataset.for, img]));
  const words = new Map();
  for (const link of links) {
    const word = document.createElement('span');
    word.className = 'menu__echo-word';
    word.innerHTML = [...link.dataset.echo].map((letter, n) => `<span style="--n: ${n}">${letter}</span>`).join('');
    echo.append(word);
    words.set(link.dataset.picture, word);
  }
  // Once one has gone up and away, put it back where it starts from, unseen (no transition there).
  for (const picture of pictures.values()) {
    picture.addEventListener('transitionend', event => {
      if (event.propertyName === 'translate') picture.classList.remove('is-out');
    });
  }
  for (const word of words.values()) {
    word.addEventListener('transitionend', event => {
      if (event.target === word.lastElementChild && event.propertyName === 'translate') word.classList.remove('is-out');
    });
  }
  let open = false;

  // Shows the one under `key` (none for null), sending the one showing before up and away.
  function swap(items, key) {
    for (const [name, item] of items) {
      if (name === key) {
        item.classList.remove('is-out');
        item.classList.add('is-in');
      } else if (item.classList.contains('is-in')) {
        item.classList.replace('is-in', 'is-out');
      }
    }
  }

  function point(link) {
    for (const other of links) other.classList.toggle('is-pointed', other === link);
    list.classList.toggle('has-pointed', Boolean(link));
    const key = link?.dataset.picture ?? null;
    swap(pictures, key);
    swap(words, key);
  }

  function show(event) {
    if (open) return;
    open = true;
    menu.hidden = false;
    // Next frame, so the raised sheet has been drawn and the transitions run.
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    navbar.classList.add('is-menu-open');
    navbar.inert = true;
    button.setAttribute('aria-expanded', 'true');
    if (page) page.inert = true;
    lenis?.stop();
    // From the keyboard focus moves to "Close"; with a pointer to the menu itself, so no ring
    // is drawn and Tab still starts inside it.
    (event?.detail ? menu : close).focus({ preventScroll: true });
  }

  function hide({ restoreFocus = true } = {}) {
    if (!open) return;
    open = false;
    menu.classList.remove('is-open');
    point(null);
    navbar.inert = false;
    button.setAttribute('aria-expanded', 'false');
    if (page) page.inert = false;
    lenis?.start();
    if (restoreFocus) button.focus({ preventScroll: true });
  }

  // Once the sheet is up out of sight, put it away and let the navbar go back to its own rule.
  sheet.addEventListener('transitionend', event => {
    if (event.target !== sheet || open || !['translate', 'opacity'].includes(event.propertyName)) return;
    menu.hidden = true;
    navbar.classList.remove('is-menu-open');
  });

  button.addEventListener('click', show);
  close.addEventListener('click', () => hide());
  document.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') hide();
    else if (SCROLL_KEYS.has(event.key)) event.preventDefault();
  });

  for (const link of links) {
    link.addEventListener('pointerenter', () => point(link));
    link.addEventListener('pointerleave', () => point(null));
    link.addEventListener('focus', () => point(link));
    link.addEventListener('blur', () => point(null));
  }

  for (const link of menu.querySelectorAll('a[data-go]')) {
    link.addEventListener('click', event => {
      const go = places[link.dataset.go];
      if (!go) return;
      event.preventDefault();
      hide({ restoreFocus: false });
      go();
    });
  }
}
