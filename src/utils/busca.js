/**
 * Busca "começa com palavra", ignorando acento e caixa — usada tanto na
 * lista de vendedores do líder quanto no formulário público de
 * apadrinhamento, pra não duplicar a mesma regra em dois lugares.
 */

/** Separa em palavras, sem acento e minúsculo. */
export function palavrasDe(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

/**
 * Cada palavra do que foi digitado precisa bater (começar igual) com
 * alguma palavra de algum dos campos — assim "joão silva" acha "João Pedro
 * Silva", "silva" sozinho também, e digitar sem acento acha nome com acento.
 */
export function bateBusca(termo, ...campos) {
  const palavrasDoTermo = palavrasDe(termo)
  if (palavrasDoTermo.length === 0) return false
  const palavrasDosCampos = campos.flatMap(palavrasDe)
  return palavrasDoTermo.every((p) => palavrasDosCampos.some((c) => c.startsWith(p)))
}
