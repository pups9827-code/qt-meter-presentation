'use strict';

const panelsContainer = document.querySelector('.panels');
const panels = [...panelsContainer.querySelectorAll('.panel')];
const hoverDevice = window.matchMedia('(any-hover: hover)');
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

for (let frame = 0; frame < 72; frame += 1) {
  const line = document.createElement('span');
  const event = terminalLog[frame % terminalLog.length];
  const address = (0x3c40 + frame * 173).toString(16).toUpperCase();
  const segment = String((frame * 7) % 41).padStart(2, '0');
  const metadata = [
    '',
    `  :: TICK=${frame} / SECTOR_${segment}`,
    `  :: OFFSET=0x${address}`,
    `  :: MEMORY_MAP[${segment}] > FRAME_0x${address} > LOCAL_REPLAY`,
  ];
  line.textContent = `0x${address}  ${event}${metadata[frame % metadata.length]}`;
  terminalFeed.append(line);
}

for (const group of document.querySelectorAll('[data-loop-copy]')) {
  if (group.classList.contains('slide-strip')) {
    // Two passes keep even the shorter lanes filled on tall screens.
    for (const image of [...group.children]) group.append(image.cloneNode(true));
  }
  const copy = group.cloneNode(true);
  copy.removeAttribute('data-loop-copy');
  group.after(copy);
}

function showPreview(panel) {
  for (const item of panels) {
    const active = item === panel;
    item.classList.toggle('is-active', active);
    item.querySelector('.panel-trigger').setAttribute('aria-expanded', String(active));
    const content = item.querySelector('.panel-content');
    if (content) content.inert = !active;
  }
}

function selectPanel(panel) {
  panelsContainer.classList.toggle('has-selection', Boolean(panel));
  for (const item of panels) item.classList.toggle('is-wide', item === panel);
  showPreview(panel);
}

panels.forEach((panel, index) => {
  const trigger = panel.querySelector('.panel-trigger');

  panel.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch' && hoverDevice.matches) selectPanel(panel);
  });

  trigger.addEventListener('click', (event) => {
    if (event.pointerType === 'touch' && panel.classList.contains('is-active')) {
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
    next.querySelector('.panel-trigger').focus();
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
      event.altKey || event.shiftKey || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
