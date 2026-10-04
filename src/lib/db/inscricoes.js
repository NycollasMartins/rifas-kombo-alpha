import { supabase } from '../supabase'
import { verificar } from './erros'

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

export async function excluirInscricao(id) {
  verificar(
    await supabase.from('inscricoes').delete().eq('id', id),
    'Não foi possível excluir a inscrição.'
  )
}
