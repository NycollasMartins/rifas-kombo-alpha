import { useMemo, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import EtiquetaSituacao from '../EtiquetaSituacao'
import ModalVendedor from '../ModalVendedor'
import ModalVendasDoVendedor from '../ModalVendasDoVendedor'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { useSessao } from '../../hooks/useSessao'
import { precoDoVendedor, resumoDoVendedor, vendasDoVendedor } from '../../utils/calculos'
import { rotuloDoTipoPlural } from '../../utils/grupos'
import { formatarMoeda } from '../../utils/formato'
import { baixarCsvDeVendedores } from '../../utils/csv'
import { rifasParaFecharMeta } from '../../utils/prazo'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './AbaVendedores.module.css'

/** Os vendedores do grupo: cadastro, termo, vendas e fechamento de meta. */
export default function AbaVendedores() {
  const {
    config,
    vendedores: todosDoGrupo,
    vendas,
    dadosPrivados,
    removerVendedor,
    fecharMeta,
    marcarComoFinalizado,
  } = useDadosRifa()
  const { grupo } = useSessao()

  // Quem já finalizou (meta fechada) some daqui — o aviso pro outro sistema
  // dispara sozinho no banco nesse momento, ver avisar_vendedor_finalizado
  // no schema.sql.
  const vendedores = useMemo(
    () => todosDoGrupo.filter((v) => v.situacao !== 'quitou'),
    [todosDoGrupo]
  )

  const [emEdicao, setEmEdicao] = useState(null) // 'novo' | vendedor
  const [vendoVendasDe, setVendoVendasDe] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('') // '' = todos

  const doTipo = useMemo(
    () => (filtroTipo ? vendedores.filter((v) => v.tipo === filtroTipo) : vendedores),
    [vendedores, filtroTipo]
  )
  const rotuloDoTipo = {
    '': '',
    adolescente: ` (${rotuloDoTipoPlural(grupo).toLowerCase()})`,
    voluntario: ' (voluntários)',
  }[filtroTipo]

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return doTipo
    return doTipo.filter((v) =>
      `${v.nome} ${v.email} ${v.telefone}`.toLowerCase().includes(termo)
    )
  }, [doTipo, busca])

  async function excluir(vendedor) {
    const quantidade = vendasDoVendedor(vendas, vendedor.id).length
    if (quantidade > 0) {
      alert(
        `${vendedor.nome} já tem ${quantidade} rifa(s) registrada(s) e não pode ser excluído — ` +
          'o registro desse dinheiro precisa continuar existindo.\n\n' +
          'Se ele não vai mais ao acampamento, edite e marque a situação como "Desistiu".'
      )
      return
    }
    if (!confirm(`Excluir ${vendedor.nome}?`)) return

    setErro('')
    try {
      await removerVendedor(vendedor.id)
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível excluir o vendedor.'))
    }
  }

  /**
   * Fecha a conta do vendedor. Se ainda faltava bater a meta, registra as
   * rifas que faltam no nome dele (fluxo de sempre); se ele já tinha batido
   * sozinho, só confirma e muda a situação — os dois casos terminam em
   * "quitou", que é o que avisa o outro sistema.
   */
  async function fechar(resumo) {
    const preco = precoDoVendedor(resumo.vendedor, config)

    if (resumo.faltante > 0) {
      const quantas = rifasParaFecharMeta(resumo.faltante, preco)
      const confirmacao =
        `${resumo.vendedor.nome} arrecadou ${formatarMoeda(resumo.total)} de ` +
        `${formatarMoeda(resumo.meta)}.\n\n` +
        `Registrar ${quantas} rifa(s) no nome dele, totalizando ` +
        `${formatarMoeda(quantas * preco)}?\n\n` +
        'São rifas de verdade: entram no sorteio e no CSV.'
      if (!confirm(confirmacao)) return

      setErro('')
      setOcupado(resumo.vendedor.id)
      try {
        await fecharMeta(resumo.vendedor.id)
      } catch (e) {
        setErro(traduzirErro(e, 'Não foi possível fechar a meta.'))
      } finally {
        setOcupado('')
      }
      return
    }

    if (!confirm(`${resumo.vendedor.nome} já bateu a meta. Marcar como finalizado?`)) return

    setErro('')
    setOcupado(resumo.vendedor.id)
    try {
      await marcarComoFinalizado(resumo.vendedor.id)
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível finalizar.'))
    } finally {
      setOcupado('')
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Vendedores ({filtrados.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-sm"
            onClick={() =>
              baixarCsvDeVendedores(
                doTipo,
                vendas,
                config,
                dadosPrivados,
                `rifas-vendedores${filtroTipo ? '-' + filtroTipo + 's' : ''}.csv`
              )
            }
            disabled={doTipo.length === 0}
          >
            Exportar CSV{rotuloDoTipo}
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setEmEdicao('novo')}>
            + Adicionar
          </button>
        </div>
      </div>

      {vendedores.length > 0 && (
        <div className="filters">
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="adolescente">{rotuloDoTipoPlural(grupo)}</option>
            <option value="voluntario">Voluntários</option>
          </select>
          <input
            placeholder="Buscar por nome, e-mail ou telefone…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}

      {erro && <p className="error-text">{erro}</p>}

      {vendedores.length === 0 ? (
        <EstadoVazio icone="👤">
          <p>Nenhum vendedor cadastrado.</p>
          <p>Cadastre com o e-mail de cada um para que possam entrar.</p>
        </EstadoVazio>
      ) : filtrados.length === 0 ? (
        <EstadoVazio icone="🔍">
          <p>Nenhum vendedor encontrado.</p>
        </EstadoVazio>
      ) : (
        <div className="card">
          {filtrados.map((vendedor) => {
            const resumo = resumoDoVendedor(vendedor, vendas, config)
            const temTermo =
              Boolean(dadosPrivados[vendedor.id]?.termoPath) || Boolean(vendedor.termoDigitalEm)
            const podeFechar = vendedor.situacao === 'ativo'

            return (
              <div key={vendedor.id} className={estilos.linha}>
                <div className={estilos.info}>
                  <div className={estilos.nome}>
                    {vendedor.nome}
                    <EtiquetaSituacao situacao={vendedor.situacao} />
                    {vendedor.tipo === 'voluntario' && <span className="tag">Voluntário</span>}
                    {!temTermo && <span className={estilos.alerta}>sem termo</span>}
                    {!vendedor.temSenha && <span className={estilos.alerta}>não entrou ainda</span>}
                  </div>
                  <div className={estilos.detalhe}>
                    {vendedor.email}
                    {vendedor.telefone && ` · ${vendedor.telefone}`}
                  </div>
                  <div className={estilos.detalhe}>
                    {formatarMoeda(resumo.total)} de {formatarMoeda(resumo.meta)} ·{' '}
                    {resumo.quantidade} rifas
                    {resumo.quantidadePropria > 0 && ` (${resumo.quantidadePropria} próprias)`}
                  </div>
                  {podeFechar && resumo.faltante > 0 && (
                    <div className={estilos.faltante}>
                      faltam {formatarMoeda(resumo.faltante)} ·{' '}
                      {rifasParaFecharMeta(resumo.faltante, precoDoVendedor(vendedor, config))} rifas
                    </div>
                  )}
                </div>

                <div className={estilos.acoes}>
                  <button className="btn btn-sm" onClick={() => setVendoVendasDe(vendedor)}>
                    Ver vendas
                  </button>
                  {podeFechar && (
                    <button
                      className="btn btn-sm"
                      onClick={() => fechar(resumo)}
                      disabled={ocupado === vendedor.id}
                    >
                      {ocupado === vendedor.id
                        ? '…'
                        : resumo.faltante > 0
                          ? 'Fechar meta'
                          : 'Finalizar'}
                    </button>
                  )}
                  <button className="btn-ghost btn-sm" onClick={() => setEmEdicao(vendedor)}>
                    Editar
                  </button>
                  <button className="btn-ghost btn-sm btn-danger" onClick={() => excluir(vendedor)}>
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {emEdicao && (
        <ModalVendedor
          vendedor={emEdicao === 'novo' ? null : emEdicao}
          aoFechar={() => setEmEdicao(null)}
        />
      )}

      {vendoVendasDe && (
        <ModalVendasDoVendedor
          vendedor={vendoVendasDe}
          aoFechar={() => setVendoVendasDe(null)}
        />
      )}
    </>
  )
}
