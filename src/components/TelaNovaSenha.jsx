import { useState } from 'react'
import { useSessao } from '../hooks/useSessao'

/** Aparece quando a pessoa chega pelo link de recuperação enviado por e-mail. */
export default function TelaNovaSenha() {
  const { trocarSenha, sair } = useSessao()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    if (senha !== confirmacao) return setErro('As duas senhas não são iguais.')

    setOcupado(true)
    const r = await trocarSenha(senha)
    setOcupado(false)
    if (!r.ok) setErro(r.erro)
  }

  return (
    <form className="card" style={{ marginTop: 40 }} onSubmit={enviar}>
      <h2>Escolha uma senha nova</h2>
      <p className="texto-ajuda">Você chegou pelo link de recuperação. Defina a senha e pronto.</p>

      {erro && <p className="error-text">{erro}</p>}

      <div className="field">
        <label htmlFor="ns-senha">Nova senha</label>
        <input
          id="ns-senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="ns-conf">Repita a senha</label>
        <input
          id="ns-conf"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
      </div>

      <button className="btn btn-primary btn-block" type="submit" disabled={ocupado}>
        {ocupado ? 'Salvando…' : 'Salvar senha'}
      </button>

      <div className="linha-de-links">
        <button type="button" className="btn-ghost btn-sm" onClick={sair}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
