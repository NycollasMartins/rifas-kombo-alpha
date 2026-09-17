import { useState } from 'react'
import Modal from './Modal'
import { versaoDoIOS } from '../utils/instalacao'
import estilos from './GuiaDeInstalacaoIphone.module.css'

/**
 * O passo a passo de instalar no iPhone.
 *
 * A Apple não deixa nenhum site disparar a instalação — o botão do app só
 * pode abrir esta explicação.
 *
 * O iOS 27 mexeu no Safari: o botão que abria o menu (os três pontinhos "⋯")
 * virou um ícone de três tracinhos ao lado da seta. Dali em diante o caminho
 * é o mesmo de sempre. Como o telefone pode estar em qualquer uma das duas
 * versões — e às vezes quem está lendo está ajudando outra pessoa com um
 * aparelho diferente do seu — o guia detecta a versão instalada e já abre
 * nela, mas deixa trocar.
 *
 * Estes passos foram conferidos no Safari do iOS 26 e do iOS 27. Não tem
 * ramificação por navegador de propósito: o caminho é o mesmo no Safari
 * atual e no Chrome, e chutar uma variação sem ter testado daria instrução
 * errada para alguém.
 *
 * Só fecha no ×: a pessoa vai sair do app para seguir os passos e voltar para
 * conferir o próximo. Um toque fora fechando a janela apagaria a instrução
 * bem na hora em que ela mais precisa dela.
 */

const PASSOS_POR_VERSAO = {
  27: [
    <>
      Toque no ícone <strong>☰</strong> (três tracinhos), ao lado da seta
    </>,
    <>
      Toque em <strong>Compartilhar</strong>
    </>,
    <>
      Na terceira fileira, toque em <strong>Ver mais</strong>
    </>,
    <>
      Toque em <strong>Adicionar à Tela de Início</strong>
    </>,
  ],
  26: [
    <>
      Toque no botão <strong>⋯</strong> (os três pontos)
    </>,
    <>
      Toque em <strong>Compartilhar</strong>
    </>,
    <>
      Na terceira fileira, toque em <strong>Ver mais</strong>
    </>,
    <>
      Toque em <strong>Adicionar à Tela de Início</strong>
    </>,
  ],
}

/** iOS 27 ou mais novo cai nos passos do 27; 26 ou mais antigo, nos do 26. */
function versaoPadrao() {
  const detectada = versaoDoIOS()
  return detectada !== null && detectada < 27 ? 26 : 27
}

export default function GuiaDeInstalacaoIphone({ aoFechar }) {
  const [versao, setVersao] = useState(versaoPadrao)
  const passos = PASSOS_POR_VERSAO[versao]

  return (
    <Modal titulo="Instalar na tela de início" aoFechar={aoFechar} soFechaNoX>
      <p className="texto-ajuda">
        No iPhone, a instalação é feita pelo próprio navegador — nenhum site consegue fazer isso
        sozinho. O caminho mudou um pouco no iOS 27: escolha a versão do seu aparelho.
      </p>

      <div className={estilos.versoes}>
        <button
          type="button"
          className={`${estilos.versao} ${versao === 27 ? estilos.ativa : ''}`}
          onClick={() => setVersao(27)}
        >
          iOS 27 (novo)
        </button>
        <button
          type="button"
          className={`${estilos.versao} ${versao === 26 ? estilos.ativa : ''}`}
          onClick={() => setVersao(26)}
        >
          iOS 26 ou antes
        </button>
      </div>

      <ol className={estilos.passos}>
        {passos.map((passo, indice) => (
          <li key={indice} className={estilos.passo}>
            <span className={estilos.numero}>{indice + 1}</span>
            <span className={estilos.texto}>{passo}</span>
          </li>
        ))}
      </ol>

      {versao === 26 && (
        <p className={estilos.fecho}>
          Em iPhones mais antigos o <strong>Compartilhar</strong> aparece direto na barra de baixo,
          sem passar pelos três pontos — o resto é igual.
        </p>
      )}
      <p className={estilos.fecho}>
        Pronto: o ícone 🔥 vai para a sua tela de início e o app abre em tela cheia, sem barra de
        endereço.
      </p>
    </Modal>
  )
}
