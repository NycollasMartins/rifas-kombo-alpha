import Modal from './Modal'
import estilos from './GuiaDeInstalacaoIphone.module.css'

/**
 * O passo a passo de instalar no iPhone.
 *
 * A Apple não deixa nenhum site disparar a instalação — o botão do app só
 * pode abrir esta explicação.
 *
 * Estes quatro passos foram conferidos no Safari do iPhone. Não tem
 * ramificação por navegador de propósito: o caminho pelo menu "⋯" é o mesmo
 * no Safari atual e no Chrome, e chutar um caminho diferente sem ter testado
 * daria instrução errada para alguém.
 *
 * Só fecha no ×: a pessoa vai sair do app para seguir os passos e voltar para
 * conferir o próximo. Um toque fora fechando a janela apagaria a instrução
 * bem na hora em que ela mais precisa dela.
 */

const PASSOS = [
  <>
    Toque no botão <strong>⋯</strong> (os três pontos)
  </>,
  <>
    Toque em <strong>Compartilhar</strong>
  </>,
  <>
    Na terceira coluna, toque em <strong>Ver mais</strong>
  </>,
  <>
    Toque em <strong>Adicionar à Tela de Início</strong>
  </>,
]

export default function GuiaDeInstalacaoIphone({ aoFechar }) {
  return (
    <Modal titulo="Instalar na tela de início" aoFechar={aoFechar} soFechaNoX>
      <p className="texto-ajuda">
        No iPhone, a instalação é feita pelo próprio navegador — nenhum site consegue fazer isso
        sozinho. São {PASSOS.length} toques:
      </p>

      <ol className={estilos.passos}>
        {PASSOS.map((passo, indice) => (
          <li key={indice} className={estilos.passo}>
            <span className={estilos.numero}>{indice + 1}</span>
            <span className={estilos.texto}>{passo}</span>
          </li>
        ))}
      </ol>

      <p className={estilos.fecho}>
        Em iPhones mais antigos o <strong>Compartilhar</strong> aparece direto na barra de baixo,
        sem passar pelos três pontos — o resto é igual.
      </p>
      <p className={estilos.fecho}>
        Pronto: o ícone 🔥 vai para a sua tela de início e o app abre em tela cheia, sem barra de
        endereço.
      </p>
    </Modal>
  )
}
