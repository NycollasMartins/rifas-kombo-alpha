import { supabase } from '../supabase'
import { traduzirErro } from './erros'

/**
 * Entrada no sistema.
 *
 * Líder   -> cria a própria conta apresentando o código do grupo dele.
 * Vendedor-> o líder cadastra o e-mail dele antes; no primeiro acesso ele
 *            escolhe a própria senha e a conta é ligada ao cadastro.
 *
 * Em nenhum dos dois casos o app decide alguma coisa: quem confere o código
 * e quem casa o e-mail é o banco.
 */

export async function meuPapel() {
  const { data, error } = await supabase.rpc('meu_papel')
  if (error) throw new Error(traduzirErro(error, 'Não foi possível verificar o seu acesso.'))
  return data || 'sem_acesso'
}

export async function meuGrupo() {
  const { data, error } = await supabase.rpc('meu_grupo')
  if (error) return null
  return data || null
}

export async function meuVendedorId() {
  const { data, error } = await supabase.rpc('meu_vendedor_id')
  if (error) return null
  return data || null
}

export async function podeCorrigirVenda() {
  const { data, error } = await supabase.rpc('pode_corrigir_venda')
  if (error) return false
  return Boolean(data)
}

/** Vira líder do grupo, se o código conferir. */
export async function registrarLider(grupo, codigo, nome) {
  const { data, error } = await supabase.rpc('registrar_lider', {
    p_grupo: grupo,
    p_codigo: codigo,
    p_nome: nome || null,
  })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível criar o acesso de líder.'))
  return data
}

/** Liga a conta recém-criada ao cadastro que o líder já tinha feito. */
export async function vincularVendedor() {
  const { data, error } = await supabase.rpc('vincular_vendedor')
  if (error) throw new Error(traduzirErro(error, 'Não foi possível liberar o seu acesso.'))
  return data
}

export async function codigoDefinido(grupo) {
  const { data, error } = await supabase.rpc('codigo_definido', { p_grupo: grupo })
  if (error) return false
  return Boolean(data)
}

/** Assinatura digital do termo: o vendedor digita o nome, o app grava. */
export async function assinarTermo(nome, conteudo) {
  const { error } = await supabase.rpc('assinar_termo', { p_nome: nome, p_conteudo: conteudo })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível assinar o termo.'))
}

export async function definirCodigoDeLider(grupo, codigo) {
  const { error } = await supabase.rpc('definir_codigo_de_lider', {
    p_grupo: grupo,
    p_codigo: codigo,
  })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível salvar o código.'))
}

export async function definirCodigoDeVendedor(grupo, codigo) {
  const { error } = await supabase.rpc('definir_codigo_de_vendedor', {
    p_grupo: grupo,
    p_codigo: codigo,
  })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível salvar o código.'))
}

/** Autocadastro: cria a própria conta de vendedor, com o código do grupo. */
export async function registrarVendedorAutonomo({ grupo, codigo, nome, email, telefone, tipo }) {
  const { error } = await supabase.rpc('registrar_vendedor_autonomo', {
    p_grupo: grupo,
    p_codigo: codigo,
    p_nome: nome,
    p_email: email,
    p_telefone: telefone,
    p_tipo: tipo,
  })
  if (error) throw new Error(traduzirErro(error, 'Não foi possível concluir o cadastro.'))
}
