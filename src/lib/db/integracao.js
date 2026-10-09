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

function mapearTentativa(linha) {
  return {
    id: linha.id,
    vendedorId: linha.vendedor_id,
    grupo: linha.grupo,
    nome: linha.payload?.nome || '',
    tentativas: linha.tentativas,
    status: linha.status,
    ultimoErro: linha.ultimo_erro || '',
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  }
}

/** Histórico de avisos do webhook (sucesso, pendente, falhou) — aba Manutenção. */
export async function listarTentativasDeWebhook() {
  const linhas = verificar(
    await supabase
      .from('integracao_webhook_log')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(50),
    'Não foi possível carregar o histórico de avisos.'
  )
  return linhas.map(mapearTentativa)
}

/** Força o job de reenvio a rodar agora, em vez de esperar os 5 minutos. */
export async function forcarReenvioDeWebhooks() {
  const { error } = await supabase.rpc('forcar_reenvio_webhooks')
  if (error) throw new Error(error.message || 'Não foi possível reenviar.')
}
