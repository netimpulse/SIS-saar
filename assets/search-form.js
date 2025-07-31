class SearchForm extends HTMLElement {
  constructor() {
    super();

    /* Elemente */
    this.input       = this.querySelector('input[type="search"]');
    this.resetButton = this.querySelector('button[type="reset"]');

    if (this.input) {
      /* Reset & Tippen (bestehende Dawn-Logik) */
      this.input.form.addEventListener('reset', this.onFormReset.bind(this));
      this.input.addEventListener(
        'input',
        debounce((e) => this.onChange(e), 300).bind(this)
      );

      /* NEU: Submit abfangen → Leistungs-Suche */
      this.input.form.addEventListener('submit', this.onSubmit.bind(this));
    }
  }

  /* ---------------- Standard-Dawn ---------------- */
  toggleResetButton() {
    const hidden = this.resetButton.classList.contains('hidden');
    if (this.input.value.length > 0 && hidden) {
      this.resetButton.classList.remove('hidden');
    } else if (this.input.value.length === 0 && !hidden) {
      this.resetButton.classList.add('hidden');
    }
  }

  onChange() { this.toggleResetButton(); }

  shouldResetForm() {
    return !document.querySelector('[aria-selected="true"] a');
  }

  onFormReset(event) {
    event.preventDefault();
    if (this.shouldResetForm()) {
      this.input.value = '';
      this.input.focus();
      this.toggleResetButton();
    }
  }

  /* ---------------- NEU: Leistungs-Suche ---------------- */
  onSubmit(event) {
    const query = this.input.value.trim();
    if (!query) return;                                // leer → Standard-Suche

    const jsonTag = document.getElementById('services-json');
    if (!jsonTag) return;                              // Section nicht im DOM

    let services = [];
    try   { services = JSON.parse(jsonTag.textContent); }
    catch { return; }

    const match = services.find(
      (s) => s.title.toLowerCase() === query.toLowerCase()
    );
    if (!match) return;                                // kein Treffer → Standard

    /* Treffer: Formular-Submit stoppen */
    event.preventDefault();

    const pagePath = '/pages/unsere-leistungen';        // ggf. anpassen
    if (window.location.pathname.startsWith(pagePath)) {
      document.getElementById(match.anchor)
              ?.scrollIntoView({ behavior:'smooth', block:'start' });
    } else {
      window.location.href = `${pagePath}#${match.anchor}`;
    }
  }
}

/* Dawn-Custom-Element */
customElements.define('search-form', SearchForm);
