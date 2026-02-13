/**
 * Trockeneis Product – Interaktive Produktseite
 * Pelletgröße, Menge, Preisberechnung, Versandoptionen
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var roots = document.querySelectorAll('[data-trockeneis-section]');
    roots.forEach(initSection);
  });

  function initSection(root) {
    /* ── DOM refs ──────────────────────────────────── */
    var sizeInputs    = root.querySelectorAll('[name="te-size"]');
    var qtyInputs     = root.querySelectorAll('[name="te-qty"]');
    var priceEl       = root.querySelector('[data-te-price]');
    var unitPriceEl   = root.querySelector('[data-te-unit-price]');
    var anfragHint    = root.querySelector('[data-te-anfrage-hint]');
    var addBtn        = root.querySelector('[data-te-add-btn]');
    var shipMethods   = root.querySelectorAll('[data-ship-method]');
    var carriers      = root.querySelectorAll('[data-carrier]');
    var carriersWrap  = root.querySelector('[data-te-carriers]');
    var summaryEl     = root.querySelector('[data-te-summary]');
    var variantInput  = root.querySelector('[data-te-variant-id]');

    /* ── Price data from section settings (embedded as data attrs) ── */
    var priceMap = {};
    try {
      priceMap = JSON.parse(root.getAttribute('data-price-map') || '{}');
    } catch (e) { /* fallback: empty */ }

    /* ── State ────────────────────────────────────── */
    var state = {
      size: '3mm',
      qty: 5,
      isAnfrage: false,
      shipMethod: '',      // 'pickup' or 'express'
      carrier: '',         // 'dhl', 'dpd', 'go'
      productPrice: 0,
      shippingPrice: 0
    };

    /* ── Init default selection ───────────────────── */
    if (sizeInputs.length) {
      var checkedSize = root.querySelector('[name="te-size"]:checked');
      if (checkedSize) state.size = checkedSize.value;
    }
    if (qtyInputs.length) {
      var checkedQty = root.querySelector('[name="te-qty"]:checked');
      if (checkedQty) {
        if (checkedQty.value === 'anfrage') {
          state.isAnfrage = true;
        } else {
          state.qty = parseInt(checkedQty.value, 10);
        }
      }
    }

    /* ── Event handlers ───────────────────────────── */
    sizeInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        state.size = input.value;
        updatePrice();
        updateVariant();
      });
    });

    qtyInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        if (input.value === 'anfrage') {
          state.isAnfrage = true;
          state.qty = 0;
        } else {
          state.isAnfrage = false;
          state.qty = parseInt(input.value, 10);
        }
        updatePrice();
        updateVariant();
      });
    });

    /* Shipping method selection */
    shipMethods.forEach(function (method) {
      var header = method.querySelector('.te-ship-method__header');
      if (!header) return;
      header.addEventListener('click', function () {
        var type = method.getAttribute('data-ship-method');
        state.shipMethod = type;

        /* Toggle selected state */
        shipMethods.forEach(function (m) { m.classList.remove('is-selected'); });
        method.classList.add('is-selected');

        /* Show/hide carrier panel */
        if (carriersWrap) {
          if (type === 'express') {
            carriersWrap.classList.add('is-open');
          } else {
            carriersWrap.classList.remove('is-open');
            state.carrier = '';
            carriers.forEach(function (c) { c.classList.remove('is-selected'); });
          }
        }

        updateSummary();
      });
    });

    /* Carrier selection + accordion */
    carriers.forEach(function (carrier) {
      var header = carrier.querySelector('.te-carrier__header');
      if (!header) return;

      header.addEventListener('click', function () {
        var id = carrier.getAttribute('data-carrier');

        /* If already selected, toggle expand */
        if (state.carrier === id) {
          carrier.classList.toggle('is-expanded');
          return;
        }

        /* Select this carrier */
        state.carrier = id;
        carriers.forEach(function (c) {
          c.classList.remove('is-selected', 'is-expanded');
        });
        carrier.classList.add('is-selected', 'is-expanded');

        /* Parse shipping price */
        var priceStr = carrier.getAttribute('data-carrier-price') || '0';
        state.shippingPrice = parseFloat(priceStr.replace(',', '.')) || 0;

        updateSummary();
      });
    });

    /* ── Update functions ─────────────────────────── */
    function updatePrice() {
      if (state.isAnfrage) {
        if (priceEl) priceEl.textContent = 'Auf Anfrage';
        if (unitPriceEl) unitPriceEl.textContent = '';
        if (anfragHint) anfragHint.classList.add('is-visible');
        if (addBtn) addBtn.disabled = true;
        updateSummary();
        return;
      }

      if (anfragHint) anfragHint.classList.remove('is-visible');
      if (addBtn) addBtn.disabled = false;

      var key = state.size + '_' + state.qty;
      var unitPrice = priceMap[key] || 0;

      /* If no specific key in map, try per-kg price */
      if (!unitPrice) {
        var perKgKey = state.size + '_per_kg';
        var perKg = priceMap[perKgKey] || 0;
        unitPrice = perKg * state.qty;
      }

      state.productPrice = unitPrice;

      if (priceEl) {
        priceEl.textContent = formatCurrency(unitPrice);
      }
      if (unitPriceEl && state.qty > 0) {
        var perKgPrice = unitPrice / state.qty;
        unitPriceEl.textContent = formatCurrency(perKgPrice) + ' / kg';
      }

      updateSummary();
    }

    function updateVariant() {
      /* Update hidden variant input if variant IDs are mapped */
      if (!variantInput) return;
      var variantMap = {};
      try {
        variantMap = JSON.parse(root.getAttribute('data-variant-map') || '{}');
      } catch (e) { /* fallback */ }

      var variantKey = state.size;
      if (variantMap[variantKey]) {
        variantInput.value = variantMap[variantKey];
      }
    }

    function updateSummary() {
      if (!summaryEl) return;

      if (state.isAnfrage || !state.shipMethod) {
        summaryEl.classList.remove('is-visible');
        return;
      }

      summaryEl.classList.add('is-visible');

      var productLine = summaryEl.querySelector('[data-summary-product]');
      var shippingLine = summaryEl.querySelector('[data-summary-shipping]');
      var totalLine = summaryEl.querySelector('[data-summary-total]');

      if (productLine) {
        productLine.querySelector('.te-summary__label').textContent =
          state.size + ' Pellets, ' + state.qty + ' kg';
        productLine.querySelector('.te-summary__value').textContent =
          formatCurrency(state.productPrice);
      }

      var shipCost = 0;
      if (state.shipMethod === 'pickup') {
        shipCost = 0;
        if (shippingLine) {
          shippingLine.querySelector('.te-summary__label').textContent = 'Selbstabholung';
          shippingLine.querySelector('.te-summary__value').textContent = 'Kostenlos';
        }
      } else if (state.shipMethod === 'express' && state.carrier) {
        shipCost = state.shippingPrice;
        if (shippingLine) {
          shippingLine.querySelector('.te-summary__label').textContent =
            'Expresslieferung (' + state.carrier.toUpperCase() + ')';
          shippingLine.querySelector('.te-summary__value').textContent =
            formatCurrency(shipCost);
        }
      }

      if (totalLine) {
        totalLine.querySelector('.te-summary__value').textContent =
          formatCurrency(state.productPrice + shipCost);
      }
    }

    function formatCurrency(val) {
      return val.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR'
      });
    }

    /* ── Initial render ───────────────────────────── */
    updatePrice();
    updateVariant();
  }
})();
