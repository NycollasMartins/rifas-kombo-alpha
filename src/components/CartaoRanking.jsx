import { formatarMoeda } from '../utils/formato'
import estilos from './CartaoRanking.module.css'

/**
 * Ranking de vendedores por valor arrecadado. Os três primeiros ganham
 * o número em destaque âmbar.
 */
export default function CartaoRanking({ ranking }) {
  return (
    <div className="card">
      {ranking.map((item, indice) => (
        <div
          key={item.vendedor.id}
          className={`${estilos.item} ${indice < 3 ? estilos.top : ''}`}
        >
          <div className={estilos.posicao}>{indice + 1}</div>
          <div className={estilos.corpo}>
            <div className={estilos.nome}>{item.vendedor.nome}</div>
            <div className={estilos.sub}>
              {item.quantidade} rifas · {item.percentual}% da meta
            </div>
          </div>
          <div className={estilos.valor}>{formatarMoeda(item.total)}</div>
        </div>
      ))}
    </div>
  )
}
