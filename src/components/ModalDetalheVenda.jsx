import { useEffect, useState } from 'react'
import Modal from './Modal'
import { gerarLinkDoComprovante } from '../lib/db/arquivos'
import { formatarDataHora, formatarMoeda, formatarNumeroRifa, rotuloPagamento } from '../utils/formato'

/** Todos os dados de uma rifa, com o comprovante já aberto — sem precisar clicar de novo. */
export default function ModalDetalheVenda({ venda, vendedorNome, precoRifa, aoFechar }) {
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (venda.pagamento === 'pix' && venda.comprovantePath) {
      gerarLinkDoComprovante(venda.comprovantePath)
        .then(setLink)
        .catch((e) => setErro(e.message))
    }
  }, [venda.comprovantePath, venda.pagamento])

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
        Vendido por {vendedorNome || '—'} · {formatarDataHora(venda.data)}
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
          {erro && <p className="error-text">{erro}</p>}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer">
              <img
                src={link}
                alt="Comprovante do Pix"
                style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--line)' }}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="btn btn-sm" style={{ display: 'inline-block', marginTop: 8 }}>
                Abrir em nova aba
              </span>
            </a>
          )}
        </div>
      )}
    </Modal>
  )
}
