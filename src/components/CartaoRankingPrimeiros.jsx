import { formatarDataHora } from '../utils/formato'
import estilos from './CartaoRanking.module.css'

/** Top de quem bateu a meta primeiro — mesmo visual do ranking por valor. */
export default function CartaoRankingPrimeiros({ ranking }) {
  return (
    <div className="card">
      {ranking.map((item, indice) => (
        <div key={item.vendedor.id} className={`${estilos.item} ${indice < 3 ? estilos.top : ''}`}>
          <div className={estilos.posicao}>{indice + 1}</div>
          <div className={estilos.corpo}>
            <div className={estilos.nome}>{item.vendedor.nome}</div>
            <div className={estilos.sub}>bateu a meta</div>
          </div>
          <div className={estilos.valor}>{formatarDataHora(item.quando)}</div>
        </div>
      ))}
    </div>
  )
}
