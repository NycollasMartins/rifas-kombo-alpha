import { formatarDataHora } from './formato'
import { resumoDoVendedor, SITUACOES } from './calculos'

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

function baixarCsv(conteudo, nomeArquivo) {
  // O \uFEFF na frente faz o Excel abrir o arquivo com os acentos corretos.
  const blob = new Blob(['\uFEFF' + conteudo], {
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

export function baixarCsvDeVendas(vendas, vendedores, nomeArquivo = 'rifas-vendas.csv') {
  baixarCsv(montarCsvDeVendas(vendas, vendedores), nomeArquivo)
}

const CABECALHO_VENDEDORES = [
  'nome',
  'email',
  'telefone',
  'grupo',
  'tipo',
  'situacao',
  'meta',
  'arrecadado',
  'a_receber',
  'rifas',
  'termo',
  'criou_senha',
]

export function montarCsvDeVendedores(vendedores, vendas, config, dadosPrivados = {}) {
  const linhas = [CABECALHO_VENDEDORES]
  vendedores
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .forEach((vendedor) => {
      const r = resumoDoVendedor(vendedor, vendas, config)
      const assinou = Boolean(dadosPrivados[vendedor.id]?.termoPath) || Boolean(vendedor.termoDigitalEm)
      linhas.push([
        vendedor.nome,
        vendedor.email,
        vendedor.telefone || '',
        vendedor.grupo,
        vendedor.tipo === 'voluntario' ? 'voluntario' : 'adolescente',
        SITUACOES[vendedor.situacao] || vendedor.situacao,
        r.meta,
        r.total,
        r.pendente,
        r.quantidade,
        assinou ? 'sim' : 'nao',
        vendedor.temSenha ? 'sim' : 'nao',
      ])
    })

  return linhas.map((linha) => linha.map(escaparCelula).join(',')).join('\n')
}

export function baixarCsvDeVendedores(
  vendedores,
  vendas,
  config,
  dadosPrivados,
  nomeArquivo = 'rifas-vendedores.csv'
) {
  baixarCsv(montarCsvDeVendedores(vendedores, vendas, config, dadosPrivados), nomeArquivo)
}
