import { supabase } from '../supabase'
import { verificar } from './erros'

/**
 * Líderes do grupo. Qualquer líder enxerga a lista (a regra do banco já
 * mostra só quem é do mesmo grupo); só o dev consegue excluir — de novo, é
 * o banco quem barra, não esta tela.
 */
export async function listarLideres(grupo) {
  const linhas = verificar(
    await supabase
      .from('perfis')
      .select('id, nome, papel, criado_em')
      .eq('grupo', grupo)
      .eq('papel', 'lider')
      .order('criado_em', { ascending: true }),
    'Não foi possível carregar os líderes.'
  )
  return linhas.map((l) => ({ id: l.id, nome: l.nome || '(sem nome)', criadoEm: l.criado_em }))
}

export async function excluirLider(id) {
  verificar(
    await supabase.from('perfis').delete().eq('id', id),
    'Não foi possível excluir este líder.'
  )
}
