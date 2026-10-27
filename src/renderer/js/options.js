'use strict';

/* ============================================================
   Opções da Internet — controlador da janela
   ============================================================ */

(function () {
  const ipc = window.ieOptions;
  const UI = window.IEOptUI;
  const SECTIONS = ['general', 'zones', 'privacy', 'content', 'connections', 'programs', 'advanced'];
  const RESTART_PATHS = {
    'advanced.useHardwareAcceleration': 'Aceleração de hardware',
    'advanced.http3': 'HTTP/3 (QUIC)',
    'advanced.doh': 'DNS sobre HTTPS',
    'advanced.tlsLegacy': 'TLS 1.0/1.1 legado',
  };

  const state = {
    config: null,
    defaults: null,
    windowsState: null,
    meta: null,
    levels: null,
    levelOrder: null,
    zoneMeta: null,
    addons: [],
    draft: null,
    saved: null,
    section: 'general',
    activeZone: 'internet',
    advFilter: '',
    dirty: false,
    applying: false,
    ready: false,
  };

  const els = {};

  function clone(value) {
    try {
      return structuredClone(value);
    } catch {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function pickSections(source) {
    const out = {};
    for (const section of SECTIONS) out[section] = clone(source?.[section] ?? {});
    return out;
  }

  function getPath(object, path) {
    return String(path)
      .split('.')
      .reduce((value, key) => (value == null ? undefined : value[key]), object);
  }

  function setPath(object, path, value) {
    const keys = String(path).split('.');
    let target = object;
    for (let index = 0; index < keys.length - 1; index += 1) {
      const key = keys[index];
      if (target[key] == null || typeof target[key] !== 'object') target[key] = {};
      target = target[key];
    }
    target[keys[keys.length - 1]] = value;
  }

  function isDirty() {
    return JSON.stringify(state.draft) !== JSON.stringify(state.saved);
  }

  function currentRestartChanges() {
    if (!state.draft || !state.saved) return [];
    // Guarda os caminhos e traduz os rótulos só na hora de exibir: o idioma
    // pode mudar durante o Aplicar.
    return Object.entries(RESTART_PATHS)
      .filter(([path]) => getPath(state.draft, path) !== getPath(state.saved, path))
      .map(([path]) => path);
  }

  function toast(message, kind = 'success') {
    els.toast.hidden = false;
    els.toast.className = `opt-toast${kind === 'error' ? ' error' : ''}`;
    els.toast.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      els.toast.hidden = true;
    }, 4600);
  }

  /* ------------------------------------------------------------------ */
  /* Estado e renderização                                              */
  /* ------------------------------------------------------------------ */

  function applyInfo(info) {
    state.config = info.config;
    state.defaults = info.defaults;
    state.windowsState = info.windowsState;
    state.meta = info.meta;
    state.levels = info.levels;
    state.levelOrder = info.levelOrder;
    state.zoneMeta = info.zoneMeta;
    state.saved = pickSections(info.config);
    state.draft = clone(state.saved);
    state.dirty = false;
    // O idioma vem do processo principal; sincroniza antes de renderizar.
    window.IEI18n?.setLocale(info.locale || info.config?.general?.language);
    window.IEI18n?.localize(document);
    window.IETheme?.apply(info.config.general?.theme);
    window.IETheme?.applyResolved(info.theme);
    if (state.meta?.version) els.version.textContent = state.meta.version;
  }

  async function reload({ keepView = true } = {}) {
    const info = await ipc.get();
    applyInfo(info);
    state.addons = await ipc.addons();
    if (keepView) renderSection(state.section);
    else updateFooter();
  }

  const ctx = {
    state,
    get draft() {
      return state.draft;
    },
    ipc,
    set: (path, value) => {
      setPath(state.draft, path, value);
      markDirty();
    },
    get: (path) => getPath(state.draft, path),
    refresh: () => renderSection(state.section),
    markDirty,
    toast,
    modal: openModal,
    closeModal,
    confirm: confirmAction,
    clearData,
    cookieSites: openCookieSites,
    reload,
    toggleAddon,
  };

  const WINDOWS_DEFAULT_EMAIL = 'Padrão do Windows';

  function displayFieldValue(path, value) {
    // O valor persistido continua sendo o texto em português; apenas a
    // exibição acompanha o idioma da interface.
    if (path === 'programs.emailClient' && value === WINDOWS_DEFAULT_EMAIL) {
      return t(WINDOWS_DEFAULT_EMAIL);
    }
    return value;
  }

  function storedFieldValue(path, value) {
    if (path === 'programs.emailClient' && value === t(WINDOWS_DEFAULT_EMAIL)) {
      return WINDOWS_DEFAULT_EMAIL;
    }
    return value;
  }

  function bindControls(root) {
    root.querySelectorAll('[data-path]').forEach((element) => {
      const path = element.dataset.path;
      const value = getPath(state.draft, path);
      if (element.type === 'checkbox') {
        element.checked = Boolean(value);
      } else if (element.tagName === 'SELECT') {
        element.value = value == null ? '' : String(value);
      } else {
        element.value =
          value == null ? '' : String(displayFieldValue(path, String(value)));
      }

      const update = () => {
        let next;
        if (element.type === 'checkbox') {
          next = element.checked;
        } else if (element.type === 'number' || element.type === 'range') {
          next = Number(element.value);
          if (!Number.isFinite(next)) next = element.min ? Number(element.min) : 0;
        } else {
          next = storedFieldValue(path, element.value);
        }
        setPath(state.draft, path, next);
        markDirty();
      };

      const eventName =
        element.type === 'checkbox' || element.tagName === 'SELECT' ? 'change' : 'input';
      element.addEventListener(eventName, update);
    });

    root.querySelectorAll('[data-radio]').forEach((element) => {
      const path = element.dataset.radio;
      element.checked = String(getPath(state.draft, path)) === String(element.dataset.value);
      element.addEventListener('change', () => {
        if (!element.checked) return;
        setPath(state.draft, path, element.dataset.value);
        markDirty();
      });
    });
  }

  function updateFooter() {
    if (!els.status || !els.apply) return;
    els.status.classList.toggle('dirty', state.dirty);
    if (state.applying) {
      els.statusText.textContent = t('Aplicando configurações ao navegador e ao Windows…');
    } else if (state.dirty) {
      els.statusText.textContent = t(
        'Alterações não aplicadas · use Aplicar para gravar no navegador e no Windows.'
      );
    } else {
      els.statusText.textContent = t(
        'Configurações sincronizadas com o navegador e o Windows.'
      );
    }
    els.apply.disabled = !state.dirty || state.applying;
    els.ok.disabled = state.applying;
    els.cancel.disabled = state.applying;
    els.reset.disabled = state.applying;
    els.sectionReset.disabled = state.applying;
  }

  function markDirty() {
    state.dirty = isDirty();
    updateFooter();
  }

  function renderSection(section) {
    const pane = window.IEOptionPanes[section];
    if (!pane) return go('general');
    state.section = section;

    document.querySelectorAll('.opt-nav-item').forEach((button) => {
      button.classList.toggle('active', button.dataset.section === section);
    });
    els.paneTitle.textContent = pane.title;
    els.paneSubtitle.textContent = pane.subtitle;
    document.title = `${pane.title} — ${t('Opções da Internet')}`;

    try {
      els.pane.innerHTML = pane.render(ctx);
      bindControls(els.pane);
      pane.mount?.(els.pane, ctx);
    } catch (err) {
      console.error('[opções] falha ao renderizar a seção:', err);
      els.pane.innerHTML = `<div class="opt-notice warn">${UI.icon(
        'i-warning'
      )}<div>${t('Não foi possível renderizar esta seção: {error}', {
        error: UI.esc(err.message),
      })}</div></div>`;
    }

    els.main.scrollTop = 0;
    updateFooter();
  }

  function go(section) {
    renderSection(window.IEOptionPanes[section] ? section : 'general');
  }

  /* ------------------------------------------------------------------ */
  /* Aplicar, restaurar e importar                                      */
  /* ------------------------------------------------------------------ */

  async function applySettings() {
    if (state.applying) return false;
    if (!state.dirty) {
      toast(t('Não há alterações para aplicar.'));
      return true;
    }
    const restart = currentRestartChanges();
    const previousLocale = window.IEI18n?.getLocale();
    state.applying = true;
    updateFooter();
    try {
      const result = await ipc.apply(pickSections(state.draft));
      state.config = result.config;
      const resultLocale = result.locale || result.config?.general?.language;
      const nextLocale = resultLocale
        ? window.IEI18n?.normalize(resultLocale)
        : previousLocale;
      if (nextLocale && nextLocale !== previousLocale) {
        window.IEI18n?.setLocale(nextLocale);
        window.IEI18n?.localize(document);
      }
      window.IETheme?.apply(result.config.general?.theme);
      window.IETheme?.applyResolved(result.theme);
      state.saved = pickSections(result.config);
      state.draft = clone(state.saved);
      state.windowsState = result.windowsState;
      state.addons = await ipc.addons();
      state.dirty = false;
      state.applying = false;
      updateFooter();
      renderSection(state.section);
      toast(t('Configurações aplicadas ao navegador e ao Registro do Windows.'));
      if (restart.length) openRestart(restart);
      return true;
    } catch (err) {
      state.applying = false;
      updateFooter();
      toast(t('Não foi possível aplicar: {error}', { error: err.message }), 'error');
      return false;
    }
  }

  async function resetAll() {
    confirmAction({
      title: t('Restaurar todas as configurações?'),
      text: t(
        'As sete seções voltam aos valores originais do IE Neo, incluindo página inicial, zonas, cookies, proxy e avançado. Favoritos, histórico e downloads são preservados.'
      ),
      confirmLabel: t('Restaurar tudo'),
      danger: true,
      onConfirm: async () => {
        closeModal();
        try {
          await ipc.reset();
          await reload({ keepView: true });
          toast(t('Configurações padrão restauradas.'));
        } catch (err) {
          toast(t('Falha ao restaurar: {error}', { error: err.message }), 'error');
        }
      },
    });
  }

  async function resetSection() {
    const pane = window.IEOptionPanes[state.section];
    if (!pane) return;
    confirmAction({
      title: t('Restaurar a seção {section}?', { section: pane.title }),
      text: t(
        'Somente esta seção volta aos valores padrão. As demais seções e os seus dados pessoais são preservados.'
      ),
      confirmLabel: t('Restaurar seção'),
      onConfirm: async () => {
        closeModal();
        try {
          await ipc.resetSection(state.section);
          await reload({ keepView: true });
          toast(t('Seção {section} restaurada.', { section: pane.title }));
        } catch (err) {
          toast(t('Falha ao restaurar: {error}', { error: err.message }), 'error');
        }
      },
    });
  }

  async function toggleAddon(id, enabled) {
    try {
      await ipc.toggleAddon({ id, enabled });
      const addon = (state.addons || []).find((item) => item.id === id);
      if (addon?.setting) {
        setPath(state.draft, addon.setting, enabled);
        setPath(state.saved, addon.setting, enabled);
      }
      state.addons = await ipc.addons();
      state.dirty = isDirty();
      if (state.section === 'programs') renderSection('programs');
      else updateFooter();
      return true;
    } catch {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Modais                                                             */
  /* ------------------------------------------------------------------ */

  function closeModal() {
    if (!els.modalRoot) return;
    els.modalRoot.hidden = true;
    els.modalRoot.innerHTML = '';
  }

  function openModal({ title, subtitle = '', icon = 'i-info', danger = false, body = '', actions = [], onMount }) {
    closeModal();
    els.modalRoot.hidden = false;
    els.modalRoot.innerHTML = `<div class="opt-modal" role="dialog" aria-modal="true" aria-label="${UI.esc(
      title
    )}">
      <div class="opt-modal-head">
        <span class="opt-modal-icon${danger ? ' danger' : ''}">${UI.icon(icon)}</span>
        <div><h3>${UI.esc(title)}</h3><p>${UI.esc(subtitle)}</p></div>
      </div>
      <div class="opt-modal-body">${body}</div>
      <div class="opt-modal-foot"></div>
    </div>`;
    const modal = els.modalRoot.querySelector('.opt-modal');
    const foot = modal.querySelector('.opt-modal-foot');
    actions.forEach((action, index) => {
      const button = document.createElement('button');
      const classes = ['opt-btn'];
      if (action.kind === 'primary') classes.push('primary');
      if (action.kind === 'danger') classes.push('danger');
      button.className = classes.join(' ');
      button.textContent = action.label;
      button.dataset.action = String(index);
      if (action.disabled) button.disabled = true;
      button.addEventListener('click', async () => {
        if (action.onClick) {
          const result = await action.onClick(modal);
          if (result === false) return;
        } else {
          closeModal();
        }
        if (action.close !== false) closeModal();
      });
      foot.appendChild(button);
    });

    els.modalRoot.onclick = (event) => {
      if (event.target === els.modalRoot) closeModal();
    };
    onMount?.(modal);
    setTimeout(() => {
      const preferred = foot.querySelector('.opt-btn.primary:not(:disabled)') || foot.lastElementChild;
      preferred?.focus();
    }, 30);
    return modal;
  }

  function confirmAction({
    title,
    text,
    confirmLabel = t('Confirmar'),
    danger = false,
    onConfirm,
  }) {
    openModal({
      title,
      subtitle: t('Esta ação será aplicada quando você confirmar.'),
      icon: danger ? 'i-warning' : 'i-info',
      danger,
      body: `<p style="margin:4px 0 8px;line-height:1.6;color:#4d6578">${text}</p>`,
      actions: [
        { label: t('Cancelar') },
        {
          label: confirmLabel,
          kind: danger ? 'danger' : 'primary',
          close: false,
          onClick: onConfirm,
        },
      ],
    });
  }

  function openRestart(paths) {
    const labels = paths.map((path) => t(RESTART_PATHS[path] || path));
    openModal({
      title: t('Reiniciar para concluir'),
      subtitle: t('As configurações já foram gravadas.'),
      icon: 'i-refresh',
      body: `<p style="margin:4px 0 8px;line-height:1.6;color:#4d6578">${t(
        'Estas opções só entram em vigor depois de reiniciar o IE Neo:'
      )}</p>
        <ul style="margin:0 0 8px 18px;padding:0;line-height:1.7;color:#3d5669">${labels
          .map((label) => `<li>${UI.esc(label)}</li>`)
          .join('')}</ul>
        ${UI.notice(
          t(
            'Você pode continuar usando o navegador e reiniciar mais tarde. O aviso voltará na próxima vez que aplicar estas opções.'
          ),
          '',
          'i-info'
        )}`,
      actions: [
        { label: t('Reiniciar depois') },
        {
          label: t('Reiniciar agora'),
          kind: 'primary',
          close: false,
          onClick: () => {
            ipc.restart();
          },
        },
      ],
    });
  }

  function selectionCheckbox(id, label, description, checked) {
    return `<label class="opt-check"><input type="checkbox" id="${id}" ${
      checked ? 'checked' : ''
    } /><span>${label}${description ? `<small>${description}</small>` : ''}</span></label>`;
  }

  function clearData(preset = {}) {
    const hasPreset = Object.keys(preset).length > 0;
    const selection = {
      history: Boolean(preset.history),
      downloads: Boolean(preset.downloads),
      cookies: hasPreset ? Boolean(preset.cookies) : true,
      cache: hasPreset ? Boolean(preset.cache) : true,
      siteData: hasPreset ? Boolean(preset.siteData) : true,
    };
    const modal = openModal({
      title: t('Excluir dados de navegação'),
      subtitle: t('Escolha o que deseja remover. A ação não pode ser desfeita.'),
      icon: 'i-trash',
      danger: true,
      body: `
        ${selectionCheckbox(
          'clear-history',
          t('Histórico de navegação'),
          t('Todas as entradas salvas neste computador.'),
          selection.history
        )}
        ${selectionCheckbox(
          'clear-downloads',
          t('Lista de downloads'),
          t('Remove o registro dos arquivos baixados; os arquivos em disco não são apagados.'),
          selection.downloads
        )}
        ${selectionCheckbox(
          'clear-cookies',
          t('Cookies'),
          t('Encerra sessões abertas em todos os sites.'),
          selection.cookies
        )}
        ${selectionCheckbox(
          'clear-cache',
          t('Cache'),
          t('Arquivos temporários, imagens e scripts.'),
          selection.cache
        )}
        ${selectionCheckbox(
          'clear-site-data',
          t('Dados de sites'),
          t('Armazenamento local, IndexedDB, service workers e cache de aplicativos.'),
          selection.siteData
        )}
        ${UI.notice(
          t(
            'A sessão InPrivate em uso também é limpa. Favoritos e configurações não são afetados.'
          ),
          'warn',
          'i-warning'
        )}`,
      actions: [
        { label: t('Cancelar') },
        {
          label: t('Excluir agora'),
          kind: 'danger',
          close: false,
          onClick: async () => {
            const run = modal.querySelector('[data-action="1"]');
            const chosen = {
              history: modal.querySelector('#clear-history').checked,
              downloads: modal.querySelector('#clear-downloads').checked,
              cookies: modal.querySelector('#clear-cookies').checked,
              cache: modal.querySelector('#clear-cache').checked,
              siteData: modal.querySelector('#clear-site-data').checked,
            };
            if (!Object.values(chosen).some(Boolean)) {
              toast(t('Selecione ao menos um tipo de dado.'), 'error');
              return false;
            }
            run.disabled = true;
            run.textContent = t('Excluindo…');
            try {
              const result = await ipc.clearData(chosen);
              const done = result.done || [];
              closeModal();
              toast(
                done.length
                  ? t('Limpeza concluída: {items}.', {
                      items: done.map((item) => t(item)).join(', '),
                    })
                  : t('Nenhum dado correspondente foi encontrado.')
              );
              if (state.section === 'general' || state.section === 'privacy') {
                renderSection(state.section);
              }
            } catch (err) {
              run.disabled = false;
              run.textContent = t('Excluir agora');
              toast(t('Falha ao limpar: {error}', { error: err.message }), 'error');
            }
            return false;
          },
        },
      ],
      onMount: (modalEl) => {
        const update = () => {
          const any = ['clear-history', 'clear-downloads', 'clear-cookies', 'clear-cache', 'clear-site-data'].some(
            (id) => modalEl.querySelector(`#${id}`)?.checked
          );
          const button = modalEl.querySelector('[data-action="1"]');
          if (button) button.disabled = !any;
        };
        modalEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
          input.addEventListener('change', update);
        });
        update();
      },
    });
    return modal;
  }

  function openCookieSites() {
    let rules = clone(state.draft.privacy.perSite || []);
    const body = `
      <div class="opt-field">
        <label>${t('Adicionar site')}</label>
        <div class="opt-input-row">
          <input class="opt-input grow" id="cookie-domain" placeholder="${UI.esc(
            t('exemplo.com ou *.exemplo.com')
          )}" spellcheck="false" />
          <button class="opt-small-btn" id="cookie-add">${t('Adicionar')}</button>
        </div>
        <small>${t(
          'Regras por site substituem o nível global de cookies. Use * para incluir subdomínios.'
        )}</small>
      </div>
      <div id="cookie-rule-list"></div>`;

    const modal = openModal({
      title: t('Regras de cookies por site'),
      subtitle: t('Permita, bloqueie ou limite cookies de domínios específicos.'),
      icon: 'i-lock',
      body,
      actions: [
        { label: t('Cancelar') },
        {
          label: t('Salvar regras'),
          kind: 'primary',
          close: false,
          onClick: () => {
            const cleaned = rules
              .map((rule) => ({ domain: UI.normalizeHost(rule.domain), action: rule.action || 'allow' }))
              .filter((rule) => rule.domain);
            setPath(state.draft, 'privacy.perSite', cleaned);
            markDirty();
            closeModal();
            renderSection(state.section);
            toast(t('Regras de cookies atualizadas. Use Aplicar para ativar.'));
          },
        },
      ],
      onMount: (modalEl) => {
        const list = modalEl.querySelector('#cookie-rule-list');
        const domain = modalEl.querySelector('#cookie-domain');

        const paint = () => {
          list.innerHTML = rules.length
            ? rules
                .map(
                  (rule, index) => `<div class="rule-row">
                    <span class="domain">${UI.esc(rule.domain)}</span>
                    <select data-rule-action="${index}" aria-label="${UI.esc(
                      t('Ação para {domain}', { domain: rule.domain })
                    )}">
                      <option value="allow"${rule.action === 'allow' ? ' selected' : ''}>${t(
                        'Permitir'
                      )}</option>
                      <option value="session"${
                        rule.action === 'session' ? ' selected' : ''
                      }>${t('Só nesta sessão')}</option>
                      <option value="block"${rule.action === 'block' ? ' selected' : ''}>${t(
                        'Bloquear'
                      )}</option>
                    </select>
                    <button data-rule-remove="${index}" title="${UI.esc(
                      t('Remover')
                    )}" aria-label="${UI.esc(
                      t('Remover {domain}', { domain: rule.domain })
                    )}">${UI.icon('i-trash')}</button>
                  </div>`
                )
                .join('')
            : `<div class="site-empty" style="padding:10px 0">${t(
                'Nenhuma regra por site. O nível global é usado para todos os sites.'
              )}</div>`;
        };

        const add = () => {
          const value = UI.normalizeHost(domain.value);
          if (!value) return;
          const existing = rules.find((rule) => rule.domain === value);
          if (existing) {
            toast(t('Este site já tem uma regra.'), 'error');
            return;
          }
          rules.push({ domain: value, action: 'allow' });
          domain.value = '';
          paint();
          domain.focus();
        };

        modalEl.querySelector('#cookie-add')?.addEventListener('click', add);
        domain?.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add();
          }
        });

        list.addEventListener('change', (event) => {
          const select = event.target.closest('[data-rule-action]');
          if (!select) return;
          const index = Number(select.dataset.ruleAction);
          if (rules[index]) rules[index].action = select.value;
        });

        list.addEventListener('click', (event) => {
          const button = event.target.closest('[data-rule-remove]');
          if (!button) return;
          rules.splice(Number(button.dataset.ruleRemove), 1);
          paint();
        });

        paint();
      },
    });
    return modal;
  }

  /* ------------------------------------------------------------------ */
  /* Janela, rodapé e navegação                                         */
  /* ------------------------------------------------------------------ */

  function requestClose() {
    if (!state.dirty || state.applying) {
      ipc.close();
      return;
    }
    openModal({
      title: t('Descartar alterações?'),
      subtitle: t('Existem configurações ainda não aplicadas.'),
      icon: 'i-warning',
      body: `<p style="margin:4px 0 8px;line-height:1.6;color:#4d6578">${t(
        'Você pode aplicar antes de sair ou descartar tudo o que foi alterado nesta janela.'
      )}</p>`,
      actions: [
        { label: t('Continuar editando') },
        {
          label: t('Descartar e sair'),
          kind: 'danger',
          onClick: () => {
            ipc.close();
          },
        },
        {
          label: t('Aplicar e sair'),
          kind: 'primary',
          close: false,
          onClick: async () => {
            const ok = await applySettings();
            if (ok) ipc.close();
            return false;
          },
        },
      ],
    });
  }

  function bindChrome() {
    els.close.addEventListener('click', () => requestClose());
    els.cancel.addEventListener('click', () => requestClose());
    els.ok.addEventListener('click', async () => {
      if (state.dirty) {
        const ok = await applySettings();
        if (ok) ipc.close();
      } else {
        ipc.close();
      }
    });
    els.apply.addEventListener('click', () => applySettings());
    els.reset.addEventListener('click', () => resetAll());
    els.sectionReset.addEventListener('click', () => resetSection());
    els.openCpl.addEventListener('click', openControlPanel);
    els.openCpl2.addEventListener('click', openControlPanel);

    document.querySelectorAll('.opt-nav-item').forEach((button) => {
      button.addEventListener('click', () => go(button.dataset.section));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (!els.modalRoot.hidden) closeModal();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        applySettings();
      }
    });

    ipc.onNavigate((section) => go(section));
    ipc.onTheme(({ theme } = {}) => {
      if (theme === 'dark' || theme === 'light') window.IETheme?.applyResolved(theme);
    });
    ipc.onLanguage(({ locale } = {}) => {
      // Reaplica o idioma sem recarregar a janela, preservando o rascunho.
      if (!state.ready || !state.config) return;
      window.IEI18n?.setLocale(locale || state.config.general?.language);
      window.IEI18n?.localize(document);
      renderSection(state.section);
    });
  }

  async function openControlPanel() {
    const ok = await ipc.openControlPanel();
    if (ok) toast(t('Painel de Controle do Windows aberto em Opções da Internet.'));
    else toast(t('Não foi possível abrir o inetcpl.cpl.'), 'error');
  }

  /* ------------------------------------------------------------------ */
  /* Inicialização                                                      */
  /* ------------------------------------------------------------------ */

  function collectElements() {
    els.version = document.getElementById('opt-version');
    els.status = document.getElementById('opt-status');
    els.statusText = document.getElementById('opt-status-text');
    els.paneTitle = document.getElementById('opt-pane-title');
    els.paneSubtitle = document.getElementById('opt-pane-subtitle');
    els.pane = document.getElementById('opt-pane');
    els.main = document.getElementById('opt-main');
    els.toast = document.getElementById('opt-toast');
    els.modalRoot = document.getElementById('opt-modal-root');
    els.close = document.getElementById('opt-close');
    els.cancel = document.getElementById('opt-cancel');
    els.apply = document.getElementById('opt-apply');
    els.ok = document.getElementById('opt-ok');
    els.reset = document.getElementById('opt-reset');
    els.sectionReset = document.getElementById('opt-section-reset');
    els.openCpl = document.getElementById('opt-open-cpl');
    els.openCpl2 = document.getElementById('opt-open-cpl-2');
  }

  async function init() {
    collectElements();
    if (!window.IEOptionPanes || !window.IEOptUI) {
      els.pane.innerHTML = `<div class="opt-notice warn">${
        UI?.icon?.('i-warning') || ''
      }<div>${t('Falha ao carregar os módulos das Opções da Internet.')}</div></div>`;
      return;
    }
    bindChrome();
    try {
      const info = await ipc.get();
      applyInfo(info);
      state.addons = await ipc.addons();
      state.ready = true;
      const querySection = new URLSearchParams(location.search).get('section');
      const hashSection = location.hash.replace(/^#/, '');
      go(window.IEOptionPanes[querySection] ? querySection : hashSection || 'general');
      updateFooter();
    } catch (err) {
      console.error('[opções] falha na inicialização:', err);
      els.paneTitle.textContent = t('Opções da Internet');
      els.paneSubtitle.textContent = t('Não foi possível carregar as configurações.');
      els.pane.innerHTML = `<div class="opt-notice warn">${UI.icon(
        'i-warning'
      )}<div>${t('Falha ao conversar com o navegador: {error}', {
        error: UI.esc(err.message),
      })}</div></div>`;
      els.statusText.textContent = t('Falha ao carregar as configurações.');
    }
  }

  init();
})();
