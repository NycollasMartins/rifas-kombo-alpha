import { useState } from 'react'
import { useSessao } from '../hooks/useSessao'

/**
 * Entrou, mas a conta ainda não está ligada a nada.
 *
 * Acontece em dois casos: o líder criou a conta e errou o código, ou o
 * vendedor criou a senha antes de o líder cadastrar o e-mail dele.
 */
export default function TelaSemAcesso() {
  const { email, sair, tentarVincular } = useSessao()
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function tentar() {
    setErro('')
    setOcupado(true)
    const r = await tentarVincular()
    setOcupado(false)
    if (!r.ok) setErro(r.erro)
  }

  return (
    <div className="card" style={{ marginTop: 40 }}>
      <h2>Sua conta ainda não tem acesso</h2>
      <p className="texto-ajuda">
        Você entrou como <strong>{email}</strong>, mas esse e-mail ainda não está ligado a nenhum
        cadastro.
      </p>
      <ul className="lista-ajuda">
        <li>
          <strong>É vendedor?</strong> Peça ao líder do seu grupo para cadastrar você com este
          mesmo e-mail. Depois toque em "Já cadastraram meu e-mail".
        </li>
        <li>
          <strong>É líder?</strong> Saia e use "Criar acesso de líder" informando o código do
          acampamento.
        </li>
      </ul>

      {erro && <p className="error-text">{erro}</p>}

      <div className="modal-actions">
        <button className="btn" onClick={sair}>
          Sair
        </button>
        <button className="btn btn-primary" onClick={tentar} disabled={ocupado}>
          {ocupado ? 'Verificando…' : 'Já cadastraram meu e-mail'}
        </button>
      </div>
    </div>
  )
}
