/**
 * Os dois grupos do acampamento.
 *
 * Alpha = adolescentes (verde e amarelo)
 * Kombo = jovens       (azul e amarelo)
 *
 * Tudo que muda de nome ou de cor entre os dois passa por aqui.
 */

export const ALPHA = 'Alpha'
export const KOMBO = 'Kombo'
export const GRUPOS = [ALPHA, KOMBO]

export const INFO_DO_GRUPO = {
  [ALPHA]: {
    nome: 'Alpha',
    nomeCompleto: 'Kombo Alpha',
    publico: 'adolescentes',
    sigla: 'Ka',
    emoji: '🔥',
  },
  [KOMBO]: {
    nome: 'Kombo',
    nomeCompleto: 'Kombo KB',
    publico: 'jovens',
    sigla: 'KB',
    emoji: '🔥',
  },
}

export function infoDoGrupo(grupo) {
  return INFO_DO_GRUPO[grupo] || { nome: '', nomeCompleto: '', publico: '', sigla: '', emoji: '🔥' }
}

export function grupoValido(grupo) {
  return GRUPOS.includes(grupo)
}

/** Rótulo do tipo "não voluntário": Adolescente no Alpha, Jovem no Kombo. */
export function rotuloDoTipo(grupo) {
  const publico = infoDoGrupo(grupo).publico // 'adolescentes' | 'jovens'
  const singular = publico.endsWith('s') ? publico.slice(0, -1) : publico
  return singular.charAt(0).toUpperCase() + singular.slice(1)
}

/**
 * Pinta o app inteiro com as cores do grupo.
 * O CSS reage ao atributo data-grupo no <html> — ver styles/tokens.css.
 */
export function aplicarTemaDoGrupo(grupo) {
  const raiz = document.documentElement
  if (grupoValido(grupo)) raiz.setAttribute('data-grupo', grupo)
  else raiz.removeAttribute('data-grupo')
}
