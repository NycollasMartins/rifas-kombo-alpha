import estilos from './BarraProgresso.module.css'

/** Barra de progresso da meta. Fica verde quando bate os 100%. */
export default function BarraProgresso({ percentual, legendaEsquerda, legendaDireita }) {
  const pct = Math.max(0, Math.min(100, percentual || 0))

  return (
    <div className={estilos.wrapper}>
      <div className={estilos.trilho}>
        <div
          className={`${estilos.preenchimento} ${pct >= 100 ? estilos.completo : ''}`}
          style={{ width: pct + '%' }}
        />
      </div>
      <div className={estilos.legenda}>
        <span>{legendaEsquerda}</span>
        <span>{legendaDireita}</span>
      </div>
    </div>
  )
}
