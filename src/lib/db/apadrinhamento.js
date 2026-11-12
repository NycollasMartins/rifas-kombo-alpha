import { supabase } from '../supabase'
import { traduzirErro } from './erros'
import { mapearVenda } from './vendas'

/**
 * Formulário público de apadrinhamento — ninguém precisa de conta nem de
 * login pra usar nada daqui. As duas funções do banco chamadas abaixo são
 * as únicas liberadas pro papel "anon" em todo o sistema.
 */

export function mapearParaApadrinhar(linha) {
  return {
    vendedorId: linha.vendedor_id,
    nome: linha.nome,
    grupo: linha.grupo,
    meta: Number(linha.meta),
    preco: Number(linha.preco),
    qtdPaga: linha.qtd_paga,
    qtdPendente: linha.qtd_pendente,
  }
}

export async function listarParaApadrinhar() {
  const { data, error } = await supabase.rpc('listar_para_apadrinhar')
  if (error) throw new Error(traduzirErro(error, 'Não foi possível carregar a lista.'))
  return (data || []).map(mapearParaApadrinhar)
}

export async function registrarApadrinhamento({
  vendedorId,
  quantidade,
  comprador,
  telefone,
  comprovantePath,
}) {
  const { data, error } = await supabase.rpc('registrar_apadrinhamento', {
    p_vendedor_id: vendedorId,
    p_quantidade: quantidade,
    p_comprador: comprador,
    p_telefone: telefone || null,
    p_comprovante_path: comprovantePath || null,
  })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível registrar o apadrinhamento.'))
  return (data || []).map(mapearVenda)
}
