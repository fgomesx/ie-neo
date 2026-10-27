'use strict';

/* ============================================================
   Opções da Internet — utilitários compartilhados do painel
   ============================================================ */

(function () {
  const UI = {};

  UI.esc = function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        default:
          return '&#39;';
      }
    });
  };

  UI.icon = function icon(name, className = '') {
    return `<svg${className ? ` class="${className}"` : ''} aria-hidden="true"><use href="#${name}" /></svg>`;
  };

  /** Reduz uma URL ou endereço digitado ao host usado nas listas de sites. */
  UI.normalizeHost = function normalizeHost(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '');
  };

  // Getter para que o selo acompanhe a troca de idioma sem recarregar a janela.
  Object.defineProperty(UI, 'badge', {
    get() {
      return `<i class="restart-badge">${t('reiniciar')}</i>`;
    },
  });

  UI.card = function card(title, body, subtitle = '') {
    const head = title
      ? `<header><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ''}</header>`
      : '';
    return `<section class="opt-card">${head}<div class="opt-card-body">${body}</div></section>`;
  };

  UI.field = function field(label, control, hint = '') {
    return `<div class="opt-field"><label>${label}</label>${control}${
      hint ? `<small>${hint}</small>` : ''
    }</div>`;
  };

  UI.input = function input(path, options = {}) {
    const type = options.type || 'text';
    const attrs = [
      `class="opt-input${options.grow ? ' grow' : ''}"`,
      `type="${type}"`,
      `data-path="${path}"`,
    ];
    if (options.placeholder) attrs.push(`placeholder="${UI.esc(options.placeholder)}"`);
    if (options.min != null) attrs.push(`min="${options.min}"`);
    if (options.max != null) attrs.push(`max="${options.max}"`);
    if (options.step != null) attrs.push(`step="${options.step}"`);
    if (options.id) attrs.push(`id="${options.id}"`);
    if (options.spellcheck === false) attrs.push('spellcheck="false"');
    return `<input ${attrs.join(' ')} />`;
  };

  UI.select = function select(path, options, settings = {}) {
    const attrs = [`class="opt-select"`, `data-path="${path}"`];
    if (settings.id) attrs.push(`id="${settings.id}"`);
    if (settings.wide) attrs.push('style="width:100%"');
    const items = options
      .map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        return `<option value="${UI.esc(value)}">${UI.esc(label)}</option>`;
      })
      .join('');
    return `<select ${attrs.join(' ')}>${items}</select>`;
  };

  UI.check = function check(path, label, description = '', options = {}) {
    return `<label class="opt-check"><input type="checkbox" data-path="${path}"${
      options.disabled ? ' disabled' : ''
    } /><span>${label}${options.restart ? UI.badge : ''}${
      description ? `<small>${description}</small>` : ''
    }</span></label>`;
  };

  UI.radio = function radio(path, value, label, description = '', name = path) {
    return `<label class="opt-radio-row"><input type="radio" name="${name}" data-radio="${path}" data-value="${UI.esc(
      value
    )}" /><span><strong>${label}</strong>${
      description ? `<small>${description}</small>` : ''
    }</span></label>`;
  };

  UI.notice = function notice(text, kind = '', icon = 'i-info') {
    return `<div class="opt-notice${kind ? ` ${kind}` : ''}">${UI.icon(icon)}<div>${text}</div></div>`;
  };

  UI.inlineLinks = function inlineLinks(links) {
    return `<div class="opt-inline-links">${links
      .map(
        (link) =>
          `<button class="opt-text-link${link.danger ? ' danger' : ''}"${
            link.id ? ` id="${link.id}"` : ''
          } data-link="${link.action || ''}">${link.label}</button>`
      )
      .join('')}</div>`;
  };

  UI.winState = function winState(rows) {
    return `<div class="win-state">${rows
      .map(
        ([label, value]) =>
          `<b>${UI.esc(label)}</b><span>${UI.esc(value || t('(vazio)'))}</span>`
      )
      .join('')}</div>`;
  };

  UI.count = function count(value) {
    return `<span class="opt-count">${value}</span>`;
  };

  UI.zoneIcon = function zoneIcon(zoneId) {
    const icons = {
      internet: 'i-globe',
      intranet: 'i-monitor',
      trusted: 'i-shield-check',
      restricted: 'i-shield',
    };
    return icons[zoneId] || 'i-globe';
  };

  UI.levelName = function levelName(level) {
    const names = {
      low: 'Baixo',
      'medium-low': 'Médio baixo',
      medium: 'Médio',
      'medium-high': 'Médio alto',
      high: 'Alto',
    };
    // Traduz no momento da chamada para acompanhar a troca de idioma.
    return names[level] ? t(names[level]) : String(level || '').replace(/-/g, ' ');
  };

  UI.zoneTile = function zoneTile(zone, active) {
    const mode = zone.protectedMode ? t('Modo Protegido') : t('sem Modo Protegido');
    return `<button class="zone-tile${active ? ' active' : ''}" data-zone="${zone.id}">
      <span class="zone-tile-icon ${zone.id}">${UI.icon(UI.zoneIcon(zone.id))}</span>
      <span class="zone-tile-body"><strong>${UI.esc(t(zone.label))}</strong><span>${t('Nível')} ${UI.esc(
        UI.levelName(zone.level).toLowerCase()
      )} · ${UI.esc(mode)}</span></span>
    </button>`;
  };

  window.IEOptUI = UI;
  window.IEOptionPanes = window.IEOptionPanes || {};
})();
