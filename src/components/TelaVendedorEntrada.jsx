import { useState } from 'react'
import BotaoVoltar from './BotaoVoltar'
import { useSessao } from '../hooks/useSessao'

/**
 * Entrada do vendedor.
 *
 * Ele não escolhe nome numa lista: digita o e-mail que o líder cadastrou.
 * No primeiro acesso escolhe a própria senha, e é isso que liga a conta ao
 * cadastro. Se o e-mail não estiver na lista do líder, não entra.
 */
export default function TelaVendedorEntrada({ aoVoltar }) {
  const { entrar, criarSenhaDeVendedor, pedirRecuperacaoDeSenha } = useSessao()

  const [modo, setModo] = useState('entrar') // entrar | primeiro | esqueci
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [lembrar, setLembrar] = useState(true)
  const [erro, setErro] = useState('')
  const [recado, setRecado] = useState('')
  const [ocupado, setOcupado] = useState(false)

  function trocarModo(novo) {
    setModo(novo)
    setErro('')
    setRecado('')
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErro('')
    setRecado('')

    if (!email.trim()) return setErro('Digite o seu e-mail.')

    if (modo === 'esqueci') {
      setOcupado(true)
      const r = await pedirRecuperacaoDeSenha(email)
      setOcupado(false)
      if (r.ok) setRecado('Se este e-mail tiver conta, o link de nova senha chegou nele.')
      else setErro(r.erro)
      return
    }

    if (!senha) return setErro('Digite a sua senha.')

    setOcupado(true)
    const r =
      modo === 'primeiro'
        ? await criarSenhaDeVendedor({ email, senha, lembrar })
        : await entrar(email, senha, lembrar)
    setOcupado(false)
    if (!r.ok) setErro(r.erro)
  }

  return (
    <>
      <BotaoVoltar aoClicar={aoVoltar} />

      <form className="card" onSubmit={enviar}>
        <h2>
          {modo === 'primeiro' && 'Criar minha senha'}
          {modo === 'entrar' && 'Entrar'}
          {modo === 'esqueci' && 'Recuperar senha'}
        </h2>

        <p className="texto-ajuda">
          {modo === 'primeiro'
            ? 'Use o mesmo e-mail que você passou para o líder. Se ele ainda não cadastrou você, não vai dar certo — fale com ele primeiro.'
            : modo === 'esqueci'
              ? 'Digite o e-mail da sua conta que enviamos um link para você escolher uma senha nova.'
              : 'Entre com o e-mail que o líder cadastrou e a senha que você criou.'}
        </p>

        {erro && <p className="error-text">{erro}</p>}
        {recado && <p className="error-text" style={{ color: 'var(--good)' }}>{recado}</p>}

        <div className="field">
          <label htmlFor="vend-email">E-mail</label>
          <input
            id="vend-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {modo !== 'esqueci' && (
          <div className="field">
            <label htmlFor="vend-senha">Senha</label>
            <input
              id="vend-senha"
              type="password"
              autoComplete={modo === 'primeiro' ? 'new-password' : 'current-password'}
              placeholder={modo === 'primeiro' ? 'Crie uma senha de 6+ caracteres' : 'Sua senha'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        )}

        {modo !== 'esqueci' && (
          <label className="rotulo-checkbox">
            <input
              type="checkbox"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
            />
            Lembrar de mim neste aparelho
          </label>
        )}

        <button className="btn btn-primary btn-block" type="submit" disabled={ocupado}>
          {ocupado
            ? 'Um instante…'
            : modo === 'primeiro'
              ? 'Criar senha e entrar'
              : modo === 'entrar'
                ? 'Entrar'
                : 'Enviar link'}
        </button>

        <div className="linha-de-links">
          {modo !== 'primeiro' && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => trocarModo('primeiro')}>
              É meu primeiro acesso
            </button>
          )}
          {modo !== 'entrar' && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => trocarModo('entrar')}>
              Já tenho senha
            </button>
          )}
          {modo === 'entrar' && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => trocarModo('esqueci')}>
              Esqueci a senha
            </button>
          )}
        </div>
      </form>
    </>
  )
}
