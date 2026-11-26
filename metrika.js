'use strict';

(() => {
  // The tag is managed by Yandex and changes in place.
  const tagUrl = 'https://mc.yandex.ru/metrika/tag.js?id=114486647';
  const counterId = 114486647;

  if (Array.from(document.scripts).some(script => script.src === tagUrl)) return;
  window.ym = window.ym || function (...args) {
    (window.ym.a || (window.ym.a = [])).push(args);
  };
  window.ym.l = Date.now();

  window.ym(counterId, 'init', {
    ssr: true,
    webvisor: false,
    clickmap: true,
    referrer: document.referrer,
    url: window.location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });

  const tag = document.createElement('script');
  tag.src = tagUrl;
  tag.async = true;
  document.head.append(tag);
})();
