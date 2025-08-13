/**
 * Karussell Leistungen – JS
 * - Endloses Karussell via Clones links/rechts
 * - Mobile: Pfeile = kleiner Pixel-Scroll
 * - Tablet/Desktop: Pfeile = exakt nächste/vorige Kachel
 * - Drag/Touch, Keyboard, Snap optional
 * - Reinit im Theme Editor (shopify:section:load)
 */

(function () {
  const SECTION_SELECTOR = '[data-kl-section]';

  function initSection(section) {
    if (!section || section.dataset.klInit === 'true') return;
    section.dataset.klInit = 'true';

    const scroller = section.querySelector('.svc-scroller');
    const row = section.querySelector('.svc-row');
    const arrows = section.querySelectorAll('.svc-arrow');

    if (!scroller || !row) return;

    // Responsive Spalten -> CSS Custom Properties
    const colsDesktop = parseFloat(scroller.getAttribute('data-cols-desktop')) || 4;
    const colsTablet  = parseFloat(scroller.getAttribute('data-cols-tablet'))  || 3;
    row.style.setProperty('--kl-cols-desktop', colsDesktop);
    row.style.setProperty('--kl-cols-tablet', colsTablet);

    // --- Endlos vorbereiten (einmalig Clones links/rechts) ---
    if (!row.dataset.loopPrepared) {
      const slides = Array.from(row.children);
      if (slides.length === 0) return;

      const fragBefore = document.createDocumentFragment();
      const fragAfter  = document.createDocumentFragment();

      slides.forEach((el) => {
        const c1 = el.cloneNode(true);
        c1.setAttribute('data-clone', 'true');
        fragBefore.appendChild(c1);

        const c2 = el.cloneNode(true);
        c2.setAttribute('data-clone', 'true');
        fragAfter.appendChild(c2);
      });

      row.prepend(fragBefore);
      row.append(fragAfter);
      row.dataset.loopPrepared = 'true';
    }

    // --- Maße & Startposition ---
    function getRowPaddingLeft() {
      return parseFloat(getComputedStyle(row).paddingLeft) || 0;
    }

    function getGroupWidth() {
      const gap = parseFloat(getComputedStyle(row).gap) || 0;
      const realSlides = row.querySelectorAll('.svc-card:not([data-clone])');
      let width = 0;
      realSlides.forEach((el, i) => {
        width += el.getBoundingClientRect().width;
        if (i < realSlides.length - 1) width += gap;
      });
      return width;
    }

    let groupWidth = 0;
    function setStart() {
      groupWidth = getGroupWidth();
      const prevBehavior = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = 'auto';
      scroller.scrollLeft = groupWidth; // echte Slides mittig
      scroller.style.scrollBehavior = prevBehavior || '';
    }

    requestAnimationFrame(setStart);
    window.addEventListener('resize', debounce(() => {
      const prevRatio = groupWidth ? scroller.scrollLeft / (groupWidth * 3) : 0.5;
      setStart();
      if (groupWidth > 0) {
        scroller.scrollLeft = groupWidth + Math.max(0, prevRatio - 1/3) * groupWidth;
      }
    }, 150));

    // --- Loop-Korrektur (nahtlos) ---
    function handleLoop() {
      if (!groupWidth) groupWidth = getGroupWidth();
      const x = scroller.scrollLeft;

      if (x <= groupWidth * 0.05) {
        const prev = scroller.style.scrollBehavior;
        scroller.style.scrollBehavior = 'auto';
        scroller.scrollLeft = x + groupWidth;
        scroller.style.scrollBehavior = prev || '';
      } else if (x >= groupWidth * 1.95) {
        const prev = scroller.style.scrollBehavior;
        scroller.style.scrollBehavior = 'auto';
        scroller.scrollLeft = x - groupWidth;
        scroller.style.scrollBehavior = prev || '';
      }
    }
    scroller.addEventListener('scroll', throttle(handleLoop, 60));

    // --- Drag/Swipe via Pointer Events ---
    let isDown = false, startX = 0, startLeft = 0;
    scroller.addEventListener('pointerdown', (e) => {
      isDown = true;
      scroller.classList.add('is-drag');
      scroller.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startLeft = scroller.scrollLeft;
    });
    scroller.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      scroller.scrollLeft = startLeft - dx;
    });
    const endDrag = (e) => {
      isDown = false;
      scroller.classList.remove('is-drag');
      if (e && e.pointerId && scroller.hasPointerCapture(e.pointerId)) {
        scroller.releasePointerCapture(e.pointerId);
      }
    };
    scroller.addEventListener('pointerup', endDrag);
    scroller.addEventListener('pointercancel', endDrag);
    scroller.addEventListener('pointerleave', endDrag);

    // --- Helfer: zur nächsten/vorigen Kachel springen (exakt) ---
    function scrollToCardByDir(dir) {
      const padL = getRowPaddingLeft();
      const cards = Array.from(row.children); // inkl. Clones
      const currentLeft = scroller.scrollLeft + 1; // Toleranz

      if (dir > 0) {
        // NÄCHSTE Karte, deren linke Kante rechts von der aktuellen Scroll-Position liegt
        let target = null;
        for (const card of cards) {
          const left = card.offsetLeft - padL;
          if (left > currentLeft) { target = card; break; }
        }
        if (!target) target = cards[0];
        scroller.scrollTo({ left: target.offsetLeft - padL, behavior: 'smooth' });
      } else {
        // VORIGE Karte, deren linke Kante links von der aktuellen Scroll-Position liegt
        let target = null;
        for (let i = cards.length - 1; i >= 0; i--) {
          const left = cards[i].offsetLeft - padL;
          if (left < currentLeft - 2) { target = cards[i]; break; }
        }
        if (!target) target = cards[cards.length - 1];
        scroller.scrollTo({ left: target.offsetLeft - padL, behavior: 'smooth' });
      }
    }

    // --- Pfeile: je nach Viewport anderes Verhalten ---
    function isMobile()   { return window.matchMedia('(max-width: 639px)').matches; }
    function isNotMobile(){ return !isMobile(); } // Tablet & Desktop verhalten sich wie Karussell

    const MOBILE_PIXEL_STEP = 80; // „wenige Pixel“ pro Klick

    arrows.forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = parseInt(btn.dataset.dir || '1', 10);

        if (isNotMobile()) {
          // Tablet/Desktop: exakt zur nächsten/vorigen Kachel
          scrollToCardByDir(dir);
        } else {
          // Mobile: kleiner Pixel-Scroll
          scroller.scrollBy({ left: dir * MOBILE_PIXEL_STEP, behavior: 'smooth' });
        }
      });
    });

    // --- Keyboard: wie bei Pfeilen (nur sinnvoll für Nicht-Mobile) ---
    scroller.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        if (isNotMobile()) {
          scrollToCardByDir(dir);
        } else {
          scroller.scrollBy({ left: dir * MOBILE_PIXEL_STEP, behavior: 'smooth' });
        }
        e.preventDefault();
      }
    });
    scroller.setAttribute('tabindex', '0');

    // Snap optional abschalten
    const snap = scroller.getAttribute('data-snap');
    if (snap === 'false') row.style.scrollSnapType = 'none';
  }

  // Utils
  function debounce(fn, ms) {
    let t; return function (...args) {
      clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
  function throttle(fn, ms) {
    let last = 0; return function (...args) {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(this, args); }
    };
  }

  function initAll() {
    document.querySelectorAll(SECTION_SELECTOR).forEach(initSection);
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else { initAll(); }

  // Theme Editor
  document.addEventListener('shopify:section:load', (e) => {
    const el = e.target && e.target.querySelector ? e.target.querySelector(SECTION_SELECTOR) : null;
    if (el) initSection(el);
  });
})();
