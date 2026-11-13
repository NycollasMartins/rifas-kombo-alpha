/**
 * Rascunho do formulário de apadrinhamento: quem escolheu, quantas rifas,
 * nome e telefone. A pessoa sai pro app do banco pra pagar o Pix e, no
 * iPhone principalmente, o navegador às vezes descarta a página da memória
 * e recarrega ao voltar — sem isso, ela voltava e encontrava tudo em branco.
 *
 * sessionStorage: sobrevive ao recarregar na mesma aba, some ao fechar a
 * aba. A foto do comprovante não dá pra guardar (é arquivo) — essa a pessoa
 * anexa de novo, se for o caso.
 */

const CHAVE = 'apadrinhamento:rascunho'

export function lerRascunho() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) || 'null')
  } catch {
    return null
  }
}

export function salvarRascunho(rascunho) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(rascunho))
  } catch {
    // aba anônima / armazenamento bloqueado: segue sem rascunho
  }
}

export function apagarRascunho() {
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    // idem
  }
}
