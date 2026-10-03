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
    publicoSingular: 'adolescente',
    sigla: 'Ka',
    emoji: '🔥',
  },
  [KOMBO]: {
    nome: 'Kombo',
    nomeCompleto: 'Kombo KB',
    publico: 'jovens',
    publicoSingular: 'jovem',
    sigla: 'KB',
    emoji: '🔥',
  },
}

export function infoDoGrupo(grupo) {
  return (
    INFO_DO_GRUPO[grupo] || {
      nome: '',
      nomeCompleto: '',
      publico: '',
      publicoSingular: '',
      sigla: '',
      emoji: '🔥',
    }
  )
}

export function grupoValido(grupo) {
  return GRUPOS.includes(grupo)
}

function maiuscula(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto
}

/** Rótulo do tipo "não voluntário", no singular: Adolescente no Alpha, Jovem no Kombo. */
export function rotuloDoTipo(grupo) {
  return maiuscula(infoDoGrupo(grupo).publicoSingular)
}

/** Mesmo rótulo, no plural: Adolescentes no Alpha, Jovens no Kombo. */
export function rotuloDoTipoPlural(grupo) {
  return maiuscula(infoDoGrupo(grupo).publico)
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
