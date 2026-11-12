import { useEffect, useRef, useState } from 'react'
import ModalChavePix from './ModalChavePix'
import { buscarMinhaChavePix } from '../lib/db/chavePix'
import { infoDoTipoPix, mascararChavePix } from '../utils/chavePix'
import estilos from './CartaoChavePix.module.css'

/**
 * A chave Pix na tela do vendedor.
 *
 * Sem chave: o pop-up abre sozinho uma vez a cada vez que ele entra no app
 * e, se ele fechar, fica a faixa grande cobrando até cadastrar. Com chave:
 * mostra a chave (com parte escondida) e o botão de alterar.
 */
export default function CartaoChavePix({ vendedor, grupo }) {
  const [minhaChave, setMinhaChave] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const jaAbriuSozinho = useRef(false)

  useEffect(() => {
    if (vendedor.temPix || jaAbriuSozinho.current) return
    jaAbriuSozinho.current = true
    setModalAberto(true)
  }, [vendedor.temPix])

  useEffect(() => {
    if (!vendedor.temPix) return undefined
    let ativo = true
    buscarMinhaChavePix(grupo)
      .then((chave) => ativo && setMinhaChave(chave))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [vendedor.temPix, grupo])

  return (
    <>
      {vendedor.temPix ? (
        <div className={estilos.cartao}>
          <div>
            <strong>Sua chave Pix</strong>
            <span>
              {minhaChave
                ? `${infoDoTipoPix(minhaChave.tipo).rotulo}: ${mascararChavePix(minhaChave.tipo, minhaChave.chave)}`
                : 'Carregando…'}
              {minhaChave?.titular && ` · titular: ${minhaChave.titular}`}
            </span>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => setModalAberto(true)}
            disabled={!minhaChave}
          >
            Alterar
          </button>
        </div>
      ) : (
        <div className={estilos.faixa}>
          <strong>⚠️ Falta cadastrar sua chave Pix</strong>
          <span>
            A gente precisa da chave onde você recebe o dinheiro das rifas. Sem ela, ninguém
            consegue te apadrinhar.
          </span>
          <button className="btn btn-primary btn-block" onClick={() => setModalAberto(true)}>
            Cadastrar minha chave Pix
          </button>
        </div>
      )}

      {modalAberto && (
        <ModalChavePix
          atual={vendedor.temPix ? minhaChave : null}
          aoSalvar={setMinhaChave}
          aoFechar={() => setModalAberto(false)}
        />
      )}
    </>
  )
}
