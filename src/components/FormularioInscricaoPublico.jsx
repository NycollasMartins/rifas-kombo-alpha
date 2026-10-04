import { useEffect, useState } from 'react'
import { aplicarTemaDoGrupo, infoDoGrupo } from '../utils/grupos'
import { criarInscricaoPublica } from '../lib/db/inscricoes'
import { traduzirErro } from '../lib/db/erros'

/**
 * Formulário público de inscrição — aberto por QR code, sem login.
 *
 * Só pede nome e telefone e cria um pedido PENDENTE. Ninguém paga aqui: a
 * pessoa combina o pagamento pessoalmente com a liderança, que confirma
 * depois no painel (aba Inscrições). O RLS do banco garante que, por este
 * caminho, só dá para criar um pedido pendente e sem valor — nada mais.
 */
export default function FormularioInscricaoPublico({ grupo }) {
  const info = infoDoGrupo(grupo)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    aplicarTemaDoGrupo(grupo)
  }, [grupo])

  async function enviar(evento) {
    evento.preventDefault()
    if (!nome.trim()) return setErro('Digite seu nome completo.')
    if (!telefone.trim()) return setErro('Digite seu telefone.')

    setErro('')
    setEnviando(true)
    try {
      await criarInscricaoPublica({ grupo, nome: nome.trim(), telefone: telefone.trim() })
      setEnviado(true)
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível enviar. Tente de novo.'))
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="card" style={{ marginTop: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <h2>Inscrição recebida!</h2>
        <p className="texto-ajuda">
          Agora combine o pagamento pessoalmente com a liderança do {info.nomeCompleto}. Sua
          inscrição é confirmada assim que o pagamento for registrado.
        </p>
      </div>
    )
  }

  return (
    <form className="card" style={{ marginTop: 40 }} onSubmit={enviar}>
      <h2>Inscrição — {info.nomeCompleto}</h2>
      <p className="texto-ajuda">
        Preencha seu nome e telefone. Depois disso, combine o pagamento do ingresso
        pessoalmente com a liderança.
      </p>

      <div className="field">
        <label htmlFor="pub-nome">Nome completo</label>
        <input
          id="pub-nome"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="pub-telefone">Telefone</label>
        <input
          id="pub-telefone"
          type="tel"
          inputMode="tel"
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </div>

      {erro && <p className="error-text">{erro}</p>}

      <button className="btn btn-primary btn-block" type="submit" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviar inscrição'}
      </button>
    </form>
  )
}
