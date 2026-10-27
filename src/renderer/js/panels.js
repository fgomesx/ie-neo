'use strict';

/* ============================================================
   IE Neo — painéis, menus e diálogos
   ============================================================ */

/* Metadados resolvidos na hora do uso para acompanhar a troca de idioma. */
const HUB_META = {
  history: {
    get heading() { return t('Histórico'); },
    get subtitle() { return t('Revise, pesquise e gerencie sua navegação recente.'); },
    icon: 'i-history',
    get placeholder() { return t('Pesquisar no histórico'); },
    get primary() { return t('Limpar tudo'); },
  },
  favorites: {
    get heading() { return t('Favoritos'); },
    get subtitle() { return t('Seus sites preferidos, sempre a um clique.'); },
    icon: 'i-star-fill',
    get placeholder() { return t('Pesquisar nos favoritos'); },
    get primary() { return t('Adicionar favorito'); },
  },
  downloads: {
    get heading() { return t('Downloads'); },
    get subtitle() { return t('Acompanhe e gerencie os arquivos baixados.'); },
    icon: 'i-download',
    get placeholder() { return t('Pesquisar downloads'); },
    get primary() { return t('Abrir pasta'); },
  },
};

/* ------------------------------------------------------------------ */
/* Infobar, toasts e modais                                            */
/* ------------------------------------------------------------------ */

function showInfoBar({ text, icon = 'i-info', actions = [] }) {
  if (state.config?.advanced?.showInfoBar === false) return;
  els.infobar.hidden = false;
  els.infobarIcon.setAttribute('href', `#${icon}`);
  els.infobarText.textContent = text;
  els.infobarActions.innerHTML = '';
  for (const action of actions) {
    const button = document.createElement('button');
    button.className = 'infobar-action';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick);
    els.infobarActions.appendChild(button);
  }
}

function toast({ title, body = '', kind = 'info' } = {}) {
  if (!title) return;
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.innerHTML = `<strong>${escapeHtml(title)}</strong>${body ? `<span>${escapeHtml(body)}</span>` : ''}`;
  els.toastStack.appendChild(node);
  while (els.toastStack.children.length > 4) els.toastStack.firstElementChild.remove();
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity .25s ease';
    setTimeout(() => node.remove(), 260);
  }, 5200);
}

function openModal(html, { persistent = false, rerender = null } = {}) {
  els.modalRoot.hidden = false;
  els.modalRoot.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  state.modal = { persistent, rerender };
  const firstInput = els.modalRoot.querySelector('input:not([type="checkbox"]), select, button.primary');
  if (firstInput) setTimeout(() => firstInput.focus(), 40);
}

function closeModal() {
  els.modalRoot.hidden = true;
  els.modalRoot.innerHTML = '';
  state.modal = null;
  if (!state.activePermission) setTimeout(showNextPermission, 140);
}

/** Redesenha o modal aberto para aplicar o novo idioma. */
function refreshOpenModal() {
  const rerender = state.modal?.rerender;
  if (typeof rerender === 'function') rerender();
}

function showAboutModal() {
  const meta = state.meta || {};
  const ua = uaForTab(activeTab() || { compat: false, private: false });
  openModal(`
    <div class="about-hero">
      <span class="brand-logo"><img src="assets/icon.png" alt="" /></span>
      <div>
        <h2>IE Neo</h2>
        <p>${escapeHtml(t('O clássico, reconstruído para os dias de hoje.'))}</p>
      </div>
    </div>
    <div class="about-grid">
      <b>${escapeHtml(t('Versão'))}</b><span>${escapeHtml(meta.version || '1.0.0')} (Trident/Next · Chromium)</span>
      <b>${escapeHtml(t('Desenvolvedor'))}</b><span><a class="about-link" href="${escapeAttr(meta.authorUrl || 'https://github.com/fgomesx')}" target="_blank" rel="noreferrer">${escapeHtml(meta.author || 'FGOMESX')}</a></span>
      <b>${escapeHtml(t('Página do projeto'))}</b><span><a class="about-link" href="${escapeAttr(meta.projectUrl || 'https://github.com/fgomesx/ie-neo')}" target="_blank" rel="noreferrer">github.com/fgomesx/ie-neo</a></span>
      <b>${escapeHtml(t('Mecanismo'))}</b><span>Chromium ${escapeHtml(meta.chromium || '')} · Electron ${escapeHtml(meta.electron || '')}</span>
      <b>${escapeHtml(t('Identificação'))}</b><span>${escapeHtml((ua || '').slice(0, 110))}${(ua || '').length > 110 ? '…' : ''}</span>
      <b>${escapeHtml(t('Navegador padrão'))}</b><span>${escapeHtml(meta.isDefaultBrowser ? t('Sim') : t('Não — configure em Opções da Internet › Programas'))}</span>
      <b>${escapeHtml(t('Preferências'))}</b><span>${escapeHtml(meta.configFile || '')}</span>
      <b>${escapeHtml(t('Zona atual'))}</b><span>${escapeHtml(classifyUrl(activeTab()?.url || '').label)}</span>
    </div>
    <div class="about-note">
      ${escapeHtml(t('Projeto conceitual e educacional. Não é afiliado, patrocinado ou endossado pela Microsoft Corporation. “Internet Explorer”, “Windows” e marcas relacionadas pertencem aos seus respectivos proprietários. Este navegador usa o Chromium de código aberto e não inclui o antigo mecanismo Trident.'))}
    </div>
    <div class="modal-footer">
      <button class="btn" data-about="options">${escapeHtml(t('Opções da Internet'))}</button>
      <button class="btn primary" data-about="close">${escapeHtml(t('Fechar'))}</button>
    </div>
  `, { rerender: () => showAboutModal() });
  els.modalRoot.querySelector('[data-about="options"]').addEventListener('click', () => {
    closeModal();
    window.ie.openOptions('general');
  });
  els.modalRoot.querySelector('[data-about="close"]').addEventListener('click', closeModal);
}

