'use strict';

const examples = document.querySelectorAll('.example');
for (const example of examples) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-code';
  button.textContent = 'Копировать';
  example.querySelector('figcaption').append(button);
}

if (examples.length) {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button.copy-code');
    if (!button) return;

    const code = button.closest('.example').querySelector('code');
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = 'Скопировано';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Код выделен';
    }
  });
}

const links = [...document.querySelectorAll('.contents a[href^="#"], .chapters a[href^="#"]')];
const linksBySection = new Map();
for (const link of links) {
  const id = link.hash.slice(1);
  if (!linksBySection.has(id)) linksBySection.set(id, []);
  linksBySection.get(id).push(link);
}
const sections = [...document.querySelectorAll('main [id]')].filter((section) => linksBySection.has(section.id));
const noActiveLinks = [];
let activeLinks = links.filter((link) => link.hasAttribute('aria-current'));
let activeSectionIndex;

function updateNavigation() {
  // The headings and lesson cards follow document order. Most scroll events
  // stay within the current section, so check its boundaries first.
  if (activeSectionIndex !== undefined) {
    const current = sections[activeSectionIndex];
    const next = sections[activeSectionIndex + 1];
    if ((!current || current.getBoundingClientRect().top <= 92) &&
        (!next || next.getBoundingClientRect().top > 92)) return;
  }

  let start = 0;
  let end = sections.length;
  while (start < end) {
    const middle = (start + end) >>> 1;
    if (sections[middle].getBoundingClientRect().top <= 92) start = middle + 1;
    else end = middle;
  }
  activeSectionIndex = start - 1;
  const nextLinks = linksBySection.get(sections[activeSectionIndex]?.id) ?? noActiveLinks;
  if (nextLinks === activeLinks) return;

  for (const link of activeLinks) {
    if (!nextLinks.includes(link)) link.removeAttribute('aria-current');
  }
  for (const link of nextLinks) {
    if (!activeLinks.includes(link)) link.setAttribute('aria-current', 'location');
  }
  activeLinks = nextLinks;
}

if (sections.length) window.addEventListener('scroll', updateNavigation, { passive: true });
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
      let lead = '0ms';
      if (firstBatch) {
        const overviewBounds = overview.getBoundingClientRect();
        if (overviewBounds.bottom > 0 && overviewBounds.top < innerHeight) {
          lead = 'var(--intro-footer-delay)';
        }
        firstBatch = false;
      }
      let step = 0;
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) {
          target.style.setProperty('--reveal-delay', `calc(${lead} + ${delays[step]})`);
          step = Math.min(step + 1, delays.length - 1);
        }
        target.classList.toggle('awaiting-reveal', !isIntersecting);
        target.classList.toggle('revealing', isIntersecting);
      }
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
