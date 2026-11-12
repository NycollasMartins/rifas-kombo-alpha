import { TIPOS_CHAVE_PIX, infoDoTipoPix } from '../utils/chavePix'

/**
 * Tipo da chave + chave + titular da conta. Controlado por fora: `valor` é
 * `{ tipo, chave, titular }` e `aoMudar` recebe o objeto inteiro de volta.
 * Usado pelo próprio vendedor (ModalChavePix) e pela liderança (ModalVendedor).
 */
export default function CamposChavePix({ valor, aoMudar, prefixoId = 'pix' }) {
  const info = infoDoTipoPix(valor.tipo)
  const mudar = (campo) => (e) => aoMudar({ ...valor, [campo]: e.target.value })

  return (
    <>
      <div className="field">
        <label htmlFor={`${prefixoId}-tipo`}>Tipo da chave Pix</label>
        <select id={`${prefixoId}-tipo`} value={valor.tipo} onChange={mudar('tipo')}>
          {TIPOS_CHAVE_PIX.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${prefixoId}-chave`}>Chave Pix</label>
        <input
          id={`${prefixoId}-chave`}
          inputMode={info.teclado}
          type={info.teclado === 'email' ? 'email' : 'text'}
          autoComplete="off"
          autoCapitalize="none"
          placeholder={info.exemplo}
          value={valor.chave}
          onChange={mudar('chave')}
        />
      </div>

      <div className="field">
        <label htmlFor={`${prefixoId}-titular`}>Nome do titular da conta</label>
        <input
          id={`${prefixoId}-titular`}
          placeholder="Quem aparece como dono da conta no banco"
          value={valor.titular}
          onChange={mudar('titular')}
        />
      </div>
    </>
  )
}
