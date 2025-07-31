class SearchForm extends HTMLElement {
  constructor() {
    super();

    /* ---------- Standard-Suche  ---------- */
    this.input       = this.querySelector('input[type="search"]');
    this.resetButton = this.querySelector('button[type="reset"]');

    if (this.input) {
      // Ereignisse für Reset-Button & Tippen
      this.input.form.addEventListener('reset', this.onFormReset.bind(this));
      this.input.addEventListener(
        'input',
        debounce((event) => this.onChange(event), 300).bind(this)
      );

      /* ---------- NEU: Leistungs-Suche ---------- */
      this.input.form.addEventListener('submit', this.onSubmit.bind(this));
    }
  }

  /* ----- sicht-/unsichtbar schalten des Reset-Buttons ----- */
  toggleResetButton() {
    const hidden = this.resetButton.classList.contains('hidden');
    if (this.input.value.length > 0 && hidden) {
      this.resetButton.classList.remove('hidden');
    } else if (this.input.value.length === 0 && !hidden) {
      this.resetButton.classList.add('hidden');
    }
  }

  onChange() {
    this.toggleResetButton();
  }

  /* ----- Standard-Verhalten für „Alle löschen“ ----- */
  shouldResetForm() {
    return !document.querySelector('[aria-selected="true"] a');
  }

  onFormReset(event) {
    // verhindert, dass Shopify den zuletzt gesuchten Begriff wiedereinsetzt
    event.preventDefault();
    if (this.shouldResetForm()) {
      this.input.value = '';
      this.input.focus();
      this.toggleResetButton();
    }
  }

  /* ==========================================================
     NEU: Prüfen, ob der Suchbegriff eine Leistung ist
     ========================================================== */
  onSubmit(event) {
    const query = this.input.value.trim();
    if (!query) return;                    // leer ⇒ normale Suche

    /* 1) JSON-Liste aller Leistungen holen (kommt aus der Services-Section) */
    const jsonTag = document.getElementById('services-json');
    if (!jsonTag) return;                  // Section noch nicht gerendert

    let services = [];
    try {
      services = JSON.parse(jsonTag.textContent);
    } catch (e) {
      return;                              // JSON ungültig ⇒ normale Suche
    }

    /* 2) Match finden (Groß-/Kleinschreibung egal) */
    const match = services.find(
      (s) => s.title.toLowerCase() === query.toLowerCase()
    );
    if (!match) return;                    // kein Treffer ⇒ normale Suche

    /* 3) Treffer ist eine Leistung → Standard-Suche stoppen */
    event.preventDefault();

    /* 4) Entweder scrollen (wenn wir schon auf der Seite sind)
          oder mit Hash-Anchor weiterleiten                             */
    const pagePath = '/pages/unsere-leistungen';   // ggf. anpassen
    if (window.location.pathname.startsWith(pagePath)) {
      // bereits auf der Seite
      document
        .getElementById(match.anchor)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // andere Seite → Redirect inkl. Hash
      window.location.href = `${pagePath}#${match.anchor}`;
    }
  }
}

customElements.define('search-form', SearchForm);

