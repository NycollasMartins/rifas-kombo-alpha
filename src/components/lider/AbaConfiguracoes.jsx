import { useState } from 'react'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { useSessao } from '../../hooks/useSessao'
import { definirCodigoDeLider } from '../../lib/db/entrada'
import { infoDoGrupo } from '../../utils/grupos'
import { traduzirErro } from '../../lib/db/erros'

/** Ajustes do grupo. Cada grupo tem os seus — Alpha não mexe no Kombo. */
export default function AbaConfiguracoes() {
  const { config, salvarAjustes, apagarTudo } = useDadosRifa()
  const { grupo, email, trocarSenha } = useSessao()
  const nomeDoGrupo = infoDoGrupo(grupo).nome

  const [preco, setPreco] = useState(String(config.precoRifa))
  const [metaPadrao, setMetaPadrao] = useState(String(config.metaPadrao))
  const [prazoFinal, setPrazoFinal] = useState(config.prazoFinal || '')
  const [premio, setPremio] = useState(config.premio || '')
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [recados, setRecados] = useState({})

  function avisar(cartao, texto, tipo = 'ok') {
    setRecados((atual) => ({ ...atual, [cartao]: { texto, tipo } }))
  }

  function Recado({ cartao }) {
    const recado = recados[cartao]
    if (!recado) return null
    return (
      <p
        className="error-text"
        style={{ color: recado.tipo === 'ok' ? 'var(--good)' : 'var(--bad)' }}
      >
        {recado.texto}
      </p>
    )
  }

  async function tentar(cartao, acao, mensagemOk) {
    try {
      await acao()
      avisar(cartao, mensagemOk)
    } catch (e) {
      avisar(cartao, traduzirErro(e), 'erro')
    }
  }

  return (
    <>
      <div className="card">
        <h2>Preço e meta do {nomeDoGrupo}</h2>
        <p className="texto-ajuda">
          Vale só para o {nomeDoGrupo}. O outro grupo tem os próprios valores.
        </p>
        <div className="field">
          <label htmlFor="cfg-preco">Preço de cada rifa (R$)</label>
          <input
            id="cfg-preco"
            type="number"
            inputMode="decimal"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cfg-meta">Meta padrão por pessoa (R$)</label>
          <input
            id="cfg-meta"
            type="number"
            inputMode="decimal"
            value={metaPadrao}
            onChange={(e) => setMetaPadrao(e.target.value)}
          />
        </div>
        <Recado cartao="valores" />
        <button
          className="btn btn-primary"
          onClick={() =>
            tentar(
              'valores',
              () =>
                salvarAjustes({
                  precoRifa: parseFloat(preco) || 0,
                  metaPadrao: parseFloat(metaPadrao) || 0,
                }),
              'Salvo.'
            )
          }
        >
          Salvar
        </button>
      </div>

      <div className="card">
        <h2>Prêmio do sorteio</h2>
        <p className="texto-ajuda">
          Aparece na mensagem que o comprador recebe pelo WhatsApp, avisando o que ele está
          concorrendo. Vale só para o {nomeDoGrupo}.
        </p>
        <div className="field">
          <label htmlFor="cfg-premio">Prêmio</label>
          <input
            id="cfg-premio"
            placeholder="Ex: uma TV 50 polegadas"
            value={premio}
            onChange={(e) => setPremio(e.target.value)}
          />
        </div>
        <Recado cartao="premio" />
        <button
          className="btn btn-primary"
          onClick={() =>
            tentar('premio', () => salvarAjustes({ premio: premio.trim() }), 'Salvo.')
          }
        >
          Salvar prêmio
        </button>
      </div>

      <div className="card">
        <h2>Prazo final das vendas</h2>
        <p className="texto-ajuda">
          Depois desta data, quem não bateu a meta precisa comprar as rifas que faltam, conforme o
          termo de compromisso. Deixe em branco se não quiser prazo.
        </p>
        <div className="field">
          <label htmlFor="cfg-prazo">Data limite</label>
          <input
            id="cfg-prazo"
            type="date"
            value={prazoFinal}
            onChange={(e) => setPrazoFinal(e.target.value)}
          />
        </div>
        <Recado cartao="prazo" />
        <button
          className="btn btn-primary"
          onClick={() =>
            tentar('prazo', () => salvarAjustes({ prazoFinal }), prazoFinal ? 'Prazo salvo.' : 'Prazo removido.')
          }
        >
          Salvar prazo
        </button>
      </div>

      <div className="card">
        <h2>Código de liderança do {nomeDoGrupo}</h2>
        <p className="texto-ajuda">
          É esta palavra que um novo líder digita para criar o acesso dele. Combine entre a
          liderança e não mande no grupo dos vendedores — quem tiver o código vira líder e enxerga
          tudo do {nomeDoGrupo}. Trocar o código não derruba quem já entrou.
        </p>
        <div className="field">
          <label htmlFor="cfg-codigo">Novo código</label>
          <input
            id="cfg-codigo"
            autoComplete="off"
            placeholder="Pelo menos 6 caracteres"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </div>
        <Recado cartao="codigo" />
        <button
          className="btn btn-primary"
          onClick={() =>
            tentar(
              'codigo',
              async () => {
                await definirCodigoDeLider(grupo, codigo)
                setCodigo('')
              },
              'Código atualizado.'
            )
          }
        >
          Trocar código
        </button>
      </div>

      <div className="card">
        <h2>Minha senha</h2>
        <p className="texto-ajuda">
          Você está logado como <strong>{email}</strong>.
        </p>
        <div className="field">
          <label htmlFor="cfg-senha">Nova senha</label>
          <input
            id="cfg-senha"
            type="password"
            autoComplete="new-password"
            placeholder="Pelo menos 6 caracteres"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
        </div>
        <Recado cartao="senha" />
        <button
          className="btn btn-primary"
          onClick={async () => {
            if (novaSenha.length < 6) {
              return avisar('senha', 'A senha precisa ter pelo menos 6 caracteres.', 'erro')
            }
            const r = await trocarSenha(novaSenha)
            if (r.ok) {
              setNovaSenha('')
              avisar('senha', 'Senha atualizada.')
            } else {
              avisar('senha', r.erro, 'erro')
            }
          }}
        >
          Trocar senha
        </button>
      </div>

      <div className="card">
        <h2 style={{ color: 'var(--bad)' }}>Zona de risco</h2>
        <p className="texto-ajuda">
          Apaga todos os vendedores, rifas e sorteios <strong>do {nomeDoGrupo}</strong> e devolve a
          numeração para o #001. O outro grupo não é afetado. Não pode ser desfeito.
        </p>
        <Recado cartao="risco" />
        <button
          className="btn btn-danger"
          onClick={() => {
            if (
              !confirm(
                `Isso vai apagar TODOS os vendedores, rifas e sorteios do ${nomeDoGrupo}. Confirma?`
              )
            ) {
              return
            }
            tentar('risco', apagarTudo, `Dados do ${nomeDoGrupo} apagados. A numeração volta ao #001.`)
          }}
        >
          Apagar os dados do {nomeDoGrupo}
        </button>
      </div>
    </>
  )
}
