import { useState } from 'react'
import Modal from './Modal'
import PainelTermo from './PainelTermo'
import BotoesDoWhatsapp from './BotoesDoWhatsapp'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { useSessao } from '../hooks/useSessao'
import { infoDoGrupo } from '../utils/grupos'
import { montarMensagemDoTermo } from '../utils/whatsapp'
import { traduzirErro } from '../lib/db/erros'

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
  const { config, adicionarVendedor, editarVendedor, buscarDadosPrivados, salvarPrivadoDoVendedor } =
    useDadosRifa()
  const { grupo } = useSessao()

  const editando = Boolean(vendedor)
  const privado = editando ? buscarDadosPrivados(vendedor.id) : null

  const [nome, setNome] = useState(vendedor?.nome || '')
  const [email, setEmail] = useState(vendedor?.email || '')
  const [telefone, setTelefone] = useState(vendedor?.telefone || '')
  const [meta, setMeta] = useState(String(vendedor?.meta ?? config.metaPadrao))
  const [situacao, setSituacao] = useState(vendedor?.situacao || 'ativo')
  const [observacao, setObservacao] = useState(privado?.observacao || '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [vendedorCriado, setVendedorCriado] = useState(null)

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
          Agora envie o termo de responsabilidade para ele(a) ler e assinar. Abre o WhatsApp com
          o texto pronto — você só confere e aperta enviar.
        </p>

        <BotoesDoWhatsapp
          telefone={vendedorCriado.telefone}
          mensagem={montarMensagemDoTermo({
            nome: vendedorCriado.nome,
            grupo,
            precoRifa: config.precoRifa,
            meta: vendedorCriado.meta ?? config.metaPadrao,
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
