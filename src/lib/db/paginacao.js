import { verificar } from './erros'

/**
 * O Supabase corta qualquer consulta em (por padrão) 1000 linhas, em
 * silêncio — sem erro, sem aviso, só devolve menos do que existe. Para
 * tabelas que passam disso (ex: vendas, com uma linha por rifa), isso faz
 * sumir dado antigo da tela sem a venda nunca ter saído do banco.
 *
 * Para não esperar uma página terminar antes de pedir a próxima (com ~4 mil
 * vendas eram 9 idas e voltas em fila, e no 4G isso passava de vários
 * segundos), pede várias páginas AO MESMO TEMPO, em rodadas. Para assim que
 * uma página vier incompleta — é a última.
 *
 * `montarConsulta` tem que devolver uma consulta NOVA a cada chamada (sem
 * `.range()` aplicado) — o construtor do Supabase não é reutilizável depois
 * de ser aguardado. A consulta precisa de uma ordem estável (sem empates),
 * senão linhas podem pular de uma página pra outra.
 */
export async function buscarTudoPaginado(
  montarConsulta,
  mensagemErro,
  tamanhoPagina = 500,
  paginasPorRodada = 6
) {
  let tudo = []
  let primeira = 0
  while (true) {
    const rodada = await Promise.all(
      Array.from({ length: paginasPorRodada }, async (_, i) => {
        const inicio = (primeira + i) * tamanhoPagina
        return verificar(
          await montarConsulta().range(inicio, inicio + tamanhoPagina - 1),
          mensagemErro
        )
      })
    )
    for (const linhas of rodada) {
      tudo = tudo.concat(linhas)
      if (linhas.length < tamanhoPagina) return tudo
    }
    primeira += paginasPorRodada
  }
}
