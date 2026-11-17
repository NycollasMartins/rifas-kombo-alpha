import { useMemo, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import EtiquetaSituacao from '../EtiquetaSituacao'
import ModalVendedor from '../ModalVendedor'
import ModalVendasDoVendedor from '../ModalVendasDoVendedor'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { useSessao } from '../../hooks/useSessao'
import { precoDoVendedor, resumoDoVendedor, vendasDoVendedor } from '../../utils/calculos'
import { GRUPOS, rotuloDoTipoPlural } from '../../utils/grupos'
import { formatarMoeda } from '../../utils/formato'
import { baixarCsvDeVendedores } from '../../utils/csv'
import { rifasParaFecharMeta } from '../../utils/prazo'
import { bateBusca } from '../../utils/busca'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './AbaVendedores.module.css'

/** Os vendedores do grupo: cadastro, termo, vendas e fechamento de meta. */
export default function AbaVendedores() {
  const {
    config,
    vendedores: comRemovidos,
    vendas,
    dadosPrivados,
    removerVendedor,
    fecharMeta,
    marcarComoFinalizado,
  } = useDadosRifa()
  const { grupo } = useSessao()

  // Quem foi excluído depois de já ter vendido continua no banco só pra dar
  // nome às rifas dele (aba Vendas, sorteio, CSV). Aqui ele não aparece mais.
  const todosDoGrupo = useMemo(() => comRemovidos.filter((v) => !v.removido), [comRemovidos])

  const [mostrarFinalizados, setMostrarFinalizados] = useState(false)

  // Quem já finalizou (meta fechada) some daqui por padrão — o aviso pro
  // outro sistema dispara sozinho no banco nesse momento, ver
  // avisar_vendedor_finalizado no schema.sql — mas a venda continua salva;
  // "Mostrar quem já finalizou" troca pra ver SÓ quem já finalizou (não
  // mistura com quem ainda está vendendo), já que é a única forma de ver
  // essas vendas de novo (Ver vendas só existe nesta lista).
  const vendedores = useMemo(
    () =>
      todosDoGrupo.filter((v) =>
        mostrarFinalizados ? v.situacao === 'quitou' : v.situacao !== 'quitou'
      ),
    [todosDoGrupo, mostrarFinalizados]
  )

  const [emEdicao, setEmEdicao] = useState(null) // 'novo' | vendedor
  const [vendoVendasDe, setVendoVendasDe] = useState(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('') // '' = todos
  const [filtroPix, setFiltroPix] = useState('') // '' = todos | 'sem' | 'com'

  // chave Pix é pra onde vai o apadrinhamento (Alpha e Kombo, cada um o seu)
  const pedePix = GRUPOS.includes(grupo)
  // só conta quem ainda está vendendo: quem já fechou a meta (ou desistiu)
  // não precisa mais de apadrinhamento, então não precisa de chave Pix
  const contagemPix = useMemo(() => {
    const quemConta = todosDoGrupo.filter((v) => v.situacao === 'ativo')
    return { com: quemConta.filter((v) => v.temPix).length, total: quemConta.length }
  }, [todosDoGrupo])

  const doTipo = useMemo(
    () =>
      vendedores.filter(
        (v) =>
          (!filtroTipo || v.tipo === filtroTipo) &&
          (!pedePix ||
            !filtroPix ||
            (filtroPix === 'com' ? v.temPix : v.situacao === 'ativo' && !v.temPix))
      ),
    [vendedores, filtroTipo, filtroPix, pedePix]
  )
  const rotuloDoTipo = {
    '': '',
    adolescente: ` (${rotuloDoTipoPlural(grupo).toLowerCase()})`,
    voluntario: ' (voluntários)',
  }[filtroTipo]

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return doTipo
    const soDigitos = termo.replace(/\D/g, '')
    // Por padrão procura SÓ no nome: muito adolescente está cadastrado com o
    // e-mail do pai/mãe/irmão, e procurar no e-mail fazia "felipe" trazer o
    // Heitor (e-mail felipeaugusto...) junto. Pra procurar pelo e-mail, é só
    // digitar com "@" (ex: "felipe@").
    const porEmail = termo.includes('@')
    return doTipo.filter((v) => {
      const bateuPalavra = porEmail
        ? (v.email || '').toLowerCase().startsWith(termo.replace(/@$/, ''))
        : bateBusca(termo, v.nome)
      const bateuTelefone =
        soDigitos.length > 0 && (v.telefone || '').replace(/\D/g, '').includes(soDigitos)
      return bateuPalavra || bateuTelefone
    })
  }, [doTipo, busca])

  // resumoDoVendedor varre TODA a tabela de vendas pra somar o total de um
  // vendedor — com milhares de vendas, fazer isso de novo pra cada linha a
  // cada letra digitada na busca travava a tela. Calcula uma vez só quando
  // os dados mudam de verdade (não a cada tecla) e olha num mapa depois.
  const resumosPorId = useMemo(() => {
    const mapa = new Map()
    for (const v of vendedores) {
      mapa.set(v.id, resumoDoVendedor(v, vendas, config))
    }
    return mapa
  }, [vendedores, vendas, config])

  async function excluir(vendedor) {
    const minhas = vendasDoVendedor(vendas, vendedor.id)
    const quantidade = minhas.length

    if (quantidade === 0) {
      if (!confirm(`Excluir ${vendedor.nome}?`)) return
    } else if (vendedor.situacao === 'quitou') {
      alert(
        `${vendedor.nome} já fechou a meta, então a vaga dele está paga.\n\n` +
          'Se ele desistiu mesmo assim, toque em Editar, marque a situação como "Desistiu" ' +
          'e depois exclua.'
      )
      return
    } else {
      const pendentes = minhas.filter((v) => v.status === 'pendente').length
      const texto =
        `${vendedor.nome} já vendeu ${quantidade} rifa(s).\n\n` +
        'Ao excluir:\n' +
        '• ele sai da lista de vendedores e perde o acesso ao app;\n' +
        `• as ${quantidade} rifa(s) continuam valendo, com o mesmo número e no nome de quem ` +
        'comprou, e entram no sorteio normalmente;\n' +
        (vendedor.situacao === 'ativo'
          ? '• ele passa a contar como desistente, e o valor que arrecadou fica para a igreja;\n'
          : '• o valor que ele arrecadou continua contando para a igreja;\n') +
        (pendentes > 0
          ? `• ${pendentes} rifa(s) ainda estão como "ainda vou receber" e continuam na aba ` +
            'Vendas para você cobrar;\n'
          : '') +
        '\nIsso não dá para desfazer pelo app. Excluir mesmo assim?'
      if (!confirm(texto)) return
    }

    setErro('')
    setAviso('')
    setOcupado(vendedor.id)
    try {
      const comoFicou = await removerVendedor(vendedor.id)
      if (comoFicou === 'removido') {
        setAviso(
          `${vendedor.nome} saiu da lista. As ${quantidade} rifa(s) que ele vendeu continuam ` +
            'na aba Vendas e no sorteio.'
        )
      }
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível excluir o vendedor.'))
    } finally {
      setOcupado('')
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

      {todosDoGrupo.length > 0 && (
        <div className="filters">
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="adolescente">{rotuloDoTipoPlural(grupo)}</option>
            <option value="voluntario">Voluntários</option>
          </select>
          {pedePix && (
            <select value={filtroPix} onChange={(e) => setFiltroPix(e.target.value)}>
              <option value="">Chave Pix: todos</option>
              <option value="sem">Sem chave Pix</option>
              <option value="com">Com chave Pix</option>
            </select>
          )}
          <input
            placeholder="Buscar por nome ou telefone…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}

      {pedePix && contagemPix.total > 0 && (
        <p className="texto-ajuda" style={{ margin: '0 0 8px' }}>
          Chave Pix: <strong>{contagemPix.com} de {contagemPix.total}</strong> já cadastraram
          {contagemPix.com < contagemPix.total &&
            ` · faltam ${contagemPix.total - contagemPix.com} (use o filtro "Sem chave Pix" pra cobrar)`}
        </p>
      )}

      {todosDoGrupo.length > 0 && (
        <label className="rotulo-checkbox">
          <input
            type="checkbox"
            checked={mostrarFinalizados}
            onChange={(e) => setMostrarFinalizados(e.target.checked)}
          />
          Mostrar só quem já finalizou (pra ver as vendas de novo)
        </label>
      )}

      {erro && <p className="error-text">{erro}</p>}
      {aviso && (
        <p className="texto-ajuda" style={{ color: 'var(--good)' }}>
          {aviso}
        </p>
      )}

      {vendedores.length === 0 ? (
        <EstadoVazio icone="👤">
          {todosDoGrupo.length === 0 ? (
            <>
              <p>Nenhum vendedor cadastrado.</p>
              <p>Cadastre com o e-mail de cada um para que possam entrar.</p>
            </>
          ) : mostrarFinalizados ? (
            <p>Ninguém finalizou ainda.</p>
          ) : (
            <p>Todo mundo já finalizou. Marque "Mostrar só quem já finalizou" acima pra ver.</p>
          )}
        </EstadoVazio>
      ) : filtrados.length === 0 ? (
        <EstadoVazio icone="🔍">
          <p>Nenhum vendedor encontrado.</p>
        </EstadoVazio>
      ) : (
        <div className="card">
          {filtrados.map((vendedor) => {
            const resumo = resumosPorId.get(vendedor.id)
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
                    {pedePix && vendedor.situacao !== 'desistiu' && vendedor.temPix && (
                      <span className="tag tag-good">Pix ✓</span>
                    )}
                    {/* só cobra de quem ainda está vendendo — quem já fechou a meta não precisa */}
                    {pedePix && vendedor.situacao === 'ativo' && !vendedor.temPix && (
                      <span className={estilos.alerta}>sem Pix</span>
                    )}
                  </div>
                  <div className={estilos.detalhe}>
                    {vendedor.email}
                    {vendedor.telefone && ` · ${vendedor.telefone}`}
                  </div>
                  <div className={estilos.detalhe}>
                    {formatarMoeda(resumo.total)} de {formatarMoeda(resumo.meta)} ·{' '}
                    {resumo.quantidade} rifas
                    {resumo.quantidadePropria > 0 && ` (${resumo.quantidadePropria} próprias)`}
                    {resumo.quantidadeApadrinhada > 0 &&
                      ` (${resumo.quantidadeApadrinhada} apadrinhadas)`}
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
                  <button
                    className="btn-ghost btn-sm btn-danger"
                    onClick={() => excluir(vendedor)}
                    disabled={ocupado === vendedor.id}
                  >
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
