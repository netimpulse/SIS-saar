document.addEventListener('DOMContentLoaded', function() {
  const container = document.querySelector('.kundenbewertung-container');
  const prevButton = document.querySelector('.prev-button');
  const nextButton = document.querySelector('.next-button');

  if (!container || !prevButton || !nextButton) return;

  const items = Array.from(container.children);
  const itemsCount = items.length;
  if (itemsCount <= 3) {
      prevButton.style.display = 'none';
      nextButton.style.display = 'none';
      return;
  }
  
  // Klonen der Elemente für den unendlichen Effekt
  items.forEach(item => {
    const clone = item.cloneNode(true);
    container.appendChild(clone);
  });
  
  let currentIndex = 0;
  let isTransitioning = false;

  function updateCarousel() {
    const itemWidth = items[0].getBoundingClientRect().width + 30; // 30px ist der gap
    const offset = -currentIndex * itemWidth;
    container.style.transition = 'transform 0.5s ease-in-out';
    container.style.transform = `translateX(${offset}px)`;
  }

  function shiftItems(direction) {
    if (isTransitioning) return;
    isTransitioning = true;
    
    currentIndex += direction;
    updateCarousel();

    container.addEventListener('transitionend', () => {
      isTransitioning = false;
      if (currentIndex >= itemsCount) {
        currentIndex = 0;
        container.style.transition = 'none';
        container.style.transform = `translateX(0px)`;
      } else if (currentIndex < 0) {
        currentIndex = itemsCount - 1;
        const itemWidth = items[0].getBoundingClientRect().width + 30;
        const offset = -currentIndex * itemWidth;
        container.style.transition = 'none';
        container.style.transform = `translateX(${offset}px)`;
      }
    }, { once: true });
  }

  nextButton.addEventListener('click', () => shiftItems(1));
  prevButton.addEventListener('click', () => shiftItems(-1));
});
