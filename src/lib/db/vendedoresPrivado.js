import { supabase } from '../supabase'
import { verificar } from './erros'

/**
 * Dados do vendedor que NÃO podem ser públicos: a anotação sobre uma
 * desistência e o termo de compromisso assinado.
 *
 * Moram numa tabela separada porque o vendedor navega sem login, e tudo que
 * está na tabela "vendedores" é legível por qualquer um com o link do app.
 * Aqui, só quem está logado alcança.
 */

export function mapearPrivado(linha) {
  return {
    vendedorId: linha.vendedor_id,
    observacao: linha.observacao || '',
    termoPath: linha.termo_path || '',
    termoAssinadoEm: linha.termo_assinado_em || '',
    termoAssinatura: linha.termo_assinatura || '',
    termoConteudo: linha.termo_conteudo || '',
  }
}

/** Devolve um objeto indexado por id do vendedor. Vazio se ninguém logado. */
export async function listarDadosPrivados() {
  const { data, error } = await supabase.from('vendedores_privado').select('*')

  // Sem login o banco simplesmente não devolve nada — isso é o esperado,
  // não é erro que precise aparecer para o vendedor.
  if (error) return {}

  const porVendedor = {}
  ;(data || []).forEach((linha) => {
    porVendedor[linha.vendedor_id] = mapearPrivado(linha)
  })
  return porVendedor
}

export async function salvarDadosPrivados(vendedorId, { observacao, termoPath, termoAssinadoEm }) {
  const linha = { vendedor_id: vendedorId, atualizado_em: new Date().toISOString() }
  if (observacao !== undefined) linha.observacao = observacao || null
  if (termoPath !== undefined) linha.termo_path = termoPath || null
  if (termoAssinadoEm !== undefined) linha.termo_assinado_em = termoAssinadoEm || null

  const salvo = verificar(
    await supabase
      .from('vendedores_privado')
      .upsert(linha, { onConflict: 'vendedor_id' })
      .select()
      .single(),
    'Não foi possível salvar os dados do vendedor.'
  )
  return mapearPrivado(salvo)
}
