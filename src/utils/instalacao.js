/**
 * Instalar o app na tela de início do celular.
 *
 * Android e computador: o navegador avisa quando dá para instalar, o app
 * guarda esse aviso e mostra um botão de verdade.
 *
 * iPhone: a Apple não deixa nenhum site disparar a instalação. O botão ali
 * abre o passo a passo, que é o máximo que um site consegue fazer.
 *
 * Fechar o convite vale só para a visita atual: na próxima vez que a pessoa
 * abrir o app ele aparece de novo. Nada disso fica guardado no navegador.
 * A única coisa que o faz sumir de vez é instalar.
 */

/** Já está rodando como app instalado? */
export function jaEstaInstalado() {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    )
  } catch {
    return false
  }
}

export function eIphoneOuIpad() {
  const ua = navigator.userAgent || ''
  const iOsClassico = /iPad|iPhone|iPod/.test(ua)
  // iPad recente se apresenta como Mac; o toque é o que o entrega
  const iPadModerno = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  return iOsClassico || iPadModerno
}

/**
 * Número da versão do iOS/iPadOS (ex: 26), ou null quando não dá pra saber —
 * o que inclui o iPad moderno "disfarçado" de Mac, cujo user agent não traz
 * versão nenhuma (por isso o padrão de eIphoneOuIpad não serve aqui: um Mac
 * de verdade tem "Mac OS X 10_15_7", sem dígito logo depois de "OS ").
 */
export function versaoDoIOS() {
  const m = (navigator.userAgent || '').match(/OS (\d+)_/)
  return m ? parseInt(m[1], 10) : null
}

/** Registra o service worker — é o que destrava o "Instalar" no Android. */
export function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sem service worker o app funciona igual, só não oferece instalação
    })
  })
}
