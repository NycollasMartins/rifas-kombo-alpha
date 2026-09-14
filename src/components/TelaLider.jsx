import { useState } from 'react'
import BotaoVoltar from './BotaoVoltar'
import SeletorDeGrupo from './SeletorDeGrupo'
import { useSessao } from '../hooks/useSessao'

/**
 * Entrada do líder: ele mesmo cria a conta, sem depender de ninguém.
 *
 * O que impede um curioso de virar líder é o código do acampamento — uma
 * palavra que a liderança de cada grupo combina entre si. Quem confere o
 * código é o banco, não esta tela.
 */
export default function TelaLider({ aoVoltar }) {
  const { entrar, criarContaDeLider, pedirRecuperacaoDeSenha } = useSessao()

  const [modo, setModo] = useState('entrar') // entrar | criar | esqueci
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [grupo, setGrupo] = useState('')
  const [codigo, setCodigo] = useState('')
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

    if (modo === 'esqueci') {
      if (!email.trim()) return setErro('Digite o seu e-mail.')
      setOcupado(true)
      const r = await pedirRecuperacaoDeSenha(email)
      setOcupado(false)
      if (r.ok) setRecado('Se este e-mail tiver conta, o link de nova senha chegou nele.')
      else setErro(r.erro)
      return
    }

    if (!email.trim() || !senha) return setErro('Preencha o e-mail e a senha.')

    if (modo === 'entrar') {
      setOcupado(true)
      const r = await entrar(email, senha, lembrar)
      setOcupado(false)
      if (!r.ok) setErro(r.erro)
      return
    }

    if (!nome.trim()) return setErro('Digite o seu nome.')
    if (!grupo) return setErro('Escolha se você é do Alpha ou do Kombo.')
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    if (!codigo.trim()) return setErro('Digite o código do acampamento.')

    setOcupado(true)
    const r = await criarContaDeLider({ nome: nome.trim(), email, senha, grupo, codigo, lembrar })
    setOcupado(false)
    if (!r.ok) setErro(r.erro)
  }

  return (
    <>
      <BotaoVoltar aoClicar={aoVoltar} />

      <form className="card" onSubmit={enviar}>
        <h2>
          {modo === 'criar' && 'Criar acesso de líder'}
          {modo === 'entrar' && 'Entrar como líder'}
          {modo === 'esqueci' && 'Recuperar senha'}
        </h2>

        {modo === 'criar' && (
          <p className="texto-ajuda">
            Você cria a sua própria conta. Para provar que é da liderança, informe o código do
            acampamento — peça a quem já é líder do seu grupo.
          </p>
        )}
        {modo === 'esqueci' && (
          <p className="texto-ajuda">
            Digite o e-mail da sua conta que enviamos um link para você escolher uma senha nova.
          </p>
        )}

        {erro && <p className="error-text">{erro}</p>}
        {recado && <p className="error-text" style={{ color: 'var(--good)' }}>{recado}</p>}

        {modo === 'criar' && (
          <>
            <div className="field">
              <label htmlFor="lider-nome">Seu nome</label>
              <input
                id="lider-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como te chamam"
              />
            </div>

            <label className="rotulo-solto">Você é de qual grupo?</label>
            <SeletorDeGrupo valor={grupo} aoEscolher={setGrupo} desabilitado={ocupado} />
          </>
        )}

        <div className="field">
          <label htmlFor="lider-email">E-mail</label>
          <input
            id="lider-email"
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
            <label htmlFor="lider-senha">Senha</label>
            <input
              id="lider-senha"
              type="password"
              autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
              placeholder={modo === 'criar' ? 'Pelo menos 6 caracteres' : 'Sua senha'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        )}

        {modo === 'criar' && (
          <div className="field">
            <label htmlFor="lider-codigo">Código do acampamento</label>
            <input
              id="lider-codigo"
              autoComplete="off"
              placeholder="A palavra combinada pela liderança"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
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
            : modo === 'criar'
              ? 'Criar acesso'
              : modo === 'entrar'
                ? 'Entrar'
                : 'Enviar link'}
        </button>

        <div className="linha-de-links">
          {modo !== 'criar' && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => trocarModo('criar')}>
              Criar acesso de líder
            </button>
          )}
          {modo !== 'entrar' && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => trocarModo('entrar')}>
              Já tenho conta
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
