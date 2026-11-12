import { supabase } from '../supabase'
import { verificar } from './erros'
import { buscarTudoPaginado } from './paginacao'

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
    pixTipo: linha.pix_tipo || '',
    pixChave: linha.pix_chave || '',
    pixTitular: linha.pix_titular || '',
  }
}

/** Devolve um objeto indexado por id do vendedor. Vazio se ninguém logado. */
export async function listarDadosPrivados() {
  // Sem login o banco simplesmente não devolve nada — isso é o esperado,
  // não é erro que precise aparecer para o vendedor.
  let linhas
  try {
    linhas = await buscarTudoPaginado(
      () => supabase.from('vendedores_privado').select('*'),
      'Não foi possível carregar os dados privados.'
    )
  } catch {
    return {}
  }

  const porVendedor = {}
  linhas.forEach((linha) => {
    porVendedor[linha.vendedor_id] = mapearPrivado(linha)
  })
  return porVendedor
}

export async function salvarDadosPrivados(
  vendedorId,
  { observacao, termoPath, termoAssinadoEm, pixTipo, pixChave, pixTitular }
) {
  const linha = { vendedor_id: vendedorId, atualizado_em: new Date().toISOString() }
  if (observacao !== undefined) linha.observacao = observacao || null
  if (termoPath !== undefined) linha.termo_path = termoPath || null
  if (termoAssinadoEm !== undefined) linha.termo_assinado_em = termoAssinadoEm || null
  // a chave chega já normalizada (utils/chavePix); vazia = tirar a chave
  if (pixChave !== undefined) {
    linha.pix_chave = pixChave || null
    linha.pix_tipo = pixChave ? pixTipo : null
    linha.pix_titular = pixChave ? pixTitular || null : null
  }

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
