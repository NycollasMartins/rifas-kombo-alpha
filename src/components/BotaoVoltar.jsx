/** Voltar para a tela de entrada. */
export default function BotaoVoltar({ aoClicar }) {
  return (
    <button className="btn-ghost" onClick={aoClicar} style={{ marginBottom: 14 }}>
      ← Voltar
    </button>
  )
}
