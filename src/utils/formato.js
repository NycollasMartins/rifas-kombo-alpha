/** Formatações de exibição. Nada aqui toca no banco. */

export function formatarMoeda(valor) {
  const n = Math.round((Number(valor) || 0) * 100) / 100
  return (
    'R$ ' +
    n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

/** 7 -> "#007" */
export function formatarNumeroRifa(numero) {
  return '#' + String(numero ?? 0).padStart(3, '0')
}

export function formatarDataHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR')
}

export function rotuloPagamento(pagamento) {
  return pagamento === 'pix' ? 'Pix' : 'Dinheiro'
}

const ROTULOS_REPASSE = {
  confirmado: 'Repasse confirmado',
  entregue: 'Repasse entregue',
  pendente: 'Repasse pendente',
}

export function rotuloRepasse(repasse) {
  return ROTULOS_REPASSE[repasse] || ROTULOS_REPASSE.pendente
}

export function corDoRepasse(repasse) {
  if (repasse === 'confirmado') return 'var(--good)'
  if (repasse === 'entregue') return 'var(--accent)'
  return 'var(--text-dim)'
}
