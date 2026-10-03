import { useState } from 'react'
import Modal from './Modal'
import PainelTermo from './PainelTermo'
import BotoesDoWhatsapp from './BotoesDoWhatsapp'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { useSessao } from '../hooks/useSessao'
import { infoDoGrupo, rotuloDoTipo, KOMBO } from '../utils/grupos'
import { montarMensagemDeAcesso, montarMensagemDoTermo } from '../utils/whatsapp'
import { metaDoVendedor, precoDoVendedor } from '../utils/calculos'
import { traduzirErro } from '../lib/db/erros'
import { formatarDataHora } from '../utils/formato'

/**
 * Cadastro do vendedor.
 *
 * O e-mail é o que permite ele entrar depois: no primeiro acesso ele digita
 * esse mesmo e-mail, escolhe uma senha, e o sistema liga as duas coisas.
 * Por isso o e-mail precisa estar certo — confira antes de salvar.
 *
 * No cadastro de um novo vendedor, ao salvar aparece a etapa de enviar o
 * termo de responsabilidade pelo WhatsApp — no telefone que acabou de ser
 * cadastrado — para que ele leia e assine.
 */
export default function ModalVendedor({ vendedor, aoFechar }) {
  const {
    config,
    vendedores,
    adicionarVendedor,
    editarVendedor,
    buscarDadosPrivados,
    salvarPrivadoDoVendedor,
  } = useDadosRifa()
  const { grupo, redefinirSenhaDoVendedor } = useSessao()

  const editando = Boolean(vendedor)
  const privado = editando ? buscarDadosPrivados(vendedor.id) : null

  const [nome, setNome] = useState(vendedor?.nome || '')
  const [email, setEmail] = useState(vendedor?.email || '')
  const [telefone, setTelefone] = useState(vendedor?.telefone || '')
  const [tipo, setTipo] = useState(vendedor?.tipo || 'adolescente')
  const [destino, setDestino] = useState(vendedor?.destino || 'quarto')
  const [meta, setMeta] = useState(
    String(vendedor?.meta ?? (destino === 'chale' ? config.metaChale : config.metaPadrao))
  )
  const [situacao, setSituacao] = useState(vendedor?.situacao || 'ativo')
  const [observacao, setObservacao] = useState(privado?.observacao || '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [vendedorCriado, setVendedorCriado] = useState(null)
  const [novaSenhaVendedor, setNovaSenhaVendedor] = useState('')
  const [redefinindo, setRedefinindo] = useState(false)
  const [recadoSenha, setRecadoSenha] = useState('')

  async function redefinirSenha() {
    if (novaSenhaVendedor.length < 6) {
      return setRecadoSenha('A senha precisa ter pelo menos 6 caracteres.')
    }
    setRedefinindo(true)
    setRecadoSenha('')
    const r = await redefinirSenhaDoVendedor(vendedor.id, novaSenhaVendedor)
    setRedefinindo(false)
    if (r.ok) {
      setNovaSenhaVendedor('')
      setRecadoSenha('Senha atualizada. Avise o vendedor pelo WhatsApp.')
    } else {
      setRecadoSenha(r.erro)
    }
  }

  // marca que a mensagem de acesso foi enviada — só quando o líder de fato toca em enviar
  function marcarAcessoEnviado(id) {
    editarVendedor(id, { acessoEnviadoEm: new Date().toISOString() }).catch(() => {})
  }

  const acessoEm = editando ? vendedores.find((v) => v.id === vendedor.id)?.acessoEnviadoEm : ''

  async function salvar() {
    if (!nome.trim()) return setErro('Digite o nome do vendedor.')
    if (!email.trim() || !email.includes('@')) return setErro('Digite um e-mail válido.')
    if (!editando && !telefone.trim()) {
      return setErro('Digite o telefone do vendedor — é para onde vai o termo de responsabilidade.')
    }

    const dados = {
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      tipo,
      destino: grupo === KOMBO ? destino : 'quarto',
      meta: parseFloat(meta) || config.metaPadrao,
    }

    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        await editarVendedor(vendedor.id, { ...dados, situacao })
        if (observacao !== (privado?.observacao || '')) {
          await salvarPrivadoDoVendedor(vendedor.id, { observacao })
        }
        aoFechar()
      } else {
        const novo = await adicionarVendedor(dados)
        setSalvando(false)
        setVendedorCriado(novo)
      }
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível salvar o vendedor.'))
      setSalvando(false)
    }
  }

  // ---- depois de cadastrar: enviar o termo de responsabilidade -------------
  if (vendedorCriado) {
    return (
      <Modal
        titulo="Vendedor cadastrado"
        aoFechar={aoFechar}
        rodape={
          <button className="btn btn-primary" onClick={aoFechar}>
            Concluir
          </button>
        }
      >
        <p>
          <strong>{vendedorCriado.nome}</strong> foi cadastrado(a) no {infoDoGrupo(grupo).nome}.
        </p>

        <p className="texto-ajuda">
          Envie o acesso ao app (link, como instalar e como criar a senha) e o termo de
          responsabilidade. Abre o WhatsApp com o texto pronto — você só confere e aperta enviar.
        </p>

        <p className="texto-ajuda" style={{ margin: '0 0 6px' }}>
          <strong>1. Acesso ao app</strong>
        </p>
        <BotoesDoWhatsapp
          telefone={vendedorCriado.telefone}
          mensagem={montarMensagemDeAcesso({
            nome: vendedorCriado.nome,
            email: vendedorCriado.email,
            link: window.location.origin,
          })}
          aoEnviar={() => marcarAcessoEnviado(vendedorCriado.id)}
        />

        <p className="texto-ajuda" style={{ margin: '16px 0 6px' }}>
          <strong>2. Termo de responsabilidade</strong>
        </p>
        <BotoesDoWhatsapp
          telefone={vendedorCriado.telefone}
          mensagem={montarMensagemDoTermo({
            nome: vendedorCriado.nome,
            grupo,
            precoRifa: precoDoVendedor(vendedorCriado, config),
            meta: metaDoVendedor(vendedorCriado, config),
            prazoFinal: config.prazoFinal,
          })}
        />

        <p className="texto-ajuda" style={{ marginTop: 14 }}>
          Depois que ele(a) devolver assinado, anexe o arquivo em Editar → Termo de compromisso.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      titulo={editando ? 'Editar vendedor' : `Novo vendedor do ${infoDoGrupo(grupo).nome}`}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="vendedor-nome">Nome</label>
        <input
          id="vendedor-nome"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="vendedor-email">E-mail</label>
        <input
          id="vendedor-email"
          type="email"
          inputMode="email"
          placeholder="email@dele.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <p className="texto-ajuda">
        {editando && vendedor.temSenha
          ? 'Ele já criou a senha dele. Se você trocar o e-mail agora, ele perde o acesso e precisa criar senha de novo.'
          : 'É com este e-mail que ele vai entrar no app e criar a própria senha. Confira se está certo.'}
      </p>

      <div className="field">
        <label htmlFor="vendedor-telefone">Telefone</label>
        <input
          id="vendedor-telefone"
          type="tel"
          inputMode="tel"
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </div>

      {!editando && (
        <p className="texto-ajuda">
          É para este número que vai o termo de responsabilidade, assim que você salvar.
        </p>
      )}

      <div className="field">
        <label htmlFor="vendedor-tipo">Vai ao acampamento como</label>
        <select id="vendedor-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="adolescente">{rotuloDoTipo(grupo)}</option>
          <option value="voluntario">Voluntário</option>
        </select>
      </div>

      {grupo === KOMBO && (
        <div className="field">
          <label htmlFor="vendedor-destino">Vendendo para</label>
          <select
            id="vendedor-destino"
            value={destino}
            onChange={(e) => {
              const novoDestino = e.target.value
              setDestino(novoDestino)
              if (!editando) {
                setMeta(String(novoDestino === 'chale' ? config.metaChale : config.metaPadrao))
              }
            }}
          >
            <option value="quarto">Quarto normal</option>
            <option value="chale">Chalé</option>
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="vendedor-meta">Meta (R$)</label>
        <input
          id="vendedor-meta"
          type="number"
          inputMode="decimal"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
        />
      </div>

      {editando && (
        <>
          <div className="field">
            <label htmlFor="vendedor-situacao">Situação</label>
            <select
              id="vendedor-situacao"
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
            >
              <option value="ativo">Ativo — vendendo normalmente</option>
              <option value="quitou">Meta fechada</option>
              <option value="desistiu">Desistiu do acampamento</option>
            </select>
          </div>

          {situacao === 'desistiu' && (
            <p className="texto-ajuda">
              Ele sai das contas de meta, mas o que já arrecadou continua no caixa, marcado como
              valor para o acampamento.
            </p>
          )}

          <div className="field">
            <label htmlFor="vendedor-observacao">Observação (só a liderança vê)</label>
            <input
              id="vendedor-observacao"
              placeholder="Ex: desistiu por motivo de saúde, avisou em 10/09"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Acesso ao app</label>
            <p className="texto-ajuda" style={{ margin: '0 0 8px' }}>
              {acessoEm
                ? `Mensagem enviada em ${formatarDataHora(acessoEm)}. Dá pra reenviar.`
                : 'A mensagem com o link, como instalar e o grupo ainda não foi enviada.'}
            </p>
            <BotoesDoWhatsapp
              telefone={telefone}
              mensagem={montarMensagemDeAcesso({
                nome,
                email,
                link: window.location.origin,
              })}
              rotulo={acessoEm ? 'Reenviar no WhatsApp' : 'Enviar no WhatsApp'}
              aoEnviar={() => marcarAcessoEnviado(vendedor.id)}
              compacto
            />
          </div>

          {vendedor.temSenha && (
            <div className="field">
              <label htmlFor="vendedor-nova-senha">Redefinir senha dele(a)</label>
              <p className="texto-ajuda" style={{ margin: '0 0 8px' }}>
                Cria uma senha nova direto no sistema — não envia nada por e-mail. Avise o
                vendedor da senha nova por fora.
              </p>
              <input
                id="vendedor-nova-senha"
                type="text"
                autoComplete="off"
                placeholder="Pelo menos 6 caracteres"
                value={novaSenhaVendedor}
                onChange={(e) => setNovaSenhaVendedor(e.target.value)}
              />
              {recadoSenha && (
                <p
                  className="error-text"
                  style={{ color: recadoSenha.startsWith('Senha atualizada') ? 'var(--good)' : 'var(--bad)' }}
                >
                  {recadoSenha}
                </p>
              )}
              <button
                type="button"
                className="btn"
                style={{ marginTop: 8 }}
                onClick={redefinirSenha}
                disabled={redefinindo}
              >
                {redefinindo ? 'Salvando…' : 'Redefinir senha'}
              </button>
            </div>
          )}

          <PainelTermo vendedor={vendedor} />
        </>
      )}

      {!editando && (
        <p className="texto-ajuda">Salve primeiro para anexar o termo de compromisso assinado.</p>
      )}

      {erro && <p className="error-text">{erro}</p>}
    </Modal>
  )
}
