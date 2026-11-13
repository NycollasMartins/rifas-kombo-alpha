/**
 * Detecta sozinho quando saiu uma versão nova do app (depois de um deploy) e
 * recarrega a página — sem precisar que a pessoa feche e abra de novo.
 *
 * Como funciona: o nome do arquivo .js principal muda a cada build (o Vite
 * grava um hash nele). A gente guarda qual é o arquivo da versão que está
 * rodando agora, e de tempos em tempos busca o index.html de novo (sem
 * cache) só pra ver se o nome mudou. Se mudou, é porque o EasyPanel já
 * publicou uma versão nova.
 */

function scriptAtual() {
  const tag = document.querySelector('script[type="module"][src]')
  return tag?.getAttribute('src') || ''
}

async function versaoNoAr() {
  const resposta = await fetch('/', { cache: 'no-store' })
  const html = await resposta.text()
  const encontrado = html.match(/<script[^>]+src="(\/assets\/[^"]+)"/)
  return encontrado?.[1] || ''
}

const INTERVALO_MS = 60_000 // confere a cada 1 minuto

/**
 * Enquanto alguém está preenchendo algo (modal aberto, formulário do
 * apadrinhamento), recarregar sozinho apaga tudo que foi digitado — e o
 * momento mais comum disso é justamente a volta do app do banco depois de
 * pagar o Pix. Quem tem formulário chama segurarAtualizacao() e devolve a
 * função que ela retorna quando terminar; a versão nova fica esperando e
 * entra na próxima conferida em que ninguém estiver segurando.
 */
let segurando = 0

export function segurarAtualizacao() {
  segurando += 1
  let solto = false
  return () => {
    if (solto) return
    solto = true
    segurando -= 1
  }
}

let versaoInicial = ''

/** Pro "puxar pra atualizar": diz se já saiu um deploy novo. */
export async function existeVersaoNova() {
  if (!versaoInicial) return false
  try {
    const noAr = await versaoNoAr()
    return Boolean(noAr) && noAr !== versaoInicial
  } catch {
    return false
  }
}

export function observarNovaVersao() {
  versaoInicial = scriptAtual()
  if (!versaoInicial) return () => {} // dev local: sem build, não tem o que comparar

  async function conferir() {
    if (segurando > 0) return
    if ((await existeVersaoNova()) && segurando === 0) {
      window.location.reload()
    }
  }

  const id = setInterval(conferir, INTERVALO_MS)

  // volta de segundo plano (trocou de app, bloqueou a tela) é o momento mais
  // comum de ter perdido uma publicação nova — confere na hora
  function aoVoltar() {
    if (document.visibilityState === 'visible') conferir()
  }
  document.addEventListener('visibilitychange', aoVoltar)

  return () => {
    clearInterval(id)
    document.removeEventListener('visibilitychange', aoVoltar)
  }
}
