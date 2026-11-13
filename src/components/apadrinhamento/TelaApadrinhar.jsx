import { useEffect, useMemo, useRef, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import PuxarParaAtualizar from '../PuxarParaAtualizar'
import FormularioApadrinhar from './FormularioApadrinhar'
import { listarParaApadrinhar } from '../../lib/db/apadrinhamento'
import { bateBusca } from '../../utils/busca'
import { formatarMoeda } from '../../utils/formato'
import { infoDoGrupo } from '../../utils/grupos'
import { apagarRascunho, lerRascunho } from '../../utils/rascunhoApadrinhamento'
import estilos from './TelaApadrinhar.module.css'

/**
 * Formulário público de apadrinhamento — sem login nenhum (ver main.jsx,
 * rota "/apadrinhar"). Qualquer um escolhe um vendedor que ainda está
 * devendo e compra rifas em nome dele via Pix.
 */
export default function TelaApadrinhar() {
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [escolhido, setEscolhido] = useState(null)

  useEffect(() => {
    let ativo = true
    listarParaApadrinhar()
      .then((l) => ativo && setLista(l))
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  // puxar pra atualizar: busca a lista de novo (quem bateu a meta sai dela)
  async function atualizarLista() {
    try {
      setLista(await listarParaApadrinhar())
      setErro('')
    } catch (e) {
      setErro(e.message)
    }
  }

  const comConta = useMemo(
    () =>
      lista
        .map((v) => {
          const total = v.qtdPaga * v.preco
          const pendenteValor = v.qtdPendente * v.preco
          const faltante = Math.max(0, v.meta - total)
          const disponivel = Math.max(0, faltante - pendenteValor)
          const percentual = v.meta > 0 ? Math.min(100, Math.round((total / v.meta) * 100)) : 0
          return { ...v, total, faltante, disponivel, percentual }
        })
        .filter((v) => v.disponivel > 0),
    [lista]
  )

  // voltou do app do banco e a página recarregou? reabre quem estava sendo
  // apadrinhado, com o que já tinha sido digitado (ver rascunhoApadrinhamento)
  const jaRetomou = useRef(false)
  useEffect(() => {
    if (jaRetomou.current || carregando || erro) return
    jaRetomou.current = true
    const rascunho = lerRascunho()
    const retomado = rascunho && comConta.find((v) => v.vendedorId === rascunho.vendedorId)
    if (retomado) setEscolhido(retomado)
    else if (rascunho) apagarRascunho() // a pessoa já saiu da lista (bateu a meta)
  }, [carregando, erro, comConta])

  const filtrada = useMemo(() => {
    const termo = busca.trim()
    if (!termo) return comConta
    return comConta.filter((v) => bateBusca(termo, v.nome))
  }, [comConta, busca])

  // no meio do formulário o gesto fica desligado: não pode apagar o que
  // já foi digitado
  const puxar = <PuxarParaAtualizar aoAtualizar={atualizarLista} desligado={Boolean(escolhido)} />

  if (escolhido) {
    return (
      <>
        {puxar}
        <FormularioApadrinhar item={escolhido} aoVoltar={() => setEscolhido(null)} />
      </>
    )
  }

  return (
    <div className={estilos.pagina}>
      {puxar}
      <div className={estilos.cabecalho}>
        <div className={estilos.chama}>🔥</div>
        <h1 className={estilos.titulo}>Apadrinhe um Adolescente</h1>
        <p className={estilos.subtitulo}>
          Escolha quem ainda está devendo e ajude a completar a meta dele(a) — rapidinho, via Pix.
        </p>
      </div>

      {!carregando && !erro && lista.length > 0 && (
        <input
          className={estilos.busca}
          placeholder="Buscar pelo nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      )}

      {carregando && <p className="texto-ajuda">Carregando…</p>}
      {erro && (
        <>
          <p className="error-text">{erro}</p>
          <button className="btn btn-block" onClick={atualizarLista}>
            Tentar de novo
          </button>
        </>
      )}

      {!carregando && !erro && comConta.length === 0 && (
        <EstadoVazio icone="🎉">
          <p>Ninguém disponível para apadrinhamento agora. Volte daqui a pouco!</p>
        </EstadoVazio>
      )}

      {!carregando && !erro && comConta.length > 0 && filtrada.length === 0 && (
        <EstadoVazio icone="🔍">
          <p>Ninguém encontrado com esse nome.</p>
        </EstadoVazio>
      )}

      <div className={estilos.lista}>
        {filtrada.map((v) => (
          <button key={v.vendedorId} className={estilos.cartao} onClick={() => setEscolhido(v)}>
            <div className={estilos.linhaNome}>
              <strong>{v.nome}</strong>
              <span className={estilos.etiquetaGrupo} data-grupo-cor={v.grupo}>
                {infoDoGrupo(v.grupo).sigla}
              </span>
            </div>
            <div className={estilos.barra}>
              <div className={estilos.barraPreenchida} style={{ width: `${v.percentual}%` }} />
            </div>
            <div className={estilos.detalhe}>
              {formatarMoeda(v.total)} de {formatarMoeda(v.meta)} · faltam{' '}
              <strong>{formatarMoeda(v.disponivel)}</strong>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
