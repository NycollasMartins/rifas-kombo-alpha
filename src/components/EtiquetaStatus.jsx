/** Etiqueta "Pago" (verde) ou "Pendente" (âmbar). */
export default function EtiquetaStatus({ status }) {
  if (status === 'pago') return <span className="tag tag-good">Pago</span>
  return <span className="tag tag-warn">Pendente</span>
}
