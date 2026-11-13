/**
 * Traduz os erros técnicos do Supabase para frases que uma pessoa entende.
 */

// Neutra de propósito: quem esbarra nisso pode ser vendedor ou alguém sem
// login (apadrinhamento) — "faça login como líder" só confundia.
const SEM_PERMISSAO = 'Você não tem permissão para fazer isso. Se acha que é um engano, fale com a liderança.'

const MENSAGENS = {
  '23505': 'Esse registro já existe. Se for o e-mail, ele já está em outro vendedor.',
  '23503': 'Não dá para excluir: existem vendas ligadas a este vendedor.',
  '23514': 'Algum campo foi preenchido de um jeito que o sistema não aceita.',
  '42501': SEM_PERMISSAO,
  PGRST301: 'Sua sessão expirou. Entre novamente.',
  PGRST303: 'Sua sessão expirou. Puxe a tela pra baixo para atualizar ou entre novamente.',
}

export function traduzirErro(erro, padrao = 'Não foi possível concluir. Tente de novo.') {
  if (!erro) return padrao

  if (erro.message === 'Failed to fetch' || erro.message === 'Load failed') {
    return 'Sem conexão com a internet. Verifique o sinal e tente de novo.'
  }
  if (erro.message === 'Invalid login credentials') {
    return 'E-mail ou senha incorretos.'
  }
  if (String(erro.message || '').includes('User already registered')) {
    return 'Este e-mail já tem uma senha criada. Use "Entrar".'
  }
  if (String(erro.message || '').includes('Password should be at least')) {
    return 'A senha precisa ter pelo menos 6 caracteres.'
  }
  if (String(erro.message || '').includes('over_email_send_rate_limit')) {
    return 'Muitos cadastros seguidos. Espere alguns minutos e tente de novo.'
  }
  if (erro.message === 'Email not confirmed') {
    return 'Este e-mail ainda não foi confirmado no painel do Supabase.'
  }
  // dois vendedores registrando no mesmo instante pegavam o mesmo número de
  // rifa — o banco agora evita isso, mas se acontecer a mensagem faz sentido
  if (erro.code === '23505' && String(erro.message || '').includes('numero')) {
    return 'Outra venda foi registrada no mesmo instante. Toque em salvar de novo.'
  }
  if (String(erro.message || '').includes('JWT expired')) {
    return MENSAGENS.PGRST303
  }
  if (erro.code && MENSAGENS[erro.code]) {
    return MENSAGENS[erro.code]
  }
  // erros que o próprio banco escreve (raise exception) muitas vezes trazem
  // uma dica do que fazer — "peça ao líder pra cadastrar você", "use Entrar"…
  // Antes só a primeira frase chegava na tela e a pessoa ficava sem saber o
  // que fazer.
  if (erro.code === 'P0001' && erro.message) {
    return erro.hint ? `${erro.message} ${erro.hint}` : erro.message
  }
  if (typeof erro.message === 'string' && erro.message.includes('row-level security')) {
    return SEM_PERMISSAO
  }

  return erro.message || padrao
}

/** Usado depois de cada chamada ao Supabase: se deu erro, levanta em português. */
export function verificar({ data, error }, padrao) {
  if (error) {
    const e = new Error(traduzirErro(error, padrao))
    e.original = error
    throw e
  }
  return data
}
