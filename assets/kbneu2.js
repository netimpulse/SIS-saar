document.addEventListener('DOMContentLoaded', function () {
  const car = document.querySelector('.kb2-car');
  if (!car) return;

  const track = car.querySelector('.kb2-track');
  const prev  = car.querySelector('.kb2-prev');
  const next  = car.querySelector('.kb2-next');
  if (!track || !prev || !next) return;

  const cards = Array.from(track.children);
  if (cards.length === 0) return;

  // GAP lesen
  const gap = parseFloat(getComputedStyle(track).gap) || parseFloat(car.dataset.gap) || 30;

  // === „Mehr erfahren“: nur zeigen, wenn Text tatsächlich gekürzt ist ===
  function initReadMore(card){
    const text = card.querySelector('.kb2-text');
    const btn  = card.querySelector('.kb2-more');
    if(!text || !btn) return;

    // Prüfen ob gekürzt: wir vergleichen scrollHeight vs clientHeight nach einem Tick
    requestAnimationFrame(() => {
      const isClamped = text.scrollHeight > text.clientHeight + 2;
      if (!isClamped) { btn.hidden = true; return; }

      btn.addEventListener('click', () => {
        const open = card.classList.toggle('kb2-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? 'Weniger anzeigen' : 'Mehr erfahren';
      });
    });
  }
  cards.forEach(initReadMore);

  // === Carousel (immer 3 / 2 / 1 sichtbar) ===
  const originalCount = cards.length;
  // Für unendlichen Effekt klonen
  cards.forEach(el => {
    const clone = el.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    // auch ReadMore in Klonen initialisieren
    initReadMore(clone);
  });

  function slidesPerView() {
    const w = window.innerWidth;
    if (w <= 767) return 1;
    if (w <= 1023) return 2;
    return 3;
  }

  function cardStepWidth() {
    // Breite inkl. Gap (alle Karten sind gleich breit)
    const first = track.children[0];
    if (!first) return 0;
    return first.getBoundingClientRect().width + gap;
  }

  let index = 0;
  let animating = false;

  function move(instant = false) {
    const offset = -index * cardStepWidth();
    track.style.transition = instant ? 'none' : 'transform 0.5s ease-in-out';
    track.style.transform = `translateX(${offset}px)`;
  }

  function onEnd() {
    animating = false;
    if (index >= originalCount) { index = 0; move(true); }
    if (index < 0) { index = originalCount - 1; move(true); }
  }

  function shift(dir) {
    if (animating) return;
    animating = true;
    index += dir;               // bewegt immer um 1 Karte
    move();
  }

  // Pfeile ausblenden, wenn nicht nötig
  function updateArrows() {
    const spv = slidesPerView();
    const hide = originalCount <= spv;
    prev.style.display = hide ? 'none' : '';
    next.style.display = hide ? 'none' : '';
  }

  track.addEventListener('transitionend', onEnd);
  next.addEventListener('click', () => shift(1));
  prev.addEventListener('click', () => shift(-1));

  // Touch/Swipe
  let startX = null;
  car.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  car.addEventListener('touchmove', e => {
    if (startX === null) return;
    const dx = e.touches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      shift(dx < 0 ? 1 : -1);
      startX = null;
    }
  }, { passive: true });
  car.addEventListener('touchend', () => { startX = null; });

  // Initial
  move(true);
  updateArrows();
  window.addEventListener('resize', () => { updateArrows(); move(true); });
});
