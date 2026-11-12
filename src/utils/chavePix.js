/**
 * Chave Pix do vendedor: os tipos aceitos, a conferência e o formato que o
 * padrão Pix exige. O banco confere de novo (chave_pix_valida, no
 * schema.sql) — aqui é pra pessoa ver o erro na hora, antes de salvar.
 *
 * O formato salvo é o "cru" que vai dentro do QR Code: CPF/CNPJ só números,
 * celular com +55 na frente, e-mail e chave aleatória em minúsculas. Celular
 * sem o +55 é o erro clássico que faz o banco dizer "chave não encontrada".
 */

export const TIPOS_CHAVE_PIX = [
  { valor: 'cpf', rotulo: 'CPF', exemplo: '000.000.000-00', teclado: 'numeric' },
  { valor: 'celular', rotulo: 'Celular', exemplo: '(61) 99999-9999', teclado: 'tel' },
  { valor: 'email', rotulo: 'E-mail', exemplo: 'nome@email.com', teclado: 'email' },
  { valor: 'aleatoria', rotulo: 'Chave aleatória', exemplo: 'a1b2c3d4-e5f6-…', teclado: 'text' },
  { valor: 'cnpj', rotulo: 'CNPJ', exemplo: '00.000.000/0000-00', teclado: 'numeric' },
]

export function infoDoTipoPix(tipo) {
  return TIPOS_CHAVE_PIX.find((t) => t.valor === tipo) || TIPOS_CHAVE_PIX[0]
}

const soNumeros = (texto) => String(texto || '').replace(/\D/g, '')

function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const digito = (ate) => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10])
}

function cnpjValido(cnpj) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false
  const digito = (ate) => {
    const pesos = ate === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const soma = pesos.reduce((total, peso, i) => total + Number(cnpj[i]) * peso, 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return digito(12) === Number(cnpj[12]) && digito(13) === Number(cnpj[13])
}

/**
 * Confere e devolve a chave no formato do Pix: `{ chave }` quando está
 * certa, `{ erro }` com o motivo em português quando não está.
 */
export function normalizarChavePix(tipo, texto) {
  const bruto = String(texto || '').trim()
  if (!bruto) return { erro: 'Digite a chave Pix.' }

  if (tipo === 'cpf') {
    const cpf = soNumeros(bruto)
    return cpfValido(cpf) ? { chave: cpf } : { erro: 'Esse CPF não é válido. Confira os números.' }
  }

  if (tipo === 'cnpj') {
    const cnpj = soNumeros(bruto)
    return cnpjValido(cnpj) ? { chave: cnpj } : { erro: 'Esse CNPJ não é válido. Confira os números.' }
  }

  if (tipo === 'celular') {
    let numero = soNumeros(bruto)
    if (numero.length === 13 && numero.startsWith('55')) numero = numero.slice(2)
    if (numero.length !== 11 || numero[2] !== '9') {
      return { erro: 'Digite o celular com DDD, ex: (61) 99999-9999.' }
    }
    return { chave: `+55${numero}` }
  }

  if (tipo === 'email') {
    const email = bruto.toLowerCase()
    if (email.length > 77 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { erro: 'Esse e-mail não parece certo.' }
    }
    return { chave: email }
  }

  if (tipo === 'aleatoria') {
    const chave = bruto.toLowerCase()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(chave)) {
      return { erro: 'A chave aleatória tem 32 letras e números, separados por tracinhos. Copie e cole do app do banco.' }
    }
    return { chave }
  }

  return { erro: 'Escolha o tipo da chave.' }
}

/** A chave salva, de volta no jeito que a pessoa reconhece (pra editar). */
export function formatarChavePix(tipo, chave) {
  const valor = String(chave || '')
  if (tipo === 'cpf' && valor.length === 11) {
    return valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (tipo === 'cnpj' && valor.length === 14) {
    return valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  if (tipo === 'celular' && valor.startsWith('+55') && valor.length === 14) {
    return valor.slice(3).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return valor
}

/** Versão com parte escondida, pra mostrar na tela sem expor a chave inteira. */
export function mascararChavePix(tipo, chave) {
  const valor = formatarChavePix(tipo, chave)
  if (!valor) return ''
  if (tipo === 'email') {
    const [nome, dominio] = valor.split('@')
    return `${nome.slice(0, 2)}•••@${dominio}`
  }
  if (valor.length <= 6) return valor
  return `${valor.slice(0, 3)}${'•'.repeat(Math.max(3, valor.length - 7))}${valor.slice(-4)}`
}
