'use strict';

/**
 * Catálogo en-US compartilhado entre o processo principal e os renderers.
 *
 * As chaves são o texto em português exatamente como aparece no código. Termos
 * muito específicos de uma área ficam nos dicionários dessa área; aqui estão
 * apenas os que aparecem em mais de um lugar (ações, zonas, níveis, status e
 * permissões).
 */
(function (root, factory) {
  const messages = factory();
  if (typeof module === 'object' && module.exports) module.exports = messages;
  if (root.IEI18n) root.IEI18n.register(messages);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    /* Ações e rótulos genéricos */
    OK: 'OK',
    Cancelar: 'Cancel',
    Aplicar: 'Apply',
    Fechar: 'Close',
    Abrir: 'Open',
    Salvar: 'Save',
    Editar: 'Edit',
    Remover: 'Remove',
    Excluir: 'Delete',
    Adicionar: 'Add',
    Atualizar: 'Refresh',
    Recarregar: 'Reload',
    Voltar: 'Back',
    Avançar: 'Forward',
    Pesquisar: 'Search',
    Continuar: 'Continue',
    Sim: 'Yes',
    Não: 'No',
    Ativado: 'On',
    Desativado: 'Off',
    Ativar: 'Enable',
    Desativar: 'Disable',
    Ativo: 'Active',
    Inativo: 'Inactive',
    Nenhum: 'None',
    Nenhuma: 'None',
    Todos: 'All',
    Todas: 'All',
    Padrão: 'Default',
    Personalizado: 'Custom',
    Automático: 'Automatic',
    Manual: 'Manual',
    Nunca: 'Never',
    Sempre: 'Always',
    Perguntar: 'Ask',
    Permitir: 'Allow',
    Bloquear: 'Block',
    Sessão: 'Session',
    Desconhecido: 'Unknown',
    desconhecido: 'unknown',
    usuário: 'user',

    /* Navegação e janelas */
    Geral: 'General',
    Segurança: 'Security',
    Privacidade: 'Privacy',
    Conteúdo: 'Content',
    Conexões: 'Connections',
    Programas: 'Programs',
    Avançado: 'Advanced',
    Configurações: 'Settings',
    Ferramentas: 'Tools',
    Ajuda: 'Help',
    Sobre: 'About',
    'Nova guia': 'New tab',
    'Página inicial': 'Home page',
    Histórico: 'History',
    Favoritos: 'Favorites',
    Downloads: 'Downloads',
    Download: 'Download',
    Feeds: 'Feeds',
    'Opções da Internet': 'Internet Options',
    'Opções': 'Options',
    'Painel de Controle': 'Control Panel',
    'Barra de Favoritos': 'Favorites bar',
    'Barra de endereços': 'Address bar',
    'Outros favoritos': 'Other favorites',

    /* Zonas de segurança */
    Internet: 'Internet',
    'Intranet local': 'Local intranet',
    'Sites confiáveis': 'Trusted sites',
    'Sites restritos': 'Restricted sites',
    'Página interna': 'Internal page',
    'Zona de segurança': 'Security zone',
    'Modo Protegido': 'Protected Mode',
    'Modo Protegido: Ativado': 'Protected Mode: On',
    'sem Modo Protegido': 'without Protected Mode',
    Baixo: 'Low',
    'Médio baixo': 'Medium-low',
    Médio: 'Medium',
    'Médio alto': 'Medium-high',
    Alto: 'High',
    'Nível': 'Level',

    /* Permissões */
    'saber sua localização': 'know your location',
    'enviar notificações': 'send notifications',
    'usar sua câmera e microfone': 'use your camera and microphone',
    'usar sua câmera': 'use your camera',
    'usar seu microfone': 'use your microphone',
    'Localização': 'Location',
    'Câmera': 'Camera',
    'Microfone': 'Microphone',
    'Notificações': 'Notifications',
    'Permissão': 'Permission',

    /* Status */
    'Carregando…': 'Loading…',
    'Concluído': 'Completed',
    'Em andamento': 'In progress',
    'Interrompido': 'Interrupted',
    'Pausado': 'Paused',
    'Falha': 'Failed',
    'Erro': 'Error',
    'Aviso': 'Warning',
    'Informação': 'Information',

    /* Tempo e unidades */
    Hoje: 'Today',
    Amanhã: 'Tomorrow',
    Ontem: 'Yesterday',
    dias: 'days',
    dia: 'day',
    horas: 'hours',
    minutos: 'minutes',
    segundos: 'seconds',
    'de leitura': 'read',
  };
});
