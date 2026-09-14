import { supabase } from '../supabase'
import { traduzirErro } from './erros'

/** Operações de fechamento e manutenção, todas conferidas pelo banco. */

export async function fecharMetaDoVendedor(vendedorId, pagamento = 'dinheiro') {
  const { data, error } = await supabase.rpc('fechar_meta_do_vendedor', {
    p_vendedor_id: vendedorId,
    p_pagamento: pagamento,
  })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível fechar a meta deste vendedor.'))
  return data || 0
}

/** Só o dev, e só entre vendedores do mesmo grupo (a numeração é separada). */
export async function transferirVendas(deVendedorId, paraVendedorId) {
  const { data, error } = await supabase.rpc('transferir_vendas', {
    p_de: deVendedorId,
    p_para: paraVendedorId,
  })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível transferir as vendas.'))
  return data || 0
}

/** Zera o grupo e devolve a numeração dele para o #001. */
export async function apagarDadosDoGrupo(grupo) {
  const { error } = await supabase.rpc('apagar_dados_do_grupo', { p_grupo: grupo })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível apagar os dados.'))
}
