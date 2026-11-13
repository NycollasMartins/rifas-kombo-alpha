import { supabase, supabasePublico } from '../supabase'
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

const TIPO_POR_EXTENSAO = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
}
const EXTENSAO_POR_TIPO = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/bmp': 'bmp',
}

function extensaoDoNome(arquivo) {
  const partes = String(arquivo?.name || '').split('.')
  if (partes.length < 2) return ''
  return partes.pop().toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * O tipo de verdade do arquivo. Nem todo aparelho informa: foto tirada na
 * hora às vezes chega sem tipo, e PDF vindo do Google Drive/WhatsApp no
 * Android às vezes chega como "application/octet-stream". Nesses casos o
 * tipo sai da extensão do nome.
 */
function tipoDo(arquivo) {
  const informado = String(arquivo?.type || '').toLowerCase()
  if (informado && informado !== 'application/octet-stream') return informado
  return TIPO_POR_EXTENSAO[extensaoDoNome(arquivo)] || informado
}

export function validarArquivo(arquivo) {
  if (!arquivo) return 'Escolha um arquivo.'
  if (!arquivo.size) return 'Esse arquivo está vazio. Tire um print do comprovante e anexe a imagem.'
  const tipo = tipoDo(arquivo)
  // sem tipo nenhum e sem extensão conhecida: deixa passar (é o caso de
  // algumas fotos de câmera) — só recusa o que com certeza não é foto/PDF
  if (tipo && tipo !== 'application/octet-stream' && !tipo.startsWith('image/') && tipo !== 'application/pdf') {
    return 'Envie um PDF ou uma foto/print do comprovante.'
  }
  if (arquivo.size > TAMANHO_MAXIMO && !ehFotoQueDaPraReduzir(arquivo)) {
    return 'O arquivo passa de 10 MB. Tire um print do comprovante e anexe a imagem.'
  }
  return ''
}

function extensaoDe(arquivo) {
  const doNome = extensaoDoNome(arquivo)
  if (TIPO_POR_EXTENSAO[doNome]) return doNome === 'jpeg' || doNome === 'jfif' ? 'jpg' : doNome
  return EXTENSAO_POR_TIPO[tipoDo(arquivo)] || 'jpg'
}

// ------------------------------------------------- reduzir fotos grandes ----

const LADO_MAXIMO = 2000 // px — sobra pra ler qualquer comprovante
const REDUZIR_ACIMA_DE = 1.5 * 1024 * 1024

function ehFotoQueDaPraReduzir(arquivo) {
  const tipo = tipoDo(arquivo)
  return tipo.startsWith('image/') && tipo !== 'image/gif'
}

function carregarImagem(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => resolver({ img, liberar: () => URL.revokeObjectURL(url) })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      rejeitar(new Error('não abriu'))
    }
    img.src = url
  })
}

/**
 * Foto de câmera de celular tem 3–12 MB; na internet do celular isso
 * demora e às vezes cai no meio. Aqui ela vira um JPEG de no máximo 2000px
 * (uns 300–600 KB), que continua legível. Se o aparelho não souber abrir a
 * foto (ex: HEIC do iPhone num Windows), vai a original mesmo.
 */
async function reduzirSeForGrande(arquivo) {
  if (!ehFotoQueDaPraReduzir(arquivo) || arquivo.size <= REDUZIR_ACIMA_DE) return arquivo
  let carregada
  try {
    carregada = await carregarImagem(arquivo)
    const { img } = carregada
    const largura = img.naturalWidth
    const altura = img.naturalHeight
    if (!largura || !altura) return arquivo
    const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(largura * escala)
    canvas.height = Math.round(altura * escala)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff' // PNG com fundo transparente não fica preto
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    if (!blob || blob.size >= arquivo.size) return arquivo
    const nome = (String(arquivo.name || 'comprovante').replace(/\.[^.]*$/, '') || 'comprovante') + '.jpg'
    try {
      return new File([blob], nome, { type: 'image/jpeg' })
    } catch {
      // Safari bem antigo não tem "new File"
      blob.name = nome
      return blob
    }
  } catch {
    return arquivo
  } finally {
    carregada?.liberar()
  }
}

