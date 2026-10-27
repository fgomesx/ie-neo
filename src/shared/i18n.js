'use strict';

/**
 * Núcleo de internacionalização do IE Neo.
 *
 * Funciona no processo principal (CommonJS) e nos renderers (script clássico).
 * As mensagens usam o texto em português como chave; o catálogo en-US fornece
 * a tradução. Em pt-BR o próprio texto de origem é devolvido.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.IEI18n = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const SUPPORTED = ['en-US', 'pt-BR'];
  const DEFAULT_LOCALE = 'en-US';
  const LOCALE_LABELS = {
    'en-US': 'English (United States)',
    'pt-BR': 'Português (Brasil)',
  };

  const catalogs = { 'en-US': Object.create(null) };
  let locale = DEFAULT_LOCALE;

  function normalize(value) {
    const raw = String(value || '').trim();
    if (/^pt(-br)?$/i.test(raw)) return 'pt-BR';
    if (/^en(-us)?$/i.test(raw)) return 'en-US';
    return DEFAULT_LOCALE;
  }

  function register(messages) {
    if (!messages || typeof messages !== 'object') return;
    Object.assign(catalogs['en-US'], messages);
  }

  function format(template, vars) {
    if (!vars) return template;
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
    );
  }

  function t(source, vars) {
    const text = locale === 'pt-BR' ? source : catalogs['en-US'][source] || source;
    return format(text, vars);
  }

  function setLocale(value) {
    locale = normalize(value);
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = locale;
    }
    return locale;
  }

  function getLocale() {
    return locale;
  }

  function formatDate(value, options) {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString(locale, options);
  }

  function formatDateTime(value, options) {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString(locale, options);
  }

  function formatNumber(value, options) {
    return Number(value).toLocaleString(locale, options);
  }

  const ATTRIBUTES = [
    { attr: 'title', marker: 'data-i18n-title', key: 'i18nTitleSource' },
    { attr: 'aria-label', marker: 'data-i18n-aria-label', key: 'i18nAriaLabelSource' },
    { attr: 'placeholder', marker: 'data-i18n-placeholder', key: 'i18nPlaceholderSource' },
  ];

  /**
   * Traduz a marcação estática. Elementos com data-i18n têm o texto inteiro
   * traduzido; os marcadores de atributo guardam o valor original no dataset.
   */
  function localize(scope) {
    const node = scope || (typeof document !== 'undefined' ? document : null);
    if (!node || typeof node.querySelectorAll !== 'function') return;

    node.querySelectorAll('[data-i18n]').forEach((el) => {
      if (!('i18nSource' in el.dataset)) {
        // A marcação costuma vir quebrada em várias linhas; o catálogo usa
        // sempre a versão normalizada, com espaços simples.
        el.dataset.i18nSource = el.textContent.replace(/\s+/g, ' ').trim();
      }
      el.textContent = t(el.dataset.i18nSource);
    });

    ATTRIBUTES.forEach(({ attr, marker, key }) => {
      node.querySelectorAll(`[${marker}]`).forEach((el) => {
        if (!(key in el.dataset)) el.dataset[key] = el.getAttribute(attr) || '';
        const value = t(el.dataset[key]);
        if (value) el.setAttribute(attr, value);
      });
    });
  }

  function detectLocale() {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    const exposed = window.ie?.locale || window.ieOptions?.locale;
    return normalize(exposed || window.__IE_LOCALE);
  }

  if (typeof document !== 'undefined') {
    setLocale(detectLocale());
    // Atalho global para os scripts clássicos dos renderers. O processo
    // principal continua usando o módulo (não polui o global do Node).
    root.t = t;
    const apply = () => localize(document);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply, { once: true });
    } else {
      apply();
    }
  }

  return {
    SUPPORTED,
    LOCALE_LABELS,
    DEFAULT_LOCALE,
    normalize,
    register,
    t,
    setLocale,
    getLocale,
    localize,
    formatDate,
    formatDateTime,
    formatNumber,
  };
});
