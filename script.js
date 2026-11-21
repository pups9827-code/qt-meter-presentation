'use strict';

const panelsContainer = document.querySelector('.panels');
const panels = Array.from(panelsContainer.querySelectorAll('.panel'), element => ({
  element,
  trigger: element.querySelector('.panel-trigger'),
  content: element.querySelector('.panel-content'),
}));
const hoverDevice = window.matchMedia('(any-hover: hover)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const collection = document.querySelector('.collection');
const openCollection = document.querySelector('.collection-link');

const terminalFeed = document.querySelector('.terminal-feed');
const terminalLog = [
  'SIM_CORE :: INITIALIZE VIRTUAL CONSOLE',
  '[stream.ready] replay buffer attached',
  '>>> scene.load("night_signal")',
  '[frame.sync] local clock / render phase aligned',
  '[trace] resolving simulated sector map',
  '>>> signal = replay.next_frame()',
  '[cache] restoring snapshot from demo memory',
  '[ ok ] channel stable / replay continues',
  '[....] █████████████░░░░░░░',
  '[verify] sample checksum accepted',
  '>>> render.signal(signal, palette="phosphor")',
  '[trace] buffer flushed',
];

const terminalLines = document.createDocumentFragment();
for (let frame = 0; frame < 72; frame += 1) {
  const line = document.createElement('span');
  const event = terminalLog[frame % terminalLog.length];
  const address = (0x3c40 + frame * 173).toString(16).toUpperCase();
  const variant = frame % 4;
  let metadata = '';
  if (variant === 2) {
    metadata = `  :: OFFSET=0x${address}`;
  } else if (variant !== 0) {
    const segment = String((frame * 7) % 41).padStart(2, '0');
    metadata = variant === 1
      ? `  :: TICK=${frame} / SECTOR_${segment}`
      : `  :: MEMORY_MAP[${segment}] > FRAME_0x${address} > LOCAL_REPLAY`;
  }
  line.textContent = `0x${address}  ${event}${metadata}`;
  terminalLines.append(line);
}
terminalFeed.append(terminalLines);

for (const group of document.querySelectorAll('[data-loop-copy]')) {
  if (group.classList.contains('slide-strip')) {
    // Two passes keep even the shorter lanes filled on tall screens.
    group.append(...Array.from(group.children, image => image.cloneNode(true)));
  }
  const copy = group.cloneNode(true);
  copy.removeAttribute('data-loop-copy');
  group.after(copy);
}

let activePanel = null;
let widePanel = null;

function setPreview(panel, active) {
  panel.element.classList.toggle('is-active', active);
  panel.trigger.setAttribute('aria-expanded', String(active));
  if (panel.content) panel.content.inert = !active;
}

function showPreview(panel) {
  if (panel === activePanel) return;
  if (activePanel) setPreview(activePanel, false);
  if (panel) setPreview(panel, true);
  activePanel = panel;
}

function selectPanel(panel) {
  if (panel !== widePanel) {
    panelsContainer.classList.toggle('has-selection', Boolean(panel));
    widePanel?.element.classList.remove('is-wide');
    panel?.element.classList.add('is-wide');
    widePanel = panel;
  }
  showPreview(panel);
}

panels.forEach((panel, index) => {
  const { element, trigger } = panel;

  element.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch' && hoverDevice.matches) selectPanel(panel);
  });

  trigger.addEventListener('click', (event) => {
    if (event.pointerType === 'touch' && panel === activePanel) {
      selectPanel(null);
    } else {
      selectPanel(panel);
    }
  });

  trigger.addEventListener('focus', () => {
    if (trigger.matches(':focus-visible')) selectPanel(panel);
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = panels[(index + step + panels.length) % panels.length];
    next.trigger.focus();
    selectPanel(next);
  });
});

// Leave the spines in place while the preview dissolves to black.
panelsContainer.addEventListener('pointerleave', (event) => {
  if (event.pointerType === 'touch') return;
  if (panelsContainer.querySelector(':focus-visible') || collection.open) return;
  showPreview(null);
});

panelsContainer.addEventListener('focusout', (event) => {
  if (event.relatedTarget && !panelsContainer.contains(event.relatedTarget) && !panelsContainer.matches(':hover')) {
    showPreview(null);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !collection.open) selectPanel(null);
});

openCollection.addEventListener('click', () => {
  collection.showModal();
  document.body.classList.add('collection-open');
});
document.querySelector('.close-collection').addEventListener('click', () => collection.close());
collection.addEventListener('close', () => {
  document.body.classList.remove('collection-open');
  selectPanel(panels[0]);
  openCollection.focus({ preventScroll: true });
});

const guideLink = document.querySelector('.python-content .collection-link');
let guideExit;

guideLink.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.altKey || event.shiftKey || reduceMotion.matches) return;

  event.preventDefault();
  if (guideExit) return;

  guideExit = document.body.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 420,
    easing: 'ease',
    fill: 'forwards',
  });
  guideExit.onfinish = () => location.assign(guideLink.href);
});

// A page restored with Back keeps its animations, including their final frame.
window.addEventListener('pageshow', () => {
  guideExit?.cancel();
  guideExit = undefined;
});
