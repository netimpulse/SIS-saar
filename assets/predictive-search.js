class PredictiveSearch extends SearchForm {
  constructor() {
    super();
    this.cachedResults = {};
    this.predictiveSearchResults = this.querySelector('[data-predictive-search]');
    this.allPredictiveSearchInstances = document.querySelectorAll('predictive-search');
    this.isOpen = false;
    this.abortController = new AbortController();
    this.searchTerm = '';
    
    // NEU: Cache für die Leistungs-Blöcke, um die Seite nicht immer neu laden zu müssen.
    this.cachedServices = null; 
    // NEU: URL zur Leistungsseite. Anpassen, falls deine Seite einen anderen Handle hat.
    this.servicesPageUrl = '/pages/leistungen';

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.input.form.addEventListener('submit', this.onFormSubmit.bind(this));
    
    // GEÄNDERT: Wir rufen hier direkt die onChange-Methode mit Debounce auf.
    this.input.addEventListener('input', debounce((event) => {
      this.onChange(event);
    }, 300).bind(this));

    this.input.addEventListener('focus', this.onFocus.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.addEventListener('keyup', this.onKeyup.bind(this));
    this.addEventListener('keydown', this.onKeydown.bind(this));
  }

  // NEU: Helper-Funktion für Debounce, falls sie nicht global verfügbar ist.
  debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  
  getQuery() {
    return this.input.value.trim();
  }

  onChange() {
    super.onChange();
    const newSearchTerm = this.getQuery();
    if (!this.searchTerm || !newSearchTerm.startsWith(this.searchTerm)) {
      this.querySelector('#predictive-search-results-groups-wrapper')?.remove();
    }

    this.updateSearchForTerm(this.searchTerm, newSearchTerm);
    this.searchTerm = newSearchTerm;

    if (!this.searchTerm.length) {
      this.close(true);
      return;
    }

    this.getSearchResults(this.searchTerm);
  }
  
  // NEU: Diese Funktion holt und filtert die Ergebnisse von der Leistungsseite.
  async getCustomServiceResults(searchTerm) {
    // Lade die Leistungen nur einmal und speichere sie im Cache.
    if (!this.cachedServices) {
      try {
        const response = await fetch(this.servicesPageUrl);
        if (!response.ok) throw new Error('Leistungsseite nicht gefunden');
        
        const text = await response.text();
        const parser = new DOMParser();
        const html = parser.parseFromString(text, 'text/html');
        const serviceBlocks = html.querySelectorAll('.service-block'); // Klasse aus der Section
        
        this.cachedServices = Array.from(serviceBlocks).map(block => ({
          id: block.id,
          title: block.querySelector('.service-block__title')?.innerText || '',
          text: block.querySelector('.service-block__text')?.innerText || '',
          url: `${this.servicesPageUrl}#${block.id}`
        }));
      } catch (error) {
        console.error('Fehler beim Laden der Leistungen:', error);
        this.cachedServices = []; // Verhindert weitere Fehlversuche
        return [];
      }
    }

    // Filtere die gecachten Ergebnisse
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return this.cachedServices.filter(service => {
      return service.title.toLowerCase().includes(lowerCaseSearchTerm) || service.text.toLowerCase().includes(lowerCaseSearchTerm);
    });
  }

  // GEÄNDERT: Diese Funktion startet jetzt beide Suchen parallel.
  getSearchResults(searchTerm) {
    const queryKey = searchTerm.replace(' ', '-').toLowerCase();
    this.setLiveRegionLoadingState();

    // Promise für die Standard-Shopify-Suche
    const standardSearchPromise = this.cachedResults[queryKey] 
      ? Promise.resolve(this.cachedResults[queryKey])
      : fetch(`${routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search`, { signal: this.abortController.signal })
          .then(response => {
            if (!response.ok) throw new Error(response.status);
            return response.text();
          })
          .then(text => {
            const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive-search').innerHTML;
            this.cachedResults[queryKey] = resultsMarkup;
            return resultsMarkup;
          });

    // Promise für die Suche nach Leistungen
    const customServicesPromise = this.getCustomServiceResults(searchTerm);

    // Führe beide Suchen gleichzeitig aus
    Promise.all([standardSearchPromise, customServicesPromise])
      .then(([standardResults, customResults]) => {
        this.renderSearchResults(standardResults, customResults);
      })
      .catch(error => {
        if (error?.code === 20) return; // Abort error
        this.close();
        console.error(error);
      });
  }

  // GEÄNDERT: Diese Funktion rendert jetzt die kombinierten Ergebnisse.
  renderSearchResults(standardResultsMarkup, customServiceResults) {
    this.predictiveSearchResults.innerHTML = standardResultsMarkup;
    
    // Erstelle und füge die Leistungs-Ergebnisse hinzu
    if (customServiceResults && customServiceResults.length > 0) {
      const servicesHtml = `
        <div class="predictive-search__result-group">
          <h3 class="predictive-search__heading">Leistungen</h3>
          <ul class="predictive-search__results-list" role="list">
            ${customServiceResults.map(item => `
              <li class="predictive-search__list-item" role="listitem">
                <a href="${item.url}" class="predictive-search__item predictive-search__item--link">
                  <span class="predictive-search__item-heading">${item.title}</span>
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      // Füge die Ergebnisse am Anfang der Liste ein
      this.predictiveSearchResults.querySelector('.predictive-search__results-groups-wrapper')?.insertAdjacentHTML('afterbegin', servicesHtml);
    }
    
    this.setAttribute('results', true);
    this.setLiveRegionResults();
    this.open();
  }
  
  // Alle restlichen Methoden bleiben unverändert...
  onFormSubmit(event) {
    if (!this.getQuery().length || this.querySelector('[aria-selected="true"] a')) event.preventDefault();
  }

  onFormReset(event) {
    super.onFormReset(event);
    if (super.shouldResetForm()) {
      this.searchTerm = '';
      this.abortController.abort();
      this.abortController = new AbortController();
      this.closeResults(true);
    }
  }

  onFocus() {
    const currentSearchTerm = this.getQuery();
    if (!currentSearchTerm.length) return;
    if (this.searchTerm !== currentSearchTerm) {
      this.onChange();
    } else if (this.getAttribute('results') === 'true') {
      this.open();
    } else {
      this.getSearchResults(this.searchTerm);
    }
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onKeyup(event) {
    if (!this.getQuery().length) this.close(true);
    event.preventDefault();
    switch (event.code) {
      case 'ArrowUp': this.switchOption('up'); break;
      case 'ArrowDown': this.switchOption('down'); break;
      case 'Enter': this.selectOption(); break;
    }
  }

  onKeydown(event) {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault();
    }
  }

  updateSearchForTerm(previousTerm, newTerm) {
    const searchForTextElement = this.querySelector('[data-predictive-search-search-for-text]');
    const currentButtonText = searchForTextElement?.innerText;
    if (currentButtonText) {
      if (currentButtonText.match(new RegExp(previousTerm, 'g'))?.length > 1) return;
      const newButtonText = currentButtonText.replace(previousTerm, newTerm);
      searchForTextElement.innerText = newButtonText;
    }
  }

  switchOption(direction) {
    if (!this.getAttribute('open')) return;
    const moveUp = direction === 'up';
    const selectedElement = this.querySelector('[aria-selected="true"]');
    const allVisibleElements = Array.from(this.querySelectorAll('.predictive-search__item')).filter(element => element.offsetParent !== null);
    let activeElementIndex = 0;
    if (moveUp && !selectedElement) return;
    let selectedElementIndex = allVisibleElements.indexOf(selectedElement);
    if (!moveUp && selectedElement) {
      activeElementIndex = selectedElementIndex === allVisibleElements.length - 1 ? 0 : selectedElementIndex + 1;
    } else if (moveUp) {
      activeElementIndex = selectedElementIndex === 0 ? allVisibleElements.length - 1 : selectedElementIndex - 1;
    }
    if (activeElementIndex === selectedElementIndex) return;
    const activeElement = allVisibleElements[activeElementIndex];
    activeElement.setAttribute('aria-selected', true);
    if (selectedElement) selectedElement.setAttribute('aria-selected', false);
    this.input.setAttribute('aria-activedescendant', activeElement.id);
  }

  selectOption() {
    const selectedOption = this.querySelector('[aria-selected="true"]');
    if (selectedOption) selectedOption.click();
  }

  setLiveRegionLoadingState() {
    this.statusElement = this.statusElement || this.querySelector('.predictive-search-status');
    this.loadingText = this.loadingText || this.getAttribute('data-loading-text');
    this.setLiveRegionText(this.loadingText);
    this.setAttribute('loading', true);
  }

  setLiveRegionText(statusText) {
    this.statusElement.setAttribute('aria-hidden', 'false');
    this.statusElement.textContent = statusText;
    setTimeout(() => { this.statusElement.setAttribute('aria-hidden', 'true'); }, 1000);
  }

  setLiveRegionResults() {
    this.removeAttribute('loading');
    this.setLiveRegionText(this.querySelector('[data-predictive-search-live-region-count-value]').textContent);
  }

  getResultsMaxHeight() {
    this.resultsMaxHeight = window.innerHeight - document.querySelector('.section-header')?.getBoundingClientRect().bottom;
    return this.resultsMaxHeight;
  }

  open() {
    this.predictiveSearchResults.style.maxHeight = this.resultsMaxHeight || `${this.getResultsMaxHeight()}px`;
    this.setAttribute('open', true);
    this.input.setAttribute('aria-expanded', true);
    this.isOpen = true;
  }

  close(clearSearchTerm = false) {
    this.closeResults(clearSearchTerm);
    this.isOpen = false;
  }

  closeResults(clearSearchTerm = false) {
    if (clearSearchTerm) {
      this.input.value = '';
      this.removeAttribute('results');
    }
    const selected = this.querySelector('[aria-selected="true"]');
    if (selected) selected.setAttribute('aria-selected', false);
    this.input.setAttribute('aria-activedescendant', '');
    this.removeAttribute('open');
    this.input.setAttribute('aria-expanded', false);
    this.predictiveSearchResults.removeAttribute('style');
  }
}

customElements.define('predictive-search', PredictiveSearch);
