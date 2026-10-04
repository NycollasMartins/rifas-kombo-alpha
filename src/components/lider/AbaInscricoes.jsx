import { useMemo, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import ModalInscricao from '../ModalInscricao'
import CartaoQrCodeInscricao from './CartaoQrCodeInscricao'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { useSessao } from '../../hooks/useSessao'
import { gerarLinkDoComprovante } from '../../lib/db/arquivos'
import { totalPagoDoGrupo } from '../../utils/calculos'
import { formatarDataHora, formatarMoeda } from '../../utils/formato'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './AbaInscricoes.module.css'

const ROTULO_FORMA = { direto: 'Ingresso direto', rifa: 'Vendendo rifas' }

/**
 * Quem já garantiu vaga no acampamento — pago direto ou vendendo as rifas.
 * Fase de teste: aba visível só pro dev (ver PainelLider.jsx).
 */
export default function AbaInscricoes() {
  const { config, vendedores, vendas, inscricoes, removerInscricao } = useDadosRifa()
  const { grupo } = useSessao()
  const [novaInscricao, setNovaInscricao] = useState(false)
  const [confirmando, setConfirmando] = useState(null)
  const [abrindo, setAbrindo] = useState('')
  const [erro, setErro] = useState('')

  const totalDireto = useMemo(
    () => inscricoes.filter((i) => i.forma === 'direto' && i.status === 'pago')
      .reduce((soma, i) => soma + i.valor, 0),
    [inscricoes]
  )
  const totalRifas = useMemo(
    () => totalPagoDoGrupo(vendas, vendedores, config),
    [vendas, vendedores, config]
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

  async function excluir(inscricao) {
    if (!confirm(`Excluir a inscrição de ${inscricao.nome}?`)) return
    setErro('')
    try {
      await removerInscricao(inscricao.id)
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível excluir a inscrição.'))
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Inscrições ({inscricoes.length})</h2>
        <button className="btn btn-sm btn-primary" onClick={() => setNovaInscricao(true)}>
          + Nova inscrição
        </button>
      </div>

      <CartaoQrCodeInscricao grupo={grupo} />

      <div className={estilos.destaques}>
        <div className={estilos.destaque}>
          <div className={estilos.numero}>{formatarMoeda(totalDireto)}</div>
          <div className={estilos.rotulo}>Ingresso direto</div>
        </div>
        <div className={estilos.destaque}>
          <div className={estilos.numero}>{formatarMoeda(totalRifas)}</div>
          <div className={estilos.rotulo}>Rifas</div>
        </div>
        <div className={`${estilos.destaque} ${estilos.acentuado}`}>
          <div className={estilos.numero}>{formatarMoeda(totalDireto + totalRifas)}</div>
          <div className={estilos.rotulo}>Total geral</div>
        </div>
      </div>

      {erro && <p className="error-text">{erro}</p>}

      {inscricoes.length === 0 ? (
        <EstadoVazio icone="🎒">
          <p>Nenhuma inscrição ainda.</p>
          <p>Aparecem aqui quem pagar o ingresso direto, e quem fechar a conta das rifas.</p>
        </EstadoVazio>
      ) : (
        <div className="card">
          {inscricoes.map((inscricao) => (
            <div key={inscricao.id} className="list-row">
              <div className="info">
                <strong>{inscricao.nome}</strong>
                <span className="tag">{ROTULO_FORMA[inscricao.forma]}</span>
                {inscricao.status === 'pendente' && <span className="tag tag-bad">Pendente</span>}
                <div className="texto-ajuda">
                  {formatarMoeda(inscricao.valor)} · {inscricao.pagamento}
                  {inscricao.telefone && ` · ${inscricao.telefone}`} ·{' '}
                  {formatarDataHora(inscricao.criadoEm)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {inscricao.status === 'pendente' && (
                  <button className="btn btn-sm" onClick={() => setConfirmando(inscricao)}>
                    Confirmar pagamento
                  </button>
                )}
                {inscricao.comprovantePath && (
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => verComprovante(inscricao.comprovantePath)}
                    disabled={abrindo === inscricao.comprovantePath}
                  >
                    {abrindo === inscricao.comprovantePath ? '…' : 'Ver comprovante'}
                  </button>
                )}
                <button className="btn-ghost btn-sm btn-danger" onClick={() => excluir(inscricao)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {novaInscricao && <ModalInscricao aoFechar={() => setNovaInscricao(false)} />}

      {confirmando && (
        <ModalInscricao inscricaoExistente={confirmando} aoFechar={() => setConfirmando(null)} />
      )}
    </>
  )
}
