import { useMemo, useState } from 'react'
import Modal from './Modal'
import EtiquetaStatus from './EtiquetaStatus'
import EstadoVazio from './EstadoVazio'
import BotoesDoWhatsapp from './BotoesDoWhatsapp'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { agruparPorLote } from '../lib/db/vendas'
import { gerarLinkDoComprovante } from '../lib/db/arquivos'
import { montarMensagemDaCompra } from '../utils/whatsapp'
import { formatarDataHora, formatarMoeda, formatarNumeroRifa, rotuloPagamento } from '../utils/formato'
import { vendasDoVendedor } from '../utils/calculos'
import estilos from './ModalVendasDoVendedor.module.css'

/**
 * As vendas de um vendedor, agrupadas por compra.
 *
 * É aqui que a liderança confere o dinheiro: cada compra por Pix mostra o
 * comprovante que o vendedor anexou, e as em dinheiro ficam marcadas como
 * declaradas por ele.
 */
export default function ModalVendasDoVendedor({ vendedor, aoFechar }) {
  const { config, vendas } = useDadosRifa()
  const [abrindo, setAbrindo] = useState('')
  const [erro, setErro] = useState('')

  const lotes = useMemo(
    () => agruparPorLote(vendasDoVendedor(vendas, vendedor.id)),
    [vendas, vendedor.id]
  )

  async function verComprovante(caminho) {
    setErro('')
    setAbrindo(caminho)
    try {
      window.open(await gerarLinkDoComprovante(caminho), '_blank', 'noopener')
    } catch (e) {
      setErro(e.message)
    } finally {
      setAbrindo('')
    }
  }

  return (
    <Modal
      titulo={`Vendas de ${vendedor.nome}`}
      aoFechar={aoFechar}
      rodape={
        <button className="btn" onClick={aoFechar}>
          Fechar
        </button>
      }
    >
      {erro && <p className="error-text">{erro}</p>}

      {lotes.length === 0 ? (
        <EstadoVazio icone="🎫">
          <p>Este vendedor ainda não registrou nenhuma rifa.</p>
        </EstadoVazio>
      ) : (
        lotes.map((lote) => {
          const v = lote.primeira
          const valor = lote.rifas.length * config.precoRifa
          return (
            <div key={lote.loteId} className={estilos.compra}>
              <div className={estilos.topo}>
                <div>
                  <strong className={estilos.comprador}>{v.comprador}</strong>
                  <span className={estilos.quando}>{formatarDataHora(v.data)}</span>
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

              <div className={estilos.rodape}>
                <EtiquetaStatus status={v.status} />
                <span className={estilos.pagamento}>{rotuloPagamento(v.pagamento)}</span>
                {v.telefone && <span className={estilos.telefone}>{v.telefone}</span>}
                {v.origem === 'propria' && <span className="tag">Compra própria</span>}
              </div>

              {v.origem !== 'propria' && (
                <div className={estilos.envio}>
                  <BotoesDoWhatsapp
                    telefone={v.telefone}
                    mensagem={montarMensagemDaCompra({
                      comprador: v.comprador,
                      numeros: lote.rifas.map((r) => r.numero),
                      valorTotal: valor,
                      nomeDoVendedor: vendedor.nome,
                      grupo: vendedor.grupo,
                      pagamentoPendente: v.status === 'pendente',
                      premio: config.premio,
                    })}
                    compacto
                  />
                </div>
              )}

              {v.pagamento === 'pix' ? (
                v.comprovantePath ? (
                  <button
                    className="btn btn-sm"
                    onClick={() => verComprovante(v.comprovantePath)}
                    disabled={abrindo === v.comprovantePath}
                  >
                    {abrindo === v.comprovantePath ? 'Abrindo…' : '📎 Ver comprovante'}
                  </button>
                ) : (
                  <span className={estilos.semComprovante}>Pix sem comprovante anexado</span>
                )
              ) : (
                <span className={estilos.emDinheiro}>
                  Dinheiro — o vendedor declarou que recebeu
                </span>
              )}
            </div>
          )
        })
      )}
    </Modal>
  )
}
