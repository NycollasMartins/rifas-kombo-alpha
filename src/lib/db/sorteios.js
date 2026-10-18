import { supabase } from '../supabase'
import { verificar } from './erros'
import { buscarTudoPaginado } from './paginacao'

export function mapearSorteio(linha) {
  return {
    id: linha.id,
    grupo: linha.grupo,
    vendaId: linha.venda_id,
    data: linha.data,
  }
}

export async function listarSorteios() {
  const linhas = await buscarTudoPaginado(
    () => supabase.from('sorteios').select('*').order('data', { ascending: false }),
    'Não foi possível carregar o histórico de sorteios.'
  )
  return linhas.map(mapearSorteio)
}

export async function registrarSorteio({ grupo, vendaId }) {
  const linha = verificar(
    await supabase
      .from('sorteios')
      .insert({ grupo, venda_id: vendaId })
      .select()
      .single(),
    'Não foi possível registrar o sorteio.'
  )
  return mapearSorteio(linha)
}
