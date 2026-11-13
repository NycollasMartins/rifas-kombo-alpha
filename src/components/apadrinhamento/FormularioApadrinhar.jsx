import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import BotaoVoltar from '../BotaoVoltar'
import BotaoArquivo from '../BotaoArquivo'
import {
  anexarComprovanteDoApadrinhamento,
  registrarApadrinhamento,
} from '../../lib/db/apadrinhamento'
import { enviarComprovante, novoLoteId, validarArquivo } from '../../lib/db/arquivos'
import { buscarPixParaApadrinhar } from '../../lib/db/chavePix'
import { montarPixCopiaECola, PIX_CIDADE } from '../../utils/pix'
import { formatarMoeda, formatarNumeroRifa } from '../../utils/formato'
import { traduzirErro } from '../../lib/db/erros'
import { segurarAtualizacao } from '../../utils/atualizacoes'
import { apagarRascunho, lerRascunho, salvarRascunho } from '../../utils/rascunhoApadrinhamento'
import estilos from './TelaApadrinhar.module.css'

/** Passo 2: quantidade, dados do comprador, Pix e comprovante opcional. */
export default function FormularioApadrinhar({ item, aoVoltar }) {
  const maximo = Math.max(1, Math.min(50, Math.ceil(item.disponivel / item.preco)))

  // se a página recarregou no meio (voltou do app do banco), retoma de onde parou
  const [rascunho] = useState(() => {
    const salvo = lerRascunho()
    return salvo?.vendedorId === item.vendedorId ? salvo : null
  })
  const [quantidade, setQuantidade] = useState(() =>
    Math.max(1, Math.min(maximo, Number(rascunho?.quantidade) || 1))
  )
  const [comprador, setComprador] = useState(rascunho?.comprador || '')
  const [telefone, setTelefone] = useState(rascunho?.telefone || '')
  const [arquivo, setArquivo] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [erroArquivo, setErroArquivo] = useState('')
  const [mostrarCodigo, setMostrarCodigo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [anexandoDepois, setAnexandoDepois] = useState(false)
  const [erroDepois, setErroDepois] = useState('')

  // miniatura da foto escolhida, pra pessoa ter certeza de que anexou a certa
  const previa = useMemo(() => {
    if (!arquivo || !String(arquivo.type).startsWith('image/')) return ''
    try {
      return URL.createObjectURL(arquivo)
    } catch {
      return ''
    }
  }, [arquivo])
  useEffect(() => () => previa && URL.revokeObjectURL(previa), [previa])

  // enquanto o formulário está na tela, a atualização automática não recarrega
  useEffect(() => segurarAtualizacao(), [])

  useEffect(() => {
    if (resultado) return
    salvarRascunho({ vendedorId: item.vendedorId, quantidade, comprador, telefone })
  }, [item.vendedorId, quantidade, comprador, telefone, resultado])

  function voltar() {
    apagarRascunho()
    aoVoltar()
  }

  const canvasRef = useRef(null)
  const codigoRef = useRef(null)
  // trava contra toque duplo no "Concluir": dois toques rápidos chegavam a
  // registrar o apadrinhamento duas vezes (rifas em dobro) antes do botão
  // ficar desabilitado na tela
  const enviandoRef = useRef(false)
  const envioAnterior = useRef(null)

  // o Pix vai pra conta do próprio vendedor — chave e titular vêm do cadastro dele
  const [recebedor, setRecebedor] = useState(null)
  const [erroRecebedor, setErroRecebedor] = useState('')

  useEffect(() => {
    let ativo = true
    buscarPixParaApadrinhar(item.vendedorId)
      .then((r) => ativo && setRecebedor(r))
      .catch((e) => ativo && setErroRecebedor(e.message))
    return () => {
      ativo = false
    }
  }, [item.vendedorId])

  const total = quantidade * item.preco
  const pix = useMemo(
    () =>
      recebedor
        ? montarPixCopiaECola({
            chave: recebedor.chave,
            nome: recebedor.titular || item.nome,
            cidade: PIX_CIDADE,
            valor: total,
          })
        : '',
    [recebedor, total, item.nome]
  )

  useEffect(() => {
    if (!pix || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, pix, { width: 220, margin: 1 }).catch(() => {})
  }, [pix])

  function ajustar(delta) {
    setQuantidade((q) => Math.max(1, Math.min(maximo, q + delta)))
  }

  function escolherArquivo(escolhido) {
    const problema = validarArquivo(escolhido)
    if (problema) {
      setArquivo(null)
      return setErroArquivo(problema)
    }
    setErroArquivo('')
    setArquivo(escolhido)
  }

  // Quem abre o link pelo WhatsApp/Instagram cai no navegador embutido
  // deles, que muitas vezes bloqueia a cópia automática. Tenta os dois
  // jeitos; se nenhum funcionar, mostra o código na tela, já selecionado,
  // pra pessoa copiar segurando o dedo.
  async function copiarPix() {
    let deu = false
    try {
      await navigator.clipboard.writeText(pix)
      deu = true
    } catch {
      deu = copiarDoJeitoAntigo(pix)
    }
    if (deu) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
      return
    }
    setMostrarCodigo(true)
    setTimeout(() => {
      codigoRef.current?.focus()
      codigoRef.current?.select()
    }, 50)
  }

  async function anexarDepois(escolhido) {
    if (anexandoDepois) return
    const problema = validarArquivo(escolhido)
    if (problema) return setErroDepois(problema)
    setErroDepois('')
    setAnexandoDepois(true)
    try {
      const caminho = await enviarComprovante(item.grupo, novoLoteId(), escolhido, {
        substituir: false,
      })
      await anexarComprovanteDoApadrinhamento(resultado.loteId, caminho)
      setAviso('')
      setResultado((r) => ({ ...r, comComprovante: true }))
    } catch (e) {
      setErroDepois(e.message || 'Não foi possível enviar. Tente de novo.')
    } finally {
      setAnexandoDepois(false)
    }
  }

  async function concluir() {
    if (enviandoRef.current) return
    if (!recebedor) return setErro(erroRecebedor || 'Espere o Pix carregar antes de concluir.')
    if (!comprador.trim()) return setErro('Digite o seu nome (lá em cima, em "Seu nome").')
    if (!arquivo) {
      return setErro(
        'Anexe o comprovante do Pix para concluir. É com ele que a liderança confere o pagamento.'
      )
    }
    enviandoRef.current = true
    setErro('')
    setAviso('')
    setEnviando(true)
    try {
      // O comprovante é obrigatório: sem ele a liderança não tem como
      // conferir se o Pix chegou e se o valor bate com a quantidade de rifas.
      // Se o envio falhar, nada é registrado — a pessoa tenta de novo (o
      // arquivo continua escolhido).
      // Se o arquivo já subiu numa tentativa anterior (e o que falhou foi o
      // registro), reaproveita em vez de enviar outra cópia.
      let comprovantePath =
        envioAnterior.current?.arquivo === arquivo ? envioAnterior.current.caminho : ''
      if (!comprovantePath) {
        try {
          // sem login não dá pra sobrescrever arquivo — e o nome é sempre novo
          comprovantePath = await enviarComprovante(item.grupo, novoLoteId(), arquivo, {
            substituir: false,
          })
          envioAnterior.current = { arquivo, caminho: comprovantePath }
        } catch (e) {
          setErro(
            `Não conseguimos enviar o comprovante: ${e.message || 'confira a internet.'} Toque em "Concluir" de novo.`
          )
          return
        }
      }
      const criadas = await registrarApadrinhamento({
        vendedorId: item.vendedorId,
        quantidade,
        comprador: comprador.trim(),
        telefone: telefone.trim(),
        comprovantePath,
      })
      apagarRascunho()
      setResultado({
        criadas,
        loteId: criadas[0]?.loteId,
        comComprovante: Boolean(comprovantePath),
      })
    } catch (e) {
      setErro(traduzirErro(e, e.message))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <div className={estilos.pagina}>
        <div className={`card ${estilos.confirmacao}`}>
          <div className={estilos.chama}>🎉</div>
          <h2>Apadrinhamento registrado!</h2>
          <p className="texto-ajuda">
            Muito obrigado por ajudar <strong>{item.nome}</strong> a chegar ao acampamento.
          </p>
          <div className={estilos.numeros}>
            {resultado.criadas
              .slice()
              .sort((a, b) => a.numero - b.numero)
              .map((v) => (
                <span key={v.id} className={estilos.numero}>
                  {formatarNumeroRifa(v.numero)}
                </span>
              ))}
          </div>
          {aviso && <p className="error-text">{aviso}</p>}
          {resultado.comComprovante ? (
            <p className="texto-ajuda">
              Recebemos o seu comprovante. Assim que a liderança conferir, isso já conta pra meta
              dele(a).
            </p>
          ) : (
            <>
              {resultado.loteId && (
                <div className={estilos.anexarDepois}>
                  <p className="texto-ajuda">
                    Já pagou? Anexe o comprovante (foto, print ou PDF) pra liderança confirmar
                    mais rápido:
                  </p>
                  <BotaoArquivo
                    className="btn btn-primary btn-block"
                    aoEscolher={anexarDepois}
                    desabilitado={anexandoDepois}
                  >
                    {anexandoDepois ? 'Enviando comprovante…' : '📎 Anexar comprovante'}
                  </BotaoArquivo>
                  {erroDepois && <p className="error-text">{erroDepois}</p>}
                </div>
              )}
              <p className="texto-ajuda">
                Se ainda não fez o Pix de {formatarMoeda(total)}, copie o código abaixo e cole no
                app do seu banco ("Pix Copia e Cola"). Se puder, mande o comprovante depois pra
                liderança confirmar mais rápido.
              </p>
              <button type="button" className="btn btn-block" onClick={copiarPix} style={{ marginBottom: 10 }}>
                {copiado ? 'Copiado!' : 'Copiar código Pix de novo'}
              </button>
              {mostrarCodigo && (
                <textarea
                  ref={codigoRef}
                  className={estilos.codigoPix}
                  value={pix}
                  readOnly
                  rows={4}
                  style={{ marginBottom: 10 }}
                  onFocus={(e) => e.target.select()}
                />
              )}
            </>
          )}
          <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
            Apadrinhar outra pessoa
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={estilos.pagina}>
      <BotaoVoltar aoClicar={voltar} />

      <div className="card">
        <h2>Apadrinhando {item.nome}</h2>
        <p className="texto-ajuda">
          Faltam {formatarMoeda(item.disponivel)} pra ele(a) completar a meta.
        </p>

        <label className="rotulo-solto">Quantas rifas você quer apadrinhar?</label>
        <div className={estilos.seletorQuantidade}>
          <button type="button" className="btn btn-sm" onClick={() => ajustar(-1)} disabled={quantidade <= 1}>
            −
          </button>
          <span className={estilos.quantidade}>{quantidade}</span>
          <button type="button" className="btn btn-sm" onClick={() => ajustar(1)} disabled={quantidade >= maximo}>
            +
          </button>
        </div>
        <p className={estilos.totalEmReais}>{formatarMoeda(total)}</p>

        <div className="field">
          <label htmlFor="apadrinhar-nome">Seu nome</label>
          <input
            id="apadrinhar-nome"
            value={comprador}
            onChange={(e) => setComprador(e.target.value)}
            maxLength={80}
            autoComplete="name"
            placeholder="Nome completo"
          />
        </div>
        <div className="field">
          <label htmlFor="apadrinhar-telefone">Seu telefone (opcional)</label>
          <input
            id="apadrinhar-telefone"
            type="tel"
            inputMode="tel"
            maxLength={20}
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>

        <div className={estilos.pix}>
          <strong>Pague via Pix</strong>
          {erroRecebedor ? (
            <p className="error-text">{erroRecebedor}</p>
          ) : !recebedor ? (
            <p className="texto-ajuda">Carregando o Pix…</p>
          ) : (
            <>
              <p className="texto-ajuda" style={{ margin: '4px 0 8px' }}>
                O Pix cai direto na conta de <strong>{recebedor.titular || item.nome}</strong>, que
                recebe as rifas de {item.nome}.
              </p>
              <canvas ref={canvasRef} className={estilos.qrcode} />
              <button type="button" className="btn btn-sm" onClick={copiarPix}>
                {copiado ? 'Copiado!' : 'Copiar código Pix'}
              </button>
              {mostrarCodigo && (
                <>
                  <p className="texto-ajuda" style={{ marginTop: 8 }}>
                    Seu navegador não deixou copiar sozinho. Segure o dedo no código abaixo e
                    toque em "Copiar":
                  </p>
                  <textarea
                    ref={codigoRef}
                    className={estilos.codigoPix}
                    value={pix}
                    readOnly
                    rows={4}
                    onFocus={(e) => e.target.select()}
                  />
                </>
              )}
              <p className="texto-ajuda" style={{ marginTop: 8 }}>
                Abra o Pix do seu banco, escolha "Pix Copia e Cola" ou aponte a câmera pro QR Code.
                O valor de {formatarMoeda(total)} já vem preenchido.
              </p>
            </>
          )}
        </div>

        <div className="field">
          <label>Comprovante do Pix (obrigatório)</label>
          {arquivo && (
            <div className={estilos.arquivoEscolhido}>
              {previa ? (
                <img
                  src={previa}
                  alt=""
                  className={estilos.previa}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <span className={estilos.iconeArquivo}>📄</span>
              )}
              <span className={estilos.nomeArquivo}>✓ {arquivo.name || 'comprovante'}</span>
            </div>
          )}
          <BotaoArquivo aoEscolher={escolherArquivo}>
            {arquivo ? 'Trocar arquivo' : '📎 Anexar comprovante'}
          </BotaoArquivo>
          <p className="texto-ajuda" style={{ marginTop: 6 }}>
            Depois de fazer o Pix, anexe a foto, o print da tela ou o PDF do comprovante. Sem
            ele não dá pra concluir, porque é com ele que a liderança confere o pagamento.
          </p>
          {erroArquivo && <p className="error-text">{erroArquivo}</p>}
        </div>

        {erro && (
          <p className="error-text" style={{ marginTop: 16 }}>
            {erro}
          </p>
        )}

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          onClick={concluir}
          disabled={enviando}
        >
          {enviando ? 'Enviando…' : 'Concluir apadrinhamento'}
        </button>
      </div>
    </div>
  )
}

/** Cópia pelo jeito antigo (execCommand), que ainda funciona em navegador embutido. */
function copiarDoJeitoAntigo(texto) {
  try {
    const campo = document.createElement('textarea')
    campo.value = texto
    campo.setAttribute('readonly', '')
    campo.style.position = 'fixed'
    campo.style.opacity = '0'
    document.body.appendChild(campo)
    campo.select()
    campo.setSelectionRange(0, texto.length)
    const deu = document.execCommand('copy')
    document.body.removeChild(campo)
    return deu
  } catch {
    return false
  }
}
