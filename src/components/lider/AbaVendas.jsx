import { useDeferredValue, useMemo, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import ModalDetalheVenda from '../ModalDetalheVenda'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import ModalComprovante from '../ModalComprovante'
import { formatarNumeroRifa, rotuloPagamento } from '../../utils/formato'
import { baixarCsvDeVendas } from '../../utils/csv'
import { precoDoVendedor } from '../../utils/calculos'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './AbaVendas.module.css'

// Com milhares de rifas, desenhar todas de uma vez (cada uma com dois
// seletores) travava o celular a cada letra digitada na busca e a cada
// atualização. Mostra um pedaço e vai abrindo mais conforme pedem.
const POR_VEZ = 50

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
  const [vendoComprovante, setVendoComprovante] = useState(null)
  const [vendoDetalhe, setVendoDetalhe] = useState(null)
  const [limite, setLimite] = useState(POR_VEZ)

  // a busca filtra milhares de linhas: o campo responde na hora e a lista
  // acompanha logo depois, sem segurar o teclado
  const buscaAdiada = useDeferredValue(busca)

  const porId = useMemo(() => new Map(vendedores.map((v) => [v.id, v])), [vendedores])

  const lista = useMemo(() => {
    const termo = buscaAdiada.trim().toLowerCase()

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
  }, [vendas, porId, filtroStatus, filtroPagamento, buscaAdiada])

  // mudou o filtro? volta a mostrar só o começo da lista nova
  const chaveFiltro = `${filtroStatus}|${filtroPagamento}|${buscaAdiada}`
  const [filtroAnterior, setFiltroAnterior] = useState(chaveFiltro)
  if (filtroAnterior !== chaveFiltro) {
    setFiltroAnterior(chaveFiltro)
    setLimite(POR_VEZ)
  }
  const visiveis = lista.length > limite ? lista.slice(0, limite) : lista

  async function executar(acao) {
    setErro('')
    try {
      await acao()
    } catch (e) {
      setErro(traduzirErro(e))
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
        visiveis.map((venda) => {
          const vendedor = porId.get(venda.vendedorId)
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
                    onClick={() => setVendoComprovante(venda)}
                    title="Ver comprovante"
                  >
                    📎
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

      {lista.length > visiveis.length && (
        <button
          className="btn btn-block"
          style={{ marginTop: 8 }}
          onClick={() => setLimite((l) => l + POR_VEZ * 2)}
        >
          Mostrar mais ({lista.length - visiveis.length} restante(s))
        </button>
      )}

      {vendoComprovante && (
        <ModalComprovante
          caminho={vendoComprovante.comprovantePath}
          detalhe={`Rifa ${formatarNumeroRifa(vendoComprovante.numero)} · ${vendoComprovante.comprador}`}
          aoFechar={() => setVendoComprovante(null)}
        />
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
