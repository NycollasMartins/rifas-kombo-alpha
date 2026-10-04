import { useState } from 'react'
import Topbar from './Topbar'
import TrocaDeGrupo from './TrocaDeGrupo'
import AbaPainel from './lider/AbaPainel'
import AbaVendas from './lider/AbaVendas'
import AbaVendedores from './lider/AbaVendedores'
import AbaSorteio from './lider/AbaSorteio'
import AbaUsuarios from './lider/AbaUsuarios'
import AbaConfiguracoes from './lider/AbaConfiguracoes'
import AbaManutencao from './lider/AbaManutencao'
import AbaInscricoes from './lider/AbaInscricoes'
import { useSessao } from '../hooks/useSessao'
import { infoDoGrupo } from '../utils/grupos'
import estilos from './PainelLider.module.css'

const ABAS = [
  { chave: 'painel', rotulo: 'Painel', Componente: AbaPainel },
  { chave: 'vendas', rotulo: 'Vendas', Componente: AbaVendas },
  { chave: 'vendedores', rotulo: 'Vendedores', Componente: AbaVendedores },
  { chave: 'sorteio', rotulo: 'Sorteio', Componente: AbaSorteio },
  { chave: 'usuarios', rotulo: 'Usuários', Componente: AbaUsuarios },
  { chave: 'config', rotulo: 'Configurações', Componente: AbaConfiguracoes },
]

// Aparece só para o papel dev. A tela some, mas quem realmente barra os
// outros é o banco — as regras do Postgres, não este array.
const ABA_DO_DEV = { chave: 'manutencao', rotulo: 'Manutenção', Componente: AbaManutencao }

// Fase de teste: inscrições só aparecem pro dev, mesmo quem tem "corrigir
// venda" liberado não vê ainda. Quando validar, troca a condição abaixo.
const ABA_INSCRICOES = { chave: 'inscricoes', rotulo: 'Inscrições', Componente: AbaInscricoes }

/** Casca do painel do líder: cabeçalho, abas e a aba escolhida. */
export default function PainelLider() {
  const { email, eDev, podeCorrigirVenda, grupo, sair } = useSessao()
  const info = infoDoGrupo(grupo)
  const [abaAtiva, setAbaAtiva] = useState('painel')

  let abas = eDev || podeCorrigirVenda ? [...ABAS, ABA_DO_DEV] : ABAS
  if (eDev) abas = [...abas, ABA_INSCRICOES]
  const { Componente } = abas.find((a) => a.chave === abaAtiva) || abas[0]

  return (
    <>
      <Topbar
        grupo={grupo}
        titulo={eDev ? `Dev · ${info.nome}` : `Liderança ${info.nome}`}
        subtitulo={`${email}${eDev ? ' · enxerga os dois grupos' : ''}`}
        aoSair={sair}
      />

      <TrocaDeGrupo />

      <div className={estilos.abas}>
        {abas.map((aba) => (
          <button
            key={aba.chave}
            className={`${estilos.aba} ${abaAtiva === aba.chave ? estilos.ativa : ''}`}
            onClick={() => setAbaAtiva(aba.chave)}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>

      <Componente />
    </>
  )
}
