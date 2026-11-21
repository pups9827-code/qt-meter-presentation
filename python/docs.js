'use strict';

for (const example of document.querySelectorAll('.example')) {
  const code = example.querySelector('code');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-code';
  button.textContent = 'Копировать';
  example.querySelector('figcaption').append(button);

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = 'Скопировано';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      button.textContent = 'Код выделен';
    }
  });
}

const links = [...document.querySelectorAll('.contents a[href^="#"], .chapters a[href^="#"]')];
const destinations = new Set(links.map((link) => link.hash.slice(1)));
const sections = [...document.querySelectorAll('main [id]')].filter((section) => destinations.has(section.id));

function updateNavigation() {
  const current = sections.findLast((section) => section.getBoundingClientRect().top <= 92);
  for (const link of links) {
    if (link.hash === '#' + current?.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

window.addEventListener('scroll', updateNavigation, { passive: true });
updateNavigation();

const revealBlocks = document.querySelectorAll('.lesson-body > *, .lesson-list > li');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

if (revealBlocks.length) {
  const page = document.documentElement;
  const overview = document.querySelector('.overview');
  let observer;

  function preparePage() {
    observer?.disconnect();
    page.classList.add('lesson-preparing');
    for (const block of revealBlocks) {
      block.classList.remove('revealing');
      block.classList.toggle('awaiting-reveal', 'IntersectionObserver' in window);
    }
  }

  function showPage(event) {
    if (event.persisted) preparePage();
    // Commit the paused appearance before restarting, including after a cached Back.
    void page.offsetWidth;
    page.classList.remove('lesson-preparing');
    if (!('IntersectionObserver' in window)) return;

    const delays = ['0ms', 'var(--intro-lead-delay)', 'var(--intro-description-delay)', 'var(--intro-footer-delay)'];
    let firstBatch = true;
    observer = new IntersectionObserver(entries => {
      const overviewBounds = overview.getBoundingClientRect();
      const headingVisible = overviewBounds.bottom > 0 && overviewBounds.top < innerHeight;
      const lead = firstBatch && headingVisible ? 'var(--intro-footer-delay)' : '0ms';
      let step = 0;
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) {
          target.style.setProperty('--reveal-delay', `calc(${lead} + ${delays[step]})`);
          step = Math.min(step + 1, delays.length - 1);
        }
        target.classList.toggle('awaiting-reveal', !isIntersecting);
        target.classList.toggle('revealing', isIntersecting);

      }
      firstBatch = false;
    });
    for (const block of revealBlocks) observer.observe(block);
  }

  preparePage();
  window.addEventListener('pagehide', preparePage);
  window.addEventListener('pageshow', showPage);
}

let exitAnimation;
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey ||
      event.ctrlKey || event.altKey || event.shiftKey || reduceMotion.matches ||
      link.target || link.hasAttribute('download')) return;

  const destination = new URL(link.href);
  if (destination.origin !== location.origin || destination.protocol !== location.protocol ||
      destination.pathname === location.pathname) return;

  event.preventDefault();
  if (exitAnimation) return;
  exitAnimation = document.body.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 420,
    easing: 'ease',
    fill: 'forwards',
  });
  exitAnimation.onfinish = () => location.assign(destination.href);
});

window.addEventListener('pageshow', () => {
  exitAnimation?.cancel();
  exitAnimation = undefined;
});
