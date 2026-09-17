import { useState } from 'react'
import EtiquetaStatus from './EtiquetaStatus'
import BotoesDoWhatsapp from './BotoesDoWhatsapp'
import ModalCompletarVenda from './ModalCompletarVenda'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { montarMensagemDaCompra } from '../utils/whatsapp'
import {
  corDoRepasse,
  formatarDataHora,
  formatarMoeda,
  formatarNumeroRifa,
  rotuloPagamento,
  rotuloRepasse,
} from '../utils/formato'
import estilos from './CompraDoVendedor.module.css'

/**
 * Uma compra na lista do vendedor: as rifas que a pessoa levou de uma vez,
 * com o botão de reenviar os números pelo WhatsApp.
 *
 * Agrupado por compra, e não uma linha por rifa, porque agora alguém pode
 * levar dez de uma vez — dez linhas iguais só atrapalhariam.
 */
export default function CompraDoVendedor({ lote, precoRifa, nomeDoVendedor, grupo }) {
  const { config } = useDadosRifa()
  const [completando, setCompletando] = useState(false)
  const v = lote.primeira
  const valor = lote.rifas.length * precoRifa

  // falta marcar como pago, ou é Pix sem comprovante — e o repasse ainda não
  // começou a ser conferido pela liderança (regra que o banco também aplica)
  const faltaCompletar =
    v.origem !== 'propria' &&
    v.repasse === 'pendente' &&
    (v.status === 'pendente' || (v.pagamento === 'pix' && !v.comprovantePath))

  return (
    <div className={estilos.compra}>
      <div className={estilos.topo}>
        <div className={estilos.quem}>
          <strong>{v.comprador}</strong>
          <span>
            {v.telefone ? v.telefone + ' · ' : ''}
            {rotuloPagamento(v.pagamento)} · {formatarDataHora(v.data)}
          </span>
        </div>
        <span className={estilos.valor}>{formatarMoeda(valor)}</span>
      </div>

      <div className={estilos.numeros}>
        {lote.rifas.map((r) => (
          <span key={r.id} className={estilos.numero}>
            {formatarNumeroRifa(r.numero)}
          </span>
        ))}
      </div>

      <div className={estilos.marcadores}>
        <EtiquetaStatus status={v.status} />
        <span style={{ color: corDoRepasse(v.repasse), fontSize: 11.5 }}>
          {rotuloRepasse(v.repasse)}
        </span>
        {v.origem === 'propria' && <span className="tag">Comprada por você</span>}
        {v.pagamento === 'pix' && !v.comprovantePath && (
          <span className={estilos.semComprovante}>sem comprovante</span>
        )}
      </div>

      {v.origem !== 'propria' && (
        <BotoesDoWhatsapp
          telefone={v.telefone}
          mensagem={montarMensagemDaCompra({
            comprador: v.comprador,
            numeros: lote.rifas.map((r) => r.numero),
            valorTotal: valor,
            nomeDoVendedor,
            grupo,
            pagamentoPendente: v.status === 'pendente',
            premio: config.premio,
          })}
          compacto
        />
      )}

      {faltaCompletar && (
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginTop: 8 }}
          onClick={() => setCompletando(true)}
        >
          Editar
        </button>
      )}

      {completando && (
        <ModalCompletarVenda
          lote={lote}
          precoRifa={precoRifa}
          grupo={grupo}
          aoFechar={() => setCompletando(false)}
        />
      )}
    </div>
  )
}
