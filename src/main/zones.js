'use strict';

/**
 * Zonas de segurança — o coração do modelo de segurança do Internet Explorer.
 * Continuam existindo no IE Neo e agora controlam permissões reais do Chromium.
 */

const ZONE_META = {
  internet: {
    id: 'internet',
    label: 'Internet',
    icon: 'globe',
    description:
      'A zona padrão para tudo que não está em outra zona. Nível recomendado: Médio alto.',
  },
  intranet: {
    id: 'intranet',
    label: 'Intranet local',
    icon: 'building',
    description:
      'Sites da rede local e da empresa. Endereços sem ponto, hosts .local e faixas de IP privadas entram aqui automaticamente.',
  },
  trusted: {
    id: 'trusted',
    label: 'Sites confiáveis',
    icon: 'shield-check',
    description:
      'Sites em que você confia. Permissões sensíveis são concedidas com menos avisos e o Modo Protegido pode ser desativado.',
  },
  restricted: {
    id: 'restricted',
    label: 'Sites restritos',
    icon: 'shield-x',
    description:
      'Sites bloqueados. O IE Neo exibe um aviso antes de abrir qualquer página desta zona e nega todas as permissões.',
  },
};

const LEVELS = {
  low: {
    id: 'low',
    label: 'Baixo',
    description: 'A maioria do conteúdo é executada sem avisos. Não recomendado para uso diário.',
    restrictions: 'Permite ActiveX, scripts, cookies de terceiros e downloads automáticos.',
  },
  'medium-low': {
    id: 'medium-low',
    label: 'Médio baixo',
    description: 'Adequado para redes locais confiáveis.',
    restrictions: 'Executa conteúdo ativo com poucos avisos; permite a maioria dos cookies.',
  },
  medium: {
    id: 'medium',
    label: 'Médio',
    description: 'Equilíbrio entre compatibilidade e segurança. Recomendado para intranets.',
    restrictions: 'Pede confirmação antes de conteúdo ativo; bloqueia cookies de terceiros sem política.',
  },
  'medium-high': {
    id: 'medium-high',
    label: 'Médio alto',
    description: 'Nível recomendado para a Internet.',
    restrictions: 'Bloqueia cookies de terceiros, pede confirmação para permissões e sinaliza conteúdo misto.',
  },
  high: {
    id: 'high',
    label: 'Alto',
    description: 'Máxima restrição. Sites podem perder funcionalidades.',
    restrictions: 'Bloqueia cookies de terceiros e boa parte do conteúdo ativo; exige HTTPS.',
  },
};

const LEVEL_ORDER = ['low', 'medium-low', 'medium', 'medium-high', 'high'];

function hostOf(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function stripPort(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

function patternToRegex(pattern) {
  const clean = stripPort(pattern);
  if (!clean) return null;
  if (clean.startsWith('*.')) {
    return new RegExp(`(^|\\.)${escapeRegex(clean.slice(2)).replace(/\\\*/g, '.*')}$`, 'i');
  }
  if (clean.includes('*')) {
    return new RegExp(`^${escapeRegex(clean).replace(/\\\*/g, '.*')}$`, 'i');
  }
  return new RegExp(`(^|\\.)${escapeRegex(clean)}$`, 'i');
}

function escapeRegex(value) {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

function matches(host, pattern) {
  const re = patternToRegex(pattern);
  return re ? re.test(host) : false;
}

function isPrivateHost(host) {
  if (!host) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local')) return true;
  if (!host.includes('.')) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)) return true;
  if (host === '[::1]' || host === '::1') return true;
  return false;
}

function classify(url, zoneConfig) {
  const host = hostOf(url);
  if (!host) return { ...ZONE_META.internet, level: zoneConfig?.internet?.level || 'medium-high' };

  const matchesZone = (id) =>
    (zoneConfig?.[id]?.sites || []).some((site) => matches(host, site));

  let id = 'internet';
  if (matchesZone('restricted')) id = 'restricted';
  else if (matchesZone('trusted')) id = 'trusted';
  else if (isPrivateHost(host)) id = 'intranet';

  const zone = zoneConfig?.[id] || {};
  return {
    ...ZONE_META[id],
    zoneId: id,
    level: zone.level || 'medium-high',
    protectedMode: zone.protectedMode !== false,
    host,
  };
}

function levelIndex(level) {
  const i = LEVEL_ORDER.indexOf(level);
  return i === -1 ? 3 : i;
}

function zoneBlocksPermissions(zone) {
  if (zone.zoneId === 'restricted') return true;
  return zone.level === 'high';
}

function zoneAllowsThirdPartyCookies(zone) {
  if (zone.zoneId === 'restricted') return false;
  return ['low', 'medium-low', 'medium'].includes(zone.level);
}

module.exports = {
  ZONE_META,
  LEVELS,
  LEVEL_ORDER,
  classify,
  matches,
  hostOf,
  isPrivateHost,
  levelIndex,
  zoneBlocksPermissions,
  zoneAllowsThirdPartyCookies,
};
