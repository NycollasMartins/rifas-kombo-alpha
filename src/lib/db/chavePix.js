import { supabase, supabasePublico } from '../supabase'
import { traduzirErro } from './erros'

/**
 * Chave Pix do vendedor. Ela mora em vendedores_privado, que o vendedor
 * não lê — por isso ele busca e salva a dele por estas funções do banco.
 * A liderança grava pelo salvarDadosPrivados(), como a observação.
 */

export function mapearChavePix(linha) {
  return {
    tipo: linha?.tipo || 'cpf',
    chave: linha?.chave || '',
    titular: linha?.titular || '',
  }
}

/** A chave do vendedor logado, ou null se ele ainda não cadastrou. */
export async function buscarMinhaChavePix(grupo) {
  const { data, error } = await supabase.rpc('minha_chave_pix', { p_grupo: grupo || null })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível carregar sua chave Pix.'))
  const linha = (data || [])[0]
  return linha?.chave ? mapearChavePix(linha) : null
}

export async function salvarMinhaChavePix({ tipo, chave, titular }, grupo) {
  const { error } = await supabase.rpc('salvar_minha_chave_pix', {
    p_tipo: tipo,
    p_chave: chave,
    p_titular: titular,
    p_grupo: grupo || null,
  })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível salvar sua chave Pix.'))
}

/** Pro formulário público: a chave de quem a pessoa escolheu apadrinhar. */
export async function buscarPixParaApadrinhar(vendedorId) {
  const { data, error } = await supabasePublico.rpc('pix_para_apadrinhar', { p_vendedor_id: vendedorId })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível carregar o Pix.'))
  const linha = (data || [])[0]
  if (!linha?.chave) {
    throw new Error('Esse vendedor ainda não cadastrou a chave Pix. Escolha outra pessoa.')
  }
  return { chave: linha.chave, titular: linha.titular || '' }
}
