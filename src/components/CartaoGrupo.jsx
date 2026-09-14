import BarraProgresso from './BarraProgresso'
import { formatarMoeda } from '../utils/formato'
import estilos from './CartaoGrupo.module.css'

/** Progresso de um grupo inteiro (ex: "Jovens") rumo à meta somada. */
export default function CartaoGrupo({ resumo }) {
  return (
    <div className="card">
      <div className={estilos.cabecalho}>
        <strong className={estilos.nome}>{resumo.campo}</strong>
        <span className={estilos.contagem}>
          {resumo.quantidadeVendedores}{' '}
          {resumo.quantidadeVendedores === 1 ? 'vendedor' : 'vendedores'}
        </span>
      </div>
      <BarraProgresso
        percentual={resumo.percentual}
        legendaEsquerda={`${formatarMoeda(resumo.pago)} de ${formatarMoeda(resumo.meta)}`}
        legendaDireita={`${resumo.percentual}%`}
      />
    </div>
  )
}
