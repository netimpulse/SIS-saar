/* team-carousel.js
 * Vanilla JS Karussell mit:
 * - Unendlichem Loop (Clones am Anfang/Ende)
 * - Buttons & Swipe/Drag
 * - Dynamischer Re-Init bei Resize und im Shopify Theme Editor
 */

(function () {
  class TeamCarousel {
    constructor(root) {
      this.root = root;
      this.viewport = root.querySelector('.team-carousel__viewport');
      this.track = root.querySelector('.team-carousel__track');
      this.prevBtn = root.querySelector('.team-carousel__btn--prev');
      this.nextBtn = root.querySelector('.team-carousel__btn--next');
      this.dotsEl = root.querySelector('.team-carousel__dots');

      this.items = Array.from(this.track.children);
      this.realCount = this.items.length;

      this.perView = this.getPerView();
      this.gap = this.getGap();

      this.current = 0;           // Index innerhalb der "realen" Slides
      this.at = 0;                // Index innerhalb der Track-Slides inkl. Clones
      this.slideW = 0;            // Breite einer Slide inkl. Lücke
      this.isDragging = false;
      this.startX = 0;
      this.dragX = 0;
      this.baseX = 0;
      this.dragPreventClick = false;

      if (this.realCount === 0) {
        this.disable();
        return;
      }

      this.setup();
      this.bind();
    }

    /* ===== Setup & Helpers ===== */

    getPerView() {
      const styles = window.getComputedStyle(this.track);
      const pv = parseFloat(styles.getPropertyValue('--per-view')) || 1;
      return Math.max(1, Math.floor(pv));
    }

    getGap() {
      const styles = window.getComputedStyle(this.track);
      const gap = parseFloat(styles.getPropertyValue('gap')) || parseFloat(styles.getPropertyValue('column-gap')) || 0;
      return isNaN(gap) ? 0 : gap;
    }

    calcSlideMetrics() {
      // Breite des ersten Items
      const first = this.track.querySelector('.team-carousel__item');
      if (!first) return;
      const rect = first.getBoundingClientRect();
      // Schrittweite = Itembreite + Gap
      this.slideW = rect.width + this.gap;
    }

    setup() {
      // Entferne ggf. alte Clones
      this.track.querySelectorAll('.is-clone').forEach(n => n.remove());

      this.perView = this.getPerView();
      this.gap = this.getGap();

      // Wenn weniger/equal als perView: einfach "fake-infinite" (keine Buttons/Dots nötig)
      if (this.realCount <= this.perView) {
        this.updateDots(); // 1 Dot
        this.prevBtn && (this.prevBtn.style.display = 'none');
        this.nextBtn && (this.nextBtn.style.display = 'none');
        this.at = 0;
        this.current = 0;
        this.calcSlideMetrics();
        this.jumpTo(0);
        return;
      } else {
        this.prevBtn && (this.prevBtn.style.display = '');
        this.nextBtn && (this.nextBtn.style.display = '');
      }

      // Clones erstellen: vorne und hinten jeweils perView Elemente klonen
      const headClones = this.items.slice(0, this.perView).map(n => this.cloneNode(n));
      const tailClones = this.items.slice(-this.perView).map(n => this.cloneNode(n));

      // Hinten anhängen, vorne einfügen
      headClones.forEach(n => this.track.appendChild(n));
      tailClones.forEach(n => this.track.insertBefore(n, this.track.firstChild));

      // Track-Liste neu erfassen
      this.slides = Array.from(this.track.children);
      this.calcSlideMetrics();

      // Startposition: direkt nach den Tail-Clones, damit man links "zurück" kann
      this.at = this.perView;
      this.current = 0; // reale 0
      this.withoutTransition(() => this.translateToIndex(this.at));

      // Dots
      this.updateDots();
      this.updateDotsActive();
    }

    cloneNode(node) {
      const c = node.cloneNode(true);
      c.classList.add('is-clone');
      c.setAttribute('aria-hidden', 'true');
      return c;
    }

    bind() {
      // Buttons
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());

      // Dots
      this.dotsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-goto]');
        if (!btn) return;
        const target = parseInt(btn.getAttribute('data-goto'), 10) || 0;
        this.goTo(target);
      });

      // Drag/Swipe
      this.track.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });

      // Resize (debounced)
      this.onResize = this.debounce(() => {
        const prevPerView = this.perView;
        this.setup(); // berechnet perView neu & clont neu
        // Versuche, die visuell "gleiche" reale Position zu behalten
        if (this.perView !== prevPerView) {
          this.goTo(this.current, true);
        }
      }, 150);
      window.addEventListener('resize', this.onResize);

      // Theme Editor: Re-Init bei Section-Neuladen
      document.addEventListener('shopify:section:load', (evt) => {
        if (evt.target && evt.target.contains(this.root)) {
          this.destroy();
          new TeamCarousel(evt.target.querySelector('.team-carousel'));
        }
      });

      // Re-Init bei Block-Reorder
      document.addEventListener('shopify:block:reorder', (evt) => {
        if (!this.root.contains(evt.target)) return;
        this.destroy();
        this.root = evt.target.closest('.team-carousel') || this.root;
        new TeamCarousel(this.root);
      });

      // Verhindere Clicks nach Drag
      this.track.addEventListener('click', (e) => {
        if (this.dragPreventClick) {
          e.preventDefault();
          e.stopPropagation();
          this.dragPreventClick = false;
        }
      });
    }

    destroy() {
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointercancel', this.onPointerUp);
      window.removeEventListener('pointermove', this.onPointerMove);
    }

    disable() {
      if (this.prevBtn) this.prevBtn.disabled = true;
      if (this.nextBtn) this.nextBtn.disabled = true;
    }

    /* ===== Navigation ===== */

    next() {
      this.moveBy(1);
    }

    prev() {
      this.moveBy(-1);
    }

    goTo(realIndex, instant = false) {
      // reale Index -> Track-Index
      const targetAt = this.perView + realIndex;
      if (instant) {
        this.withoutTransition(() => this.translateToIndex(targetAt));
      } else {
        this.translateToIndex(targetAt);
      }
      this.at = targetAt;
      this.current = this.normRealIndex(realIndex);
      this.updateDotsActive();
    }

    moveBy(step) {
      const target = this.at + step;
      this.translateToIndex(target);
    }

    translateToIndex(targetIndex) {
      this.track.style.transition = 'transform 400ms ease';
      const x = -targetIndex * this.slideW;
      this.track.style.transform = `translate3d(${x}px,0,0)`;
      this.at = targetIndex;

      // Nach Ende einer Transition an die reale Position "springen", wenn wir in Clones sind
      const onEnd = () => {
        this.track.removeEventListener('transitionend', onEnd);
        const { fixedIndex, changed } = this.fixInfiniteBounds();
        if (changed) {
          this.withoutTransition(() => this.translateToIndex(fixedIndex));
        }
        // reale current berechnen
        this.current = this.normRealIndex(this.at - this.perView);
        this.updateDotsActive();
      };
      this.track.addEventListener('transitionend', onEnd, { once: true });
    }

    withoutTransition(cb) {
      const prev = this.track.style.transition;
      this.track.style.transition = 'none';
      cb();
      // force reflow
      void this.track.offsetHeight;
      this.track.style.transition = prev || '';
    }

    fixInfiniteBounds() {
      let changed = false;
      let idx = this.at;

      // Von rechts über das Ende → springe zurück
      const rightEdge = this.perView + this.realCount;
      if (idx >= rightEdge) {
        idx = idx - this.realCount;
        changed = true;
      }

      // Von links über den Anfang → springe ans Ende
      if (idx < this.perView) {
        idx = idx + this.realCount;
        changed = true;
      }
      this.at = idx;
      return { fixedIndex: idx, changed };
    }

    normRealIndex(i) {
      // normalisiert auf [0, realCount)
      const m = ((i % this.realCount) + this.realCount) % this.realCount;
      return m;
    }

    /* ===== Dots ===== */

    updateDots() {
      this.dotsEl.innerHTML = '';
      const count = Math.max(1, this.realCount);
      for (let i = 0; i < count; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-goto', String(i));
        b.setAttribute('aria-label', `Gehe zu Slide ${i + 1}`);
        this.dotsEl.appendChild(b);
      }
    }

    updateDotsActive() {
      const dots = Array.from(this.dotsEl.querySelectorAll('button'));
      dots.forEach((d, i) => {
        if (i === this.current) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    /* ===== Drag/Swipe ===== */

    onPointerDown = (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return; // nur linker Mausklick
      this.isDragging = true;
      this.dragPreventClick = false;
      this.startX = e.clientX;
      // aktuelle x-Position merken
      const matrix = new DOMMatrixReadOnly(getComputedStyle(this.track).transform);
      this.baseX = matrix.m41; // translateX
      this.track.style.transition = 'none';
      this.track.setPointerCapture(e.pointerId);
    };

    onPointerMove = (e) => {
      if (!this.isDragging) return;
      this.dragX = e.clientX - this.startX;
      const x = this.baseX + this.dragX;
      this.track.style.transform = `translate3d(${x}px,0,0)`;

      if (Math.abs(this.dragX) > 5) this.dragPreventClick = true;
    };

    onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.track.releasePointerCapture && this.track.releasePointerCapture(e.pointerId);

      const threshold = Math.max(50, this.slideW * 0.15);
      let step = 0;
      if (Math.abs(this.dragX) > threshold) {
        step = this.dragX < 0 ? 1 : -1; // nach links gezogen → nächstes
      } else {
        // Zur nächsten "Zelle" runden
        const matrix = new DOMMatrixReadOnly(getComputedStyle(this.track).transform);
        const xNow = matrix.m41;
        const idxFloat = -xNow / this.slideW;
        step = Math.round(idxFloat - this.at);
      }
      this.dragX = 0;

      if (step === 0) {
        // Zurück auf die aktuelle Zelle
        this.translateToIndex(this.at);
      } else {
        this.moveBy(step);
      }
    };

    /* ===== Utilities ===== */

    debounce(fn, wait) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    }
  }

  /* ===== Init auf allen Karussells ===== */

  function initAll() {
    document.querySelectorAll('.team-carousel').forEach((el) => {
      // Verhindere Doppel-Init
      if (el.__tc_inited) return;
      el.__tc_inited = true;
      new TeamCarousel(el);
    });
  }

  document.addEventListener('DOMContentLoaded', initAll);
})();
