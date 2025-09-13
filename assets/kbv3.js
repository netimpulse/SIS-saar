(function () {
  function initCarousel(root) {
    if (!root || root.__kbvInit) return; // mehrfach-Init verhindern
    const container = root.querySelector('.kundenbewertung-container');
    const prevButton = root.querySelector('.prev-button');
    const nextButton = root.querySelector('.next-button');
    if (!container || !prevButton || !nextButton) return;

    root.__kbvInit = true;

    const originals = Array.from(container.children);
    const itemsCount = originals.length;
    const gap = parseFloat(getComputedStyle(container).gap) || 30;

    // Endlos-Klone (nur einmal)
    originals.forEach(item => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      container.appendChild(clone);
    });

    let currentIndex = 0;
    let isTransitioning = false;

    function itemWidth() {
      const first = container.children[0];
      return first ? first.getBoundingClientRect().width + gap : 0;
    }

    function moveCarousel(instant = false) {
      const offset = -currentIndex * itemWidth();
      container.style.transition = instant ? 'none' : 'transform 0.5s ease-in-out';
      container.style.transform = `translateX(${offset}px)`;
    }

    function handleTransitionEnd() {
      isTransitioning = false;
      if (currentIndex >= itemsCount) {
        currentIndex = 0;
        moveCarousel(true);
      } else if (currentIndex < 0) {
        currentIndex = itemsCount - 1;
        moveCarousel(true);
      }
    }

    function shiftItems(dir) {
      if (isTransitioning) return;
      isTransitioning = true;
      currentIndex += dir;
      moveCarousel();
    }

    // Listeners (pro Instanz)
    container.addEventListener('transitionend', handleTransitionEnd);
    nextButton.addEventListener('click', e => { e.preventDefault(); shiftItems(1); });
    prevButton.addEventListener('click', e => { e.preventDefault(); shiftItems(-1); });

    // Re-Layout bei Resize (z. B. Breakpoints)
    let resizeTO;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTO);
      resizeTO = setTimeout(() => moveCarousel(true), 100);
    });

    // Startposition setzen
    moveCarousel(true);
  }

  function initAll() {
    document.querySelectorAll('.kundenbewertung-karussell').forEach(initCarousel);
  }

  // 1) Erstes Laden
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // 2) Shopify Section dynamisch geladen (Theme-Editor / Ajax)
  document.addEventListener('shopify:section:load', evt => {
    const section = evt.target;
    section.querySelectorAll('.kundenbewertung-karussell').forEach(initCarousel);
  });
})();
