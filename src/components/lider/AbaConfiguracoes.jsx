import { useEffect, useState } from 'react'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { useSessao } from '../../hooks/useSessao'
import { definirCodigoDeLider, definirCodigoDeVendedor } from '../../lib/db/entrada'
import { notificarVendedores } from '../../lib/db/notificacoes'
import { buscarWebhook, salvarWebhook } from '../../lib/db/integracao'
import { formatarPrazo } from '../../utils/prazo'
import { infoDoGrupo, KOMBO } from '../../utils/grupos'
import { traduzirErro } from '../../lib/db/erros'
import CartaoQrCode from './CartaoQrCode'

/** Ajustes do grupo. Cada grupo tem os seus — Alpha não mexe no Kombo. */
export default function AbaConfiguracoes() {
  const { config, salvarAjustes, apagarTudo } = useDadosRifa()
  const { grupo, email, eDev, trocarSenha } = useSessao()
  const nomeDoGrupo = infoDoGrupo(grupo).nome

  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSegredo, setWebhookSegredo] = useState('')

  useEffect(() => {
    if (!eDev) return
    buscarWebhook(grupo).then(({ url, segredo }) => {
      setWebhookUrl(url)
      setWebhookSegredo(segredo)
    })
  }, [grupo, eDev])

  const [preco, setPreco] = useState(String(config.precoRifa))
  const [metaPadrao, setMetaPadrao] = useState(String(config.metaPadrao))
  const [precoChale, setPrecoChale] = useState(String(config.precoRifaChale))
  const [metaChale, setMetaChale] = useState(String(config.metaChale))
  const [prazoFinal, setPrazoFinal] = useState(config.prazoFinal || '')
  const [premio, setPremio] = useState(config.premio || '')
  const [dataSorteio, setDataSorteio] = useState(config.dataSorteio || '')
  const [primeiroAcerto, setPrimeiroAcerto] = useState(config.primeiroAcerto || '')
  const [codigo, setCodigo] = useState('')
  const [codigoVendedor, setCodigoVendedor] = useState('')
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
      <CartaoQrCode />

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

      {grupo === KOMBO && (
        <div className="card">
          <h2>Preço e meta — vendedores do chalé</h2>
          <p className="texto-ajuda">
            Vale só para quem está vendendo para ficar no chalé. Quem vende para o quarto normal
            usa os valores do cartão acima.
          </p>
          <div className="field">
            <label htmlFor="cfg-preco-chale">Preço de cada rifa (R$)</label>
            <input
              id="cfg-preco-chale"
              type="number"
              inputMode="decimal"
              value={precoChale}
              onChange={(e) => setPrecoChale(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="cfg-meta-chale">Meta padrão por pessoa (R$)</label>
            <input
              id="cfg-meta-chale"
              type="number"
              inputMode="decimal"
              value={metaChale}
              onChange={(e) => setMetaChale(e.target.value)}
            />
          </div>
          <Recado cartao="valoresChale" />
          <button
            className="btn btn-primary"
            onClick={() =>
              tentar(
                'valoresChale',
                () =>
                  salvarAjustes({
                    precoRifaChale: parseFloat(precoChale) || 0,
                    metaChale: parseFloat(metaChale) || 0,
                  }),
                'Salvo.'
              )
            }
          >
            Salvar
          </button>
        </div>
      )}

      <div className="card">
        <h2>Prêmio e data do sorteio</h2>
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
        <div className="field">
          <label htmlFor="cfg-sorteio">Data do sorteio</label>
          <input
            id="cfg-sorteio"
            type="date"
            value={dataSorteio}
            onChange={(e) => setDataSorteio(e.target.value)}
          />
        </div>
        <p className="texto-ajuda">
          Também entra na mensagem do comprador. Deixe em branco se ainda não tiver data.
        </p>
        <Recado cartao="premio" />
        <button
          className="btn btn-primary"
          onClick={() =>
            tentar(
              'premio',
              () => salvarAjustes({ premio: premio.trim(), dataSorteio }),
              'Salvo.'
            )
          }
        >
          Salvar
        </button>
      </div>

      <div className="card">
        <h2>Primeiro acerto</h2>
        <p className="texto-ajuda">
          A data do primeiro encontro para acertar as contas com os vendedores. Some do vendedor
          quando o dia passa.
        </p>
        <div className="field">
          <label htmlFor="cfg-acerto">Data do primeiro acerto</label>
          <input
            id="cfg-acerto"
            type="date"
            value={primeiroAcerto}
            onChange={(e) => setPrimeiroAcerto(e.target.value)}
          />
        </div>
        <Recado cartao="acerto" />
        <button
          className="btn btn-primary"
          onClick={() =>
            tentar('acerto', async () => {
              await salvarAjustes({ primeiroAcerto })
              if (primeiroAcerto) {
                notificarVendedores(
                  grupo,
                  'Primeiro acerto marcado',
                  `O primeiro acerto do ${nomeDoGrupo} é dia ${formatarPrazo(primeiroAcerto)}.`
                )
              }
            }, primeiroAcerto ? 'Salvo.' : 'Removido.')
          }
        >
          Salvar primeiro acerto
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
            tentar('prazo', async () => {
              await salvarAjustes({ prazoFinal })
              if (prazoFinal) {
                notificarVendedores(
                  grupo,
                  'Prazo final marcado',
                  `O prazo final de vendas do ${nomeDoGrupo} é dia ${formatarPrazo(prazoFinal)}.`
                )
              }
            }, prazoFinal ? 'Prazo salvo.' : 'Prazo removido.')
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
        <h2>Código de cadastro do vendedor</h2>
        <p className="texto-ajuda">
          É esta palavra que a pessoa digita para se cadastrar sozinha como vendedor(a) do{' '}
          {nomeDoGrupo}, em "Ainda não tenho cadastro". Diferente do código de liderança — quem
          tiver este código só vira vendedor, nunca líder.
        </p>
        <div className="field">
          <label htmlFor="cfg-codigo-vendedor">Novo código</label>
          <input
            id="cfg-codigo-vendedor"
            autoComplete="off"
            placeholder="Pelo menos 6 caracteres"
            value={codigoVendedor}
            onChange={(e) => setCodigoVendedor(e.target.value)}
          />
        </div>
        <Recado cartao="codigoVendedor" />
        <button
          className="btn btn-primary"
          onClick={() =>
            tentar(
              'codigoVendedor',
              async () => {
                await definirCodigoDeVendedor(grupo, codigoVendedor)
                setCodigoVendedor('')
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

      {eDev && (
        <div className="card">
          <h2>Integração por webhook</h2>
          <p className="texto-ajuda">
            Quando um vendedor do {nomeDoGrupo} finaliza (meta fechada), o sistema avisa essa URL
            automaticamente — uma vez só por vendedor. Deixe em branco pra manter desligado.
          </p>
          <div className="field">
            <label htmlFor="cfg-webhook-url">URL do outro sistema</label>
            <input
              id="cfg-webhook-url"
              placeholder="https://..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="cfg-webhook-segredo">Segredo (opcional)</label>
            <input
              id="cfg-webhook-segredo"
              autoComplete="off"
              placeholder="Vai no cabeçalho X-Webhook-Secret, pro outro sistema conferir a origem"
              value={webhookSegredo}
              onChange={(e) => setWebhookSegredo(e.target.value)}
            />
          </div>
          <Recado cartao="webhook" />
          <button
            className="btn btn-primary"
            onClick={() =>
              tentar(
                'webhook',
                () => salvarWebhook(grupo, { url: webhookUrl, segredo: webhookSegredo }),
                webhookUrl ? 'Salvo — integração ligada.' : 'Salvo — integração desligada.'
              )
            }
          >
            Salvar
          </button>
        </div>
      )}

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
