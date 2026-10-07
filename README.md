# Rifas do Acampamento

Sistema de venda de rifas para dois grupos independentes de um acampamento de
igreja:

- **Alpha** — adolescentes · verde `#0d6636` e amarelo `#fbbf05`
- **Kombo** — jovens · azul `#001b60` e amarelo `#f1b404`

Cada grupo tem seu preço de rifa, sua meta, sua numeração e seu sorteio. Um
líder do Alpha nunca enxerga nem altera nada do Kombo, e vice-versa — essa
separação é imposta pelo banco (RLS), não pela tela.

**Stack:** Vite + React (sem framework de rotas, sem Redux) na frente,
Supabase (Postgres + Auth + Storage + Edge Functions) atrás. Não existe
servidor próprio: o "backend" inteiro é o schema do Postgres mais duas Edge
Functions.

**Produção:**
- App: `https://dashboard.rifasacampamento.tech`
- Repositório: `https://github.com/NycollasMartins/rifas-kombo-alpha` (privado)
- Host: EasyPanel (Docker + Nginx), servidor próprio
- Banco: Supabase, projeto `odgweocenaopqxjgpdqm`

---

## Índice

1. [Arquitetura em 2 minutos](#arquitetura-em-2-minutos)
2. [Publicar uma mudança (produção)](#publicar-uma-mudança-produção)
3. [Rodar localmente / criar um projeto do zero](#rodar-localmente--criar-um-projeto-do-zero)
4. [Banco de dados e segurança](#banco-de-dados-e-segurança)
5. [Edge Functions](#edge-functions)
6. [Mapa do código](#mapa-do-código)
7. [Funcionalidades — onde mexer em cada uma](#funcionalidades--onde-mexer-em-cada-uma)
8. [Convenções e pegadinhas](#convenções-e-pegadinhas)
9. [Arquivos legados](#arquivos-legados)

---

## Arquitetura em 2 minutos

```
┌─────────────────────┐        ┌──────────────────────────────┐
│  React (Vite SPA)    │──────▶│  Supabase                     │
│  servido por Nginx    │       │  - Postgres (RLS faz a conta) │
│  dentro de um          │       │  - Auth (e-mail + senha)      │
│  container Docker      │       │  - Storage (termos/comprov.)  │
│  no EasyPanel          │       │  - 2 Edge Functions (Deno)    │
└─────────────────────┘        └──────────────────────────────┘
```

- **Sem rota de servidor própria.** Tudo que parece "lógica de backend" é
  função SQL `SECURITY DEFINER` no Postgres, chamada via `supabase.rpc(...)`.
  O front-end nunca decide quem pode o quê — ele só mostra ou esconde botão;
  quem barra de verdade é o banco. Isso importa: se um líder do Alpha chamar
  a API na mão, ele continua sem alcançar o Kombo.
- **Três papéis** (tabela `perfis.papel`): `dev` (enxerga os dois grupos,
  corrige dados), `lider` (só o próprio grupo), `vendedor` (só as próprias
  vendas). Todo mundo faz login — inclusive o vendedor.
- **Duas Edge Functions** cobrem as duas coisas que exigem uma chave que o
  navegador nunca pode ver: mandar push de verdade (VAPID private key) e
  trocar a senha de outra pessoa (`service_role`). Ver [Edge
  Functions](#edge-functions).
- **Tema por grupo** é um atributo (`data-grupo="Alpha"` ou `"Kombo"`) no
  `<html>`, e `styles/tokens.css` troca as variáveis de cor em cima disso. Pra
  mudar a cor de um grupo, mexe só ali.

---

## Publicar uma mudança (produção)

### Frontend — é só dar `git push`

```bash
git push origin main
```

O EasyPanel está apontado para este repositório no GitHub e builda com o
[`Dockerfile`](Dockerfile) da raiz (Node compila com Vite → Nginx serve o
resultado estático). As variáveis `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` e `VITE_VAPID_PUBLIC_KEY` já estão cadastradas no
serviço do EasyPanel como **Build Args** — o Vite só lê essas variáveis na
hora do build (ficam embutidas no JS gerado), por isso elas têm de estar
configuradas ali como *build-time*, não só como variável de runtime do
container.

Se o painel do EasyPanel estiver com o **auto-deploy ligado** (aba do serviço
→ *Source* → *Auto Deploy*), um push na `main` já builda e publica sozinho —
não precisa fazer mais nada. Se não tiver, a única ação manual é clicar em
**Deploy** no serviço, depois do push.

> Confira essa opção uma vez e deixa ligada: é o que faz "só subir pro
> GitHub" ser literalmente o único passo.

### Banco de dados (Supabase) — **sempre manual, nunca automático**

Push no GitHub **não muda o banco**. Toda alteração em
[`supabase/schema.sql`](supabase/schema.sql) precisa ser colada manualmente
no **SQL Editor** do painel do Supabase e rodada com *Run*. O arquivo é
**idempotente** — todo `create table` é `if not exists`, todo `alter table
add column` é `if not exists`, toda função é `create or replace` — então dá
pra colar o arquivo inteiro de novo sempre que ele mudar, mesmo com o
acampamento inteiro já cadastrado. Nada é apagado numa re-execução.

### Edge Functions — manual, via CLI

As duas funções em [`supabase/functions/`](supabase/functions/) também não
sobem sozinhas com o `git push`. Precisa da Supabase CLI instalada e do
projeto linkado (`supabase link --project-ref odgweocenaopqxjgpdqm`), depois:

```bash
supabase functions deploy notificar-vendedores
supabase functions deploy redefinir-senha-vendedor
```

Ver [Edge Functions](#edge-functions) para o que cada uma faz e quais secrets
precisa.

---

## Rodar localmente / criar um projeto do zero

Use isto para testar numa máquina nova, ou para montar um segundo ambiente
(ex: um projeto Supabase de teste, separado do de produção).

### 1. Criar o projeto no Supabase

> ⚠️ **Projeto novo, só para este sistema.** O `schema.sql` tem uma trava que
> detecta tabelas de outro sistema e se recusa a rodar.

Em [supabase.com](https://supabase.com) → **New project** → region `South
America (São Paulo)`. Guarde a Database Password.

### 2. Desligar a confirmação de e-mail

**Não é opcional** — sem isso ninguém consegue criar senha.

**Authentication → Sign In / Providers → Email:**

| Interruptor | Deve ficar |
|---|---|
| **Enable Email provider** | ligado |
| **Confirm email** | **desligado** |

Com a confirmação ligada, o Supabase manda e-mail antes de liberar acesso —
e o envio gratuito é limitado a 3/hora. Num grupo de 40 pessoas isso trava no
primeiro dia.

### 3. Criar as tabelas

**SQL Editor → New query**, cole [`supabase/schema.sql`](supabase/schema.sql)
inteiro, **Run**. Esperado: `Success. No rows returned`.

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Devem aparecer nove: `codigos_acesso`, `config`, `integracao_webhook`,
`inscricoes_push`, `perfis`, `sorteios`, `vendas`, `vendedores`,
`vendedores_privado`.

### 4. Criar o seu acesso de dev e os códigos dos grupos

```sql
-- depois de criar o usuário em Authentication -> Users -> Add user
-- (marque "Auto Confirm User")
insert into public.perfis (id, nome, papel, grupo)
select id, 'Dev', 'dev', null from auth.users where email = 'voce@email.com'
on conflict (id) do update set papel = 'dev', grupo = null;

select public.definir_codigo_de_lider('Alpha', 'troque-esta-palavra');
select public.definir_codigo_de_lider('Kombo', 'troque-esta-tambem');
```

Os códigos (liderança e autocadastro de vendedor) podem ser trocados depois
dentro do app, em Configurações — não precisam mais passar por SQL.

### 5. Credenciais locais

**Project Settings → API** → copie o Project URL e a chave `anon public`
(a.k.a. "Publishable key").

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave
VITE_VAPID_PUBLIC_KEY=   # opcional, só pra notificação push — veja Edge Functions
```

> A chave `anon` vai embutida no site — é pública por natureza e esperado.
> Quem protege os dados são as regras do banco (RLS), não o sigilo dessa
> chave. A `service_role` **nunca** entra neste arquivo nem no front-end —
> ela só existe dentro da Edge Function `redefinir-senha-vendedor`, injetada
> automaticamente pelo Supabase.

### 6. Rodar

```bash
npm install
npm run dev
```

O terminal também mostra um endereço de rede (`http://192.168.x.x:5173`) —
com o celular no mesmo Wi-Fi dá pra testar de verdade, inclusive o convite de
instalação.

---

## Banco de dados e segurança

Tudo em [`supabase/schema.sql`](supabase/schema.sql), um arquivo só,
organizado em seções numeradas (o cabeçalho de cada uma explica o que vem a
seguir). Resumo das tabelas:

| Tabela | Guarda |
|---|---|
| `config` | preço da rifa, meta padrão, prazo, prêmio — uma linha por grupo. Inclui `preco_rifa_chale`/`meta_chale`, usados só pelo Kombo (ver [chalé x quarto](#preço-por-destino-chalé-x-quarto--só-kombo)) |
| `codigos_acesso` | hash dos códigos de liderança e de autocadastro — nunca legível, só comparável por função |
| `vendedores` | cadastro, `situacao` (`ativo` / `quitou` / `desistiu`), `tipo` (`adolescente` / `voluntario`), `destino` (`quarto` / `chale`, só Kombo) |
| `perfis` | o papel de cada conta logada (`dev` / `lider` / `vendedor`) e o `vendedor_id` quando for vendedor |
| `vendedores_privado` | observações e termo assinado — líder vê, vendedor não vê nem o próprio |
| `vendas` | cada rifa vendida, com `status` (pago/pendente) e `repasse` (pendente/entregue/confirmado) |
| `integracao_webhook` | URL e segredo do aviso automático pro outro sistema — ver [Integração por webhook](#integração-por-webhook) |
| `inscricoes_push` | assinatura de notificação push por vendedor |
| `sorteios` | histórico de sorteios |

**Os três papéis**, resumidos:

| | Vendedor | Líder | Dev |
|---|:---:|:---:|:---:|
| Enxerga | só o grupo dele | só o grupo dele | os dois grupos |
| Registra venda | ✅ (só as próprias) | ✅ | ✅ |
| Marca pago/pendente, repasse | ❌ | ✅ | ✅ |
| Cadastra vendedores, sorteia, configura | ❌ | ✅ | ✅ |
| Vê termos assinados e observações | ❌ | ✅ | ✅ |
| Corrige venda já registrada | ❌ | ❌ | ✅ |
| Transfere rifas entre vendedores | ❌ | ❌ | ✅ |
| Configura o webhook de integração | ❌ | ❌ | ✅ |

Cada linha é uma policy de RLS ou uma checagem dentro de uma função
`SECURITY DEFINER` — não uma tela escondida.

**Modelo de segurança (RLS):** toda tabela tem Row Level Security ligado.
Funções helper (`meu_papel()`, `meu_grupo()`, `e_dev()`, `e_lider()`,
`posso_ver(grupo)`) decidem visibilidade; políticas usam essas funções. Fluxos
que precisam de lógica (cadastro, fechamento de meta, etc.) são funções
`SECURITY DEFINER` chamadas via `.rpc(...)`, nunca `insert`/`update` direto
numa tabela sensível pelo cliente.

**Numeração das rifas:** cada grupo tem sequência independente começando em
`#001`. O número de uma venda nova é sempre o **menor número livre** daquele
grupo (não um sequence monotônico) — se uma venda de teste for apagada, o
número dela volta a ficar disponível. Ver `definir_grupo_e_numero()` no
schema.

---

## Edge Functions

Em [`supabase/functions/`](supabase/functions/). Rodam no Deno, do lado do
Supabase — é o único lugar onde chaves privadas podem existir.

### `notificar-vendedores`

Dispara notificação push de verdade (barra do celular) pros vendedores de um
grupo. Chamada pelo front-end em `src/lib/db/notificacoes.js`. Secrets
necessários (`supabase secrets set ...`):

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:voce@email.com
```

Gere o par com `npx web-push generate-vapid-keys`. A pública também vai no
`.env.local` / build args do front (`VITE_VAPID_PUBLIC_KEY`); a privada
**só** vai como secret da função, nunca no front.

### `redefinir-senha-vendedor`

Deixa o líder trocar a senha de um vendedor **direto no app**, sem precisar
de link por e-mail (o reset por e-mail do Supabase é limitado e, pra um
vendedor menor de idade sem o próprio e-mail, nem sempre funciona). Usa a
`SUPABASE_SERVICE_ROLE_KEY` — que o Supabase injeta automaticamente em toda
Edge Function, sem precisar configurar nada. Chamada pelo botão "Redefinir
senha" em `ModalVendedor.jsx` (dentro de Editar vendedor, se ele já criou
conta).

Ambas usam `SUPABASE_URL` e `SUPABASE_ANON_KEY`, também injetadas
automaticamente.

---

## Mapa do código

```
supabase/
  schema.sql                 Todo o banco: tabelas, RLS, funções, Storage,
                              Realtime — numerado em seções, leia o topo
  functions/
    notificar-vendedores/    Push de verdade via VAPID
    redefinir-senha-vendedor/ Líder troca a senha do vendedor sem e-mail

public/                      Servidos como estão
  manifest.webmanifest       Nome, cores, ícones do app instalado
  sw.js                      Service worker mínimo — só GET, sem cache
                              (ver "Convenções" antes de mexer aqui)
  icone-*.png, apple-touch-icon.png

src/
  main.jsx                   Ponto de entrada
  App.jsx                    Só decide qual tela mostrar conforme sessão/papel

  lib/
    supabase.js              Conexão (único cliente, guarda sessão)
    db/                      Uma chamada RPC ou query por arquivo, nomeado
                              pelo domínio:
      entrada.js              Login, autocadastro, cadastro de líder, códigos
      config.js                Preço, meta e prazo — por grupo
      vendedores.js             Cadastro, e-mail, tipo, destino, situação
      vendedoresPrivado.js       Observações e termos — nunca sem login
      arquivos.js                 Upload/link de termos e comprovantes
      vendas.js                    Registro em lote, correção, agrupamento
      sorteios.js                   Histórico
      fechamento.js                 Fechar meta, finalizar, transferir rifas,
                                     apagar grupo
      perfis.js                     Lista/gestão de líderes
      integracao.js                  URL/segredo do webhook — por grupo
      notificacoes.js                 Push: salvar inscrição, disparar aviso
      erros.js                        Traduz erro técnico -> frase em português

  hooks/
    useSessao.jsx             Quem está logado: papel, grupo, todas as ações
                               de entrar/cadastrar/trocar senha
    useDadosRifa.jsx           Carrega tudo do grupo ativo, escuta Realtime,
                               expõe as ações (adicionarVendedor, fecharMeta,
                               marcarComoFinalizado, etc.)

  utils/
    grupos.js                  Alpha/Kombo: nomes, siglas, rótulos
                                (Adolescente/Jovem), tema
    calculos.js                  Totais, metas, ranking — tudo que resolve
                                  preço por vendedor (chalé x quarto) passa
                                  por aqui, ver precoDoVendedor()
    formato.js, prazo.js, csv.js, whatsapp.js, instalacao.js

  components/
    Tela*                       Telas de nível superior (entrada, login,
                                 sem-acesso, vendedor)
    PainelLider.jsx              Casca do painel: cabeçalho + abas. A aba
                                 "Manutenção" só aparece condicionada a papel
                                 (ver código)
    lider/Aba*.jsx                Uma aba = um arquivo (Painel, Vendas,
                                 Vendedores, Sorteio, Usuários,
                                 Configurações, Manutenção)
    Modal*.jsx                    Cada fluxo que abre em modal tem o seu
    lider/CartaoQrCode.jsx          QR code de acesso ao app

  styles/
    tokens.css                  As três peles (neutra, Alpha, Kombo) — só
                                 aqui pra mudar cor de grupo
    global.css                   Botões, campos, cartões, etiquetas — o
                                 "kit de peças" que todo componente usa
```

Cada tela/componente visual tem um `NomeDoComponente.module.css` ao lado —
não listado item a item acima pra não poluir.

---

## Funcionalidades — onde mexer em cada uma

### Autocadastro de vendedor

O vendedor pode criar a própria conta sem o líder cadastrar antes: `"Ainda
não tenho cadastro"` em `TelaVendedorEntrada.jsx` → RPC
`registrar_vendedor_autonomo` (schema.sql) → `cadastrarVendedor` em
`useSessao.jsx`. Usa um código **separado** do código de líder
(`codigo_vendedor_hash`), pra compartilhar esse código nunca dar acesso de
liderança por engano.

`cadastrarVendedor` tem um "plano B": se a conta de e-mail/senha já existe
(sobra de uma tentativa anterior que falhou no meio, ex: código errado), ele
entra com a senha em vez de travar em "e-mail já cadastrado" — mesmo padrão
usado em `criarContaDeLider`.

### Preço por destino (chalé x quarto) — só Kombo

No Kombo, um vendedor pode estar vendendo pra ficar no quarto normal (preço
padrão de `config`) ou pra ficar num chalé (preço separado,
`preco_rifa_chale`/`meta_chale`, configurável só quando o grupo ativo é
Kombo — ver `AbaConfiguracoes.jsx`). O campo `vendedores.destino` guarda qual
é. **Todo lugar que calcula dinheiro resolve isso via
`precoDoVendedor(vendedor, config)` e `metaDoVendedor(vendedor, config)` em
`utils/calculos.js`** — nunca lê `config.precoRifa` direto quando há um
vendedor específico envolvido. Se for adicionar uma tela nova que mostra
valor de rifa, passe por essas funções.

### Rótulo Adolescente / Jovem

O Alpha chama quem vende de "Adolescente"; o Kombo chama de "Jovem" — mesmo
campo (`tipo = 'adolescente' | 'voluntario'` no banco), rótulo diferente.
Resolvido em `utils/grupos.js` (`rotuloDoTipo` / `rotuloDoTipoPlural`), nunca
hardcoded num componente.

### Redefinir senha sem e-mail

Botão "Redefinir senha" em `ModalVendedor.jsx` (editando um vendedor que já
tem conta) → `redefinirSenhaDoVendedor` em `useSessao.jsx` → Edge Function
`redefinir-senha-vendedor`. O reset por e-mail do Supabase (`"Esqueci a
senha"`, em `TelaVendedorEntrada.jsx`) continua existindo em paralelo, mas
pra vendedor costuma ser mais prático o líder resolver na hora.

### Integração por webhook

Quando a situação de um vendedor passa a `'quitou'` (meta fechada — pelo
botão "Fechar meta"/"Finalizar" em `AbaVendedores.jsx`, ou editando a
situação na mão em `ModalVendedor.jsx`), o **próprio Postgres** avisa um
sistema externo via HTTP, sem passar pelo front-end nenhum. Existiu antes
uma aba "Inscrições" local pra isso (tabela, QR code, formulário público);
saiu de cena — quem acompanha isso agora é o outro sistema.

**Como funciona:** a função `avisar_vendedor_finalizado()` (gatilho na
tabela `vendedores`, seção "7-B" do `schema.sql`) compara o valor antigo com
o novo a cada `update`. Só dispara na transição pra `'quitou'` — se o
vendedor já estava `'quitou'` e continua (ex: pegou mais uma rifa depois,
editaram o telefone dele), não manda de novo. Isso resolve o "avisar uma
única vez por vendedor" sem precisar de nenhum controle extra no código.

O disparo usa a extensão `pg_net` (`net.http_post`, assíncrona — não trava a
venda nem a edição) e manda:

```json
{
  "evento": "vendedor_finalizado",
  "vendedorId": "...",
  "nome": "...",
  "telefone": "...",
  "email": "...",
  "grupo": "Alpha",
  "finalizadoEm": "2026-10-06T14:30:00Z",
  "totalVendedores": 42
}
```

com o cabeçalho `X-Webhook-Secret` (o valor configurado, pra o outro lado
conferir que veio daqui). `totalVendedores` conta só quem ainda está
**ativo** (vendendo) naquele grupo no instante do envio — o próprio
vendedor deste aviso não entra na conta, porque a situação dele já virou
`quitou` antes do gatilho disparar.

**Configuração:** tabela `integracao_webhook`, uma linha por grupo (`url` +
`segredo`). Enquanto `url` estiver vazia, o gatilho não manda nada — a
integração nasce desligada. Dá pra configurar de dois jeitos:

- **Pelo app:** Configurações → "Integração por webhook" (só aparece pro
  dev).
- **Por SQL**, direto no banco:
  ```sql
  update public.integracao_webhook
     set url = 'https://seu-outro-sistema.com/webhook/rifas',
         segredo = 'uma-palavra-combinada-com-o-outro-sistema'
   where grupo = 'Alpha'; -- repete trocando pra 'Kombo'
  ```

### Notificações push

`ConviteParaNotificar.jsx` pede permissão e salva a inscrição
(`salvarInscricaoPush`); `notificarVendedores` (líder, em Configurações)
dispara via Edge Function. Tudo depende de `VITE_VAPID_PUBLIC_KEY` estar
configurada — sem ela o convite nem aparece.

### Instalar como app (PWA)

`ConviteParaInstalar.jsx` + `GuiaDeInstalacaoIphone.jsx` + `sw.js` +
`manifest.webmanifest`. Sem banco de dados envolvido — é tudo arquivo
estático em `public/`. O Android oferece instalação nativa quando o
navegador dispara o evento; sem o evento (ou no iPhone, que não tem esse
evento), cai no guia manual.

### Mensagem pronta no WhatsApp

`utils/whatsapp.js` monta o texto (venda, termo, acesso ao app); o app nunca
envia sozinho — abre a conversa com o texto pronto e quem vende/lidera
aperta enviar. Enviar de verdade sem toque exigiria a API oficial da Meta
(conta business, modelos homologados, custo por mensagem) — fora de escopo
de propósito.

---

## Convenções e pegadinhas

- **O front-end nunca decide permissão sozinho.** Se vai adicionar uma ação
  nova que mexe em dado sensível, a regra de quem pode tem de existir no
  Postgres (policy de RLS ou `SECURITY DEFINER`) — esconder um botão não
  basta, é só UX.
- **`schema.sql` é a fonte única de verdade do banco** e é seguro rodar
  inteiro de novo a qualquer momento (todo `create` é condicional). Não crie
  arquivos de migration separados — edite este arquivo.
- **Nunca intercepte método diferente de GET no `sw.js`.** Já causou um bug
  real: refazer um `fetch` de um POST com corpo binário (foto de
  comprovante) dentro do service worker perde o corpo pelo caminho e dá "No
  content provided". O service worker só existe pra destravar o botão
  "Instalar" do Android — não tem cache, de propósito (republicar não pode
  deixar ninguém preso numa versão velha).
- **Numeração de rifa = menor número livre do grupo**, não um sequence.
  Apagar uma venda de teste libera o número dela de novo. Ver
  `definir_grupo_e_numero()`.
- **Nunca commitar a `service_role` / `secret key` do Supabase.** Ela não
  tem lugar nenhum no front-end nem no `.env.local` — só existe dentro de
  Edge Functions, injetada automaticamente pelo Supabase.
- **Toda tela/fluxo que calcula valor de rifa deve resolver o preço por
  vendedor** (`precoDoVendedor`/`metaDoVendedor` em `utils/calculos.js`), por
  causa do chalé x quarto do Kombo. Um `config.precoRifa` lido direto numa
  tela nova provavelmente está errado.
- **Webhook pra sistema externo é gatilho no banco, não código no app.**
  O aviso de "vendedor finalizou" (`avisar_vendedor_finalizado()`) dispara
  comparando o valor antigo com o novo no próprio Postgres — não existe
  nenhum `fetch` equivalente no front-end, e não deveria existir: botão
  clicado duas vezes, aba fechada no meio, requisição que falha — nada disso
  afeta um gatilho de banco, afetaria uma chamada feita pelo navegador.
- **CSS por grupo é só `data-grupo` + `tokens.css`.** Nunca hardcode uma cor
  de grupo num `.module.css` — usa a variável.
- **A CLI do Supabase já está instalada e linkada** nesta máquina ao projeto
  de produção (`odgweocenaopqxjgpdqm`). `supabase functions deploy <nome>`
  funciona direto, sem precisar rodar `supabase link` de novo.

---

## Arquivos legados

`rifas-acampamento.html`, na raiz, é a versão original feita no Claude.ai
(single-file, usava `window.storage`). Não funciona mais fora de lá — ficou
só como referência do visual e das regras de negócio originais. Pode ser
removido com segurança quando não precisar mais consultar.
