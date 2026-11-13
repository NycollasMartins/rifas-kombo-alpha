import { useEffect, useRef } from 'react'
import { existeVersaoNova } from '../utils/atualizacoes'
import estilos from './PuxarParaAtualizar.module.css'

const LIMIAR = 70 // quanto (em px, já com a resistência) precisa puxar pra valer
const MAXIMO = 110
const TEMPO_MAXIMO_MS = 15_000

/**
 * "Puxar pra atualizar": no topo da página, arrastar o dedo pra baixo e
 * soltar busca tudo de novo. Feito à mão porque o app instalado (tela
 * cheia, sem barra do navegador) não tem o gesto nativo — e no navegador o
 * gesto nativo é desligado enquanto este existe, pra não disparar os dois.
 *
 * `aoAtualizar` busca os dados de novo; sem ele, recarrega a página
 * inteira (telas de entrada, por exemplo). Se já saiu uma versão nova do
 * app, recarrega a página de qualquer jeito. Com algum modal aberto (um
 * formulário no meio) ou com `desligado`, o gesto não faz nada.
 *
 * O aviso acompanha o dedo mexendo direto no estilo do elemento, sem
 * passar pelo React a cada movimento — é isso que deixa o arrasto e o
 * giro lisos mesmo com a tela cheia de coisa.
 */
export default function PuxarParaAtualizar({ aoAtualizar, desligado = false }) {
  const indicadorRef = useRef(null)
  const textoRef = useRef(null)
  const aoAtualizarRef = useRef(aoAtualizar)
  aoAtualizarRef.current = aoAtualizar
  const desligadoRef = useRef(desligado)
  desligadoRef.current = desligado

  useEffect(() => {
    const raiz = document.documentElement
    const anterior = raiz.style.overscrollBehaviorY
    raiz.style.overscrollBehaviorY = 'contain'

    const indicador = indicadorRef.current
    const texto = textoRef.current
    let inicioY = null
    let atual = 0
    let atualizando = false
    let quadro = 0

    function desenhar(distancia, estado) {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => {
        indicador.style.transform = `translate3d(-50%, ${distancia}px, 0)`
        indicador.style.opacity = distancia > 0 || estado === 'atualizando' ? '1' : '0'
        indicador.style.setProperty('--giro', `${distancia * 4}deg`)
        indicador.dataset.estado = estado
        texto.textContent =
          estado === 'atualizando'
            ? 'Atualizando…'
            : estado === 'pronto'
              ? 'Solte para atualizar'
              : 'Puxe para atualizar'
      })
    }

    function aoTocar(e) {
      const podeComecar =
        !atualizando &&
        !desligadoRef.current &&
        e.touches.length === 1 &&
        window.scrollY <= 0 &&
        !document.querySelector('[data-modal-aberto]')
      inicioY = podeComecar ? e.touches[0].clientY : null
      atual = 0
    }

    function aoMover(e) {
      if (inicioY === null) return
      const puxado = e.touches[0].clientY - inicioY
      if (puxado <= 0 || window.scrollY > 0) {
        if (atual !== 0) desenhar(0, 'puxando')
        atual = 0
        return
      }
      atual = Math.min(puxado * 0.5, MAXIMO)
      desenhar(atual, atual >= LIMIAR ? 'pronto' : 'puxando')
    }

    async function aoSoltar() {
      if (inicioY === null) return
      inicioY = null
      if (atual < LIMIAR) {
        atual = 0
        desenhar(0, 'puxando')
        return
      }
      atual = 0
      atualizando = true
      desenhar(LIMIAR, 'atualizando')
      try {
        // a conferência de versão nova e a busca dos dados vão juntas; e se
        // a internet travar no meio, o aviso some do mesmo jeito depois de
        // um tempo, em vez de ficar preso na tela
        const buscar = aoAtualizarRef.current
        const [versaoNova] = await Promise.race([
          Promise.all([existeVersaoNova(), buscar ? buscar() : null]),
          new Promise((resolver) => setTimeout(() => resolver([false]), TEMPO_MAXIMO_MS)),
        ])
        if (versaoNova || !buscar) {
          window.location.reload()
          return
        }
      } catch {
        // erro de rede: os dados antigos continuam na tela
      } finally {
        atualizando = false
        desenhar(0, 'puxando')
      }
    }

    window.addEventListener('touchstart', aoTocar, { passive: true })
    window.addEventListener('touchmove', aoMover, { passive: true })
    window.addEventListener('touchend', aoSoltar)
    window.addEventListener('touchcancel', aoSoltar)
    return () => {
      cancelAnimationFrame(quadro)
      raiz.style.overscrollBehaviorY = anterior
      window.removeEventListener('touchstart', aoTocar)
      window.removeEventListener('touchmove', aoMover)
      window.removeEventListener('touchend', aoSoltar)
      window.removeEventListener('touchcancel', aoSoltar)
    }
  }, [])

  return (
    <div ref={indicadorRef} className={estilos.indicador} data-estado="puxando" aria-live="polite">
      <span className={estilos.circulo} />
      <span ref={textoRef} className={estilos.texto} />
    </div>
  )
}
