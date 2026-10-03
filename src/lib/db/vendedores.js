import { supabase } from '../supabase'
import { verificar } from './erros'

export function mapearVendedor(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    telefone: linha.telefone || '',
    tipo: linha.tipo || 'adolescente',
    grupo: linha.grupo,
    destino: linha.destino || 'quarto',
    meta: linha.meta === null || linha.meta === undefined ? null : Number(linha.meta),
    situacao: linha.situacao || 'ativo',
    // preenchido quando a pessoa cria a senha dela no primeiro acesso
    temSenha: Boolean(linha.user_id),
    termoDigitalEm: linha.termo_digital_em || '',
    acessoEnviadoEm: linha.acesso_enviado_em || '',
    criadoEm: linha.created_at,
  }
}

export async function listarVendedores() {
  const linhas = verificar(
    await supabase.from('vendedores').select('*').order('nome', { ascending: true }),
    'Não foi possível carregar os vendedores.'
  )
  return linhas.map(mapearVendedor)
}

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export async function criarVendedor({ nome, email, telefone, tipo, grupo, meta, destino }) {
  const linha = verificar(
    await supabase
      .from('vendedores')
      .insert({
        nome,
        email: normalizarEmail(email),
        telefone: telefone || null,
        tipo: tipo || 'adolescente',
        grupo,
        meta: meta ?? null,
        destino: destino || 'quarto',
      })
      .select()
      .single(),
    'Não foi possível cadastrar o vendedor.'
  )
  return mapearVendedor(linha)
}

export async function atualizarVendedor(
  id,
  { nome, email, telefone, tipo, meta, situacao, acessoEnviadoEm, destino }
) {
  const mudancas = {}
  if (nome !== undefined) mudancas.nome = nome
  if (email !== undefined) mudancas.email = normalizarEmail(email)
  if (telefone !== undefined) mudancas.telefone = telefone || null
  if (tipo !== undefined) mudancas.tipo = tipo
  if (meta !== undefined) mudancas.meta = meta ?? null
  if (situacao !== undefined) mudancas.situacao = situacao
  if (acessoEnviadoEm !== undefined) mudancas.acesso_enviado_em = acessoEnviadoEm || null
  if (destino !== undefined) mudancas.destino = destino

  const linha = verificar(
    await supabase.from('vendedores').update(mudancas).eq('id', id).select().single(),
    'Não foi possível salvar as alterações do vendedor.'
  )
  return mapearVendedor(linha)
}

export async function excluirVendedor(id) {
  verificar(
    await supabase.from('vendedores').delete().eq('id', id),
    'Não foi possível excluir o vendedor.'
  )
}