function showAddFavoriteModal(tab) {
  if (!tab) return;
  openModal(`
    <div class="modal-header">
      <div class="modal-icon"><svg><use href="#i-star" /></svg></div>
      <div>
        <h2>${escapeHtml(t('Adicionar aos favoritos'))}</h2>
        <p>${escapeHtml(t('Guarde esta página na Barra de Favoritos para acessá-la rapidamente.'))}</p>
      </div>
    </div>
    <div class="modal-body">
      <div class="field">
        <label for="fav-title">${escapeHtml(t('Nome'))}</label>
        <input id="fav-title" type="text" value="${escapeAttr(tab.title || hostOf(tab.url))}" maxlength="120" />
      </div>
      <div class="field">
        <label for="fav-folder">${escapeHtml(t('Pasta'))}</label>
        <input id="fav-folder" type="text" list="fav-folders" value="Barra de Favoritos" maxlength="60" />
        <datalist id="fav-folders">
          <option value="Barra de Favoritos"></option>
          <option value="Outros favoritos"></option>
        </datalist>
      </div>
      <div class="perm-origin"><svg><use href="#i-page" /></svg><span>${escapeHtml(tab.url)}</span></div>
    </div>
    <div class="modal-footer">
      <button class="btn" data-fav="cancel">${escapeHtml(t('Cancelar'))}</button>
      <button class="btn primary" data-fav="save">${escapeHtml(t('Adicionar'))}</button>
    </div>
  `, { rerender: () => showAddFavoriteModal(tab) });
  els.modalRoot.querySelector('[data-fav="cancel"]').addEventListener('click', closeModal);
  const save = async () => {
    const title = els.modalRoot.querySelector('#fav-title').value.trim() || tab.title || hostOf(tab.url);
    const folder = els.modalRoot.querySelector('#fav-folder').value.trim() || 'Barra de Favoritos';
    closeModal();
    await window.ie.favorites.add({ title, url: tab.url, folder });
    toast({ title: t('Adicionado aos favoritos'), body: title, kind: 'success' });
  };
  els.modalRoot.querySelector('[data-fav="save"]').addEventListener('click', save);
  els.modalRoot.querySelector('#fav-title').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') save();
  });
}

function permissionText(request) {
  if (request.permission === 'media') {
    const types = request.mediaTypes || [];
    if (types.includes('video') && types.includes('audio')) return t('usar sua câmera e seu microfone');
    if (types.includes('video')) return t('usar sua câmera');
    return t('usar seu microfone');
  }
  return PERMISSION_LABEL[request.permission] || t('usar {permission}', { permission: request.permission });
}

function showNextPermission() {
  if (state.activePermission || state.modal) return;
  const request = state.permissionQueue.shift();
  if (!request) return;
  state.activePermission = request;
  renderPermissionModal(request);
}

function renderPermissionModal(request) {
  const zoneLabel = request.zone?.label ? t('Zona {zone}', { zone: t(request.zone.label) }) : t('Zona Internet');
  openModal(`
    <div class="modal-header">
      <div class="modal-icon"><svg><use href="#i-shield-check" /></svg></div>
      <div>
        <h2>${escapeHtml(t('Permissão do site'))}</h2>
        <p><b>${escapeHtml(request.origin || hostOf(request.url))}</b> ${escapeHtml(t('deseja'))} ${escapeHtml(permissionText(request))}.</p>
      </div>
    </div>
    <div class="modal-body">
      <div class="perm-origin"><svg><use href="#i-globe" /></svg><span>${escapeHtml(request.url || '')}</span></div>
      <div class="site-pop-row"><span>${escapeHtml(t('Zona de segurança'))}</span><b>${escapeHtml(zoneLabel)} · ${escapeHtml(request.zone?.level || '')}</b></div>
      <div class="site-pop-row"><span>${escapeHtml(t('Modo Protegido'))}</span><b>${escapeHtml(t('Ativado'))}</b></div>
      <div class="check-row"><input type="checkbox" id="perm-remember" /><label for="perm-remember">${escapeHtml(t('Lembrar minha escolha para este tipo de permissão'))}</label></div>
      <p class="perm-note">${escapeHtml(t('Você pode alterar isso depois em Opções da Internet › Privacidade.'))}</p>
    </div>
    <div class="modal-footer">
      <button class="btn" data-perm="block">${escapeHtml(t('Bloquear'))}</button>
      <button class="btn primary" data-perm="allow">${escapeHtml(t('Permitir'))}</button>
    </div>
  `, { persistent: true, rerender: () => renderPermissionModal(request) });
  els.modalRoot.querySelector('[data-perm="block"]').addEventListener('click', () => respondPermission(false, els.modalRoot.querySelector('#perm-remember').checked));
  els.modalRoot.querySelector('[data-perm="allow"]').addEventListener('click', () => respondPermission(true, els.modalRoot.querySelector('#perm-remember').checked));
}

function respondPermission(allow, remember) {
  const request = state.activePermission;
  state.activePermission = null;
  if (request) {
    window.ie.respondPermission({ id: request.id, allow, remember }).catch(() => {});
  }
  closeModal();
  setTimeout(showNextPermission, 120);
}

/* ------------------------------------------------------------------ */
/* Menu principal                                                      */
/* ------------------------------------------------------------------ */

function menuItem(action, label, shortcut, icon, extra = '') {
  return `<button class="menu-item ${extra}" data-menu="${action}">
    <svg><use href="#${icon}" /></svg>
    <span>${escapeHtml(label)}</span>
    ${shortcut ? `<span class="shortcut">${escapeHtml(shortcut)}</span>` : ''}
  </button>`;
}

