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

// um rascunho por grupo: o do Alpha continua com o nome de sempre
function chave(grupo) {
  return !grupo || grupo === 'Alpha' ? 'apadrinhamento:rascunho' : `apadrinhamento:rascunho:${grupo}`
}

export function lerRascunho(grupo) {
  try {
    return JSON.parse(sessionStorage.getItem(chave(grupo)) || 'null')
  } catch {
    return null
  }
}

export function salvarRascunho(rascunho, grupo) {
  try {
    sessionStorage.setItem(chave(grupo), JSON.stringify(rascunho))
  } catch {
    // aba anônima / armazenamento bloqueado: segue sem rascunho
  }
}

export function apagarRascunho(grupo) {
  try {
    sessionStorage.removeItem(chave(grupo))
  } catch {
    // idem
  }
}
