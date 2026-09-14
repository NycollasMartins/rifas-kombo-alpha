/**
 * Traduz os erros técnicos do Supabase para frases que uma pessoa entende.
 */

const MENSAGENS = {
  '23505': 'Esse registro já existe. Se for o e-mail, ele já está em outro vendedor.',
  '23503': 'Não dá para excluir: existem vendas ligadas a este vendedor.',
  '23514': 'Algum campo foi preenchido de um jeito que o sistema não aceita.',
  '42501': 'Você não tem permissão para isso. Faça login como líder.',
  PGRST301: 'Sua sessão expirou. Entre novamente.',
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
  if (erro.code && MENSAGENS[erro.code]) {
    return MENSAGENS[erro.code]
  }
  if (typeof erro.message === 'string' && erro.message.includes('row-level security')) {
    return 'Você não tem permissão para isso. Faça login como líder.'
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
