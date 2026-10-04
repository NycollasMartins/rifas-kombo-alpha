import { supabase, supabaseAnonimo } from '../supabase'
import { traduzirErro, verificar } from './erros'

/**
 * Quem já garantiu vaga no acampamento — pagando o ingresso direto, ou
 * vendendo todas as rifas (aí fica ligado ao vendedor de origem).
 *
 * Fase de teste: só o dev lê e escreve aqui (ver RLS em "inscricoes" no
 * schema.sql). Quando for liberar pra liderança, essa parte do app não
 * muda — é só trocar a política no banco.
 */

export function mapearInscricao(linha) {
  return {
    id: linha.id,
    grupo: linha.grupo,
    nome: linha.nome,
    telefone: linha.telefone || '',
    forma: linha.forma,
    pagamento: linha.pagamento,
    valor: Number(linha.valor) || 0,
    status: linha.status,
    comprovantePath: linha.comprovante_path || '',
    vendedorId: linha.vendedor_id || null,
    observacao: linha.observacao || '',
    criadoEm: linha.criado_em,
  }
}

export async function listarInscricoes() {
  const linhas = verificar(
    await supabase.from('inscricoes').select('*').order('criado_em', { ascending: false }),
    'Não foi possível carregar as inscrições.'
  )
  return linhas.map(mapearInscricao)
}

export async function criarInscricao({
  grupo,
  nome,
  telefone,
  forma,
  pagamento,
  valor,
  status,
  comprovantePath,
  vendedorId,
  observacao,
}) {
  const linha = verificar(
    await supabase
      .from('inscricoes')
      .insert({
        grupo,
        nome,
        telefone: telefone || null,
        forma,
        pagamento: pagamento || 'dinheiro',
        valor: valor || 0,
        status: status || 'pago',
        comprovante_path: comprovantePath || null,
        vendedor_id: vendedorId || null,
        observacao: observacao || null,
      })
      .select()
      .single(),
    'Não foi possível salvar a inscrição.'
  )
  return mapearInscricao(linha)
}

export async function atualizarInscricao(id, { telefone, pagamento, valor, status, comprovantePath }) {
  const mudancas = {}
  if (telefone !== undefined) mudancas.telefone = telefone || null
  if (pagamento !== undefined) mudancas.pagamento = pagamento
  if (valor !== undefined) mudancas.valor = valor
  if (status !== undefined) mudancas.status = status
  if (comprovantePath !== undefined) mudancas.comprovante_path = comprovantePath || null

  const linha = verificar(
    await supabase.from('inscricoes').update(mudancas).eq('id', id).select().single(),
    'Não foi possível salvar a inscrição.'
  )
  return mapearInscricao(linha)
}

/**
 * Formulário público (QR code): qualquer um pode criar, mas só um pedido
 * pendente, sem valor — o RLS garante isso mesmo se alguém tentar forçar
 * outra coisa pela API. Confirmar o pagamento é sempre o dev, depois.
 */
export async function criarInscricaoPublica({ grupo, nome, telefone }) {
  // cliente isolado, sem sessão — mesmo que este aparelho já tenha um login
  // de líder salvo, este pedido precisa valer como anônimo de verdade
  const { error } = await supabaseAnonimo.from('inscricoes').insert({
    grupo,
    nome,
    telefone: telefone || null,
    forma: 'direto',
    pagamento: 'dinheiro',
    valor: 0,
    status: 'pendente',
  })
  // sem permissão de leitura aqui (de propósito) — por isso não dá pra
  // devolver a linha criada, só confirmar que não deu erro
  if (error) throw new Error(traduzirErro(error, 'Não foi possível enviar a inscrição.'))
}

export async function excluirInscricao(id) {
  verificar(
    await supabase.from('inscricoes').delete().eq('id', id),
    'Não foi possível excluir a inscrição.'
  )
}
