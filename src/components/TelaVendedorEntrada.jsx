import { useState } from 'react'
import BotaoVoltar from './BotaoVoltar'
import SeletorDeGrupo from './SeletorDeGrupo'
import { useSessao } from '../hooks/useSessao'
import { rotuloDoTipo, KOMBO } from '../utils/grupos'

/**
 * Entrada do vendedor.
 *
 * Três caminhos: já tem senha (entrar), o líder já cadastrou e é a
 * primeira vez que ele cria a senha, ou ninguém cadastrou ainda e a
 * própria pessoa se cadastra — com o código do grupo, para a liderança
 * continuar sabendo quem entrou.
 */
export default function TelaVendedorEntrada({ aoVoltar }) {
  const { entrar, criarSenhaDeVendedor, cadastrarVendedor, pedirRecuperacaoDeSenha } = useSessao()

  const [modo, setModo] = useState('entrar') // entrar | primeiro | cadastro | esqueci
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipo, setTipo] = useState('adolescente')
  const [destino, setDestino] = useState('quarto')
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

    if (modo === 'cadastro') {
      if (!nome.trim()) return setErro('Digite o seu nome.')
      if (!telefone.trim()) return setErro('Digite o seu telefone.')
      if (!grupo) return setErro('Escolha se você é do Alpha ou do Kombo.')
      if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
      if (!codigo.trim()) return setErro('Digite o código do grupo.')

      setOcupado(true)
      const r = await cadastrarVendedor({
        nome: nome.trim(),
        email,
        telefone: telefone.trim(),
        tipo,
        destino: grupo === KOMBO ? destino : 'quarto',
        grupo,
        codigo,
        senha,
        lembrar,
      })
      setOcupado(false)
      if (!r.ok) setErro(r.erro)
      return
    }

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
          {modo === 'cadastro' && 'Cadastrar como vendedor(a)'}
          {modo === 'entrar' && 'Entrar'}
          {modo === 'esqueci' && 'Recuperar senha'}
        </h2>

        <p className="texto-ajuda">
          {modo === 'primeiro'
            ? 'Use o mesmo e-mail que você passou para o líder. Se ele ainda não cadastrou você, use "Ainda não tenho cadastro" abaixo.'
            : modo === 'cadastro'
              ? 'Preencha tudo e informe o código do seu grupo — peça à liderança se não tiver.'
              : modo === 'esqueci'
                ? 'Digite o e-mail da sua conta que enviamos um link para você escolher uma senha nova.'
                : 'Entre com o e-mail cadastrado e a senha que você criou.'}
        </p>

        {erro && <p className="error-text">{erro}</p>}
        {recado && <p className="error-text" style={{ color: 'var(--good)' }}>{recado}</p>}

        {modo === 'cadastro' && (
          <>
            <div className="field">
              <label htmlFor="vend-nome">Seu nome</label>
              <input
                id="vend-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="field">
              <label htmlFor="vend-telefone">Seu telefone</label>
              <input
                id="vend-telefone"
                type="tel"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <label className="rotulo-solto">Você é de qual grupo?</label>
            <SeletorDeGrupo valor={grupo} aoEscolher={setGrupo} desabilitado={ocupado} />
            <div className="field">
              <label htmlFor="vend-tipo">Vai ao acampamento como</label>
              <select id="vend-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="adolescente">{grupo ? rotuloDoTipo(grupo) : 'Adolescente/Jovem'}</option>
                <option value="voluntario">Voluntário (vai trabalhar)</option>
              </select>
            </div>
            {grupo === KOMBO && (
              <div className="field">
                <label htmlFor="vend-destino">Vendendo para</label>
                <select id="vend-destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
                  <option value="quarto">Quarto normal</option>
                  <option value="chale">Chalé</option>
                </select>
              </div>
            )}
          </>
        )}

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
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              placeholder={modo === 'entrar' ? 'Sua senha' : 'Crie uma senha de 6+ caracteres'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        )}

        {modo === 'cadastro' && (
          <div className="field">
            <label htmlFor="vend-codigo">Código do grupo</label>
            <input
              id="vend-codigo"
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
            : modo === 'primeiro'
              ? 'Criar senha e entrar'
              : modo === 'cadastro'
                ? 'Cadastrar e entrar'
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
          {modo !== 'cadastro' && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => trocarModo('cadastro')}>
              Ainda não tenho cadastro
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
