import { useMemo } from 'react'
import CartaoRanking from '../CartaoRanking'
import CartaoRankingPrimeiros from '../CartaoRankingPrimeiros'
import EstadoVazio from '../EstadoVazio'
import BarraProgresso from '../BarraProgresso'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import {
  montarRanking,
  quemEstaDevendo,
  rankingDePrimeiros,
  rankingPorTalao,
  resumoGeral,
  separarPorDestino,
  totalPago,
  totalPendente,
} from '../../utils/calculos'
import { formatarMoeda } from '../../utils/formato'
import { formatarPrazo, prazoEncerrado, recadoDoPrazo, rifasParaFecharMeta } from '../../utils/prazo'
import estilos from './AbaPainel.module.css'

/** Visão geral do grupo: quanto entrou, quem está devendo e o ranking. */
export default function AbaPainel() {
  const { config, vendedores, vendas } = useDadosRifa()

  const { deVagas, daIgreja } = useMemo(
    () => separarPorDestino(vendedores, vendas),
    [vendedores, vendas]
  )

  const pagoVagas = totalPago(deVagas, config.precoRifa)
  const pagoIgreja = totalPago(daIgreja, config.precoRifa)
  const pendente = totalPendente(vendas, config.precoRifa)
  const geral = useMemo(() => resumoGeral(vendedores, vendas, config), [vendedores, vendas, config])

  const ranking = useMemo(
    () => montarRanking(vendedores, vendas, config),
    [vendedores, vendas, config]
  )
  const devedores = useMemo(
    () => quemEstaDevendo(vendedores, vendas, config),
    [vendedores, vendas, config]
  )
  const topTalao = useMemo(
    () => rankingPorTalao(vendedores, vendas, config).slice(0, 3),
    [vendedores, vendas, config]
  )
  const topPrimeiros = useMemo(
    () => rankingDePrimeiros(vendedores, vendas, config).slice(0, 3),
    [vendedores, vendas, config]
  )

  const encerrado = prazoEncerrado(config.prazoFinal)
  const semComprovante = vendas.filter((v) => v.pagamento === 'pix' && !v.comprovantePath).length

  return (
    <>
      {config.prazoFinal && (
        <div className={`${estilos.prazo} ${encerrado ? estilos.prazoVencido : ''}`}>
          <strong>{recadoDoPrazo(config.prazoFinal)}</strong>
          <span>Prazo: {formatarPrazo(config.prazoFinal)}</span>
        </div>
      )}

      <div className={estilos.destaques}>
        <div className={`${estilos.destaque} ${estilos.acentuado}`}>
          <div className={estilos.numeroGrande}>{formatarMoeda(pagoVagas + pagoIgreja)}</div>
          <div className={estilos.rotulo}>Arrecadado (pago)</div>
        </div>
        <div className={estilos.destaque}>
          <div className={estilos.numeroGrande}>{formatarMoeda(pendente)}</div>
          <div className={estilos.rotulo}>A receber (pendente)</div>
        </div>
      </div>

      <div className="card">
        <BarraProgresso
          percentual={geral.percentual}
          legendaEsquerda={`${formatarMoeda(pagoVagas)} de ${formatarMoeda(geral.meta)}`}
          legendaDireita={`${geral.percentual}% da meta do grupo`}
        />
      </div>

      <div className={estilos.linhaMetricas}>
        <div className={estilos.metrica}>
          <div className={estilos.numero}>{vendas.length}</div>
          <div className={estilos.rotuloPequeno}>Rifas vendidas</div>
        </div>
        <div className={estilos.metrica}>
          <div className={estilos.numero}>{vendedores.length}</div>
          <div className={estilos.rotuloPequeno}>Vendedores</div>
        </div>
        <div className={estilos.metrica}>
          <div className={estilos.numero}>{semComprovante}</div>
          <div className={estilos.rotuloPequeno}>Pix sem comprovante</div>
        </div>
      </div>

      {pagoIgreja > 0 && (
        <div className={estilos.igreja}>
          <strong>{formatarMoeda(pagoIgreja)}</strong>
          <span>Arrecadado por quem desistiu — fica para o acampamento</span>
        </div>
      )}

      {devedores.length > 0 && (
        <>
          <div className="section-head">
            <h2>{encerrado ? 'Precisam comprar as rifas que faltam' : 'Ainda não fecharam a meta'}</h2>
          </div>
          <div className="card">
            {devedores.map((r) => (
              <div key={r.vendedor.id} className="list-row">
                <div className="info">
                  <strong>{r.vendedor.nome}</strong>
                  <span>
                    {formatarMoeda(r.total)} de {formatarMoeda(r.meta)}
                  </span>
                </div>
                <div className={estilos.deve}>
                  <strong>{formatarMoeda(r.faltante)}</strong>
                  <span>{rifasParaFecharMeta(r.faltante, config.precoRifa)} rifas</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {topTalao.length > 0 && (
        <>
          <div className="section-head">
            <h2>Top 3 — mais de um talão (R$ 600+)</h2>
          </div>
          <CartaoRanking ranking={topTalao} />
        </>
      )}

      {topPrimeiros.length > 0 && (
        <>
          <div className="section-head">
            <h2>Top 3 — primeiros a bater a meta</h2>
          </div>
          <CartaoRankingPrimeiros ranking={topPrimeiros} />
        </>
      )}

      <div className="section-head">
        <h2>Ranking de vendas</h2>
      </div>

      {ranking.length === 0 ? (
        <EstadoVazio icone="🏆">
          <p>Cadastre vendedores para ver o ranking.</p>
        </EstadoVazio>
      ) : (
        <CartaoRanking ranking={ranking} />
      )}
    </>
  )
}
