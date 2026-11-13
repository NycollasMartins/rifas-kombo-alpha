import { useEffect, useRef, useState } from 'react'
import { existeVersaoNova } from '../utils/atualizacoes'
import estilos from './PuxarParaAtualizar.module.css'

const LIMIAR = 70 // quanto (em px, já com a resistência) precisa puxar pra valer
const MAXIMO = 110

/**
 * "Puxar pra atualizar": no topo da página, arrastar o dedo pra baixo e
 * soltar busca tudo de novo no banco. Feito à mão porque o app instalado
 * (tela cheia, sem barra do navegador) não tem o gesto nativo — e no
 * navegador o gesto nativo é desligado enquanto este existe, pra não
 * disparar os dois juntos.
 *
 * Se já saiu uma versão nova do app, recarrega a página inteira em vez de
 * só os dados — é o "recarregar de verdade". Com algum modal aberto (um
 * formulário no meio), o gesto não faz nada.
 */
export default function PuxarParaAtualizar({ aoAtualizar }) {
  const [distancia, setDistancia] = useState(0)
  const [atualizando, setAtualizando] = useState(false)
  const atualizandoRef = useRef(false)
  const aoAtualizarRef = useRef(aoAtualizar)
  aoAtualizarRef.current = aoAtualizar

  useEffect(() => {
    const raiz = document.documentElement
    const anterior = raiz.style.overscrollBehaviorY
    raiz.style.overscrollBehaviorY = 'contain'

    let inicioY = null
    let atual = 0

    function aoTocar(e) {
      const podeComecar =
        !atualizandoRef.current &&
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
        atual = 0
        setDistancia(0)
        return
      }
      atual = Math.min(puxado * 0.5, MAXIMO)
      setDistancia(atual)
    }

    async function aoSoltar() {
      if (inicioY === null) return
      inicioY = null
      if (atual < LIMIAR) {
        atual = 0
        setDistancia(0)
        return
      }
      atual = 0
      atualizandoRef.current = true
      setAtualizando(true)
      setDistancia(LIMIAR)
      try {
        if (await existeVersaoNova()) {
          window.location.reload()
          return
        }
        await aoAtualizarRef.current()
      } finally {
        atualizandoRef.current = false
        setAtualizando(false)
        setDistancia(0)
      }
    }

    window.addEventListener('touchstart', aoTocar, { passive: true })
    window.addEventListener('touchmove', aoMover, { passive: true })
    window.addEventListener('touchend', aoSoltar)
    window.addEventListener('touchcancel', aoSoltar)
    return () => {
      raiz.style.overscrollBehaviorY = anterior
      window.removeEventListener('touchstart', aoTocar)
      window.removeEventListener('touchmove', aoMover)
      window.removeEventListener('touchend', aoSoltar)
      window.removeEventListener('touchcancel', aoSoltar)
    }
  }, [])

  if (distancia === 0 && !atualizando) return null

  const pronto = distancia >= LIMIAR
  return (
    <div className={estilos.indicador} style={{ transform: `translate(-50%, ${distancia}px)` }}>
      <span
        className={`${estilos.icone} ${atualizando ? estilos.girando : ''}`}
        style={atualizando ? undefined : { transform: `rotate(${pronto ? 180 : distancia * 2.5}deg)` }}
      >
        {atualizando ? '⟳' : '↓'}
      </span>
      <span className={estilos.texto}>
        {atualizando ? 'Atualizando…' : pronto ? 'Solte para atualizar' : 'Puxe para atualizar'}
      </span>
    </div>
  )
}
