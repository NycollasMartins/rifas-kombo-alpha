import { supabase } from '../supabase'
import { verificar } from './erros'

export async function salvarInscricaoPush(vendedorId, inscricao) {
  verificar(
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

/** Manda uma notificação de verdade para todos os vendedores do grupo. */
export async function notificarVendedores(grupo, titulo, corpo) {
  const { error } = await supabase.functions.invoke('notificar-vendedores', {
    body: { grupo, titulo, corpo },
  })
  // se a função não estiver publicada ainda, não trava o resto do app
  if (error) console.warn('Não foi possível notificar os vendedores:', error.message)
}
