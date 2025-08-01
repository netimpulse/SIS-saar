class LeistungenCarousel {
  constructor(section) {
    this.section = section;
    this.viewport = this.section.querySelector('.carousel-viewport');
    this.track = this.section.querySelector('.carousel-track');
    this.slides = Array.from(this.track.children);
    this.prevButton = this.section.querySelector('.carousel-arrow--prev');
    this.nextButton = this.section.querySelector('.carousel-arrow--next');
    this.isMoving = false;

    // Auf Mobile-Geräten wird natives Scrollen verwendet, daher kein JS nötig.
    if (window.innerWidth <= 749 || this.slides.length <= 1) {
      if(this.prevButton) this.prevButton.style.display = 'none';
      if(this.nextButton) this.nextButton.style.display = 'none';
      return;
    }

    this.init();
  }

  init() {
    this.clones = [];
    this.currentIndex = 0;
    
    this.setupClones();
    this.updateCarouselPosition(false); // Initiale Position ohne Animation setzen
    this.bindEvents();
    
    // Beobachte Größenänderungen, um das Karussell neu zu initialisieren
    new ResizeObserver(() => this.reInit()).observe(this.viewport);
  }

  // Re-Initialisierung bei Größenänderung des Fensters
  reInit() {
      // Entferne die Klone, bevor du sie neu erstellst
      this.clones.forEach(clone => clone.remove());
      this.track.style.transition = 'none';
      this.track.style.transform = 'translateX(0px)';
      this.init();
  }

  setupClones() {
    const slidesToCloneCount = Math.ceil(this.viewport.offsetWidth / this.slides[0].offsetWidth);

    // Klone vom Ende nehmen und an den Anfang setzen
    for (let i = 0; i < slidesToCloneCount; i++) {
      const index = this.slides.length - 1 - i;
      const clone = this.slides[index].cloneNode(true);
      clone.classList.add('is-clone');
      this.track.insertBefore(clone, this.slides[0]);
      this.clones.push(clone);
    }

    // Klone vom Anfang nehmen und ans Ende setzen
    for (let i = 0; i < slidesToCloneCount; i++) {
      const clone = this.slides[i].cloneNode(true);
      clone.classList.add('is-clone');
      this.track.appendChild(clone);
      this.clones.push(clone);
    }

    this.allSlides = Array.from(this.track.children);
    this.currentIndex = slidesToCloneCount;
  }

  bindEvents() {
    this.prevButton.addEventListener('click', () => this.move('prev'));
    this.nextButton.addEventListener('click', () => this.move('next'));

    // Wichtig: Event-Listener für das Ende der Transition
    this.track.addEventListener('transitionend', () => {
      this.isMoving = false;
      this.checkInfiniteLoop();
    });
  }

  move(direction) {
    if (this.isMoving) return;
    this.isMoving = true;

    this.currentIndex += (direction === 'next' ? 1 : -1);
    this.updateCarouselPosition(true);
  }

  updateCarouselPosition(animated = true) {
    if (!animated) {
      this.track.style.transition = 'none';
    }

    const slideWidth = this.allSlides[0].offsetWidth;
    const newTransform = -this.currentIndex * slideWidth;
    this.track.style.transform = `translateX(${newTransform}px)`;

    if (!animated) {
      // Force repaint, um sicherzustellen, dass die Transition wieder aktiv ist
      this.track.offsetHeight; 
      this.track.style.transition = '';
    }
  }

  checkInfiniteLoop() {
    const slidesToCloneCount = this.clones.length / 2;
    // Sprung zum echten Slide, wenn ein Klon am Ende erreicht wird
    if (this.currentIndex >= this.slides.length + slidesToCloneCount) {
      this.currentIndex = slidesToCloneCount;
      this.updateCarouselPosition(false);
    }
    // Sprung zum echten Slide, wenn ein Klon am Anfang erreicht wird
    if (this.currentIndex < slidesToCloneCount) {
      this.currentIndex = this.slides.length + slidesToCloneCount - 1;
      this.updateCarouselPosition(false);
    }
  }
}

// Initialisierung der Sektion
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.leistungen-neu-section');
  sections.forEach(section => {
    new LeistungenCarousel(section);
  });
});

// Sicherstellen, dass es auch im Shopify Theme Editor funktioniert
if (window.Shopify && window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const section = event.target.querySelector('.leistungen-neu-section');
    if (section) {
      new LeistungenCarousel(section);
    }
  });
   document.addEventListener('shopify:section:reorder', (event) => {
    const section = event.target.querySelector('.leistungen-neu-section');
    if (section) {
      new LeistungenCarousel(section);
    }
  });
}
