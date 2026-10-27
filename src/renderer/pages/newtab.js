'use strict';

(function () {
  const PALETTE = ['#2b7cb8', '#0f7b6c', '#7a5bb5', '#b25d1f', '#2e8b57', '#9c3b6e', '#4a6fa5', '#8a6d1f'];
  const FALLBACK_LINKS = [
    { title: 'DuckDuckGo', url: 'https://duckduckgo.com' },
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'Reddit', url: 'https://www.reddit.com' },
    { title: 'Wikipédia', url: 'https://pt.wikipedia.org' },
    { title: 'Outlook', url: 'https://outlook.live.com' },
  ];
  const FALLBACK_SEARCH = 'https://duckduckgo.com/?q={searchTerms}';

  function applyTheme(value) {
    const theme = value === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }

  let data = {
    favorites: FALLBACK_LINKS,
    topSites: [],
    searchUrl: FALLBACK_SEARCH,
    user: '',
    theme: 'light',
    themeMode: 'system',
  };

  let themeMode = 'system';

  const paletteFor = (seed) => {
    let hash = 0;
    const text = String(seed || '');
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return PALETTE[hash % PALETTE.length];
  };

  const hostOf = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return t('Bom dia');
    if (hour < 18) return t('Boa tarde');
    return t('Boa noite');
  }

  function paintGreeting() {
    const name = data.user && data.user !== 'usuário' ? `, ${data.user}` : '';
    document.getElementById('nt-greeting').textContent = `${greeting()}${name}`;
    const now = new Date();
    const formatted = window.IEI18n.formatDate(now, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    document.getElementById('nt-date').textContent = formatted;
  }

  function makeTile(item) {
    const anchor = document.createElement('a');
    anchor.className = 'nt-tile';
    anchor.href = item.url;
    anchor.title = `${item.title} — ${item.url}`;

    const icon = document.createElement('span');
    icon.className = 'nt-tile-icon';
    icon.style.background = paletteFor(item.url);
    icon.textContent = (item.title || hostOf(item.url) || '?').trim().charAt(0).toUpperCase();

    const label = document.createElement('span');
    label.className = 'nt-tile-label';
    label.textContent = item.title || hostOf(item.url);

    anchor.appendChild(icon);
    anchor.appendChild(label);
    return anchor;
  }

  function paintTiles() {
    const host = document.getElementById('nt-tiles');
    host.innerHTML = '';
    const favorites = (data.favorites || []).slice(0, 9);
    for (const favorite of favorites) host.appendChild(makeTile(favorite));

    const add = document.createElement('a');
    add.className = 'nt-tile add';
    add.href = 'ie://favorites';
    add.title = t('Gerenciar favoritos');
    const addIcon = document.createElement('span');
    addIcon.className = 'nt-tile-icon';
    addIcon.textContent = '+';
    const addLabel = document.createElement('span');
    addLabel.className = 'nt-tile-label';
    addLabel.textContent = t('Adicionar');
    add.appendChild(addIcon);
    add.appendChild(addLabel);
    host.appendChild(add);
  }

  function paintResume() {
    const section = document.getElementById('nt-resume-section');
    const host = document.getElementById('nt-resume');
    const sites = (data.topSites || []).slice(0, 6);
    host.innerHTML = '';
    if (!sites.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    for (const site of sites) {
      const card = document.createElement('a');
      card.className = 'nt-resume-card';
      card.href = site.url;
      card.title = site.url;

      const icon = document.createElement('span');
      icon.className = 'nt-resume-icon';
      icon.style.background = paletteFor(site.url);
      icon.textContent = (site.title || site.host || '?').trim().charAt(0).toUpperCase();

      const meta = document.createElement('div');
      meta.className = 'nt-resume-meta';
      const strong = document.createElement('strong');
      strong.textContent = site.title || site.host;
      const span = document.createElement('span');
      span.textContent = site.host || hostOf(site.url);
      meta.appendChild(strong);
      meta.appendChild(span);

      card.appendChild(icon);
      card.appendChild(meta);
      host.appendChild(card);
    }
  }

  function bindSearch() {
    const form = document.getElementById('nt-search');
    const input = document.getElementById('nt-query');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = input.value.trim();
      if (!query) {
        input.focus();
        return;
      }
      const template = data.searchUrl || FALLBACK_SEARCH;
      const url = template.includes('{searchTerms}')
        ? template.replace(/\{searchTerms\}/g, encodeURIComponent(query))
        : `${template}${encodeURIComponent(query)}`;
      window.location.href = url;
    });
    setTimeout(() => {
      try {
        input.focus();
      } catch {}
    }, 120);
  }

  function bindWelcome() {
    const close = document.getElementById('nt-welcome-close');
    close?.addEventListener('click', () => {
      document.getElementById('nt-welcome').hidden = true;
    });
  }

  function paintWelcome() {
    const banner = document.getElementById('nt-welcome');
    const link = document.getElementById('nt-welcome-project');
    if (link && data.projectUrl) link.href = data.projectUrl;
    banner.hidden = !data.welcome;
  }

  function paintAbout() {
    const version = document.getElementById('nt-about-version');
    if (version) version.textContent = data.version ? `v${data.version}` : '';
  }

  function themeModeLabel() {
    if (themeMode === 'dark') return t('Escuro');
    if (themeMode === 'light') return t('Claro');
    return t('Automático');
  }

  function paintThemeCard() {
    const label = document.getElementById('nt-theme-label');
    const card = document.getElementById('nt-theme-card');
    const mode = themeModeLabel();
    if (label) label.textContent = `${mode} · ${t('Clique para alternar')}`;
    if (card) card.title = `${t('Alternar tema')}: ${mode}`;
  }

  function bindThemeCard() {
    const card = document.getElementById('nt-theme-card');
    if (!card) return;
    card.addEventListener('click', () => {
      // A nova guia não tem preload/IPC: esta rota interna é interceptada pelo
      // processo principal, que alterna Claro → Escuro → Automático.
      window.location.href = 'ie://theme/next';
    });
  }

  /**
   * Atualiza o cartão de tema depois de uma troca feita pelo processo principal.
   * Chamado via executeJavaScript pelo chrome.
   */
  window.IE_newtabTheme = function (mode, resolved) {
    if (mode) themeMode = mode;
    if (resolved === 'dark' || resolved === 'light') applyTheme(resolved);
    paintThemeCard();
  };

  async function load() {
    paintGreeting();
    bindSearch();
    bindWelcome();
    bindThemeCard();
    try {
      const response = await fetch('data.json', { cache: 'no-store' });
      if (response.ok) {
        const payload = await response.json();
        data = { ...data, ...payload };
        themeMode = data.themeMode || 'system';
        applyTheme(data.theme);
      }
    } catch {}
    // O idioma vem do data.json; localize() reaplica os textos estáticos antes
    // de repintar o conteúdo dinâmico.
    window.IEI18n.setLocale(data.language || window.__IE_LOCALE__);
    window.IEI18n.localize(document);
    paintGreeting();
    paintWelcome();
    paintAbout();
    paintThemeCard();
    paintTiles();
    paintResume();
    applyTheme(data.theme);
    document.title = t('Nova guia');
  }

  /**
   * Reaplica o idioma na página aberta sem recarregá-la. Chamado pelo chrome
   * quando as Opções trocam o idioma.
   */
  window.IE_newtabRefresh = function refresh(locale) {
    if (locale) window.IEI18n.setLocale(locale);
    window.IEI18n.localize(document);
    paintGreeting();
    paintAbout();
    paintThemeCard();
    paintTiles();
    paintResume();
    document.title = t('Nova guia');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
