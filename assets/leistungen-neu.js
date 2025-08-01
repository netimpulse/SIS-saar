/* --- Grundlegende Sektions-Styles --- */
.leistungen-neu-heading {
  text-align: center;
  margin-bottom: 40px;
}

.carousel-wrapper {
  position: relative;
}

.carousel-viewport {
  overflow: hidden;
  position: relative;
}

.carousel-track {
  display: flex;
  flex-wrap: nowrap;
}

.carousel-slide {
  flex-shrink: 0;
  width: 25%; /* 4 sichtbare Elemente standardmäßig auf Desktop */
  box-sizing: border-box;
  /* Das Padding wird nun direkt in der .liquid-Datei gesetzt */
}

/* --- Pfeile --- */
.carousel-arrow {
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  height: 48px;
  width: 48px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  cursor: pointer;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.carousel-arrow:hover {
  background: #fff;
  transform: scale(1.1);
}

.carousel-arrow svg {
  width: 28px;
  height: 28px;
}

/* Position der Pfeile leicht angepasst für bessere Optik */
.carousel-arrow--prev {
  left: -24px;
}

.carousel-arrow--next {
  right: -24px;
}

/* --- Das eigentliche Leistungs-Item --- */
.service-item {
  display: flex;
  flex-direction: column;
  text-align: center;
  position: relative;
  z-index: 2; /* Über der Linie */
}

.service-item__timeline {
  margin-bottom: 25px;
}

.service-item__timeline-connector {
  content: '';
  position: absolute;
  top: calc(var(--image-diameter, 150px) / 2);
  left: 0;
  right: 0;
  height: 2px;
  z-index: 1; /* Hinter den Bildern */
  transform: translateY(-50%);
  margin: 0 auto;
  width: 95%;
}

.service-item__image-wrapper {
  --image-diameter: 150px; /* Default-Wert, wird von Liquid überschrieben */
  width: var(--image-diameter);
  height: var(--image-diameter);
  position: relative;
  margin: 0 auto;
  border-radius: 50%;
  padding: 5px; /* Abstand zur Linie */
  background: var(--section-bg-color, #fff); /* Gleiche Farbe wie Sektionshintergrund */
}

.service-item__main-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.service-item__main-image.placeholder,
.service-item__main-image.placeholder svg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #f2f2f2;
}


.service-item__number-icon {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 30%;
  height: 30%;
  min-width: 30px;
  min-height: 30px;
  object-fit: contain;
}

.service-item__content {
  flex-grow: 1;
}

.service-item__title {
  margin: 0 0 8px 0;
  font-weight: bold;
}

.service-item__subtitle {
  margin: 0 0 15px 0;
  font-weight: normal;
}

.service-item__text p {
  margin: 0;
  line-height: 1.6;
}

/* --- Responsive Anpassungen --- */
@media (max-width: 1200px) {
  .carousel-slide {
    width: 33.333%; /* 3 sichtbare Elemente */
  }
}

@media (max-width: 990px) {
  .carousel-slide {
    width: 50%; /* 2 sichtbare Elemente */
  }
}

@media (max-width: 749px) {
  .carousel-slide {
    width: 85%; /* Fast 1 Element sichtbar */
    scroll-snap-align: center; /* Sorgt für schönes Einrasten beim Scrollen */
  }
  .carousel-viewport {
    overflow-x: auto;
    scroll-snap-type: x mandatory; /* Aktiviert Snap-Scrolling auf Touch-Geräten */
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .carousel-viewport::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
   .carousel-track {
    transition: none;
  }
  .carousel-arrow {
    display: none; /* Pfeile auf Mobile ausblenden */
  }
}
