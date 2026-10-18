import { verificar } from './erros'

/**
 * O Supabase corta qualquer consulta em (por padrão) 1000 linhas, em
 * silêncio — sem erro, sem aviso, só devolve menos do que existe. Para
 * tabelas que passam disso (ex: vendas, com uma linha por rifa), isso faz
 * sumir dado antigo da tela sem a venda nunca ter saído do banco.
 *
 * `montarConsulta` tem que devolver uma consulta NOVA a cada chamada (sem
 * `.range()` aplicado) — o construtor do Supabase não é reutilizável depois
 * de ser aguardado.
 */
export async function buscarTudoPaginado(montarConsulta, mensagemErro, tamanhoPagina = 500) {
  let tudo = []
  let pagina = 0
  while (true) {
    const inicio = pagina * tamanhoPagina
    const linhas = verificar(
      await montarConsulta().range(inicio, inicio + tamanhoPagina - 1),
      mensagemErro
    )
    tudo = tudo.concat(linhas)
    if (linhas.length < tamanhoPagina) break
    pagina++
  }
  return tudo
}
