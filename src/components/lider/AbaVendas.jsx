import { useMemo, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import ModalDetalheVenda from '../ModalDetalheVenda'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { gerarLinkDoComprovante } from '../../lib/db/arquivos'
import { formatarNumeroRifa, rotuloPagamento } from '../../utils/formato'
import { baixarCsvDeVendas } from '../../utils/csv'
import { precoDoVendedor } from '../../utils/calculos'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './AbaVendas.module.css'

/** Todas as rifas do grupo, com filtros, status, repasse e comprovante. */
export default function AbaVendas() {
  const {
    config,
    vendedores,
    vendas,
    buscarVendedor,
    mudarStatusVenda,
    mudarRepasseVenda,
    removerVenda,
  } = useDadosRifa()

  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroPagamento, setFiltroPagamento] = useState('')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [abrindo, setAbrindo] = useState('')
  const [vendoDetalhe, setVendoDetalhe] = useState(null)

  const lista = useMemo(() => {
    const porId = new Map(vendedores.map((v) => [v.id, v]))
    const termo = busca.trim().toLowerCase()

    return vendas
      .filter((venda) => {
        if (filtroStatus && venda.status !== filtroStatus) return false
        if (filtroPagamento === 'pix' && venda.pagamento !== 'pix') return false
        if (filtroPagamento === 'dinheiro' && venda.pagamento !== 'dinheiro') return false
        if (filtroPagamento === 'sem-comprovante') {
          if (venda.pagamento !== 'pix' || venda.comprovantePath) return false
        }
        if (termo) {
          const vendedor = porId.get(venda.vendedorId)
          const alvo = `${venda.comprador} ${vendedor?.nome || ''}`.toLowerCase()
          if (!alvo.includes(termo)) return false
        }
        return true
      })
      .sort((a, b) => b.numero - a.numero)
  }, [vendas, vendedores, filtroStatus, filtroPagamento, busca])

  async function executar(acao) {
    setErro('')
    try {
      await acao()
    } catch (e) {
      setErro(traduzirErro(e))
    }
  }

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
    <>
      <div className="filters">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>

        <select value={filtroPagamento} onChange={(e) => setFiltroPagamento(e.target.value)}>
          <option value="">Todo pagamento</option>
          <option value="pix">Pix</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="sem-comprovante">Pix sem comprovante</option>
        </select>

        <input
          placeholder="Buscar comprador ou vendedor…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="section-head">
        <h2>{lista.length} rifa(s)</h2>
        <button
          className="btn btn-sm"
          onClick={() => baixarCsvDeVendas(vendas, vendedores)}
          disabled={vendas.length === 0}
        >
          Exportar CSV
        </button>
      </div>

      {erro && <p className="error-text">{erro}</p>}

      {lista.length === 0 ? (
        <EstadoVazio icone="🔍">
          <p>Nenhuma rifa encontrada.</p>
        </EstadoVazio>
      ) : (
        lista.map((venda) => {
          const vendedor = buscarVendedor(venda.vendedorId)
          return (
            <div key={venda.id} className={estilos.linha}>
              <span className={estilos.numero}>{formatarNumeroRifa(venda.numero)}</span>

              <div className={estilos.comprador}>
                <strong>{venda.comprador}</strong>
                <span>
                  {vendedor ? vendedor.nome : '—'} · {rotuloPagamento(venda.pagamento)}
                  {venda.origem === 'propria' && ' · própria'}
                </span>
              </div>

              {venda.pagamento === 'pix' &&
                (venda.comprovantePath ? (
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => verComprovante(venda.comprovantePath)}
                    disabled={abrindo === venda.comprovantePath}
                    title="Ver comprovante"
                  >
                    {abrindo === venda.comprovantePath ? '…' : '📎'}
                  </button>
                ) : (
                  <span className={estilos.semComprovante} title="Pix sem comprovante">
                    sem foto
                  </span>
                ))}

              <select
                className={estilos.seletor}
                value={venda.status}
                onChange={(e) => executar(() => mudarStatusVenda(venda.id, e.target.value))}
              >
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </select>

              <select
                className={estilos.seletor}
                value={venda.repasse || 'pendente'}
                onChange={(e) => executar(() => mudarRepasseVenda(venda.id, e.target.value))}
              >
                <option value="pendente">Repasse pendente</option>
                <option value="entregue">Entregue</option>
                <option value="confirmado">Confirmado</option>
              </select>

              <button className="btn-ghost btn-sm" onClick={() => setVendoDetalhe(venda)}>
                Ver
              </button>

              <button
                className="btn-ghost btn-sm btn-danger"
                onClick={() => {
                  if (confirm('Excluir esta rifa?')) executar(() => removerVenda(venda.id))
                }}
              >
                Excluir
              </button>
            </div>
          )
        })
      )}

      {vendoDetalhe && (
        <ModalDetalheVenda
          venda={vendoDetalhe}
          vendedorNome={buscarVendedor(vendoDetalhe.vendedorId)?.nome}
          precoRifa={precoDoVendedor(buscarVendedor(vendoDetalhe.vendedorId), config)}
          aoFechar={() => setVendoDetalhe(null)}
        />
      )}
    </>
  )
}
