import { supabase } from '../supabase'
import { traduzirErro } from './erros'

/**
 * Arquivos guardados no Supabase: termos de compromisso e comprovantes de Pix.
 *
 * Os dois buckets são privados e o grupo é a PRIMEIRA PASTA do caminho —
 * "Alpha/..." ou "Kombo/...". A regra do banco confere essa pasta, então um
 * líder do Alpha não abre um arquivo do Kombo nem sabendo o endereço.
 * Nada tem link fixo: cada abertura gera um endereço que expira.
 */

const TAMANHO_MAXIMO = 10 * 1024 * 1024 // 10 MB
const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']

export function validarArquivo(arquivo) {
  if (!arquivo) return 'Escolha um arquivo.'
  if (arquivo.size > TAMANHO_MAXIMO) {
    return 'O arquivo passa de 10 MB. Tire a foto com menos qualidade ou reduza o PDF.'
  }
  if (arquivo.type && !TIPOS_ACEITOS.includes(arquivo.type)) {
    return 'Envie um PDF ou uma foto (JPG, PNG).'
  }
  return ''
}

function extensaoDe(arquivo) {
  const partes = String(arquivo.name || '').split('.')
  if (partes.length < 2) return 'jpg'
  return partes.pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}

async function enviar(bucket, caminho, arquivo) {
  // fotos tiradas direto da câmera às vezes chegam sem "type" — sem um
  // Content-Type válido, o Storage recusa o envio com "No content provided"
  const { error } = await supabase.storage
    .from(bucket)
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type || 'application/octet-stream' })

  if (error) {
    if (String(error.message).toLowerCase().includes('bucket not found')) {
      throw new Error(
        `O espaço de arquivos "${bucket}" não existe no Supabase. Crie um bucket privado com esse nome em Storage.`
      )
    }
    throw new Error(traduzirErro(error, 'Não foi possível enviar o arquivo.'))
  }
  return caminho
}

/** Link temporário (10 minutos) para abrir um arquivo. */
export async function gerarLink(bucket, caminho) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(caminho, 600)
  if (error) throw new Error(traduzirErro(error, 'Não foi possível abrir o arquivo.'))
  return data.signedUrl
}

// ---------------------------------------------------------------- termos ----

export async function enviarTermo(grupo, vendedorId, arquivo, caminhoAntigo) {
  const problema = validarArquivo(arquivo)
  if (problema) throw new Error(problema)

  const caminho = `${grupo}/${vendedorId}/termo.${extensaoDe(arquivo)}`
  await enviar('termos', caminho, arquivo)

  if (caminhoAntigo && caminhoAntigo !== caminho) {
    await supabase.storage.from('termos').remove([caminhoAntigo])
  }
  return caminho
}

export const gerarLinkDoTermo = (caminho) => gerarLink('termos', caminho)

export async function removerTermo(caminho) {
  const { error } = await supabase.storage.from('termos').remove([caminho])
  if (error) throw new Error(traduzirErro(error, 'Não foi possível remover o termo.'))
}

// ---------------------------------------------------------- comprovantes ----

/**
 * O comprovante é enviado ANTES de a venda existir, porque o nome do arquivo
 * usa o número do lote — que o app sorteia aqui e depois manda junto com a
 * venda. Assim as rifas da mesma compra apontam todas para a mesma foto.
 */
export function novoLoteId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'lote-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export async function enviarComprovante(grupo, loteId, arquivo) {
  const problema = validarArquivo(arquivo)
  if (problema) throw new Error(problema)

  const caminho = `${grupo}/${loteId}.${extensaoDe(arquivo)}`
  return enviar('comprovantes', caminho, arquivo)
}

/** Mesmo bucket das rifas, usado também pelo comprovante de uma inscrição. */
export async function enviarComprovanteDeInscricao(grupo, inscricaoId, arquivo) {
  const problema = validarArquivo(arquivo)
  if (problema) throw new Error(problema)

  const caminho = `${grupo}/inscricao-${inscricaoId}.${extensaoDe(arquivo)}`
  return enviar('comprovantes', caminho, arquivo)
}

export const gerarLinkDoComprovante = (caminho) => gerarLink('comprovantes', caminho)