function toggleMenu() {
  if (!els.menuPopover.hidden) {
    closeAllPopovers();
    return;
  }
  closeAllPopovers();
  const meta = state.meta || {};
  els.menuPopover.innerHTML = `
    <div class="menu-head">
      <span class="brand-logo"><img src="assets/icon.png" alt="" /></span>
      <div>
        <strong>IE Neo</strong>
        <span>${escapeHtml(t('Versão {version} · Chromium {chromium}', { version: meta.version || '1.0.0', chromium: (meta.chromium || '').split('.')[0] }))}</span>
      </div>
    </div>
    ${menuItem('new-tab', t('Nova guia'), 'Ctrl+T', 'i-plus')}
    ${menuItem('private', t('Nova janela InPrivate'), 'Ctrl+Shift+P', 'i-inprivate')}
    <div class="menu-sep"></div>
    ${menuItem('favorites', t('Favoritos'), 'Ctrl+Shift+O', 'i-star')}
    ${menuItem('add-favorite', t('Adicionar aos favoritos'), 'Ctrl+D', 'i-star-fill')}
    ${menuItem('feeds', t('Feeds'), '', 'i-rss')}
    ${menuItem('history', t('Histórico'), 'Ctrl+H', 'i-history')}
    ${menuItem('downloads', t('Downloads'), 'Ctrl+J', 'i-download')}
    <div class="menu-sep"></div>
    ${menuItem('print', t('Imprimir'), 'Ctrl+P', 'i-print')}
    ${menuItem('find', t('Localizar na página'), 'Ctrl+F', 'i-search')}
    ${menuItem('zoom', t('Zoom'), '', 'i-zoom')}
    <div class="menu-sep"></div>
    ${menuItem('options', t('Opções da Internet'), '', 'i-gear', 'accent')}
    ${menuItem('about', t('Sobre o IE Neo'), 'F1', 'i-info')}
    <div class="menu-footer">
      <span>${escapeHtml(t('Modo Protegido: ativado'))}</span>
      <span>${escapeHtml(meta.chromium || '')}</span>
    </div>
  `;
  els.menuPopover.hidden = false;
}

function runMenuAction(action) {
  closeAllPopovers();
  switch (action) {
    case 'add-favorite':
      toggleFavorite();
      break;
    case 'zoom':
      toggleZoomPopover();
      break;
    case 'options':
      window.ie.openOptions('general');
      break;
    case 'about':
      showAboutModal();
      break;
    default:
      runAction(action);
  }
}

/* ------------------------------------------------------------------ */
/* Popover de zoom e informações do site                               */
/* ------------------------------------------------------------------ */

function toggleZoomPopover() {
  if (!els.zoomPopover.hidden) {
    closeAllPopovers();
    return;
  }
  closeAllPopovers();
  const zoom = Math.round((activeTab()?.zoom || 1) * 100);
  els.zoomPopover.innerHTML = `
    <div class="zoom-row">
      <div class="site-pop-row"><span>${escapeHtml(t('Zoom da página'))}</span><b id="zoom-readout">${zoom}%</b></div>
      <div class="zoom-slider">
        <span>−</span>
        <input type="range" id="zoom-range" min="25" max="300" step="5" value="${Math.min(300, Math.max(25, zoom))}" />
        <span>+</span>
      </div>
    </div>
    <div class="zoom-shortcuts">
      <button class="zoom-chip" data-zoom="0.5">50%</button>
      <button class="zoom-chip" data-zoom="0.75">75%</button>
      <button class="zoom-chip" data-zoom="1">100%</button>
      <button class="zoom-chip" data-zoom="1.25">125%</button>
      <button class="zoom-chip" data-zoom="1.5">150%</button>
      <button class="zoom-chip" data-zoom="reset">${escapeHtml(t('Redefinir'))}</button>
    </div>
  `;
  els.zoomPopover.hidden = false;
  const range = els.zoomPopover.querySelector('#zoom-range');
  const readout = els.zoomPopover.querySelector('#zoom-readout');
  range.addEventListener('input', () => {
    const value = Number(range.value) / 100;
    setZoom(value);
    readout.textContent = `${range.value}%`;
  });
  els.zoomPopover.querySelectorAll('[data-zoom]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.zoom;
      setZoom(value === 'reset' ? 1 : Number(value));
      readout.textContent = `${Math.round((value === 'reset' ? 1 : Number(value)) * 100)}%`;
      range.value = Math.round((value === 'reset' ? 1 : Number(value)) * 100);
    });
  });
}

async function toggleSitePopover() {
  if (!els.sitePopover.hidden) {
    closeAllPopovers();
    return;
  }
  closeAllPopovers();
  const tab = activeTab();
  if (!tab) return;
  els.sitePopover.hidden = false;
  els.sitePopover.innerHTML = `<div class="site-pop-head"><svg><use href="#i-globe" /></svg><div><strong>${escapeHtml(t('Informações do site'))}</strong><span>${escapeHtml(t('Carregando…'))}</span></div></div>`;
  let info;
  try {
    info = await window.ie.siteInfo(tab.error?.url || tab.url);
  } catch {
    info = null;
  }
  if (!info) {
    els.sitePopover.innerHTML = `<div class="site-pop-head"><svg><use href="#i-warning" /></svg><div><strong>${escapeHtml(t('Informações indisponíveis'))}</strong><span>${escapeHtml(t('Tente novamente.'))}</span></div></div>`;
    return;
  }
  const zone = info.zone;
  const secure = info.https;
  const icon = zone.id === 'restricted' ? 'i-shield-x' : secure ? 'i-lock' : 'i-warning';
  els.sitePopover.innerHTML = `
    <div class="site-pop-head">
      <svg style="color:${secure ? '#17663a' : '#a05a00'}"><use href="#${icon}" /></svg>
      <div>
        <strong>${escapeHtml(secure ? t('Conexão segura') : t('Conexão não segura'))}</strong>
        <span>${escapeHtml(hostOf(tab.error?.url || tab.url) || t('Página interna'))}</span>
      </div>
    </div>
    <div class="site-pop-row"><span>${escapeHtml(t('Zona de segurança'))}</span><b>${escapeHtml(t(zone.label))}</b></div>
    <div class="site-pop-row"><span>${escapeHtml(t('Nível da zona'))}</span><b>${escapeHtml(zone.level || '—')}</b></div>
    <div class="site-pop-row"><span>${escapeHtml(t('Modo Protegido'))}</span><b>${escapeHtml(zone.protectedMode ? t('Ativado') : t('Desativado'))}</b></div>
    <div class="site-pop-row"><span>${escapeHtml(t('Cookies armazenados'))}</span><b>${info.cookies}</b></div>
    <div class="site-pop-row"><span>${escapeHtml(t('Mecanismo'))}</span><b>${escapeHtml(info.compat ? t('Trident 7 (compatibilidade)') : 'Chromium')}</b></div>
    <div class="site-pop-actions">
      <button class="site-pop-btn" data-site="security">${escapeHtml(t('Segurança'))}</button>
      <button class="site-pop-btn" data-site="cookies">${escapeHtml(t('Cookies'))}</button>
      <button class="site-pop-btn" data-site="certs">${escapeHtml(t('Certificados'))}</button>
    </div>
  `;
  els.sitePopover.querySelector('[data-site="security"]').addEventListener('click', () => { closeAllPopovers(); window.ie.openOptions('security'); });
  els.sitePopover.querySelector('[data-site="cookies"]').addEventListener('click', () => { closeAllPopovers(); window.ie.openOptions('privacy'); });
  els.sitePopover.querySelector('[data-site="certs"]').addEventListener('click', () => { closeAllPopovers(); window.ie.openOptions('content'); });
}

