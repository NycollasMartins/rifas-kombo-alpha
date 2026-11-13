import Modal from './Modal'
import VisualizadorComprovante from './VisualizadorComprovante'

/** O comprovante aberto numa janela do próprio app, em vez de uma aba do navegador. */
export default function ModalComprovante({
  caminho,
  titulo = 'Comprovante do Pix',
  detalhe,
  acoes,
  aoFechar,
}) {
  return (
    <Modal
      titulo={titulo}
      aoFechar={aoFechar}
      soFechaNoX
      rodape={
        <>
          {acoes}
          <button className="btn btn-block" onClick={aoFechar}>
            Fechar
          </button>
        </>
      }
    >
      {detalhe && <p className="texto-ajuda">{detalhe}</p>}
      <VisualizadorComprovante caminho={caminho} />
    </Modal>
  )
}
