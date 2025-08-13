/**
 * Karussell Leistungen – JS
 * - Endloses Karussell via Clones links/rechts
 * - Drag/Touch, Pfeile, Snap, Keyboard
 * - Reinitialisiert im Theme Editor (shopify:section:load)
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

    // Responsive Column-Vars -> in CSS als --kl-cols-*
    const colsDesktop = parseFloat(scroller.getAttribute('data-cols-desktop')) || 4;
    const colsTablet  = parseFloat(scroller.getAttribute('data-cols-tablet'))  || 3;
    row.style.setProperty('--kl-cols-desktop', colsDesktop);
    row.style.setProperty('--kl-cols-tablet', colsTablet);

    // Endlos: Clones links/rechts erzeugen (einmalig)
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

      row.prepend(fragBefore); // Clones vor den echten
      row.append(fragAfter);   // Clones hinter den echten
      row.dataset.loopPrepared = 'true';
    }

    // Helper: Gruppenbreite (nur echte Slides zählen)
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

    // Startposition auf die Mitte (hintere Clone-Gruppe links, echte in der Mitte)
    let groupWidth = 0;
    function setStart() {
      groupWidth = getGroupWidth();
      // ohne smooth-jank setzen
      const prevBehavior = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = 'auto';
      scroller.scrollLeft = groupWidth; // mittig starten
      scroller.style.scrollBehavior = prevBehavior || '';
    }
    // initial nach Layout
    requestAnimationFrame(setStart);
    window.addEventListener('resize', debounce(() => {
      const prevRatio = scroller.scrollLeft / (groupWidth * 3 || 1);
      setStart();
      // Optional: Position ungefähr bewahren
      if (groupWidth > 0) {
        scroller.scrollLeft = groupWidth + Math.max(0, prevRatio - 1/3) * groupWidth;
      }
    }, 150));

    // Loop-Korrektur (nahtlos)
    function handleLoop() {
      if (groupWidth === 0) groupWidth = getGroupWidth();
      const max = groupWidth * 3; // clone-before + real + clone-after
      const x = scroller.scrollLeft;

      if (x <= groupWidth * 0.05) {
        // fast am linken Ende -> in die Mitte springen
        const prev = scroller.style.scrollBehavior;
        scroller.style.scrollBehavior = 'auto';
        scroller.scrollLeft = x + groupWidth;
        scroller.style.scrollBehavior = prev || '';
      } else if (x >= groupWidth * 1.95) {
        // fast am rechten Ende -> in die Mitte springen
        const prev = scroller.style.scrollBehavior;
        scroller.style.scrollBehavior = 'auto';
        scroller.scrollLeft = x - groupWidth;
        scroller.style.scrollBehavior = prev || '';
      }
    }
    scroller.addEventListener('scroll', throttle(handleLoop, 60));

    // Drag/Swipe via Pointer Events
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

    // Pfeile
    arrows.forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = parseInt(btn.dataset.dir || '1', 10);
        const firstCard = row.querySelector('.svc-card');
        const gap = parseFloat(getComputedStyle(row).gap) || 0;
        const step = firstCard ? (firstCard.getBoundingClientRect().width + gap) : 300;
        scroller.scrollBy({ left: dir * step, behavior: 'smooth' });
      });
    });

    // Keyboard (links/rechts)
    scroller.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const firstCard = row.querySelector('.svc-card');
        const gap = parseFloat(getComputedStyle(row).gap) || 0;
        const step = firstCard ? (firstCard.getBoundingClientRect().width + gap) : 300;
        scroller.scrollBy({ left: dir * step, behavior: 'smooth' });
        e.preventDefault();
      }
    });
    // Fokus erreichbar
    scroller.setAttribute('tabindex', '0');

    // Snap optional
    const snap = scroller.getAttribute('data-snap');
    if (snap === 'false') row.style.scrollSnapType = 'none';
  }

  // Hilfsfunktionen
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

  // Theme Editor Events
  document.addEventListener('shopify:section:load', (e) => {
    const el = e.target && e.target.querySelector ? e.target.querySelector(SECTION_SELECTOR) : null;
    if (el) initSection(el);
  });
})();