function closeAllPopovers() {
  els.menuPopover.hidden = true;
  els.zoomPopover.hidden = true;
  els.sitePopover.hidden = true;
  $$('.context-menu, #floating-menu').forEach((node) => node.remove());
}

function positionPopovers() {
  closeAllPopovers();
}

/* ------------------------------------------------------------------ */
/* Central de navegação                                                */
/* ------------------------------------------------------------------ */

async function openHub(mode) {
  state.hubMode = mode;
  state.hubQuery = '';
  closeAllPopovers();
  els.feedsPanel.hidden = true;
  els.hub.hidden = false;
  const meta = HUB_META[mode] || HUB_META.history;
  els.hubHeading.textContent = meta.heading;
  els.hubSubtitle.textContent = meta.subtitle;
  els.hubIcon.innerHTML = `<svg><use href="#${meta.icon}" /></svg>`;
  els.hubSearch.placeholder = meta.placeholder;
  els.hubSearch.value = '';
  els.hubPrimary.textContent = meta.primary;
  els.hubPrimary.classList.toggle('primary', mode === 'favorites');
  els.hubBody.innerHTML = `<div class="hub-empty"><p>${escapeHtml(t('Carregando…'))}</p></div>`;

  try {
    if (mode === 'history') state.hubData.history = await window.ie.history.list();
    if (mode === 'favorites') state.hubData.favorites = state.config.favorites || [];
    if (mode === 'downloads') state.hubData.downloads = await window.ie.downloads.list();
  } catch {
    /* mantém dados anteriores */
  }
  renderHub();
  setTimeout(() => els.hubSearch.focus(), 80);
}

function closeHub({ silent = false } = {}) {
  els.hub.hidden = true;
  state.hubMode = null;
  state.hubQuery = '';
  if (!silent) {
    try {
      activeTab()?.webview.focus();
    } catch {}
  }
}

/** Reaplica títulos e conteúdo da central aberta após trocar de idioma. */
function refreshHub() {
  if (!state.hubMode) return;
  const meta = HUB_META[state.hubMode] || HUB_META.history;
  els.hubHeading.textContent = meta.heading;
  els.hubIcon.innerHTML = `<svg><use href="#${meta.icon}" /></svg>`;
  els.hubSearch.placeholder = meta.placeholder;
  renderHub();
}

function hubEmpty(icon, title, text) {
  return `<div class="hub-empty">
    <svg><use href="#${icon}" /></svg>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(text)}</p>
  </div>`;
}

function dayLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return t('Hoje');
  if (sameDay(date, yesterday)) return t('Ontem');
  return window.IEI18n.formatDate(date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(timestamp) {
  return window.IEI18n.formatDateTime(timestamp, { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function renderHub() {
  if (!state.hubMode) return;
  const mode = state.hubMode;
  const query = state.hubQuery.trim().toLowerCase();
  if (mode === 'history') {
    const items = (state.hubData.history || []).filter(
      (entry) => !query || `${entry.title || ''} ${entry.url}`.toLowerCase().includes(query)
    );
    const days = state.config.general.historyDays;
    els.hubSubtitle.textContent =
      items.length === 1
        ? t('{count} entrada · mantida por {days} dias', { count: items.length, days })
        : t('{count} entradas · mantidas por {days} dias', { count: items.length, days });
    els.hubPrimary.textContent = t('Limpar tudo');
    els.hubPrimary.classList.remove('primary');
    if (!items.length) {
      els.hubBody.innerHTML = query
        ? hubEmpty('i-search', t('Nenhum resultado'), t('Tente outro termo de pesquisa.'))
        : hubEmpty('i-history', t('Nenhum histórico'), t('As páginas que você visitar aparecerão aqui.'));
      return;
    }
    const groups = new Map();
    for (const entry of items) {
      const label = dayLabel(entry.time);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(entry);
    }
    els.hubBody.innerHTML = [...groups.entries()]
      .map(
        ([label, entries]) => `<section class="history-group">
          <h3>${escapeHtml(label)}</h3>
          ${entries
            .map(
              (entry) => `<div class="history-item" data-history-url="${escapeAttr(entry.url)}" title="${escapeAttr(entry.url)}">
                <span class="history-time">${formatTime(entry.time)}</span>
                <span class="history-fav" style="background:${colorFor(entry.url)}">${escapeHtml(letterFor(entry.title, entry.url))}</span>
                <div class="history-info">
                  <div class="history-title">${escapeHtml(entry.title || entry.url)}</div>
                  <div class="history-url">${escapeHtml(entry.url)}</div>
                </div>
                <button class="history-delete" data-del-history="${entry.time}" title="${escapeAttr(t('Excluir esta entrada'))}" aria-label="${escapeAttr(t('Excluir'))}">
                  <svg><use href="#i-trash" /></svg>
                </button>
              </div>`
            )
            .join('')}
        </section>`
      )
      .join('');
    return;
  }

  if (mode === 'favorites') {
    const items = (state.config.favorites || []).filter(
      (fav) => !query || `${fav.title || ''} ${fav.url} ${fav.folder || ''}`.toLowerCase().includes(query)
    );
    els.hubSubtitle.textContent =
      items.length === 1
        ? t('{count} favorito salvo', { count: items.length })
        : t('{count} favoritos salvos', { count: items.length });
    els.hubPrimary.textContent = t('Adicionar favorito');
    els.hubPrimary.classList.add('primary');
    if (!items.length) {
      els.hubBody.innerHTML = query
        ? hubEmpty('i-search', t('Nenhum resultado'), t('Tente outro termo de pesquisa.'))
        : hubEmpty('i-star', t('Nenhum favorito'), t('Use o botão de estrela na barra de endereços para salvar uma página.'));
      return;
    }
    els.hubBody.innerHTML = `<div class="hub-section-title"><h3>${escapeHtml(t('Barra de Favoritos'))}</h3><span>${escapeHtml(items.length === 1 ? t('{count} item', { count: items.length }) : t('{count} itens', { count: items.length }))}</span></div>
      <div class="hub-grid">${items
        .map(
          (fav) => `<div class="favorite-card" data-favorite-url="${escapeAttr(fav.url)}" data-favorite-id="${escapeAttr(fav.id)}">
            <span class="favicon" style="background:${colorFor(fav.url)}">${escapeHtml(letterFor(fav.title, fav.url))}</span>
            <div class="favorite-meta">
              <strong>${escapeHtml(fav.title)}</strong>
              <span>${escapeHtml(fav.folder || 'Barra de Favoritos')} · ${escapeHtml(hostOf(fav.url) || fav.url)}</span>
            </div>
            <button class="card-menu" data-del-favorite="${escapeAttr(fav.id)}" title="${escapeAttr(t('Remover favorito'))}" aria-label="${escapeAttr(t('Remover favorito'))}">
              <svg><use href="#i-trash" /></svg>
            </button>
          </div>`
        )
        .join('')}</div>`;
    return;
  }

  if (mode === 'downloads') {
    const items = (state.hubData.downloads || []).filter((item) => !query || item.filename.toLowerCase().includes(query));
    els.hubSubtitle.textContent =
      items.length === 1
        ? t('{count} arquivo nesta lista', { count: items.length })
        : t('{count} arquivos nesta lista', { count: items.length });
    els.hubPrimary.textContent = t('Abrir pasta');
    els.hubPrimary.classList.remove('primary');
    if (!items.length) {
      els.hubBody.innerHTML = hubEmpty('i-download', t('Nenhum download'), t('Os arquivos baixados pelo navegador aparecerão aqui.'));
      return;
    }
    els.hubBody.innerHTML = `<div class="hub-grid">${items
      .map((item) => {
        const pct = item.total ? Math.min(100, Math.round((item.received / item.total) * 100)) : 0;
        const stateLabel =
          item.state === 'completed'
            ? t('Concluído')
            : item.state === 'progressing'
              ? t('Baixando')
              : item.state === 'paused'
                ? t('Pausado')
                : item.state === 'interrupted'
                  ? t('Interrompido')
                  : t('Cancelado');
        const sizeText = item.total
          ? t('{received} of {total}', { received: formatBytes(item.received), total: formatBytes(item.total) })
          : formatBytes(item.received);
        return `<div class="download-card" data-download-id="${escapeAttr(item.id)}" data-download-state="${escapeAttr(item.state)}">
          <span class="favicon" style="background:${item.state === 'completed' ? '#0f7b6c' : '#2b7cb8'}">
            <svg style="width:15px;height:15px"><use href="#i-download" /></svg>
          </span>
          <div class="download-meta">
            <strong title="${escapeAttr(item.filename)}">${escapeHtml(item.filename)}</strong>
            <span>${escapeHtml(stateLabel)} · ${escapeHtml(sizeText)}</span>
            ${item.state === 'progressing' ? `<div class="download-progress"><div style="width:${pct}%"></div></div>` : ''}
          </div>
          <button class="card-menu" data-show-download="${escapeAttr(item.id)}" title="${escapeAttr(t('Mostrar na pasta'))}" aria-label="${escapeAttr(t('Mostrar na pasta'))}">
            <svg><use href="#i-folder" /></svg>
          </button>
        </div>`;
      })
      .join('')}</div>`;
  }
}

/** Confirmação de limpeza do histórico (também redesenhada ao trocar de idioma). */
function showClearHistoryModal() {
  openModal(`
    <div class="modal-header">
      <div class="modal-icon" style="background:#fdecea;color:#c42b1c"><svg><use href="#i-trash" /></svg></div>
      <div><h2>${escapeHtml(t('Excluir histórico de navegação?'))}</h2><p>${escapeHtml(t('Esta ação remove todas as entradas de histórico deste navegador. Favoritos e downloads serão preservados.'))}</p></div>
    </div>
    <div class="modal-footer">
      <button class="btn" data-clear="cancel">${escapeHtml(t('Cancelar'))}</button>
      <button class="btn danger" data-clear="confirm">${escapeHtml(t('Excluir histórico'))}</button>
    </div>
  `, { rerender: () => showClearHistoryModal() });
  els.modalRoot.querySelector('[data-clear="cancel"]').addEventListener('click', closeModal);
  els.modalRoot.querySelector('[data-clear="confirm"]').addEventListener('click', async () => {
    closeModal();
    await window.ie.history.clear();
    state.hubData.history = [];
    state.localHistory = [];
    renderHub();
    toast({ title: t('Histórico excluído'), body: t('Todas as entradas foram removidas.'), kind: 'success' });
  });
}

function bindHubEvents() {
  els.hubClose.addEventListener('click', () => closeHub());
  els.hubSearch.addEventListener('input', () => {
    state.hubQuery = els.hubSearch.value;
    renderHub();
  });
  els.hubPrimary.addEventListener('click', async () => {
    if (state.hubMode === 'favorites') {
      const tab = activeTab();
      if (tab) showAddFavoriteModal(tab);
      return;
    }
    if (state.hubMode === 'downloads') {
      const dir = state.config.general.downloadDir || state.meta?.downloadsPath;
      if (dir) window.ie.openPath(dir);
      else toast({ title: t('Pasta de downloads indisponível'), body: t('Abra um download primeiro ou defina uma pasta nas Opções da Internet.') });
      return;
    }
    if (state.hubMode === 'history') showClearHistoryModal();
  });

  els.hubBody.addEventListener('click', (event) => {
    const deleteHistory = event.target.closest('[data-del-history]');
    if (deleteHistory) {
      event.stopPropagation();
      const time = Number(deleteHistory.dataset.delHistory);
      window.ie.history.remove({ time }).then(() => {
        state.hubData.history = state.hubData.history.filter((entry) => entry.time !== time);
        state.localHistory = state.localHistory.filter((entry) => entry.time !== time);
        renderHub();
      });
      return;
    }
    const deleteFavorite = event.target.closest('[data-del-favorite]');
    if (deleteFavorite) {
      event.stopPropagation();
      const id = deleteFavorite.dataset.delFavorite;
      window.ie.favorites.remove(id).then(() => {
        state.hubData.favorites = (state.hubData.favorites || []).filter((fav) => fav.id !== id);
        state.config.favorites = (state.config.favorites || []).filter((fav) => fav.id !== id);
        renderHub();
        renderBookmarks();
        updateSiteUI();
        toast({ title: t('Favorito removido') });
      });
      return;
    }
    const showDownload = event.target.closest('[data-show-download]');
    if (showDownload) {
      event.stopPropagation();
      window.ie.downloads.show(showDownload.dataset.showDownload);
      return;
    }
    const historyItem = event.target.closest('[data-history-url]');
    if (historyItem) {
      navigateActive(historyItem.dataset.historyUrl);
      closeHub();
      return;
    }
    const favoriteCard = event.target.closest('[data-favorite-url]');
    if (favoriteCard) {
      navigateActive(favoriteCard.dataset.favoriteUrl);
      closeHub();
      return;
    }
    const downloadCard = event.target.closest('[data-download-id]');
    if (downloadCard && downloadCard.dataset.downloadState === 'completed') {
      window.ie.downloads.open(downloadCard.dataset.downloadId);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Leitor de feeds                                                     */
/* ------------------------------------------------------------------ */

function openFeedsPanel() {
  const tab = activeTab();
  if (!tab) return;
  if (!tab.feeds?.length) {
    toast({
      title: t('Nenhum feed detectado'),
      body: t('Esta página não anuncia feeds RSS ou Atom. Visite um site de notícias para experimentar.'),
    });
    return;
  }
  closeAllPopovers();
  els.hub.hidden = true;
  state.hubMode = null;
  els.feedsPanel.hidden = false;
  state.activeFeedUrl = tab.feeds[0].href;
  renderFeedSources();
  loadFeed(tab.feeds[0].href);
}

function renderFeedSources() {
  const tab = activeTab();
  if (!tab) return;
  const feeds = tab.feeds || [];
  els.feedsSource.textContent =
    feeds.length === 1
      ? t('{count} feed disponível em {host}', { count: feeds.length, host: hostOf(tab.url) || t('esta página') })
      : t('{count} feeds disponíveis em {host}', { count: feeds.length, host: hostOf(tab.url) || t('esta página') });
  const sources = feeds
    .map(
      (feed) => `<button class="feed-source-btn ${feed.href === state.activeFeedUrl ? 'active' : ''}" data-feed-url="${escapeAttr(feed.href)}">
        <svg><use href="#i-rss" /></svg>
        <div><strong>${escapeHtml(feed.title || t('Feed'))}</strong><span>${escapeHtml(feed.type || hostOf(feed.href))}</span></div>
      </button>`
    )
    .join('');
  els.feedsBody.innerHTML = `<div id="feed-source-list">${sources}</div><div id="feed-items"><div class="feed-loading">${escapeHtml(t('Carregando feed…'))}</div></div>`;
  els.feedsBody.querySelectorAll('[data-feed-url]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeFeedUrl = button.dataset.feedUrl;
      renderFeedSources();
      loadFeed(button.dataset.feedUrl);
    });
  });
}

async function loadFeed(url) {
  const itemsHost = els.feedsBody.querySelector('#feed-items');
  if (!itemsHost) return;
  const cached = state.feedCache.get(url);
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
    renderFeedItems(cached.data, itemsHost);
    return;
  }
  itemsHost.innerHTML = `<div class="feed-loading"><span class="spinner"></span> ${escapeHtml(t('Carregando feed…'))}</div>`;
  const result = await window.ie.fetchFeed(url);
  if (!result.ok) {
    itemsHost.innerHTML = `<div class="feed-loading">${escapeHtml(t('Não foi possível carregar o feed.'))}<br />${escapeHtml(result.error || '')}</div>`;
    return;
  }
  let parsed;
  try {
    parsed = parseFeedXml(result.text, result.finalUrl || url);
  } catch (err) {
    itemsHost.innerHTML = `<div class="feed-loading">${escapeHtml(t('Feed inválido: {message}', { message: err.message }))}</div>`;
    return;
  }
  state.feedCache.set(url, { data: parsed, time: Date.now() });
  renderFeedItems(parsed, itemsHost);
}

function parseFeedXml(text, baseUrl) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error(t('XML malformado'));
  const root = doc.documentElement;
  if (!root) throw new Error(t('Documento vazio'));
  const isAtom = root.localName === 'feed';
  const titleOf = (node, names) => {
    for (const name of names) {
      const elements = Array.from(node.getElementsByTagName('*')).filter((el) => el.localName === name);
      if (elements[0]) return elements[0].textContent.trim();
    }
    return '';
  };
  const feedTitle = titleOf(root, ['title']) || t('Feed');
  const nodes = Array.from(doc.getElementsByTagName(isAtom ? 'entry' : 'item')).slice(0, 40);
  const strip = (html) => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent.replace(/\s+/g, ' ').trim();
  };
  const absolute = (link) => {
    if (!link) return '';
    try {
      return new URL(link, baseUrl).href;
    } catch {
      return link;
    }
  };
  const items = nodes.map((node) => {
    const title = titleOf(node, ['title']) || t('(sem título)');
    let link = titleOf(node, ['link']);
    if (isAtom && !link) {
      const linkEl = node.querySelector('link[rel="alternate"]') || node.querySelector('link');
      link = linkEl?.getAttribute('href') || '';
    }
    if (!link) {
      const linkEl = Array.from(node.getElementsByTagName('*')).find((el) => el.localName === 'link');
      link = linkEl?.getAttribute('href') || '';
    }
    const date = titleOf(node, ['pubDate', 'published', 'updated', 'date']);
    const description = strip(titleOf(node, ['description', 'summary', 'content', 'encoded']));
    return { title, link: absolute(link), date, description };
  });
  return { title: feedTitle, items };
}

function renderFeedItems(feed, host) {
  if (!feed.items.length) {
    host.innerHTML = `<div class="feed-loading">${escapeHtml(t('Este feed não contém itens.'))}</div>`;
    return;
  }
  host.innerHTML = feed.items
    .map(
      (item) => `<article class="feed-item" ${item.link ? `data-feed-link="${escapeAttr(item.link)}"` : ''}>
        <h3>${escapeHtml(item.title)}</h3>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
        <time>${escapeHtml(formatFeedDate(item.date))}</time>
      </article>`
    )
    .join('');
  host.querySelectorAll('[data-feed-link]').forEach((node) => {
    node.addEventListener('click', () => {
      createTab({ url: node.dataset.feedLink, activate: true });
      closeFeedsPanel();
    });
  });
}

function formatFeedDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return window.IEI18n.formatDateTime(date, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function closeFeedsPanel() {
  els.feedsPanel.hidden = true;
  state.activeFeedUrl = null;
  try {
    activeTab()?.webview.focus();
  } catch {}
}

/** Redesenha o leitor de feeds aberto após trocar de idioma. */
function refreshFeedsPanel() {
  if (els.feedsPanel.hidden) return;
  renderFeedSources();
  if (state.activeFeedUrl) loadFeed(state.activeFeedUrl);
}

/* ------------------------------------------------------------------ */
/* Downloads: bandeja                                                  */
/* ------------------------------------------------------------------ */

/** Escreve os textos da bandeja de downloads no idioma atual. */
function renderShelfItem(latest) {
  const pct = latest.total ? Math.min(100, Math.round((latest.received / latest.total) * 100)) : 0;
  els.shelfTitle.textContent = latest.filename;
  els.shelfSubtitle.textContent =
    latest.state === 'completed'
      ? t('{bytes} — download concluído', { bytes: formatBytes(latest.received) })
      : latest.state === 'progressing'
        ? latest.total
          ? t('{received} of {total} ({percent}%)', {
              received: formatBytes(latest.received),
              total: formatBytes(latest.total),
              percent: pct,
            })
          : formatBytes(latest.received)
        : latest.state === 'paused'
          ? t('Download pausado')
          : t('Download interrompido');
  els.shelfProgress.style.width = latest.state === 'completed' ? '100%' : `${pct}%`;
}

function handleDownloadShelf(list) {
  if (!Array.isArray(list) || !list.length) return;
  const latest = list[0];
  const recentCompleted = latest.state === 'completed' && latest.finishedAt && Date.now() - latest.finishedAt < 15000;
  if (!['progressing', 'paused', 'interrupted'].includes(latest.state) && !recentCompleted) return;
  state.shelfId = latest.id;
  state.shelfItem = latest;
  els.shelf.hidden = false;
  renderShelfItem(latest);
  clearTimeout(state.shelfTimer);
  if (latest.state !== 'progressing') {
    state.shelfTimer = setTimeout(() => {
      els.shelf.hidden = true;
    }, 9000);
  }
}

/** Reaplica os textos da bandeja aberta após trocar de idioma. */
function refreshDownloadShelf() {
  if (els.shelf.hidden || !state.shelfItem) return;
  renderShelfItem(state.shelfItem);
}

function bindDownloadShelf() {
  els.shelfClose.addEventListener('click', () => {
    els.shelf.hidden = true;
    clearTimeout(state.shelfTimer);
  });
  els.shelfOpen.addEventListener('click', () => {
    if (state.shelfId) window.ie.downloads.open(state.shelfId);
  });
  els.shelfShow.addEventListener('click', () => {
    if (state.shelfId) window.ie.downloads.show(state.shelfId);
  });
  els.shelfMore.addEventListener('click', () => {
    els.shelf.hidden = true;
    openHub('downloads');
  });
}

/* ------------------------------------------------------------------ */
/* Menus de contexto                                                   */
/* ------------------------------------------------------------------ */

function floatingMenu(items, x, y) {
  closeAllPopovers();
  const menu = document.createElement('div');
  menu.className = 'popover context-menu';
  menu.id = 'floating-menu';
  menu.innerHTML = items
    .map((item, index) => {
      if (item.separator) return '<div class="menu-sep"></div>';
      return `<button class="menu-item" data-float-index="${index}" ${item.disabled ? 'disabled' : ''}>
        ${item.icon ? `<svg><use href="#${item.icon}" /></svg>` : '<span style="width:16px"></span>'}
        <span>${escapeHtml(item.label)}</span>
        ${item.shortcut ? `<span class="shortcut">${escapeHtml(item.shortcut)}</span>` : ''}
      </button>`;
    })
    .join('');
  els.app.appendChild(menu);
  const width = 252;
  const height = Math.min(items.length * 33 + 12, 420);
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - width - 10))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - height - 10))}px`;
  menu.addEventListener('click', (event) => {
    const button = event.target.closest('[data-float-index]');
    if (!button) return;
    const item = items[Number(button.dataset.floatIndex)];
    closeAllPopovers();
    item?.onClick?.();
  });
}

function showContextMenu(tab, params) {
  const items = [];
  if (params.linkURL) {
    items.push(
      { label: t('Abrir link em nova guia'), icon: 'i-plus', onClick: () => createTab({ url: params.linkURL, activate: true }) },
      {
        label: t('Abrir link em InPrivate'),
        icon: 'i-inprivate',
        onClick: () => createTab({ url: params.linkURL, private: true, activate: true }),
      },
      { label: t('Copiar link'), icon: 'i-copy', shortcut: 'Ctrl+C', onClick: () => window.ie.copyText(params.linkURL) },
      { separator: true }
    );
  }
  if (params.selectionText) {
    items.push(
      { label: t('Copiar'), icon: 'i-copy', shortcut: 'Ctrl+C', onClick: () => { try { tab.webview.copy(); } catch {} } },
      { label: t('Copiar texto do link'), icon: 'i-page', disabled: !params.linkURL, onClick: () => window.ie.copyText(params.selectionText) },
      { separator: true }
    );
  }
  if (params.isEditable) {
    items.push(
      { label: t('Recortar'), icon: 'i-page', shortcut: 'Ctrl+X', onClick: () => { try { tab.webview.cut(); } catch {} } },
      { label: t('Copiar'), icon: 'i-copy', shortcut: 'Ctrl+C', onClick: () => { try { tab.webview.copy(); } catch {} } },
      { label: t('Colar'), icon: 'i-page', shortcut: 'Ctrl+V', onClick: () => { try { tab.webview.paste(); } catch {} } },
      { label: t('Selecionar tudo'), icon: 'i-page', shortcut: 'Ctrl+A', onClick: () => { try { tab.webview.selectAll(); } catch {} } },
      { separator: true }
    );
  }
  if (!params.selectionText && !params.isEditable && !params.linkURL) {
    items.push(
      {
        label: t('Voltar'),
        icon: 'i-back',
        disabled: !tab.webview.canGoBack(),
        onClick: () => { try { tab.webview.goBack(); } catch {} },
      },
      {
        label: t('Avançar'),
        icon: 'i-forward',
        disabled: !tab.webview.canGoForward(),
        onClick: () => { try { tab.webview.goForward(); } catch {} },
      },
      { label: t('Atualizar'), icon: 'i-reload', shortcut: 'F5', onClick: () => { try { tab.webview.reload(); } catch {} } },
      { separator: true },
      { label: t('Adicionar aos favoritos'), icon: 'i-star', shortcut: 'Ctrl+D', onClick: () => toggleFavorite() },
      { label: t('Localizar na página'), icon: 'i-search', shortcut: 'Ctrl+F', onClick: () => openFind() },
      { separator: true },
      {
        label: t('Exibir código-fonte'),
        icon: 'i-page',
        disabled: !/^https?:/i.test(tab.url),
        onClick: () => createTab({ url: `view-source:${tab.url}`, activate: true }),
      },
      {
        label: t('Inspecionar elemento'),
        icon: 'i-compat',
        shortcut: 'F12',
        disabled: !state.config.advanced.developerTools,
        onClick: () => window.ie.openDevTools(tab.webview.getWebContentsId()),
      }
    );
  }
  const rect = tab.webview.getBoundingClientRect();
  floatingMenu(items, rect.left + params.x, rect.top + params.y);
}

function showTabContextMenu(tabId, event) {
  const tab = findTab(tabId);
  if (!tab) return;
  floatingMenu(
    [
      { label: t('Nova guia'), icon: 'i-plus', shortcut: 'Ctrl+T', onClick: () => createTab({ url: 'ie://newtab' }) },
      { label: t('Recarregar'), icon: 'i-reload', shortcut: 'F5', onClick: () => { try { tab.webview.reload(); } catch {} } },
      {
        label: t('Duplicar guia'),
        icon: 'i-copy',
        onClick: () => createTab({ url: tab.error?.url || tab.url, private: tab.private, activate: true }),
      },
      { separator: true },
      { label: t('Fechar guia'), icon: 'i-close', shortcut: 'Ctrl+W', onClick: () => closeTab(tab.id) },
      {
        label: t('Fechar outras guias'),
        icon: 'i-close',
        disabled: state.tabs.length < 2,
        onClick: () => {
          const keep = tab.id;
          [...state.tabs].forEach((entry) => {
            if (entry.id !== keep) closeTab(entry.id);
          });
          activateTab(keep);
        },
      },
      { label: t('Reabrir guia fechada'), icon: 'i-history', shortcut: 'Ctrl+Shift+T', onClick: reopenClosedTab },
      { separator: true },
      {
        label: t('Nova janela InPrivate'),
        icon: 'i-inprivate',
        onClick: () => createTab({ url: 'ie://newtab', private: true, activate: true }),
      },
    ],
    event.clientX,
    event.clientY
  );
}

/* ------------------------------------------------------------------ */
/* Bindings dos painéis                                                */
/* ------------------------------------------------------------------ */

function bindPanelEvents() {
  bindHubEvents();
  bindDownloadShelf();
  els.feedsClose.addEventListener('click', closeFeedsPanel);

  els.menuPopover.addEventListener('click', (event) => {
    const item = event.target.closest('[data-menu]');
    if (!item) return;
    runMenuAction(item.dataset.menu);
  });

  els.modalRoot.addEventListener('mousedown', (event) => {
    if (event.target !== els.modalRoot) return;
    if (state.modal?.persistent) return;
    closeModal();
  });

  document.addEventListener('mousedown', (event) => {
    if (event.target.closest('.popover, .context-menu, #menu-btn, #status-zoom, #site-info-btn, .modal')) return;
    closeAllPopovers();
  });

  window.ie.downloads.list().then((list) => {
    state.downloads = list || [];
    if (state.downloads.some((item) => item.state === 'progressing')) handleDownloadShelf(state.downloads);
  }).catch(() => {});
}
