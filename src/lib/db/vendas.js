import { supabase } from '../supabase'
import { traduzirErro, verificar } from './erros'

export function mapearVenda(linha) {
  return {
    id: linha.id,
    grupo: linha.grupo,
    numero: linha.numero,
    vendedorId: linha.vendedor_id,
    // rifas compradas juntas compartilham o lote e o comprovante
    loteId: linha.lote_id,
    comprador: linha.comprador,
    telefone: linha.telefone || '',
    pagamento: linha.pagamento,
    comprovantePath: linha.comprovante_path || '',
    status: linha.status,
    repasse: linha.repasse || 'pendente',
    origem: linha.origem || 'venda',
    data: linha.data,
  }
}

export async function listarVendas() {
  const linhas = verificar(
    await supabase.from('vendas').select('*').order('numero', { ascending: false }),
    'Não foi possível carregar as vendas.'
  )
  return linhas.map(mapearVenda)
}

/**
 * Registra uma compra de 1 a 50 rifas de uma vez.
 *
 * Vai por função no banco, e não por INSERT direto, porque é o banco que
 * decide o número de cada rifa e confere se você pode registrar em nome
 * daquele vendedor.
 */
export async function registrarVenda({
  quantidade,
  comprador,
  telefone,
  pagamento,
  status,
  comprovantePath,
  vendedorId,
}) {
  const { data, error } = await supabase.rpc('registrar_venda', {
    p_quantidade: quantidade,
    p_comprador: comprador,
    p_telefone: telefone || null,
    p_pagamento: pagamento,
    p_status: status,
    p_comprovante_path: comprovantePath || null,
    p_vendedor_id: vendedorId || null,
  })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível registrar a venda.'))
  return (data || []).map(mapearVenda)
}

export async function atualizarStatusVenda(id, status) {
  const linha = verificar(
    await supabase.from('vendas').update({ status }).eq('id', id).select().single(),
    'Não foi possível mudar o status da venda.'
  )
  return mapearVenda(linha)
}

/**
 * Completa uma compra que ficou incompleta: marca como pago/pendente e/ou
 * anexa o comprovante que faltava. Atualiza TODAS as rifas do lote de uma
 * vez, porque elas compartilham o mesmo status e comprovante — foram
 * registradas juntas, na mesma compra.
 */
export async function completarLote(loteId, { status, comprovantePath }) {
  const mudancas = {}
  if (status !== undefined) mudancas.status = status
  if (comprovantePath !== undefined) mudancas.comprovante_path = comprovantePath

  const linhas = verificar(
    await supabase.from('vendas').update(mudancas).eq('lote_id', loteId).select(),
    'Não foi possível salvar as alterações desta compra.'
  )
  return linhas.map(mapearVenda)
}

export async function atualizarRepasseVenda(id, repasse) {
  const linha = verificar(
    await supabase.from('vendas').update({ repasse }).eq('id', id).select().single(),
    'Não foi possível mudar o repasse da venda.'
  )
  return mapearVenda(linha)
}

/** Correção completa. Só o dev: o banco recusa para os outros papéis. */
export async function corrigirVenda(id, dados) {
  const mudancas = {}
  if (dados.comprador !== undefined) mudancas.comprador = dados.comprador
  if (dados.telefone !== undefined) mudancas.telefone = dados.telefone || null
  if (dados.pagamento !== undefined) mudancas.pagamento = dados.pagamento
  if (dados.status !== undefined) mudancas.status = dados.status
  if (dados.repasse !== undefined) mudancas.repasse = dados.repasse
  if (dados.vendedorId !== undefined) mudancas.vendedor_id = dados.vendedorId
  if (dados.numero !== undefined) mudancas.numero = dados.numero
  if (dados.origem !== undefined) mudancas.origem = dados.origem

  const linha = verificar(
    await supabase.from('vendas').update(mudancas).eq('id', id).select().single(),
    'Não foi possível corrigir a venda.'
  )
  return mapearVenda(linha)
}

export async function excluirVenda(id) {
  verificar(await supabase.from('vendas').delete().eq('id', id), 'Não foi possível excluir a venda.')
}

/** Agrupa as rifas de uma mesma compra, para mostrar o comprovante uma vez só. */
export function agruparPorLote(vendas) {
  const lotes = new Map()
  vendas.forEach((venda) => {
    const atual = lotes.get(venda.loteId)
    if (atual) {
      atual.rifas.push(venda)
    } else {
      lotes.set(venda.loteId, { loteId: venda.loteId, primeira: venda, rifas: [venda] })
    }
  })
  return [...lotes.values()]
    .map((lote) => ({ ...lote, rifas: lote.rifas.sort((a, b) => a.numero - b.numero) }))
    .sort((a, b) => b.rifas[0].numero - a.rifas[0].numero)
}
