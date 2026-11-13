import Modal from './Modal'
import VisualizadorComprovante from './VisualizadorComprovante'
import { formatarDataHora, formatarMoeda, formatarNumeroRifa, rotuloPagamento } from '../utils/formato'

/** Todos os dados de uma rifa, com o comprovante já aberto — sem precisar clicar de novo. */
export default function ModalDetalheVenda({ venda, vendedorNome, precoRifa, aoFechar }) {
  return (
    <Modal
      titulo={`Rifa ${formatarNumeroRifa(venda.numero)}`}
      aoFechar={aoFechar}
      rodape={
        <button className="btn" onClick={aoFechar}>
          Fechar
        </button>
      }
    >
      <p className="texto-ajuda">
        <strong>{venda.comprador}</strong>
        {venda.telefone ? ` · ${venda.telefone}` : ''}
      </p>
      <p className="texto-ajuda">
        Vendido por {vendedorNome || 'vendedor não encontrado'} · {formatarDataHora(venda.data)}
      </p>
      <p className="texto-ajuda">
        {formatarMoeda(precoRifa)} · {rotuloPagamento(venda.pagamento)} ·{' '}
        {venda.status === 'pago' ? 'Pago' : 'Pendente'}
        {venda.origem === 'propria' && ' · compra própria'}
      </p>

      {venda.pagamento === 'pix' && (
        <div style={{ marginTop: 14 }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>Comprovante</strong>
          {!venda.comprovantePath && <p className="texto-ajuda">Sem comprovante anexado.</p>}
          {venda.comprovantePath && <VisualizadorComprovante caminho={venda.comprovantePath} />}
        </div>
      )}
    </Modal>
  )
}
