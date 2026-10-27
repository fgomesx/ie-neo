'use strict';

/* ============================================================
   Tema do IE Neo — Claro, Escuro e Sistema
   O tema "Sistema" acompanha o modo claro/escuro do Windows.
   ============================================================ */

(function () {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const VALID = ['light', 'dark', 'system'];
  let preference = 'system';

  function normalize(value) {
    return VALID.includes(value) ? value : 'system';
  }

  function resolved(value = preference) {
    const pref = normalize(value);
    return pref === 'system' ? (media.matches ? 'dark' : 'light') : pref;
  }

  function apply(value) {
    preference = normalize(value);
    const effective = resolved();
    document.documentElement.dataset.themePreference = preference;
    return applyResolved(effective);
  }

  /**
   * Aplica o tema já resolvido pelo processo principal. É a fonte de verdade
   * do modo Sistema, que pode divergir de prefers-color-scheme no renderer.
   */
  function applyResolved(value) {
    const effective = value === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = effective;
    document.documentElement.style.colorScheme = effective;
    return effective;
  }

  media.addEventListener('change', () => {
    if (preference === 'system') apply('system');
  });

  window.IETheme = {
    apply,
    applyResolved,
    resolved,
    get preference() {
      return preference;
    },
  };

  apply('system');
})();