/** Deixa o arquivo pronto pra enviar: reduz foto grande e confere de novo. */
export async function prepararArquivo(arquivo) {
  const problema = validarArquivo(arquivo)
  if (problema) throw new Error(problema)
  const pronto = await reduzirSeForGrande(arquivo)
  if (pronto.size > TAMANHO_MAXIMO) {
    throw new Error('O arquivo passa de 10 MB. Tire um print do comprovante e anexe a imagem.')
  }
  return pronto
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

function jaExiste(error) {
  const texto = `${error?.message || ''} ${error?.error || ''}`.toLowerCase()
  return String(error?.statusCode) === '409' || texto.includes('already exists') || texto.includes('duplicate')
}

function naoAdiantaRepetir(error) {
  const texto = String(error?.message || '').toLowerCase()
  return (
    texto.includes('row-level security') ||
    texto.includes('bucket not found') ||
    texto.includes('payload too large') ||
    texto.includes('mime type')
  )
}

/**
 * `substituir` liga o "upsert" do Storage — só serve pra quem está logado:
 * sobrescrever exige permissão de LER e ALTERAR o arquivo, além de criar, e
 * quem apadrinha (sem login) só tem a de criar. Com upsert ligado o envio
 * dele era recusado com "row-level security", mesmo com nome de arquivo novo.
 *
 * Internet de celular oscila: se o envio cair, tenta mais duas vezes antes
 * de desistir. Se a primeira tentativa chegou mas a resposta se perdeu, a
 * segunda volta "já existe" — e isso conta como enviado.
 */
async function enviar(bucket, caminho, arquivo, { substituir = true, publico = false } = {}) {
  const cliente = publico ? supabasePublico : supabase
  const pronto = await prepararArquivo(arquivo)
  // fotos tiradas direto da câmera às vezes chegam sem "type" — sem um
  // Content-Type válido, o Storage recusa o envio com "No content provided"
  // sem tipo nenhum e sem extensão conhecida: é foto de câmera (o único
  // caso que passa na validação assim). O Storage só aceita foto ou PDF.
  const tipoReal = tipoDo(pronto)
  const tipo = tipoReal && tipoReal !== 'application/octet-stream' ? tipoReal : 'image/jpeg'

  let ultimoErro = null
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    let error
    try {
      ;({ error } = await cliente.storage
        .from(bucket)
        .upload(caminho, pronto, { upsert: substituir, contentType: tipo }))
    } catch (e) {
      error = e
    }
    if (!error) return caminho
    if (tentativa > 1 && !substituir && jaExiste(error)) return caminho
    ultimoErro = error
    if (naoAdiantaRepetir(error)) break
    if (tentativa < 3) await esperar(tentativa * 1500)
  }

  if (String(ultimoErro?.message).toLowerCase().includes('bucket not found')) {
    throw new Error(
      `O espaço de arquivos "${bucket}" não existe no Supabase. Crie um bucket privado com esse nome em Storage.`
    )
  }
  throw new Error(
    traduzirErro(ultimoErro, 'Não foi possível enviar o arquivo. Confira a internet e tente de novo.')
  )
}

/** Link temporário (10 minutos) para abrir um arquivo. */
export async function gerarLink(bucket, caminho) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(caminho, 600)
  if (error) throw new Error(traduzirErro(error, 'Não foi possível abrir o arquivo.'))
  return data.signedUrl
}

// ---------------------------------------------------------------- termos ----

export async function enviarTermo(grupo, vendedorId, original, caminhoAntigo) {
  const arquivo = await prepararArquivo(original)

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
  // iPhone com iOS antigo (antes do 15.4) não tem randomUUID. O lote vai pro
  // banco numa coluna de UUID, então precisa ter o formato certo de UUID.
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function enviarComprovante(grupo, loteId, original, opcoes) {
  // a foto já reduzida decide a extensão (uma foto grande vira .jpg)
  const arquivo = await prepararArquivo(original)

  const caminho = `${grupo}/${loteId}.${extensaoDe(arquivo)}`
  return enviar('comprovantes', caminho, arquivo, opcoes)
}

export const gerarLinkDoComprovante = (caminho) => gerarLink('comprovantes', caminho)
