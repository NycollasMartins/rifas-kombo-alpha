import { useMemo, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import EtiquetaStatus from '../EtiquetaStatus'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { agruparPorLote } from '../../lib/db/vendas'
import ModalComprovante from '../ModalComprovante'
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
  const { config, vendas, buscarVendedor, mudarStatusDoLote, removerLote } = useDadosRifa()
  const [vendoLote, setVendoLote] = useState(null)
  const [confirmando, setConfirmando] = useState('')
  const [erro, setErro] = useState('')

  // os que ainda precisam ser conferidos vêm primeiro
  const lotes = useMemo(() => {
    const todos = agruparPorLote(vendas.filter((v) => v.origem === 'apadrinhamento'))
    const pendente = (l) => l.rifas.some((r) => r.status === 'pendente')
    return [...todos.filter(pendente), ...todos.filter((l) => !pendente(l))]
  }, [vendas])
  const qtdPendentes = lotes.filter((l) => l.rifas.some((r) => r.status === 'pendente')).length

  const totalConfirmado = useMemo(
    () =>
      lotes.reduce((soma, lote) => {
        if (lote.primeira.status !== 'pago') return soma
        const vendedor = buscarVendedor(lote.primeira.vendedorId)
        return soma + lote.rifas.length * (vendedor ? precoDoVendedor(vendedor, config) : 0)
      }, 0),
    [lotes, buscarVendedor, config]
  )

  async function confirmarPagamento(lote) {
    if (confirmando) return
    setErro('')
    setConfirmando(lote.loteId)
    try {
      await mudarStatusDoLote(lote.loteId, 'pago')
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível confirmar o pagamento.'))
    } finally {
      setConfirmando('')
    }
  }

  // comprovante falso, de outro valor ou Pix que nunca chegou: apaga as
  // rifas desse apadrinhamento (e o vendedor volta a aparecer na lista)
  async function recusar(lote, valor) {
    if (confirmando) return
    const v = lote.primeira
    const ok = window.confirm(
      `Recusar o apadrinhamento de ${v.comprador} (${lote.rifas.length} rifa(s), ${formatarMoeda(valor)})?\n\n` +
        'As rifas desse apadrinhamento serão apagadas. Use quando o Pix não chegou ou o comprovante não confere.'
    )
    if (!ok) return
    setErro('')
    setConfirmando(lote.loteId)
    try {
      await removerLote(lote.loteId)
      setVendoLote((atual) => (atual?.loteId === lote.loteId ? null : atual))
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível recusar este apadrinhamento.'))
    } finally {
      setConfirmando('')
    }
  }

  function valorDoLote(lote) {
    const vendedor = buscarVendedor(lote.primeira.vendedorId)
    return lote.rifas.length * (vendedor ? precoDoVendedor(vendedor, config) : 0)
  }

  return (
    <>
      <div className="section-head">
        <h2>
          Apadrinhamento ({lotes.length}
          {qtdPendentes > 0 ? `, ${qtdPendentes} para conferir` : ''})
        </h2>
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
            const valor = valorDoLote(lote)
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
                    <button className="btn btn-sm" onClick={() => setVendoLote(lote)}>
                      📎 Ver comprovante
                    </button>
                  ) : (
                    <span className={estilos.semComprovante}>Sem comprovante anexado</span>
                  )}
                  {v.status === 'pendente' && (
                    <>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => confirmarPagamento(lote)}
                        disabled={Boolean(confirmando)}
                      >
                        {confirmando === lote.loteId ? 'Salvando…' : 'Confirmar pagamento'}
                      </button>
                      <button
                        className="btn-ghost btn-sm btn-danger"
                        onClick={() => recusar(lote, valor)}
                        disabled={Boolean(confirmando)}
                      >
                        Recusar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {vendoLote && (
        <ComprovanteDoLote
          lote={vendas.length ? lotes.find((l) => l.loteId === vendoLote.loteId) || vendoLote : vendoLote}
          vendedor={buscarVendedor(vendoLote.primeira.vendedorId)}
          valor={valorDoLote(vendoLote)}
          confirmando={confirmando === vendoLote.loteId}
          aoConfirmar={confirmarPagamento}
          aoRecusar={recusar}
          aoFechar={() => setVendoLote(null)}
        />
      )}
    </>
  )
}

/** O comprovante de um apadrinhamento, já com o botão de confirmar ali mesmo. */
function ComprovanteDoLote({ lote, vendedor, valor, confirmando, aoConfirmar, aoRecusar, aoFechar }) {
  const v = lote.primeira
  const pendente = lote.rifas.some((r) => r.status === 'pendente')
  return (
    <ModalComprovante
      caminho={v.comprovantePath}
      detalhe={
        <>
          <strong>{v.comprador}</strong> apadrinhou{' '}
          <strong>{vendedor ? vendedor.nome : '(vendedor removido)'}</strong> ·{' '}
          {lote.rifas.length} rifa{lote.rifas.length > 1 ? 's' : ''}
          <br />
          Confira se o comprovante é de <strong>{formatarMoeda(valor)}</strong>
          {vendedor ? (
            <>
              {' '}
              e se o Pix foi para a conta de <strong>{vendedor.nome}</strong> (ou do responsável)
            </>
          ) : null}
          .
        </>
      }
      acoes={
        pendente ? (
          <>
            <button
              className="btn btn-primary btn-block"
              onClick={() => aoConfirmar(lote)}
              disabled={confirmando}
            >
              {confirmando ? 'Salvando…' : 'Confirmar pagamento'}
            </button>
            <button
              className="btn btn-block btn-danger"
              onClick={() => aoRecusar(lote, valor)}
              disabled={confirmando}
            >
              Recusar (não confere)
            </button>
          </>
        ) : (
          <span className="tag tag-good" style={{ alignSelf: 'center' }}>
            Pago ✓
          </span>
        )
      }
      aoFechar={aoFechar}
    />
  )
}
