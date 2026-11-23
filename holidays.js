// Flip-through for the holiday book's sample pages. The track is a native
// scroll-snap row, so swipe and trackpad work without script; this adds the
// buttons, arrow keys and the "1 of 4" counter.
(() => {
  const track = document.querySelector('#peek-track');
  if (!track) return;
  const slides = [...track.querySelectorAll('.peek-slide')];
  const prev = document.querySelector('#peek-prev');
  const next = document.querySelector('#peek-next');
  const count = document.querySelector('#peek-count');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;

  const update = index => {
    current = index;
    count.textContent = `${index + 1} of ${slides.length}`;
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    slides.forEach((slide, i) => slide.classList.toggle('is-current', i === index));
  };

  const go = index => {
    const target = Math.max(0, Math.min(slides.length - 1, index));
    const slide = slides[target];
    track.scrollTo({left: slide.offsetLeft - track.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2, behavior: reduced.matches ? 'auto' : 'smooth'});
    update(target);
  };

  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(current + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); go(current - 1); }
    else if (event.key === 'Home') { event.preventDefault(); go(0); }
    else if (event.key === 'End') { event.preventDefault(); go(slides.length - 1); }
  });

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const middle = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      slides.forEach((slide, i) => {
        const centre = slide.offsetLeft - track.offsetLeft + slide.offsetWidth / 2;
        const bestCentre = slides[best].offsetLeft - track.offsetLeft + slides[best].offsetWidth / 2;
        if (Math.abs(centre - middle) < Math.abs(bestCentre - middle)) best = i;
      });
      if (best !== current) update(best);
    });
  }, {passive: true});

  update(0);
})();
