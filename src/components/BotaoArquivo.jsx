import { useId } from 'react'

export const TIPOS_DO_SELETOR = 'image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp'

/**
 * Botão que abre o seletor de arquivos — feito com <label> em volta do
 * <input type="file">, e não com um input escondido (display:none) clicado
 * por código. Esse segundo jeito falha em alguns navegadores: o embutido do
 * Instagram/Facebook, versões antigas do Safari e alguns Androids
 * simplesmente não abrem nada. O toque direto no <label> funciona em
 * todos — iPhone, iPad, Android, Mac e Windows.
 *
 * O input fica invisível mas "presente" na página (não display:none),
 * que é o que os navegadores exigem pra abrir a galeria/câmera.
 */
export default function BotaoArquivo({
  children,
  aoEscolher,
  className = 'btn btn-sm',
  accept = TIPOS_DO_SELETOR,
  desabilitado = false,
}) {
  const id = useId()

  function mudou(evento) {
    const arquivo = evento.target.files?.[0] || null
    // limpa pra conseguir escolher o MESMO arquivo de novo, se precisar
    evento.target.value = ''
    if (arquivo) aoEscolher(arquivo)
  }

  return (
    <label
      htmlFor={id}
      className={className}
      aria-disabled={desabilitado || undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: desabilitado ? 'default' : 'pointer',
        opacity: desabilitado ? 0.6 : undefined,
        pointerEvents: desabilitado ? 'none' : undefined,
      }}
    >
      {children}
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={mudou}
        disabled={desabilitado}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
          opacity: 0,
        }}
      />
    </label>
  )
}
