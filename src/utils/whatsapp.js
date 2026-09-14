/**
 * Mensagem de confirmação da compra pelo WhatsApp.
 *
 * O app NÃO envia sozinho: ele abre a conversa com o texto pronto e quem
 * aperta enviar é o vendedor. Envio automático exigiria a API oficial da Meta,
 * que cobra por mensagem e pede conta business aprovada.
 */

import { formatarMoeda, formatarNumeroRifa } from './formato'
import { infoDoGrupo } from './grupos'
import { formatarPrazo } from './prazo'

/**
 * Deixa o telefone no formato que o WhatsApp entende: só dígitos, com o 55 na
 * frente. Aceita "(11) 98888-0000", "11988880000", "+55 11 98888-0000".
 * Devolve '' quando não dá para confiar no número.
 */
export function normalizarTelefone(telefone) {
  const digitos = String(telefone || '').replace(/\D/g, '')
  if (!digitos) return ''

  // já veio com o código do país
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return digitos
  }
  // DDD + 8 dígitos (fixo) ou DDD + 9 (celular)
  if (digitos.length === 10 || digitos.length === 11) return '55' + digitos

  return ''
}

export function telefoneServeParaWhatsapp(telefone) {
  return normalizarTelefone(telefone) !== ''
}

/** O texto que o comprador recebe. */
export function montarMensagemDaCompra({
  comprador,
  numeros,
  valorTotal,
  nomeDoVendedor,
  grupo,
  pagamentoPendente,
  premio,
}) {
  const primeiroNome = String(comprador || '').trim().split(/\s+/)[0] || 'Olá'
  const lista = numeros
    .slice()
    .sort((a, b) => a - b)
    .map(formatarNumeroRifa)
    .join(', ')
  const quantidade = numeros.length
  const info = infoDoGrupo(grupo)

  const linhas = [
    `Oi, ${primeiroNome}! 🔥`,
    '',
    `Sua compra das rifas do acampamento${info.nomeCompleto ? ' — ' + info.nomeCompleto : ''} está registrada:`,
    '',
    `🎟️ ${quantidade === 1 ? 'Rifa' : `${quantidade} rifas`}: ${lista}`,
    `💰 Total: ${formatarMoeda(valorTotal)}`,
  ]

  if (premio && premio.trim()) {
    linhas.push(`🏆 Prêmio: ${premio.trim()}`)
  }

  if (pagamentoPendente) {
    linhas.push('', '⏳ O pagamento ficou marcado como pendente. Combine comigo quando puder.')
  }

  linhas.push(
    '',
    `Guarde esses números: o sorteio é entre as rifas pagas.`,
    nomeDoVendedor ? `Qualquer coisa é só me chamar. — ${nomeDoVendedor}` : '',
    '',
    'Obrigado por ajudar! 🙏'
  )

  return linhas.filter((l) => l !== null).join('\n')
}

/**
 * O texto do termo de responsabilidade, enviado ao vendedor logo depois do
 * cadastro. Ele se compromete a repassar o dinheiro arrecadado e, se não
 * bater a meta até o prazo, a comprar ele mesmo as rifas que faltarem.
 */
export function montarMensagemDoTermo({ nome, grupo, precoRifa, meta, prazoFinal }) {
  const primeiroNome = String(nome || '').trim().split(/\s+/)[0] || 'Olá'
  const info = infoDoGrupo(grupo)

  const linhas = [
    `Oi, ${primeiroNome}! 🔥`,
    '',
    `Você foi cadastrado(a) como vendedor(a) das rifas do acampamento${info.nomeCompleto ? ' — ' + info.nomeCompleto : ''}.`,
    '',
    '📋 Termo de responsabilidade:',
    `• Preço de cada rifa: ${formatarMoeda(precoRifa)}`,
    `• Sua meta: ${formatarMoeda(meta)}`,
  ]

  if (prazoFinal) {
    linhas.push(`• Prazo final para vender: ${formatarPrazo(prazoFinal)}`)
  }

  linhas.push(
    '',
    'Ao vender, você se compromete a repassar o dinheiro arrecadado à liderança. Se até o ' +
      'prazo você não tiver batido a sua meta, se compromete a comprar você mesmo(a) as rifas ' +
      'que faltarem, completando o valor.',
    '',
    'Guarde esta mensagem. Qualquer dúvida, fale com a liderança. 🙏'
  )

  return linhas.join('\n')
}

/** Endereço que abre o WhatsApp com a mensagem pronta. */
export function linkDoWhatsapp(telefone, mensagem) {
  const numero = normalizarTelefone(telefone)
  const texto = encodeURIComponent(mensagem)
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`
}

/** Copia para a área de transferência, com plano B para navegador antigo. */
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const campo = document.createElement('textarea')
      campo.value = texto
      campo.style.position = 'fixed'
      campo.style.opacity = '0'
      document.body.appendChild(campo)
      campo.select()
      const deu = document.execCommand('copy')
      document.body.removeChild(campo)
      return deu
    } catch {
      return false
    }
  }
}
