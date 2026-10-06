import { useEffect, useRef } from 'react'
import estilos from './Modal.module.css'

/**
 * Janela que sobe de baixo no celular e aparece centralizada no computador.
 *
 * Por padrão fecha ao tocar no fundo escuro ou ao apertar Esc — o esperado
 * para formulários. Com `soFechaNoX`, ela ignora as duas saídas e passa a
 * mostrar um × no cabeçalho: serve para conteúdo que a pessoa precisa
 * terminar de ler, e que um toque fora fecharia sem querer.
 */
export default function Modal({ titulo, aoFechar, children, rodape, soFechaNoX }) {
  // O toque precisa COMEÇAR no fundo, não só terminar lá — ao escolher uma
  // foto (comprovante, termo...), o seletor nativo do celular às vezes
  // devolve um "toque fantasma" bem no fundo da tela ao fechar, e sem essa
  // trava isso fechava o modal sozinho antes da pessoa salvar.
  const comecouNoFundo = useRef(false)

  useEffect(() => {
    if (soFechaNoX) return undefined

    function aoTeclar(evento) {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar, soFechaNoX])

  return (
    <div
      className={estilos.fundo}
      onPointerDown={(e) => {
        comecouNoFundo.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (soFechaNoX) return
        if (comecouNoFundo.current && e.target === e.currentTarget) aoFechar()
      }}
    >
      <div className={estilos.caixa} onClick={(e) => e.stopPropagation()}>
        {soFechaNoX ? (
          <div className={estilos.cabecalho}>
            <h2 className={estilos.tituloDoCabecalho}>{titulo}</h2>
            <button className={estilos.fechar} onClick={aoFechar} aria-label="Fechar">
              ×
            </button>
          </div>
        ) : (
          <h2 className={estilos.titulo}>{titulo}</h2>
        )}

        {children}
        {rodape && <div className={estilos.acoes}>{rodape}</div>}
      </div>
    </div>
  )
}
