import { useMemo, useState } from 'react'
import Topbar from './Topbar'
import BarraProgresso from './BarraProgresso'
import EstadoVazio from './EstadoVazio'
import CompraDoVendedor from './CompraDoVendedor'
import AvisoDePrazo from './AvisoDePrazo'
import ModalNovaVenda from './ModalNovaVenda'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { useSessao } from '../hooks/useSessao'
import { resumoDoVendedor, vendasDoVendedor } from '../utils/calculos'
import { agruparPorLote } from '../lib/db/vendas'
import { formatarMoeda } from '../utils/formato'
import { prazoEncerrado } from '../utils/prazo'
import { infoDoGrupo } from '../utils/grupos'
import estilos from './TelaVendedor.module.css'

/** A tela de quem vende: progresso, prazo e as próprias rifas. */
export default function TelaVendedor() {
  const { config, vendas, meuCadastro } = useDadosRifa()
  const { sair, grupo } = useSessao()
  const [modalAberto, setModalAberto] = useState(false)

  const minhasVendas = useMemo(
    () => vendasDoVendedor(vendas, meuCadastro?.id),
    [vendas, meuCadastro?.id]
  )
  // agrupadas por compra: quem levou 5 rifas de uma vez aparece uma vez só
  const compras = useMemo(() => agruparPorLote(minhasVendas), [minhasVendas])

  if (!meuCadastro) {
    return (
      <EstadoVazio icone="🙈">
        <p>Seu cadastro não está mais na lista do grupo.</p>
        <p>Fale com a liderança.</p>
        <button className="btn" onClick={sair} style={{ marginTop: 12 }}>
          Sair
        </button>
      </EstadoVazio>
    )
  }

  const resumo = resumoDoVendedor(meuCadastro, vendas, config)
  const encerrado = prazoEncerrado(config.prazoFinal)
  const saiu = meuCadastro.situacao === 'desistiu'

  return (
    <>
      <Topbar
        grupo={grupo}
        titulo={meuCadastro.nome}
        subtitulo={infoDoGrupo(grupo).nomeCompleto}
        aoSair={sair}
      />

      {saiu && (
        <div className={estilos.avisoSaida}>
          <strong>Você não está mais na lista de vendedores.</strong>
          <span>
            O valor que você arrecadou ficou para o acampamento. Fale com a liderança se isso
            estiver errado.
          </span>
        </div>
      )}

      <div className="card">
        <div className={estilos.resumo}>
          <span className={`display ${estilos.valor}`}>{formatarMoeda(resumo.total)}</span>
          <span className={estilos.meta}>meta {formatarMoeda(resumo.meta)}</span>
        </div>
        <BarraProgresso
          percentual={resumo.percentual}
          legendaEsquerda={`${resumo.percentual}% da meta`}
          legendaDireita={resumo.pendente > 0 ? `+${formatarMoeda(resumo.pendente)} a receber` : ''}
        />
      </div>

      {!saiu && (
        <AvisoDePrazo
          prazoFinal={config.prazoFinal}
          faltante={resumo.faltante}
          precoRifa={config.precoRifa}
          identificador={meuCadastro.id}
        />
      )}

      {!saiu && resumo.bateuAMeta && (
        <div className={estilos.avisoMeta}>
          <strong>Meta batida! 🎉</strong>
          <span>Sua vaga está paga. O que vender daqui pra frente ajuda o acampamento.</span>
        </div>
      )}

      {!saiu && (
        <button
          className="btn btn-primary btn-block"
          onClick={() => setModalAberto(true)}
          style={{ marginBottom: 18 }}
        >
          + Registrar venda
        </button>
      )}

      <div className="section-head">
        <h2>Minhas rifas ({minhasVendas.length})</h2>
        {resumo.quantidadePropria > 0 && (
          <span className={estilos.contagemPropria}>
            {resumo.quantidadePropria} compradas por você
          </span>
        )}
      </div>

      {compras.length === 0 ? (
        <EstadoVazio icone="🎫">
          <p>Nenhuma rifa registrada ainda.</p>
          <p>Toque em "Registrar venda" para começar.</p>
        </EstadoVazio>
      ) : (
        compras.map((lote) => (
          <CompraDoVendedor
            key={lote.loteId}
            lote={lote}
            precoRifa={config.precoRifa}
            nomeDoVendedor={meuCadastro.nome}
            grupo={grupo}
          />
        ))
      )}

      {modalAberto && (
        <ModalNovaVenda vendedorId={meuCadastro.id} aoFechar={() => setModalAberto(false)} />
      )}
    </>
  )
}
