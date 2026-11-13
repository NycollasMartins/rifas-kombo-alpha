/**
 * Monta o "Pix Copia e Cola" (padrão BR Code / EMV do Banco Central) na mão,
 * sem gateway nenhum — é só texto formatado com um checksum no final, que
 * qualquer banco sabe ler. O QR Code é esse mesmo texto, desenhado pela
 * biblioteca `qrcode` (já usada em CartaoQrCode.jsx).
 *
 * Quem recebe é o próprio vendedor: a chave e o titular vêm do cadastro dele
 * (vendedores_privado, ver pix_para_apadrinhar no schema.sql). A cidade é
 * obrigatória no padrão, mas o banco de quem paga não confere — fica fixa.
 */
export const PIX_CIDADE = 'Brasília' // o acento é tirado na hora de montar o payload

/** Tira acento, deixa maiúsculo e só o que o padrão aceita (letras, números, espaço). */
function limpar(texto, tamanhoMaximo) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, tamanhoMaximo)
    .trim()
}

/** Cada campo do BR Code é "id + tamanho (2 dígitos) + valor". */
function campo(id, valor) {
  const tamanho = String(valor.length).padStart(2, '0')
  return `${id}${tamanho}${valor}`
}

/** CRC16/CCITT-FALSE — o checksum que o padrão Pix exige no último campo. */
function crc16(texto) {
  let crc = 0xffff
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Monta o texto do Pix com a chave do vendedor e o valor já preenchido.
 *
 * O identificador da transação (txid) vai SEMPRE como "***", que é o que o
 * padrão do Banco Central manda usar em Pix por chave (QR estático). Antes
 * ia um código nosso ("RIFA..."), e alguns bancos — o Inter, por exemplo —
 * recusam receber um Pix estático com identificador que eles não emitiram:
 * quem tinha chave no Inter não conseguia receber apadrinhamento nenhum.
 */
export function montarPixCopiaECola({ chave, nome, cidade, valor }) {
  const chaveLimpa = String(chave || '').trim()
  const nomeLimpo = limpar(nome, 25) || 'RECEBEDOR'
  const cidadeLimpa = limpar(cidade, 15) || 'BRASIL'
  const valorTexto = Number(valor || 0).toFixed(2)
  const txid = '***'

  const infoAdicional = campo('01', chaveLimpa)
  const merchantAccount = campo('26', campo('00', 'BR.GOV.BCB.PIX') + infoAdicional)
  const txidCampo = campo('05', txid)
  const dadosAdicionais = campo('62', txidCampo)

  const semCrc =
    campo('00', '01') +
    campo('01', '11') + // "11" = QR estático (Pix por chave)
    merchantAccount +
    campo('52', '0000') +
    campo('53', '986') + // BRL
    campo('54', valorTexto) +
    campo('58', 'BR') +
    campo('59', nomeLimpo) +
    campo('60', cidadeLimpa) +
    dadosAdicionais +
    '6304'

  return semCrc + crc16(semCrc)
}
