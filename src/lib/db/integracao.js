import { supabase } from '../supabase'
import { verificar } from './erros'

/**
 * URL e segredo do webhook que avisa o outro sistema quando um vendedor
 * finaliza. Uma linha por grupo; enquanto a URL estiver vazia, o gatilho no
 * banco não manda nada (ver avisar_vendedor_finalizado em schema.sql).
 */

export async function buscarWebhook(grupo) {
  const linha = verificar(
    await supabase.from('integracao_webhook').select('*').eq('grupo', grupo).maybeSingle(),
    'Não foi possível carregar a integração.'
  )
  return { url: linha?.url || '', segredo: linha?.segredo || '' }
}

export async function salvarWebhook(grupo, { url, segredo }) {
  verificar(
    await supabase
      .from('integracao_webhook')
      .update({
        url: url?.trim() || null,
        segredo: segredo?.trim() || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('grupo', grupo),
    'Não foi possível salvar a integração.'
  )
}
