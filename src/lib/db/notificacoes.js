import { supabase } from '../supabase'
import { verificar } from './erros'

/**
 * Vai pela função do banco, não por upsert direto: quando o mesmo celular
 * já tinha sido inscrito por OUTRO vendedor (irmãos dividindo o aparelho),
 * a regra de acesso não deixava "tomar" a inscrição dele e dava erro 403 —
 * a notificação nunca ligava pra quem estava usando o aparelho agora.
 */
export async function salvarInscricaoPush(vendedorId, inscricao) {
  const resposta = await supabase.rpc('salvar_inscricao_push', {
    p_vendedor_id: vendedorId,
    p_endpoint: inscricao.endpoint,
    p_p256dh: inscricao.keys.p256dh,
    p_auth: inscricao.keys.auth,
  })
  // banco ainda sem a função (schema.sql não rodado): usa o jeito antigo
  if (resposta.error?.code === 'PGRST202') {
    return verificar(
      await supabase.from('inscricoes_push').upsert(
        {
          vendedor_id: vendedorId,
          endpoint: inscricao.endpoint,
          p256dh: inscricao.keys.p256dh,
          auth: inscricao.keys.auth,
        },
        { onConflict: 'endpoint' }
      ),
      'Não foi possível salvar a notificação.'
    )
  }
  verificar(resposta, 'Não foi possível salvar a notificação.')
}

/** Manda uma notificação de verdade para todos os vendedores do grupo. */
export async function notificarVendedores(grupo, titulo, corpo) {
  const { error } = await supabase.functions.invoke('notificar-vendedores', {
    body: { grupo, titulo, corpo },
  })
  // se a função não estiver publicada ainda, não trava o resto do app
  if (error) console.warn('Não foi possível notificar os vendedores:', error.message)
}
