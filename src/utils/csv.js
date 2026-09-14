import { formatarDataHora } from './formato'

const CABECALHO = [
  'numero',
  'comprador',
  'telefone',
  'vendedor',
  'grupo',
  'pagamento',
  'comprovante',
  'origem',
  'status',
  'repasse',
  'data',
]

function escaparCelula(valor) {
  return '"' + String(valor ?? '').replace(/"/g, '""') + '"'
}

export function montarCsvDeVendas(vendas, vendedores) {
  const porId = new Map(vendedores.map((v) => [v.id, v]))

  const linhas = [CABECALHO]
  vendas
    .slice()
    .sort((a, b) => a.numero - b.numero)
    .forEach((s) => {
      const v = porId.get(s.vendedorId)
      linhas.push([
        s.numero,
        s.comprador,
        s.telefone || '',
        v ? v.nome : '',
        s.grupo || (v ? v.grupo : ''),
        s.pagamento,
        s.pagamento === 'pix' ? (s.comprovantePath ? 'anexado' : 'sem comprovante') : 'dinheiro',
        s.origem === 'propria' ? 'compra propria' : 'venda',
        s.status,
        s.repasse || 'pendente',
        formatarDataHora(s.data),
      ])
    })

  return linhas.map((linha) => linha.map(escaparCelula).join(',')).join('\n')
}

export function baixarCsvDeVendas(vendas, vendedores, nomeArquivo = 'rifas-vendas.csv') {
  // O \uFEFF na frente faz o Excel abrir o arquivo com os acentos corretos.
  const blob = new Blob(['\uFEFF' + montarCsvDeVendas(vendas, vendedores)], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
