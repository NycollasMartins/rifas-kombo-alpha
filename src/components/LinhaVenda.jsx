import EtiquetaStatus from './EtiquetaStatus'
import {
  corDoRepasse,
  formatarNumeroRifa,
  rotuloPagamento,
  rotuloRepasse,
} from '../utils/formato'
import estilos from './LinhaVenda.module.css'

/**
 * Uma rifa na lista do vendedor: número, comprador, status e situação do
 * repasse. Só leitura — quem muda status e repasse é o líder.
 */
export default function LinhaVenda({ venda, nomeDoVendedor }) {
  return (
    <div className={estilos.linha}>
      <span className={estilos.numero}>{formatarNumeroRifa(venda.numero)}</span>

      <div className={estilos.comprador}>
        <strong>{venda.comprador}</strong>
        <span>
          {venda.telefone ? venda.telefone + ' · ' : ''}
          {rotuloPagamento(venda.pagamento)}
        </span>
      </div>

      {nomeDoVendedor && <span className={estilos.vendedorMini}>{nomeDoVendedor}</span>}

      <EtiquetaStatus status={venda.status} />

      <span className={estilos.repasse} style={{ color: corDoRepasse(venda.repasse) }}>
        {rotuloRepasse(venda.repasse)}
      </span>
    </div>
  )
}
