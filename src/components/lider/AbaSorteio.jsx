import { useEffect, useMemo, useRef, useState } from 'react'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { useSessao } from '../../hooks/useSessao'
import { formatarDataHora, formatarNumeroRifa } from '../../utils/formato'
import { infoDoGrupo } from '../../utils/grupos'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './AbaSorteio.module.css'

const TOTAL_DE_GIROS = 18
const INTERVALO_MS = 90

/** Sorteia entre as rifas pagas do grupo. Cada grupo tem o seu sorteio. */
export default function AbaSorteio() {
  const { vendas, sorteios, buscarVendedor, salvarSorteio } = useDadosRifa()
  const { grupo } = useSessao()

  const [sorteando, setSorteando] = useState(false)
  const [numeroNoVisor, setNumeroNoVisor] = useState(null)
  const [ganhador, setGanhador] = useState(null)
  const [aviso, setAviso] = useState('')

  // congelado no início para que uma venda registrada no meio da animação
  // não mude o resultado
  const poolCongelado = useRef([])

  const pagas = useMemo(() => vendas.filter((v) => v.status === 'pago'), [vendas])

  function iniciarSorteio() {
    if (pagas.length === 0) {
      setGanhador(null)
      setNumeroNoVisor(null)
      setAviso('Nenhuma rifa paga ainda. O sorteio considera só pagamento confirmado.')
      return
    }
    poolCongelado.current = pagas
    setAviso('')
    setGanhador(null)
    setNumeroNoVisor(pagas[0].numero)
    setSorteando(true)
  }

  useEffect(() => {
    if (!sorteando) return undefined

    const pool = poolCongelado.current
    let giros = 0

    const intervalo = setInterval(() => {
      setNumeroNoVisor(pool[Math.floor(Math.random() * pool.length)].numero)
      giros += 1

      if (giros > TOTAL_DE_GIROS) {
        clearInterval(intervalo)
        const vencedora = pool[Math.floor(Math.random() * pool.length)]
        setNumeroNoVisor(vencedora.numero)
        setGanhador(vencedora)
        setSorteando(false)
        salvarSorteio(vencedora.id).catch((e) => {
          setAviso(traduzirErro(e, 'O ganhador saiu, mas não deu para salvar no histórico.'))
        })
      }
    }, INTERVALO_MS)

    return () => clearInterval(intervalo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorteando])

  const vendedorDoGanhador = ganhador ? buscarVendedor(ganhador.vendedorId) : null

  return (
    <>
      <div className="card">
        <h2>Sortear ganhador do {infoDoGrupo(grupo).nome}</h2>
        <p className="texto-ajuda">
          Entram só as rifas com pagamento confirmado do seu grupo: {pagas.length} elegíveis.
        </p>

        <button className="btn btn-primary btn-block" onClick={iniciarSorteio} disabled={sorteando}>
          {sorteando ? 'Sorteando…' : 'Sortear agora'}
        </button>

        {aviso && <p className="center-note">{aviso}</p>}

        {sorteando && (
          <div className={estilos.caixa}>
            <div className={estilos.visor}>{formatarNumeroRifa(numeroNoVisor)}</div>
          </div>
        )}

        {ganhador && !sorteando && (
          <div className={estilos.cartaoGanhador}>
            <div className={estilos.numeroGanhador}>{formatarNumeroRifa(ganhador.numero)}</div>
            <div className={estilos.nomeGanhador}>{ganhador.comprador}</div>
            <div className={estilos.detalheGanhador}>
              {ganhador.telefone ? ganhador.telefone + ' · ' : ''}
              vendido por {vendedorDoGanhador ? vendedorDoGanhador.nome : '—'}
            </div>
          </div>
        )}
      </div>

      {sorteios.length > 0 && (
        <>
          <div className="section-head">
            <h2>Histórico de sorteios</h2>
          </div>
          <div className="card">
            {sorteios.map((sorteio) => {
              const venda = vendas.find((v) => v.id === sorteio.vendaId)
              const vendedor = venda ? buscarVendedor(venda.vendedorId) : null
              return (
                <div key={sorteio.id} className="list-row">
                  <div className="info">
                    <strong>
                      {venda
                        ? `${formatarNumeroRifa(venda.numero)} · ${venda.comprador}`
                        : 'rifa removida'}
                    </strong>
                    <span>
                      {vendedor ? vendedor.nome + ' · ' : ''}
                      {formatarDataHora(sorteio.data)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
