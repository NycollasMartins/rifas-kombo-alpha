# Rifas do Acampamento

Controle das rifas de dois grupos independentes:

- **Alpha** — adolescentes · verde `#0d6636` e amarelo `#fbbf05`
- **Kombo** — jovens · azul `#001b60` e amarelo `#f1b404`

Cada grupo tem seu preço, sua meta, sua numeração de rifas e seu sorteio. Um
líder do Alpha nunca enxerga nada do Kombo, e vice-versa.

Feito com **Vite + React** na frente e **Supabase** (Postgres) atrás.

---

## Passo 1 — Criar o projeto no Supabase

> ⚠️ **Crie um projeto novo, só para as rifas.** Não use um projeto que já
> tenha outro sistema dentro — o `schema.sql` tem uma trava que detecta isso e
> se recusa a rodar. O plano gratuito permite dois projetos por organização.

1. Em [supabase.com](https://supabase.com), **New project**.
2. Guarde a **Database Password** num lugar seguro.
3. **Region:** `South America (São Paulo)`.

## Passo 2 — Desligar a confirmação de e-mail

**Este passo não é opcional.** Sem ele ninguém consegue criar senha.

**Authentication → Sign In / Providers → Email.** Essa tela tem **dois**
interruptores e é fácil trocar:

| Interruptor | Onde | Deve ficar |
|---|---|---|
| **Enable Email provider** | no alto da seção | **ligado** |
| **Confirm email** | dentro da seção | **desligado** |

Desligar o de cima por engano derruba o login inteiro, e o app passa a responder
*"Email logins are disabled"*.

Por que desligar o "Confirm email": o app deixa cada pessoa criar a própria
senha. Com a confirmação ligada, o Supabase manda um e-mail antes de liberar o
acesso — e o envio gratuito é limitado a **3 e-mails por hora**. Num grupo de 40
adolescentes isso trava no primeiro dia.

Para conferir se ficou certo, abra este endereço no navegador (troque pela sua
URL e sua chave):

```
https://SEU-PROJETO.supabase.co/auth/v1/settings?apikey=SUA_CHAVE
```

Tem de aparecer `"email": true` e `"mailer_autoconfirm": true`.

## Passo 3 — Criar as tabelas

**SQL Editor → New query**, cole o [`supabase/schema.sql`](supabase/schema.sql)
inteiro e **Run**.

O resultado esperado é `Success. No rows returned` — o script cria coisas, não
consulta nada. Para conferir:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Devem aparecer sete: `codigos_acesso`, `config`, `perfis`, `sorteios`,
`vendas`, `vendedores`, `vendedores_privado`.

Pode rodar de novo sempre que houver atualização: quando a estrutura nova já
está no lugar, **nada é apagado**.

## Passo 4 — Criar o seu acesso de dev e os códigos dos grupos

O **dev** é o único que enxerga os dois grupos e corrige dados já registrados.

1. **Authentication → Users → Add user → Create new user** com o seu e-mail e
   senha. Marque **Auto Confirm User**.
2. No **SQL Editor**, troque o e-mail e rode:

```sql
insert into public.perfis (id, nome, papel, grupo)
select id, 'Dev', 'dev', null from auth.users where email = 'voce@email.com'
on conflict (id) do update set papel = 'dev', grupo = null;
```

3. Ainda no SQL Editor, defina o código de liderança de cada grupo — é a
   palavra que um novo líder digita para criar o acesso dele:

```sql
select public.definir_codigo_de_lider('Alpha', 'troque-esta-palavra');
select public.definir_codigo_de_lider('Kombo', 'troque-esta-tambem');
```

Depois disso os códigos podem ser trocados dentro do app, em Configurações.

## Passo 5 — Colar as credenciais

**Project Settings → API.** Copie o **Project URL** e a chave pública (aparece
como `anon public` ou como **Publishable key**, dependendo da idade do
projeto — as duas servem).

```bash
cp .env.example .env.local
```

Preencha as duas linhas do `.env.local`:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave
```

> A chave pública vai embutida no site — isso é normal e esperado. Quem protege
> os dados são as regras do banco. A `service_role` / `secret key` **não** é
> usada aqui e nunca deve ser colada neste arquivo.

## Passo 6 — Rodar

```bash
npm install
npm run dev
```

O terminal mostra também um endereço de rede (`http://192.168.x.x:5173`). Com o
celular no mesmo Wi-Fi, dá para testar de verdade antes de publicar.

## Passo 7 — Publicar

```bash
npm run build
```

Arraste a pasta `dist` para [app.netlify.com/drop](https://app.netlify.com/drop).
Em segundos você tem um endereço público. Crie a conta no Netlify para poder
atualizar o mesmo site depois.

Se preferir deploy automático a cada `git push`, use a Vercel: importe o
repositório e cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em
**Environment Variables** antes do primeiro deploy.

---

## Como cada pessoa entra

### Líder — cria a própria conta

Na tela inicial: **Sou líder → Criar acesso de líder**. Ele informa nome,
e-mail, senha, escolhe **Alpha ou Kombo** e digita o **código do acampamento**
do grupo dele.

Ninguém precisa de você para isso. O que impede um curioso de virar líder é o
código, que a liderança combina entre si — **não mande no grupo dos
vendedores**: quem tem o código enxerga tudo daquele grupo, inclusive os termos
assinados.

Para trocar o código: **Configurações → Código de liderança**. Trocar não
derruba quem já entrou.

### Vendedor — o líder cadastra, ele cria a senha

1. O líder cadastra o vendedor em **Vendedores → Adicionar**, com **nome,
   e-mail, telefone e meta**. O e-mail é o que vai permitir a entrada, então
   confira — e o telefone é para onde vai o termo de responsabilidade (veja
   abaixo).
2. O vendedor abre o app: **Sou vendedor(a) → É meu primeiro acesso**, digita o
   **mesmo e-mail** e escolhe uma senha.
3. Nas próximas vezes, é só **Entrar**.

Se o e-mail não estiver cadastrado, o app diz isso com todas as letras e manda
falar com o líder. Não existe mais lista de nomes para escolher.

Na aba Vendedores, quem ainda não criou a senha aparece marcado como
**"não entrou ainda"**.

### Esqueci a senha

Tem link de recuperação por e-mail nas duas telas de entrada. Lembre que o
envio gratuito do Supabase é limitado (3 por hora). Se isso virar problema,
configure um SMTP próprio em **Authentication → SMTP Settings** — o plano
gratuito do [Resend](https://resend.com) resolve. Em último caso, o dev gera um
link de recuperação em **Authentication → Users**, nos três pontinhos.

### Lembrar de mim

As duas telas de entrada (líder e vendedor) têm um checkbox **"Lembrar de mim
neste aparelho"**, marcado por padrão. Com ele marcado, a sessão continua
depois de fechar o navegador — é o que sempre aconteceu. Desmarcando, a
sessão vale só para aquela aba: fechou, precisa entrar de novo. Útil em
celular emprestado ou computador compartilhado.

---

## Instalar na tela de início

Quem abre o link vê, num cantinho embaixo, um convite para deixar o app na tela
de início do celular. Instalado, ele abre em tela cheia, sem barra de endereço
e sem precisar procurar o link.

O convite **aparece toda vez** que alguém abre o app sem tê-lo instalado.
Fechar vale só para aquela visita: nada fica guardado no navegador. Some de vez
só depois de instalado.

O que ele mostra muda conforme o aparelho:

| Situação | O que aparece |
|---|---|
| Android, navegador colaborando | botão **Instalar** — um toque e pronto |
| Android, sem o botão disponível | *"No menu do navegador (⋮), toque em Instalar app"* |
| iPhone | botão **Instalar** que abre o passo a passo |

No iPhone o guia mostra os quatro toques, com duas versões — o iOS 27 trocou
o botão que abre o menu, o resto do caminho é igual. O guia detecta a versão
instalada e já abre na certa, mas deixa trocar (útil quando quem está lendo
ajuda outra pessoa com um aparelho diferente):

**iOS 27** (Safari novo):
1. Toque no ícone **☰** (três tracinhos), ao lado da seta
2. Toque em **Compartilhar**
3. Na terceira fileira, toque em **Ver mais**
4. Toque em **Adicionar à Tela de Início**

**iOS 26 ou antes:**
1. Toque no botão **⋯** (os três pontos)
2. Toque em **Compartilhar**
3. Na terceira fileira, toque em **Ver mais**
4. Toque em **Adicionar à Tela de Início**

Não há caminho diferente por navegador de propósito: esse menu é o mesmo no
Safari atual e no Chrome, e inventar uma variação sem ter testado daria
instrução errada para alguém. O guia só acrescenta uma nota de que no iOS 26
ou antes, em iPhones mais antigos, o Compartilhar fica direto na barra de
baixo.

Ao abrir o guia, o cartão do canto some — os dois juntos disputariam a atenção.
E o guia **só fecha no ×**: nem toque fora, nem Esc. A pessoa vai sair do app
para seguir os passos e voltar para conferir o próximo, e um toque fora
apagaria a instrução bem na hora em que ela mais precisa dela.

Duas coisas que valem saber:

**A Apple não permite** que um site dispare a instalação no iPhone. O botão
"Instalar" ali abre a explicação — é o máximo que um site consegue fazer.

**O botão do Android depende do navegador.** O Chrome decide quando oferecer
esse evento e tem critérios próprios: às vezes ele segura numa visita seguinte.
Por isso o convite nunca depende dele para aparecer — sem o evento, cai na
instrução pelo menu. Assim ninguém fica sem saber que dá para instalar.

Nada disso é banco de dados: são arquivos estáticos em `public/`
(`manifest.webmanifest`, os ícones e um `sw.js` mínimo). O `sw.js` existe só
porque o Android exige um service worker para oferecer a instalação — ele
repassa tudo para a rede e **não guarda cache**, de propósito: com cache, uma
republicação deixaria as pessoas presas na versão velha.

Só funciona em **HTTPS** — no Netlify já vem assim. Em `localhost` também
funciona para testar.

## Os três acessos

| | Vendedor | Líder | Dev |
|---|:---:|:---:|:---:|
| Enxerga | só o grupo dele | só o grupo dele | os dois grupos |
| Registrar venda | ✅ (só as próprias) | ✅ | ✅ |
| Marcar pago/pendente e repasse | ❌ | ✅ | ✅ |
| Cadastrar vendedores, sortear, configurar | ❌ | ✅ | ✅ |
| Ver termos assinados e observações | ❌ | ✅ | ✅ |
| Corrigir venda já registrada | ❌ | ❌ | ✅ |
| Transferir rifas entre vendedores | ❌ | ❌ | ✅ |

Cada linha dessa tabela é uma regra dentro do Postgres, não uma tela escondida.
Um líder do Alpha que chame a API por fora do app continua sem alcançar o
Kombo, e um vendedor continua sem conseguir apagar nada.

Quem não fez login não lê absolutamente nada.

---

## O dia a dia

### Registrar uma venda (vendedor)

O comprador pode levar **várias rifas de uma vez** — o app mostra o total e, ao
salvar, exibe os números que saíram para você anotar no talão.

- **Pix** → anexe a foto do comprovante. Se não der naquele momento, marque
  "não consigo anexar agora" e a venda fica sinalizada para a liderança.
- **Dinheiro** → o vendedor declara que recebeu e assume o repasse.

### Avisar o comprador pelo WhatsApp

Terminada a venda, aparece **"Enviar no WhatsApp"**. Abre a conversa com o
comprador já com a mensagem escrita: o primeiro nome dele, os números das
rifas, o valor, o **prêmio que ele está concorrendo** (se cadastrado em
Configurações → Prêmio do sorteio) e o nome de quem vendeu.

> **O app não envia sozinho.** Ele deixa a mensagem pronta e o vendedor aperta
> enviar. Envio automático exigiria a API oficial da Meta — conta business
> aprovada, modelos de mensagem homologados e cobrança por mensagem.

Sem telefone cadastrado, ou com um número que o sistema não reconhece, o botão
vira **"Copiar mensagem"** — cola em qualquer conversa. Esse botão aparece
sempre, mesmo com telefone.

O número é entendido em qualquer formato: `(11) 98888-0000`, `11988880000`,
`+55 11 98888-0000`. Só o DDD é obrigatório.

Dá para reenviar depois: na lista de compras do vendedor, e também no painel da
liderança em **Vendedores → Ver vendas**.

### Os avisos do prazo

Quando há prazo cadastrado, o vendedor é avisado na tela dele em quatro
momentos, com urgência crescente:

| Quando | O que aparece |
|---|---|
| 7 dias antes | *"Falta 1 semana para o prazo"* — pode ser fechado |
| 3 dias antes | *"Faltam 3 dias para o prazo"* — pode ser fechado |
| 24 horas antes | *"Falta 1 dia para o prazo acabar"* — pode ser fechado |
| no dia | *"Hoje é o último dia de vendas"* — não fecha |
| depois | *"O prazo de vendas encerrou"* — não fecha |

Todos dizem quantas rifas e quanto em dinheiro ainda faltam para a meta dele.

Quem fechou um aviso volta a ser avisado no marco seguinte — dispensar o de 7
dias não silencia o de 3. Os dois últimos não têm botão de fechar: é a hora de
agir. E quem já bateu a meta não recebe aviso nenhum.

Quem abre o app entre dois marcos vê o mais recente: no quinto dia aparece o
aviso de 7, não o silêncio.

### Conferir o dinheiro (líder)

**Vendedores → Ver vendas** mostra as compras daquele vendedor agrupadas: cada
compra com os números das rifas, o valor, e o botão para abrir o comprovante do
Pix. As em dinheiro ficam marcadas como declaradas por ele.

No painel há o contador **"Pix sem comprovante"**, e a aba Vendas tem o filtro
correspondente — é a sua lista de cobrança.

### O termo de compromisso

Todo vendedor assina um termo se comprometendo a comprar as rifas que não
vender.

Assim que o líder cadastra o vendedor, o app já abre a tela para **enviar o
termo pelo WhatsApp**: o texto vem pronto (preço da rifa, meta e prazo), no
telefone que acabou de ser cadastrado — o líder só confere e aperta enviar,
igual ao aviso do comprador. Sem telefone reconhecido, sobra "Copiar
mensagem".

Depois que o vendedor devolver assinado (papel ou PDF), anexe em
**Vendedores → Editar → Anexar arquivo** (PDF ou foto, até 10 MB). Quem ainda
não entregou aparece marcado como **"sem termo"**.

Os arquivos ficam num espaço privado separado por grupo. Não existe link fixo:
cada abertura gera um endereço que expira em 10 minutos. O vendedor nunca
enxerga nenhum termo, nem o próprio — são documentos pessoais, muitos de
adolescentes. A observação do vendedor segue a mesma regra.

### O prêmio do sorteio

Em **Configurações → Prêmio do sorteio** você descreve o que está sendo
sorteado (ex: "uma TV 50 polegadas"). Vale só para o grupo daquela
configuração. Uma vez preenchido, entra sozinho na mensagem que o comprador
recebe pelo WhatsApp — não precisa digitar de novo em cada venda.

### O prazo e o fechamento

Em **Configurações → Prazo final** você define a data limite. Passado o prazo,
o vendedor vê na tela dele quantas rifas precisa comprar, e o líder vê a lista
de quem está devendo.

**Vendedores → Fechar meta** registra de uma vez as rifas que faltam, no nome
da pessoa. São rifas de verdade: ganham número, entram no sorteio e no CSV,
marcadas como compra própria.

### Quando alguém desiste

Ninguém é excluído depois de ter vendido. Edite o vendedor e marque a situação
como **Desistiu**, com uma observação. Ele sai das contas de meta e do ranking,
e o que já arrecadou aparece no painel como **"Arrecadado por quem desistiu —
fica para o acampamento"**.

---

## Detalhes que valem saber

**Cada grupo tem sua numeração.** Alpha começa no `#001` e Kombo também, em
sequências independentes. Se o líder excluir uma rifa, aquele número não é
reaproveitado — igual a um talão de papel.

**Rifas não atravessam grupos.** Nem na transferência do dev, justamente porque
a numeração é separada.

**Começar um acampamento novo.** *Configurações → Zona de risco* apaga só o
**seu** grupo e devolve a numeração ao `#001`. Exporte o CSV antes.

**Projeto pausado.** No plano gratuito o Supabase pausa projetos com cerca de
uma semana sem acesso. É só clicar em *Restore* no painel — os dados continuam
lá.

---

## Organização do código

```
supabase/schema.sql        Todo o banco: tabelas, papéis, permissões,
                           arquivos e Realtime

public/                    Arquivos servidos como estão
  manifest.webmanifest     Nome, cores e ícones do app instalado
  sw.js                    Service worker mínimo (sem cache)
  icone-192.png            Ícones da tela de início
  icone-512.png
  apple-touch-icon.png

src/
  main.jsx                 Ponto de entrada
  App.jsx                  Só decide qual tela mostrar

  lib/
    supabase.js            Conexão
    db/
      entrada.js           Papel de quem entrou, cadastro de líder, códigos
      config.js            Preço, meta e prazo — por grupo
      vendedores.js        Cadastro, e-mail e situação
      vendedoresPrivado.js Observações e termos — nunca legível sem login
      arquivos.js          Termos e comprovantes nos buckets privados
      vendas.js            Registro em lote, correção, agrupamento
      sorteios.js          Histórico
      fechamento.js        Fechar meta, transferir rifas, apagar grupo
      erros.js             Traduz os erros técnicos para português

  hooks/
    useSessao.jsx          Login, cadastro, papel e grupo
    useDadosRifa.jsx       Carrega os dados do grupo e escuta o Realtime

  utils/
    grupos.js              Alpha e Kombo: nomes, siglas e troca de tema
    formato.js             Moeda, número da rifa, datas
    calculos.js            Totais, metas, ranking, quem está devendo
    prazo.js               Contagem de dias, marcos de aviso e o que falta
    instalacao.js          Detecta o aparelho e controla o convite de instalar
    whatsapp.js            Monta a mensagem e o link da conversa
    csv.js                 Exportação para planilha

  components/
    TelaEntrada            Vendedor ou líder
    TelaLider              Login e criação de conta com o código do grupo
    TelaVendedorEntrada    Login e primeiro acesso por e-mail
    TelaNovaSenha          Chegada pelo link de recuperação
    TelaSemAcesso          Entrou mas a conta não está ligada a nada
    TelaVendedor           Progresso, prazo e as próprias rifas
    PainelLider            Cabeçalho e abas
    lider/Aba*             Painel, Vendas, Vendedores, Sorteio,
                           Configurações e Manutenção (só dev)
    ModalNovaVenda         Venda em lote com comprovante
    ModalVendasDoVendedor  Compras agrupadas, com os comprovantes
    CompraDoVendedor       Uma compra na lista do vendedor, com o WhatsApp
    AvisoDePrazo           Os avisos de 7 dias, 3 dias, 24 horas e o dia
    BotoesDoWhatsapp       Enviar / copiar a mensagem do comprador
    ConviteParaInstalar    O cartão do canto oferecendo instalar o app
    GuiaDeInstalacaoIphone O passo a passo do iPhone
    ModalVendedor          Cadastro, situação, observação e termo
    ModalEditarVenda       Correção completa (dev)
    SeletorDeGrupo         Escolha entre Alpha e Kombo, já colorida
    PainelTermo            Anexar, abrir e remover o termo

  styles/
    tokens.css             As três peles: neutra, Alpha e Kombo
    global.css             Botões, campos, cartões e etiquetas
```

Para mudar as cores de um grupo, mexa só no `tokens.css` — o app inteiro segue.

O arquivo `rifas-acampamento.html` na raiz é a versão original, feita no
Claude.ai. Não funciona mais fora de lá (usava `window.storage`), mas ficou
como referência do visual e das regras de negócio.
