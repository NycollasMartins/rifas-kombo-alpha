import { useMemo, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import ModalEditarVenda from '../ModalEditarVenda'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { formatarDataHora, formatarNumeroRifa, rotuloPagamento } from '../../utils/formato'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './AbaManutencao.module.css'

/**
 * Aba do dev. É o conserto de erro: corrigir uma venda registrada errado,
 * transferir as rifas de um vendedor para outro.
 *
 * Esta tela só aparece para quem tem papel "dev", mas quem realmente segura a
 * porta é o banco — esconder o botão não impediria ninguém de chamar a API.
 */
export default function AbaManutencao() {
  const { vendedores, vendas, buscarVendedor, passarVendasPara } = useDadosRifa()

  const [busca, setBusca] = useState('')
  const [vendaEmEdicao, setVendaEmEdicao] = useState(null)
  const [de, setDe] = useState('')
  const [para, setPara] = useState('')
  const [recado, setRecado] = useState(null)
  const [transferindo, setTransferindo] = useState(false)

  const encontradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return []

    const porNumero = termo.replace(/\D/g, '')
    return vendas
      .filter((v) => {
        if (porNumero && String(v.numero) === String(Number(porNumero))) return true
        if (v.comprador.toLowerCase().includes(termo)) return true
        const vendedor = buscarVendedor(v.vendedorId)
        return Boolean(vendedor && vendedor.nome.toLowerCase().includes(termo))
      })
      .sort((a, b) => b.numero - a.numero)
      .slice(0, 30)
  }, [busca, vendas, buscarVendedor])

  async function transferir() {
    const origem = buscarVendedor(de)
    const destino = buscarVendedor(para)
    if (!origem || !destino) {
      setRecado({ tipo: 'erro', texto: 'Escolha os dois vendedores.' })
      return
    }
    if (de === para) {
      setRecado({ tipo: 'erro', texto: 'Escolha dois vendedores diferentes.' })
      return
    }

    const quantas = vendas.filter((v) => v.vendedorId === de).length
    if (!confirm(`Passar ${quantas} rifa(s) de ${origem.nome} para ${destino.nome}?`)) return

    setTransferindo(true)
    setRecado(null)
    try {
      const total = await passarVendasPara(de, para)
      setRecado({
        tipo: 'ok',
        texto: `${total} rifa(s) passaram de ${origem.nome} para ${destino.nome}.`,
      })
      setDe('')
      setPara('')
    } catch (e) {
      setRecado({ tipo: 'erro', texto: traduzirErro(e, 'Não foi possível transferir.') })
    } finally {
      setTransferindo(false)
    }
  }

  return (
    <>
      <div className={estilos.aviso}>
        <strong>Modo dev.</strong> Aqui dá para reescrever dados já registrados. Use quando algo
        foi lançado errado — não para o dia a dia.
      </div>

      <div className="card">
        <h2>Corrigir uma venda</h2>
        <p className="texto-ajuda">
          Busque pelo número da rifa, pelo comprador ou pelo vendedor. Você pode mudar qualquer
          campo, inclusive de quem é a venda e o número da rifa.
        </p>
        <div className="field">
          <input
            placeholder="Ex: 42, Maria, João"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {busca.trim() && encontradas.length === 0 && (
          <EstadoVazio icone="🔍">
            <p>Nenhuma rifa encontrada.</p>
          </EstadoVazio>
        )}

        {encontradas.map((venda) => {
          const vendedor = buscarVendedor(venda.vendedorId)
          return (
            <div key={venda.id} className={estilos.resultado}>
              <span className={estilos.numero}>{formatarNumeroRifa(venda.numero)}</span>
              <div className={estilos.dados}>
                <strong>{venda.comprador}</strong>
                <span>
                  {venda.grupo} · {vendedor ? vendedor.nome : '—'} ·{' '}
                  {rotuloPagamento(venda.pagamento)} ·{' '}
                  {venda.status === 'pago' ? 'Pago' : 'Pendente'}
                  {venda.origem === 'propria' && ' · compra própria'}
                </span>
                <span className={estilos.quando}>{formatarDataHora(venda.data)}</span>
              </div>
              <button className="btn btn-sm" onClick={() => setVendaEmEdicao(venda)}>
                Corrigir
              </button>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h2>Transferir rifas entre vendedores</h2>
        <p className="texto-ajuda">
          Para quando as rifas foram registradas no nome errado, ou quando alguém precisa sair da
          lista sem que o histórico se perca.
        </p>

        <div className="field">
          <label htmlFor="mt-de">Tirar de</label>
          <select id="mt-de" value={de} onChange={(e) => setDe(e.target.value)}>
            <option value="">Escolha…</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.grupo} · {v.nome} ({vendas.filter((s) => s.vendedorId === v.id).length} rifas)
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="mt-para">Passar para</label>
          <select id="mt-para" value={para} onChange={(e) => setPara(e.target.value)}>
            <option value="">Escolha…</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.grupo} · {v.nome}
              </option>
            ))}
          </select>
        </div>

        {recado && (
          <p
            className="error-text"
            style={{ color: recado.tipo === 'ok' ? 'var(--good)' : 'var(--bad)' }}
          >
            {recado.texto}
          </p>
        )}

        <button className="btn btn-primary" onClick={transferir} disabled={transferindo}>
          {transferindo ? 'Transferindo…' : 'Transferir'}
        </button>
      </div>

      {vendaEmEdicao && (
        <ModalEditarVenda venda={vendaEmEdicao} aoFechar={() => setVendaEmEdicao(null)} />
      )}
    </>
  )
}
