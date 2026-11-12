import { useMemo, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import EtiquetaStatus from '../EtiquetaStatus'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { agruparPorLote } from '../../lib/db/vendas'
import { gerarLinkDoComprovante } from '../../lib/db/arquivos'
import { precoDoVendedor } from '../../utils/calculos'
import { formatarDataHora, formatarMoeda, formatarNumeroRifa } from '../../utils/formato'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './AbaApadrinhamento.module.css'

/**
 * Quem apadrinhou quem — todas as compras feitas pelo formulário público
 * (/apadrinhar), com os dados de quem comprou, pra quem e quanto.
 *
 * Nasce sempre 'pendente' (não tem gateway de pagamento) — confirmar aqui é
 * o mesmo "conferir o Pix" que já existe pras vendas normais, só que
 * reunido numa lista só, em vez de misturado com todas as outras vendas.
 */
export default function AbaApadrinhamento() {
  const { config, vendas, buscarVendedor, mudarStatusVenda } = useDadosRifa()
  const [abrindo, setAbrindo] = useState('')
  const [confirmando, setConfirmando] = useState('')
  const [erro, setErro] = useState('')

  const lotes = useMemo(
    () => agruparPorLote(vendas.filter((v) => v.origem === 'apadrinhamento')),
    [vendas]
  )

  const totalConfirmado = useMemo(
    () =>
      lotes.reduce((soma, lote) => {
        if (lote.primeira.status !== 'pago') return soma
        const vendedor = buscarVendedor(lote.primeira.vendedorId)
        return soma + lote.rifas.length * (vendedor ? precoDoVendedor(vendedor, config) : 0)
      }, 0),
    [lotes, buscarVendedor, config]
  )

  async function verComprovante(caminho) {
    setErro('')
    setAbrindo(caminho)
    try {
      window.open(await gerarLinkDoComprovante(caminho), '_blank', 'noopener')
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível abrir o comprovante.'))
    } finally {
      setAbrindo('')
    }
  }

  async function confirmarPagamento(lote) {
    setErro('')
    setConfirmando(lote.loteId)
    try {
      await Promise.all(lote.rifas.map((r) => mudarStatusVenda(r.id, 'pago')))
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível confirmar o pagamento.'))
    } finally {
      setConfirmando('')
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Apadrinhamento ({lotes.length})</h2>
      </div>

      {lotes.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className={estilos.resumo}>
            <span className={`display ${estilos.resumoValor}`}>
              {formatarMoeda(totalConfirmado)}
            </span>
            <span className="texto-ajuda">arrecadado e já confirmado pelo apadrinhamento</span>
          </div>
        </div>
      )}

      {erro && <p className="error-text">{erro}</p>}

      {lotes.length === 0 ? (
        <EstadoVazio icone="🙏">
          <p>Ninguém apadrinhou ninguém ainda.</p>
          <p>Mande o link de /apadrinhar pra quem quiser ajudar.</p>
        </EstadoVazio>
      ) : (
        <div className="card">
          {lotes.map((lote) => {
            const v = lote.primeira
            const vendedor = buscarVendedor(v.vendedorId)
            const valor = lote.rifas.length * (vendedor ? precoDoVendedor(vendedor, config) : 0)
            return (
              <div key={lote.loteId} className={estilos.item}>
                <div className={estilos.topo}>
                  <div>
                    <strong>{v.comprador}</strong>
                    <span className={estilos.quando}> · {formatarDataHora(v.data)}</span>
                  </div>
                  <span className={estilos.valor}>{formatarMoeda(valor)}</span>
                </div>

                <div className={estilos.detalhe}>
                  apadrinhou{' '}
                  <strong>{vendedor ? vendedor.nome : '(vendedor removido)'}</strong> ·{' '}
                  {lote.rifas.length} rifa{lote.rifas.length > 1 ? 's' : ''}
                  {v.telefone && ` · ${v.telefone}`}
                </div>

                <div className={estilos.numeros}>
                  {lote.rifas.map((r) => (
                    <span key={r.id} className={estilos.numero}>
                      {formatarNumeroRifa(r.numero)}
                    </span>
                  ))}
                </div>

                <div className={estilos.acoes}>
                  <EtiquetaStatus status={v.status} />
                  {v.comprovantePath ? (
                    <button
                      className="btn btn-sm"
                      onClick={() => verComprovante(v.comprovantePath)}
                      disabled={abrindo === v.comprovantePath}
                    >
                      {abrindo === v.comprovantePath ? 'Abrindo…' : '📎 Ver comprovante'}
                    </button>
                  ) : (
                    <span className={estilos.semComprovante}>Sem comprovante anexado</span>
                  )}
                  {v.status === 'pendente' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => confirmarPagamento(lote)}
                      disabled={confirmando === lote.loteId}
                    >
                      {confirmando === lote.loteId ? 'Confirmando…' : 'Confirmar pagamento'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
