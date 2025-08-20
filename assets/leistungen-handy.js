/* leistungen-handy.js
   Macht das Carousel aus "Leistungen Button" funktionsfähig.
   - Desktop/Tablet: Pfeilsteuerung (transform).
   - Mobile (<= 749px): natives Scrollen mit Scroll-Snap, genau 1 Slide sichtbar.
*/

(function () {
  "use strict";

  const MOBILE_QUERY = "(max-width: 749px)";

  // Debounce helper
  const debounce = (fn, wait = 120) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  // Init all sections on the page
  function initAll() {
    document
      .querySelectorAll(".leistungen-neu-section")
      .forEach((sectionEl) => initCarousel(sectionEl));
  }

  function initCarousel(root) {
    const viewport = root.querySelector(".carousel-viewport");
    const track = root.querySelector(".carousel-track");
    const slides = Array.from(root.querySelectorAll(".carousel-slide"));
    const prevBtn = root.querySelector(".carousel-arrow--prev");
    const nextBtn = root.querySelector(".carousel-arrow--next");

    if (!viewport || !track || slides.length === 0) return;

    // State
    let current = 0;
    let slideWidth = 0;
    let isMobile = window.matchMedia(MOBILE_QUERY).matches;

    // ---- Layout helpers ----
    const getSlideWidth = () => {
      // offsetWidth deckt Padding des Slides ab; damit rechnen wir die Step-Breite
      return slides[0].offsetWidth;
    };

    const updateButtons = () => {
      if (!prevBtn || !nextBtn) return;
      if (isMobile) {
        // Auf Mobile blenden die Buttons via CSS aus; zur Sicherheit disablen
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
      }
      prevBtn.disabled = current <= 0;
      // erlauben, bis der letzte Slide linksbündig sichtbar ist
      const maxIndex = Math.max(0, slides.length - visibleCount());
      nextBtn.disabled = current >= maxIndex;
    };

    const visibleCount = () => {
      // Wie viele Slides sind ungefähr sichtbar?
      const count = Math.max(1, Math.round(viewport.offsetWidth / slideWidth));
      return count;
    };

    const applyDesktopMode = () => {
      // Entferne mobile Styles
      viewport.style.scrollSnapType = "";
      viewport.style.overflowX = "";
      track.style.scrollBehavior = "";
      slides.forEach((s) => {
        s.style.scrollSnapAlign = "";
        s.style.width = ""; // CSS steuert Breite für >= 750px
      });

      // Aktuelle Breite neu berechnen
      slideWidth = getSlideWidth();
      // Setze transform passend zum Index
      track.style.transition = "transform 0.6s cubic-bezier(0.86, 0, 0.07, 1)";
      setTransformToIndex(current);
      updateButtons();
    };

    const applyMobileMode = () => {
      // Genau 1 Slide pro View
      slides.forEach((s) => {
        s.style.width = "100%"; // überschreibt die 85% aus dem CSS
        s.style.scrollSnapAlign = "center";
      });
      viewport.style.scrollSnapType = "x mandatory";
      viewport.style.overflowX = "auto";
      track.style.transition = "none";
      // Transform entfernen; mobile nutzt ScrollLeft
      track.style.transform = "";

      // an die nächste Snap-Position scrollen
      slideWidth = getSlideWidth();
      snapToIndex(current, false);
      updateButtons();
    };

    const setTransformToIndex = (idx) => {
      track.style.transform = `translateX(${-idx * slideWidth}px)`;
    };

    const clampIndex = (idx) => {
      const max = Math.max(0, slides.length - visibleCount());
      return Math.min(Math.max(0, idx), max);
    };

    const goTo = (idx) => {
      current = clampIndex(idx);
      if (isMobile) {
        snapToIndex(current, true);
      } else {
        setTransformToIndex(current);
      }
      updateButtons();
    };

    const snapToIndex = (idx, smooth = true) => {
      const x = idx * slideWidth;
      viewport.scrollTo({ left: x, behavior: smooth ? "smooth" : "auto" });
    };

    // ---- Events ----
    const onPrev = () => goTo(current - 1);
    const onNext = () => goTo(current + 1);

    if (prevBtn) prevBtn.addEventListener("click", onPrev);
    if (nextBtn) nextBtn.addEventListener("click", onNext);

    // Keyboard (wenn Fokus innerhalb der Section)
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      }
    });

    // Mobile: aktualisiere current nach Scroll (debounced)
    const onMobileScroll = debounce(() => {
      if (!isMobile) return;
      slideWidth = getSlideWidth();
      const idx = Math.round(viewport.scrollLeft / slideWidth);
      current = clampIndex(idx);
      updateButtons();
    }, 80);

    viewport.addEventListener("scroll", onMobileScroll, { passive: true });

    // Resize / Orientation Change
    const onResize = debounce(() => {
      const nowMobile = window.matchMedia(MOBILE_QUERY).matches;
      // Falls Breakpoint gewechselt ist, Modus umschalten
      if (nowMobile !== isMobile) {
        isMobile = nowMobile;
        if (isMobile) applyMobileMode();
        else applyDesktopMode();
        return;
      }
      // Gleiches Layout, aber Breiten neu berechnen
      slideWidth = getSlideWidth();
      if (isMobile) {
        snapToIndex(current, false);
      } else {
        setTransformToIndex(current);
        updateButtons();
      }
    }, 120);

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    // Falls Bilder nachladen & Größen ändern: beobachten und neu messen
    const ro =
      "ResizeObserver" in window
        ? new ResizeObserver(onResize)
        : null;
    ro && ro.observe(viewport);

    // Initialer Modus
    if (isMobile) applyMobileMode();
    else applyDesktopMode();

    // Public API (optional, falls später gebraucht)
    root._leistungenCarousel = {
      next: onNext,
      prev: onPrev,
      goTo,
      get index() {
        return current;
      },
    };
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
