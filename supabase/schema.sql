-- ============================================================================
--  RIFAS DO ACAMPAMENTO — esquema completo do banco
-- ----------------------------------------------------------------------------
--  Dois grupos independentes: ALPHA (adolescentes) e KOMBO (jovens).
--  Cada um tem seu preço, sua meta, sua numeração de rifas e seu sorteio.
--  Um líder do Alpha nunca enxerga nada do Kombo, e vice-versa.
--
--  Como usar: painel do Supabase -> SQL Editor -> New query,
--  cole ESTE ARQUIVO INTEIRO e clique em "Run".
--  Resultado esperado: "Success. No rows returned".
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
--  0. TRAVAS DE SEGURANÇA
-- ============================================================================

-- Não rodar num projeto que já tem outro sistema dentro.
do $$
declare
  alvo record;
begin
  for alvo in
    select * from (values
      ('vendedores', 'grupo'),
      ('vendas',     'vendedor_id'),
      ('sorteios',   'venda_id')
    ) as t(tabela, coluna_nossa)
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = alvo.tabela
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = alvo.tabela
        and column_name in (alvo.coluna_nossa, 'campo')
    ) then
      raise exception 'Este projeto já tem uma tabela "%" de outro sistema.', alvo.tabela
        using hint = 'Rode este script num projeto Supabase dedicado às rifas.';
    end if;
  end loop;
end
$$;

-- Esta versão reorganiza as tabelas (grupos separados, login de vendedor).
-- Se já houver vendas na estrutura ANTIGA, para tudo: exporte o CSV antes.
do $$
declare
  qtd bigint;
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='vendas')
     and not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='vendas' and column_name='lote_id')
  then
    execute 'select count(*) from public.vendas' into qtd;
    if qtd > 0 then
      raise exception 'Existem % venda(s) na estrutura antiga.', qtd
        using hint = 'Guarde os dados antes: rode "select * from public.vendas" e use o botao '
                     'Download CSV do painel de resultados. Depois apague com '
                     '"delete from public.vendas; delete from public.vendedores;" e rode este '
                     'script de novo. (O app novo nao le a estrutura antiga, entao a exportacao '
                     'tem de ser por aqui mesmo.)';
    end if;
  end if;
end
$$;

-- ============================================================================
--  1. TROCA DA ESTRUTURA ANTIGA
-- ----------------------------------------------------------------------------
--  Só derruba tabela quando encontra a estrutura ANTIGA (e, pela trava acima,
--  vazia). Se a estrutura nova já está no lugar, nada é apagado: daí para a
--  frente o script só atualiza, e pode rodar quantas vezes você quiser mesmo
--  com o acampamento inteiro cadastrado.
-- ============================================================================

do $$
declare
  antiga boolean;
begin
  antiga :=
       exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='config' and column_name='id')
    or exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='vendedores' and column_name='campo')
    or (exists (select 1 from information_schema.tables
                where table_schema='public' and table_name='vendas')
        and not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='vendas' and column_name='lote_id'));

  if not antiga then
    return;
  end if;

  raise notice 'Estrutura antiga encontrada e vazia: recriando do zero.';

  drop table if exists public.sorteios           cascade;
  drop table if exists public.vendas             cascade;
  drop table if exists public.vendedores_privado cascade;
  drop table if exists public.vendedores         cascade;
  drop table if exists public.perfis             cascade;
  drop table if exists public.config             cascade;
  drop sequence if exists public.vendas_numero_seq cascade;
  drop function if exists public.apagar_todos_os_dados()             cascade;
  drop function if exists public.fechar_meta_do_vendedor(uuid, text) cascade;
  drop function if exists public.transferir_vendas(uuid, uuid)       cascade;
  drop function if exists public.papel_atual()                       cascade;
  drop function if exists public.definir_numero_da_venda()           cascade;
end
$$;

-- ============================================================================
--  2. TABELAS
-- ============================================================================

-- ---- config: uma linha por grupo -------------------------------------------
create table if not exists public.config (
  grupo       text primary key check (grupo in ('Alpha', 'Kombo')),
  preco_rifa  numeric(10, 2) not null default 10,
  meta_padrao numeric(10, 2) not null default 500,
  prazo_final date,
  premio      text,
  data_sorteio     date,
  primeiro_acerto  date,
  updated_at  timestamptz not null default now()
);

insert into public.config (grupo) values ('Alpha'), ('Kombo') on conflict (grupo) do nothing;

alter table public.config add column if not exists premio text;
alter table public.config add column if not exists data_sorteio date;
alter table public.config add column if not exists primeiro_acerto date;
-- preço/meta específicos de quem vende para ficar no chalé (só usado no Kombo)
alter table public.config add column if not exists preco_rifa_chale numeric(10, 2) not null default 10;
alter table public.config add column if not exists meta_chale numeric(10, 2) not null default 500;

-- ---- codigos_acesso: a senha para virar líder de um grupo ------------------
--  Guardado como hash e SEM permissão de leitura para ninguém: só as funções
--  abaixo (que rodam com privilégio elevado) conseguem comparar.
create table if not exists public.codigos_acesso (
  grupo             text primary key check (grupo in ('Alpha', 'Kombo')),
  codigo_hash       text,
  codigo_vendedor_hash text,
  atualizado_em     timestamptz not null default now()
);

alter table public.codigos_acesso add column if not exists codigo_vendedor_hash text;

insert into public.codigos_acesso (grupo) values ('Alpha'), ('Kombo') on conflict (grupo) do nothing;

comment on table public.codigos_acesso is
  'Código que a liderança combina entre si para criar conta de líder. Nunca legível pelo app.';

-- ---- vendedores -------------------------------------------------------------
create table if not exists public.vendedores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (length(btrim(nome)) > 0),
  email      text not null unique check (position('@' in email) > 1),
  telefone   text,
  grupo      text not null check (grupo in ('Alpha', 'Kombo')),
  meta       numeric(10, 2),                          -- nulo = meta padrão do grupo
  situacao   text not null default 'ativo' check (situacao in ('ativo', 'quitou', 'desistiu')),
  user_id    uuid references auth.users (id) on delete set null,  -- preenchido no 1º acesso
  created_at timestamptz not null default now()
);

create index if not exists vendedores_grupo_idx on public.vendedores (grupo);
create index if not exists vendedores_email_idx on public.vendedores (lower(email));

alter table public.vendedores add column if not exists telefone text;
alter table public.vendedores add column if not exists termo_digital_em timestamptz;
alter table public.vendedores add column if not exists acesso_enviado_em timestamptz;
alter table public.vendedores add column if not exists tipo text not null default 'adolescente'
  check (tipo in ('adolescente', 'voluntario'));
-- destino da venda, só relevante no Kombo: vai para um chalé ou para o quarto normal
alter table public.vendedores add column if not exists destino text not null default 'quarto'
  check (destino in ('quarto', 'chale'));

-- "inscrito" = já garantiu a vaga (direto ou vendendo todas as rifas) e sai da lista de quem ainda vende
alter table public.vendedores drop constraint if exists vendedores_situacao_check;
alter table public.vendedores add constraint vendedores_situacao_check
  check (situacao in ('ativo', 'quitou', 'desistiu', 'inscrito'));

-- ---- perfis: quem é quem depois de logar -----------------------------------
--  dev      -> enxerga os dois grupos e corrige dados
--  lider    -> enxerga só o próprio grupo
--  vendedor -> enxerga só o próprio grupo, e só registra as próprias vendas
create table if not exists public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text,
  papel       text not null check (papel in ('dev', 'lider', 'vendedor')),
  grupo       text check (grupo in ('Alpha', 'Kombo')),   -- nulo só para o dev
  vendedor_id uuid references public.vendedores (id) on delete cascade,
  criado_em   timestamptz not null default now(),
  constraint perfis_grupo_obrigatorio check (papel = 'dev' or grupo is not null)
);

alter table public.perfis add column if not exists pode_corrigir_venda boolean not null default false;

-- ---- vendedores_privado: o que NÃO pode circular ---------------------------
create table if not exists public.vendedores_privado (
  vendedor_id       uuid primary key references public.vendedores (id) on delete cascade,
  observacao        text,
  termo_path        text,
  termo_assinado_em date,
  termo_assinatura  text, -- nome digitado na assinatura digital
  termo_conteudo    text, -- o texto exato que a pessoa leu e assinou
  atualizado_em     timestamptz not null default now()
);

alter table public.vendedores_privado add column if not exists termo_assinatura text;
alter table public.vendedores_privado add column if not exists termo_conteudo text;

-- ---- vendas -----------------------------------------------------------------
--  Cada grupo tem sua própria numeração, começando no #001.
create sequence if not exists public.vendas_numero_alpha_seq as integer start with 1;
create sequence if not exists public.vendas_numero_kombo_seq as integer start with 1;

create table if not exists public.vendas (
  id               uuid primary key default gen_random_uuid(),
  grupo            text not null check (grupo in ('Alpha', 'Kombo')),
  numero           integer not null,
  vendedor_id      uuid not null references public.vendedores (id) on delete restrict,
  -- rifas compradas de uma vez pela mesma pessoa compartilham o lote e o comprovante
  lote_id          uuid not null default gen_random_uuid(),
  comprador        text not null check (length(btrim(comprador)) > 0),
  telefone         text,
  pagamento        text not null default 'dinheiro' check (pagamento in ('dinheiro', 'pix')),
  comprovante_path text,
  status           text not null default 'pago'     check (status in ('pago', 'pendente')),
  repasse          text not null default 'pendente' check (repasse in ('pendente', 'entregue', 'confirmado')),
  origem           text not null default 'venda'    check (origem in ('venda', 'propria')),
  data             timestamptz not null default now(),
  unique (grupo, numero)
);

create index if not exists vendas_vendedor_idx on public.vendas (vendedor_id);
create index if not exists vendas_grupo_idx    on public.vendas (grupo);
create index if not exists vendas_lote_idx     on public.vendas (lote_id);

-- ---- inscricoes_push: notificação de verdade, na barra do celular ---------
create table if not exists public.inscricoes_push (
  id           uuid primary key default gen_random_uuid(),
  vendedor_id  uuid not null references public.vendedores (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  criado_em    timestamptz not null default now()
);

create index if not exists inscricoes_push_vendedor_idx on public.inscricoes_push (vendedor_id);

-- ---- sorteios ---------------------------------------------------------------
create table if not exists public.sorteios (
  id       uuid primary key default gen_random_uuid(),
  grupo    text not null check (grupo in ('Alpha', 'Kombo')),
  venda_id uuid references public.vendas (id) on delete set null,
  data     timestamptz not null default now()
);

-- ---- inscricoes -------------------------------------------------------------
--  Quem já garantiu vaga no acampamento: pagando o ingresso direto, ou
--  vendendo todas as rifas (nesse caso ligado ao vendedor de origem).
--  Fase de teste: só o dev lê e escreve aqui (ver políticas de RLS abaixo).
create table if not exists public.inscricoes (
  id               uuid primary key default gen_random_uuid(),
  grupo            text not null check (grupo in ('Alpha', 'Kombo')),
  nome             text not null check (length(btrim(nome)) > 0),
  telefone         text,
  forma            text not null check (forma in ('direto', 'rifa')),
  pagamento        text not null default 'dinheiro' check (pagamento in ('dinheiro', 'pix')),
  valor            numeric(10, 2) not null default 0,
  status           text not null default 'pago' check (status in ('pago', 'pendente')),
  comprovante_path text,
  vendedor_id      uuid references public.vendedores (id) on delete set null,
  observacao       text,
  criado_em        timestamptz not null default now()
);

create index if not exists inscricoes_grupo_idx on public.inscricoes (grupo);

-- ============================================================================
--  3. QUEM SOU EU
-- ----------------------------------------------------------------------------
--  SECURITY DEFINER porque estas funções são chamadas de dentro das políticas
--  de RLS da própria tabela perfis — sem isso o Postgres entra em recursão.
-- ============================================================================

create or replace function public.meu_papel()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select papel from public.perfis where id = auth.uid()), 'sem_acesso')
$$;

create or replace function public.meu_grupo()
returns text language sql stable security definer set search_path = public as $$
  select grupo from public.perfis where id = auth.uid()
$$;

create or replace function public.e_dev()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'dev' from public.perfis where id = auth.uid()), false)
$$;

create or replace function public.e_lider()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select papel in ('dev', 'lider') from public.perfis where id = auth.uid()), false)
$$;

create or replace function public.meu_vendedor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select vendedor_id from public.perfis where id = auth.uid()
$$;

/** Dev sempre pode; líder só se o dev liberou (Usuários -> Corrigir venda). */
create or replace function public.pode_corrigir_venda()
returns boolean language sql stable security definer set search_path = public as $$
  select public.e_dev() or coalesce((select pode_corrigir_venda from public.perfis where id = auth.uid()), false)
$$;

/** O dev enxerga os dois grupos; todo mundo enxerga só o seu. */
create or replace function public.posso_ver(p_grupo text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.e_dev() or p_grupo = public.meu_grupo()
$$;

-- ============================================================================
--  4. ENTRADA: criar conta de líder, vincular vendedor
-- ============================================================================

/**
 * Vira líder de um grupo apresentando o código que a liderança combinou.
 * Chamado logo depois do cadastro de e-mail e senha.
 */
create or replace function public.registrar_lider(
  p_grupo  text,
  p_codigo text,
  p_nome   text default null
)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'Faça o cadastro de e-mail e senha antes.';
  end if;
  if p_grupo not in ('Alpha', 'Kombo') then
    raise exception 'Escolha Alpha ou Kombo.';
  end if;

  -- já tem acesso? não deixa trocar de papel sozinho
  if exists (select 1 from public.perfis where id = auth.uid()) then
    return (select papel from public.perfis where id = auth.uid());
  end if;

  select codigo_hash into v_hash from public.codigos_acesso where grupo = p_grupo;

  if v_hash is null then
    raise exception 'O grupo % ainda não tem código de liderança definido.', p_grupo
      using hint = 'Peça para quem administra abrir Configurações e criar o código.';
  end if;

  if v_hash <> crypt(coalesce(p_codigo, ''), v_hash) then
    raise exception 'Código do acampamento incorreto.';
  end if;

  insert into public.perfis (id, nome, papel, grupo)
  values (auth.uid(), nullif(btrim(coalesce(p_nome, '')), ''), 'lider', p_grupo);

  return 'lider';
end;
$$;

/**
 * Primeiro acesso do vendedor: liga a conta recém-criada ao cadastro que o
 * líder já tinha feito, casando pelo e-mail.
 */
create or replace function public.vincular_vendedor()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_email     text;
  v_vendedor  public.vendedores%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Faça o cadastro de e-mail e senha antes.';
  end if;

  if exists (select 1 from public.perfis where id = auth.uid()) then
    return (select papel from public.perfis where id = auth.uid());
  end if;

  select lower(email) into v_email from auth.users where id = auth.uid();

  select * into v_vendedor from public.vendedores where lower(email) = v_email;
  if not found then
    raise exception 'Este e-mail não está cadastrado como vendedor.'
      using hint = 'Peça ao líder do seu grupo para cadastrar você com este mesmo e-mail.';
  end if;

  if v_vendedor.user_id is not null and v_vendedor.user_id <> auth.uid() then
    raise exception 'Este e-mail já tem uma senha criada.'
      using hint = 'Use "Entrar" em vez de "Criar senha".';
  end if;

  update public.vendedores set user_id = auth.uid() where id = v_vendedor.id;

  insert into public.perfis (id, nome, papel, grupo, vendedor_id)
  values (auth.uid(), v_vendedor.nome, 'vendedor', v_vendedor.grupo, v_vendedor.id);

  return 'vendedor';
end;
$$;

/** Troca o código de liderança do grupo. Só o líder do grupo ou o dev. */
create or replace function public.definir_codigo_de_lider(p_grupo text, p_codigo text)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  -- auth.uid() nulo = chamada pelo SQL Editor do painel (o dono do banco).
  -- É por ali que os códigos são criados na primeira vez, antes de existir
  -- qualquer líder. Pelo app, sempre há usuário logado.
  if auth.uid() is not null and not (public.e_lider() and public.posso_ver(p_grupo)) then
    raise exception 'Só a liderança do grupo pode mudar o código.';
  end if;
  if length(btrim(coalesce(p_codigo, ''))) < 6 then
    raise exception 'O código precisa ter pelo menos 6 caracteres.';
  end if;

  update public.codigos_acesso
     set codigo_hash = crypt(btrim(p_codigo), gen_salt('bf')),
         atualizado_em = now()
   where grupo = p_grupo;
end;
$$;

/** Só diz se o código já existe — nunca devolve o código em si. */
create or replace function public.codigo_definido(p_grupo text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.codigos_acesso where grupo = p_grupo and codigo_hash is not null)
$$;

/** Troca o código de autocadastro de vendedor do grupo. Só a liderança do grupo. */
create or replace function public.definir_codigo_de_vendedor(p_grupo text, p_codigo text)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if not (public.e_lider() and public.posso_ver(p_grupo)) then
    raise exception 'Só a liderança do grupo pode mudar o código.';
  end if;
  if length(btrim(coalesce(p_codigo, ''))) < 6 then
    raise exception 'O código precisa ter pelo menos 6 caracteres.';
  end if;

  update public.codigos_acesso
     set codigo_vendedor_hash = crypt(btrim(p_codigo), gen_salt('bf')),
         atualizado_em = now()
   where grupo = p_grupo;
end;
$$;

/** Autocadastro do vendedor: cria a própria conta E o próprio cadastro, num passo só. */
-- a assinatura antiga (sem p_destino) fica como um overload morto se não remover
drop function if exists public.registrar_vendedor_autonomo(text, text, text, text, text, text);

create or replace function public.registrar_vendedor_autonomo(
  p_grupo    text,
  p_codigo   text,
  p_nome     text,
  p_email    text,
  p_telefone text,
  p_tipo     text,
  p_destino  text default 'quarto'
)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_hash      text;
  v_email     text := lower(btrim(p_email));
  v_destino   text := case when p_grupo = 'Kombo' and p_destino = 'chale' then 'chale' else 'quarto' end;
  v_vendedor  public.vendedores%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Faça o cadastro de e-mail e senha antes.';
  end if;
  if p_grupo not in ('Alpha', 'Kombo') then
    raise exception 'Escolha Alpha ou Kombo.';
  end if;
  if exists (select 1 from public.perfis where id = auth.uid()) then
    return;
  end if;
  if length(btrim(coalesce(p_nome, ''))) = 0 then
    raise exception 'Digite seu nome.';
  end if;
  if length(btrim(coalesce(p_telefone, ''))) = 0 then
    raise exception 'Digite seu telefone.';
  end if;
  if p_tipo not in ('adolescente', 'voluntario') then
    raise exception 'Escolha adolescente ou voluntário.';
  end if;

  select codigo_vendedor_hash into v_hash from public.codigos_acesso where grupo = p_grupo;
  if v_hash is null then
    raise exception 'O grupo % ainda não tem código de cadastro definido.', p_grupo
      using hint = 'Peça para a liderança criar o código em Configurações.';
  end if;
  if v_hash <> crypt(coalesce(p_codigo, ''), v_hash) then
    raise exception 'Código incorreto.';
  end if;

  select * into v_vendedor from public.vendedores where lower(email) = v_email;

  if found then
    if v_vendedor.user_id is not null and v_vendedor.user_id <> auth.uid() then
      raise exception 'Este e-mail já tem uma senha criada.'
        using hint = 'Use "Entrar" em vez de se cadastrar.';
    end if;
    update public.vendedores
       set user_id = auth.uid(), nome = btrim(p_nome), telefone = btrim(p_telefone), tipo = p_tipo,
           destino = v_destino
     where id = v_vendedor.id
    returning * into v_vendedor;
  else
    insert into public.vendedores (nome, email, telefone, tipo, grupo, user_id, destino)
    values (btrim(p_nome), v_email, btrim(p_telefone), p_tipo, p_grupo, auth.uid(), v_destino)
    returning * into v_vendedor;
  end if;

  insert into public.perfis (id, nome, papel, grupo, vendedor_id)
  values (auth.uid(), btrim(p_nome), 'vendedor', p_grupo, v_vendedor.id);
end;
$$;

-- ============================================================================
--  5. GATILHOS DA VENDA
-- ============================================================================

/**
 * Grupo e número vêm do banco: o app nunca escolhe.
 *
 * O número é sempre o MENOR livre naquele grupo — se uma rifa foi apagada
 * (venda de teste ou lançada errado), o número dela volta a ficar disponível
 * para a próxima venda, em vez de ficar pulado para sempre.
 */
create or replace function public.definir_grupo_e_numero()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_grupo text;
  v_numero integer;
begin
  select grupo into v_grupo from public.vendedores where id = new.vendedor_id;
  if v_grupo is null then
    raise exception 'Vendedor não encontrado.';
  end if;

  select min(t.n) into v_numero
  from generate_series(
    1, (select coalesce(max(numero), 0) + 1 from public.vendas where grupo = v_grupo)
  ) as t(n)
  where not exists (
    select 1 from public.vendas v where v.grupo = v_grupo and v.numero = t.n
  );

  new.grupo  := v_grupo;
  new.numero := coalesce(v_numero, 1);
  return new;
end;
$$;

drop trigger if exists vendas_definir_grupo_e_numero on public.vendas;
create trigger vendas_definir_grupo_e_numero
  before insert on public.vendas
  for each row execute function public.definir_grupo_e_numero();

/**
 * O líder mexe em status e repasse. O vendedor completa status e comprovante
 * só da própria venda (ver política "vendas: o vendedor completa a
 * própria"), e só antes do repasse começar a ser conferido — depois disso
 * quem manda nesse dado é a liderança. Corrigir o resto é só do dev.
 */
create or replace function public.proteger_colunas_da_venda()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.pode_corrigir_venda() then
    return new;
  end if;

  if new.numero      is distinct from old.numero
  or new.grupo       is distinct from old.grupo
  or new.vendedor_id is distinct from old.vendedor_id
  or new.comprador   is distinct from old.comprador
  or new.telefone    is distinct from old.telefone
  or new.pagamento   is distinct from old.pagamento
  or new.origem      is distinct from old.origem
  or new.data        is distinct from old.data then
    raise exception 'Só o dev pode corrigir os dados de uma venda já registrada.'
      using hint = 'O líder pode mudar o status (pago/pendente) e o repasse.';
  end if;

  if not public.e_lider() and new.repasse is distinct from old.repasse then
    raise exception 'Só a liderança pode mudar o repasse.';
  end if;

  return new;
end;
$$;

drop trigger if exists vendas_proteger_colunas on public.vendas;
create trigger vendas_proteger_colunas
  before update on public.vendas
  for each row execute function public.proteger_colunas_da_venda();

-- ============================================================================
--  6. REGISTRAR VENDA (várias rifas de uma vez)
-- ============================================================================

create or replace function public.registrar_venda(
  p_quantidade       integer,
  p_comprador        text,
  p_telefone         text default null,
  p_pagamento        text default 'dinheiro',
  p_status           text default 'pago',
  p_comprovante_path text default null,
  p_vendedor_id      uuid default null
)
returns setof public.vendas
language plpgsql security definer
set search_path = public
as $$
declare
  v_vendedor_id uuid;
  v_vendedor    public.vendedores%rowtype;
  v_lote        uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para registrar uma venda.';
  end if;
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 50 then
    raise exception 'A quantidade precisa ser de 1 a 50 rifas.';
  end if;
  if length(btrim(coalesce(p_comprador, ''))) = 0 then
    raise exception 'Digite o nome do comprador.';
  end if;

  -- o vendedor só registra para si; líder e dev registram para alguém do grupo
  v_vendedor_id := coalesce(p_vendedor_id, public.meu_vendedor_id());
  if v_vendedor_id is null then
    raise exception 'Escolha o vendedor.';
  end if;

  select * into v_vendedor from public.vendedores where id = v_vendedor_id;
  if not found then
    raise exception 'Vendedor não encontrado.';
  end if;

  if v_vendedor_id <> coalesce(public.meu_vendedor_id(), '00000000-0000-0000-0000-000000000000'::uuid)
     and not (public.e_lider() and public.posso_ver(v_vendedor.grupo)) then
    raise exception 'Você só pode registrar as suas próprias vendas.';
  end if;

  if v_vendedor.situacao = 'desistiu' then
    raise exception 'Este vendedor saiu do acampamento e não registra mais vendas.';
  end if;

  return query
  insert into public.vendas
    (vendedor_id, lote_id, comprador, telefone, pagamento, comprovante_path, status, grupo, numero)
  select v_vendedor_id, v_lote, btrim(p_comprador), nullif(btrim(coalesce(p_telefone, '')), ''),
         p_pagamento, nullif(btrim(coalesce(p_comprovante_path, '')), ''), p_status,
         v_vendedor.grupo, 0        -- grupo e numero são reescritos pelo gatilho
  from generate_series(1, p_quantidade)
  returning *;
end;
$$;

/**
 * Assinatura digital do termo: o vendedor lê o texto (já com os dados dele)
 * dentro do app e digita o próprio nome. Grava o nome, o texto exato lido e
 * a data em vendedores_privado — mas o vendedor nunca ganha permissão de
 * ler essa tabela, só de chamar esta função. É por isso que fica bem aqui,
 * não numa política de RLS.
 */
create or replace function public.assinar_termo(p_nome text, p_conteudo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_vendedor_id uuid := public.meu_vendedor_id();
begin
  if v_vendedor_id is null then
    raise exception 'Só o vendedor pode assinar o próprio termo.';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 3 then
    raise exception 'Digite seu nome completo.';
  end if;

  insert into public.vendedores_privado
    (vendedor_id, termo_assinatura, termo_conteudo, termo_assinado_em, atualizado_em)
  values (v_vendedor_id, btrim(p_nome), p_conteudo, current_date, now())
  on conflict (vendedor_id) do update
    set termo_assinatura  = excluded.termo_assinatura,
        termo_conteudo    = excluded.termo_conteudo,
        termo_assinado_em = excluded.termo_assinado_em,
        atualizado_em     = now();

  update public.vendedores set termo_digital_em = now() where id = v_vendedor_id;
end;
$$;

-- ============================================================================
--  7. FECHAMENTO E MANUTENÇÃO
-- ============================================================================

create or replace function public.fechar_meta_do_vendedor(
  p_vendedor_id uuid,
  p_pagamento   text default 'dinheiro'
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_vendedor   public.vendedores%rowtype;
  v_preco      numeric;
  v_meta       numeric;
  v_arrecadado numeric;
  v_faltante   numeric;
  v_quantidade integer;
begin
  select * into v_vendedor from public.vendedores where id = p_vendedor_id;
  if not found then
    raise exception 'Vendedor não encontrado.';
  end if;
  if not (public.e_lider() and public.posso_ver(v_vendedor.grupo)) then
    raise exception 'Só a liderança do grupo pode fechar a meta de um vendedor.';
  end if;
  if v_vendedor.situacao = 'desistiu' then
    raise exception 'Este vendedor desistiu do acampamento. Não faz sentido fechar a meta dele.';
  end if;

  select preco_rifa, meta_padrao into v_preco, v_meta
    from public.config where grupo = v_vendedor.grupo;
  v_meta := coalesce(v_vendedor.meta, v_meta);

  if v_preco is null or v_preco <= 0 then
    raise exception 'O preço da rifa precisa ser maior que zero nas configurações.';
  end if;

  select coalesce(count(*), 0) * v_preco into v_arrecadado
    from public.vendas where vendedor_id = p_vendedor_id and status = 'pago';

  v_faltante := v_meta - v_arrecadado;

  if v_faltante <= 0 then
    update public.vendedores set situacao = 'quitou' where id = p_vendedor_id;
    return 0;
  end if;

  v_quantidade := ceil(v_faltante / v_preco);

  insert into public.vendas
    (vendedor_id, comprador, pagamento, status, origem, grupo, numero)
  select p_vendedor_id, v_vendedor.nome, p_pagamento, 'pago', 'propria', v_vendedor.grupo, 0
  from generate_series(1, v_quantidade);

  update public.vendedores set situacao = 'quitou' where id = p_vendedor_id;
  return v_quantidade;
end;
$$;

create or replace function public.transferir_vendas(p_de uuid, p_para uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_total  integer;
  v_origem public.vendedores%rowtype;
  v_dest   public.vendedores%rowtype;
begin
  if not public.e_dev() then
    raise exception 'Apenas o dev pode transferir vendas entre vendedores.';
  end if;
  if p_de = p_para then
    raise exception 'Escolha dois vendedores diferentes.';
  end if;

  select * into v_origem from public.vendedores where id = p_de;
  select * into v_dest   from public.vendedores where id = p_para;
  if v_dest.id is null or v_origem.id is null then
    raise exception 'Vendedor não encontrado.';
  end if;
  if v_origem.grupo <> v_dest.grupo then
    raise exception 'Não dá para transferir rifas entre grupos diferentes (a numeração é separada).';
  end if;

  update public.vendas set vendedor_id = p_para where vendedor_id = p_de;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

/** Zera um grupo e devolve a numeração dele para o #001. */
create or replace function public.apagar_dados_do_grupo(p_grupo text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not (public.e_lider() and public.posso_ver(p_grupo)) then
    raise exception 'Só a liderança do grupo pode apagar os dados dele.';
  end if;

  delete from public.inscricoes where grupo = p_grupo;
  delete from public.sorteios where grupo = p_grupo;
  delete from public.vendas   where grupo = p_grupo;
  delete from public.vendedores where grupo = p_grupo;
  -- a numeração já volta ao #001 sozinha: o próximo cadastro pega o menor
  -- número livre, e sem vendas no grupo o menor livre é sempre 1
end;
$$;

-- ============================================================================
--  8. SEGURANÇA (RLS)
-- ----------------------------------------------------------------------------
--  Agora TODO MUNDO faz login — inclusive o vendedor. Quem não entrou não lê
--  absolutamente nada, e a separação entre Alpha e Kombo é feita aqui, não na
--  tela: um líder do Alpha que chame a API na mão continua sem ver o Kombo.
-- ============================================================================

alter table public.config              enable row level security;
alter table public.codigos_acesso      enable row level security;
alter table public.perfis              enable row level security;
alter table public.vendedores          enable row level security;
alter table public.vendedores_privado  enable row level security;
alter table public.vendas              enable row level security;
alter table public.sorteios            enable row level security;
alter table public.inscricoes_push     enable row level security;
alter table public.inscricoes          enable row level security;

-- ---- config ----------------------------------------------------------------
drop policy if exists "config: só o meu grupo" on public.config;
create policy "config: só o meu grupo"
  on public.config for select to authenticated
  using (public.posso_ver(grupo));

drop policy if exists "config: só a liderança altera" on public.config;
create policy "config: só a liderança altera"
  on public.config for update to authenticated
  using (public.e_lider() and public.posso_ver(grupo))
  with check (public.e_lider() and public.posso_ver(grupo));

-- ---- codigos_acesso: ninguém lê, ninguém escreve direto --------------------
--  Sem política nenhuma = nada passa. Só as funções com privilégio elevado.

-- ---- perfis ----------------------------------------------------------------
drop policy if exists "perfis: cada um vê o seu" on public.perfis;
create policy "perfis: cada um vê o seu"
  on public.perfis for select to authenticated
  using (
    id = auth.uid()
    or public.e_dev()
    or (public.e_lider() and grupo = public.meu_grupo())
  );

drop policy if exists "perfis: só o dev gerencia" on public.perfis;
create policy "perfis: só o dev gerencia"
  on public.perfis for all to authenticated
  using (public.e_dev()) with check (public.e_dev());

-- ---- vendedores -------------------------------------------------------------
drop policy if exists "vendedores: só o meu grupo" on public.vendedores;
create policy "vendedores: só o meu grupo"
  on public.vendedores for select to authenticated
  using (public.posso_ver(grupo));

drop policy if exists "vendedores: a liderança cadastra" on public.vendedores;
create policy "vendedores: a liderança cadastra"
  on public.vendedores for insert to authenticated
  with check (public.e_lider() and public.posso_ver(grupo));

drop policy if exists "vendedores: a liderança edita" on public.vendedores;
create policy "vendedores: a liderança edita"
  on public.vendedores for update to authenticated
  using (public.e_lider() and public.posso_ver(grupo))
  with check (public.e_lider() and public.posso_ver(grupo));

drop policy if exists "vendedores: a liderança exclui" on public.vendedores;
create policy "vendedores: a liderança exclui"
  on public.vendedores for delete to authenticated
  using (public.e_lider() and public.posso_ver(grupo));

-- ---- vendedores_privado: termo e observações -------------------------------
--  Só a liderança. Nem o próprio vendedor abre o seu.
drop policy if exists "privado: só a liderança do grupo" on public.vendedores_privado;
create policy "privado: só a liderança do grupo"
  on public.vendedores_privado for all to authenticated
  using (
    public.e_lider()
    and exists (select 1 from public.vendedores v
                 where v.id = vendedor_id and public.posso_ver(v.grupo))
  )
  with check (
    public.e_lider()
    and exists (select 1 from public.vendedores v
                 where v.id = vendedor_id and public.posso_ver(v.grupo))
  );

-- ---- vendas -----------------------------------------------------------------
drop policy if exists "vendas: só o meu grupo" on public.vendas;
create policy "vendas: só o meu grupo"
  on public.vendas for select to authenticated
  using (public.posso_ver(grupo));

-- inserir é sempre pela função registrar_venda(), nunca direto
drop policy if exists "vendas: a liderança edita" on public.vendas;
create policy "vendas: a liderança edita"
  on public.vendas for update to authenticated
  using (public.e_lider() and public.posso_ver(grupo))
  with check (public.e_lider() and public.posso_ver(grupo));

/**
 * O vendedor completa a própria venda quando esqueceu de marcar como pago
 * ou de anexar o comprovante do Pix — só enquanto o repasse ainda não
 * começou a ser conferido pela liderança (repasse = 'pendente'). O gatilho
 * "vendas_proteger_colunas" garante que só status e comprovante mudam de
 * verdade; o resto (número, comprador, valor...) fica travado mesmo se
 * alguém tentar forçar pela API.
 */
drop policy if exists "vendas: o vendedor completa a própria" on public.vendas;
create policy "vendas: o vendedor completa a própria"
  on public.vendas for update to authenticated
  using (vendedor_id = public.meu_vendedor_id() and repasse = 'pendente')
  with check (vendedor_id = public.meu_vendedor_id());

drop policy if exists "vendas: a liderança exclui" on public.vendas;
create policy "vendas: a liderança exclui"
  on public.vendas for delete to authenticated
  using (public.e_lider() and public.posso_ver(grupo));

-- ---- inscricoes_push: só o próprio vendedor mexe na própria ----------------
--  A Edge Function que dispara o envio usa a service_role e ignora RLS.
drop policy if exists "push: o vendedor cuida da própria" on public.inscricoes_push;
create policy "push: o vendedor cuida da própria"
  on public.inscricoes_push for all to authenticated
  using (vendedor_id = public.meu_vendedor_id())
  with check (vendedor_id = public.meu_vendedor_id());

-- ---- sorteios ---------------------------------------------------------------
drop policy if exists "sorteios: só o meu grupo" on public.sorteios;
create policy "sorteios: só o meu grupo"
  on public.sorteios for select to authenticated
  using (public.posso_ver(grupo));

drop policy if exists "sorteios: a liderança sorteia" on public.sorteios;
create policy "sorteios: a liderança sorteia"
  on public.sorteios for insert to authenticated
  with check (public.e_lider() and public.posso_ver(grupo));

-- ---- inscricoes ---------------------------------------------------------------
--  Fase de teste: só o dev. Quando for liberar pra liderança, troca
--  "public.e_dev()" por "public.e_lider() and public.posso_ver(grupo)" aqui.
drop policy if exists "inscricoes: só o dev, por enquanto" on public.inscricoes;
create policy "inscricoes: só o dev, por enquanto"
  on public.inscricoes for all to authenticated
  using (public.e_dev())
  with check (public.e_dev());

-- Formulário público (QR code): qualquer um pode CRIAR um pedido pendente,
-- mas só isso — nunca ler, trocar ou apagar. Só entra como "pendente", sem
-- valor e sem vendedor ligado; quem confirma o pagamento e vira inscrição de
-- verdade é sempre o dev, pela policy de cima.
drop policy if exists "inscricoes: formulário público só cria pendente" on public.inscricoes;
create policy "inscricoes: formulário público só cria pendente"
  on public.inscricoes for insert to anon
  with check (
    grupo in ('Alpha', 'Kombo')
    and forma = 'direto'
    and status = 'pendente'
    and valor = 0
    and vendedor_id is null
  );

-- ============================================================================
--  9. PERMISSÕES DE TABELA
-- ----------------------------------------------------------------------------
--  Segunda camada. O RLS diz QUAIS LINHAS; isto diz QUAIS COMANDOS.
--  Quem não fez login (anon) não tem absolutamente nada.
-- ============================================================================

grant usage on schema public to anon, authenticated;

revoke all on public.config, public.codigos_acesso, public.perfis, public.vendedores,
              public.vendedores_privado, public.vendas, public.sorteios, public.inscricoes_push,
              public.inscricoes
  from anon, authenticated;

grant select on public.config, public.vendedores, public.vendas, public.sorteios, public.perfis
  to authenticated;
grant select, insert, delete on public.inscricoes_push to authenticated;
grant select, insert, update, delete on public.inscricoes to authenticated;
grant insert on public.inscricoes to anon;

grant update                 on public.config             to authenticated;
grant insert, update, delete on public.vendedores         to authenticated;
grant select, insert, update, delete on public.vendedores_privado to authenticated;
grant update, delete         on public.vendas             to authenticated;
grant insert                 on public.sorteios           to authenticated;
grant insert, update, delete on public.perfis             to authenticated;

-- as funções decidem quem pode o quê; anon só precisa das duas de entrada
revoke all on function public.registrar_lider(text, text, text)                     from public, anon;
revoke all on function public.vincular_vendedor()                                   from public, anon;
revoke all on function public.definir_codigo_de_lider(text, text)                   from public, anon;
revoke all on function public.definir_codigo_de_vendedor(text, text)                from public, anon;
revoke all on function public.registrar_vendedor_autonomo(text, text, text, text, text, text, text) from public, anon;
revoke all on function public.registrar_venda(integer, text, text, text, text, text, uuid) from public, anon;
revoke all on function public.assinar_termo(text, text) from public, anon;
revoke all on function public.fechar_meta_do_vendedor(uuid, text)                   from public, anon;
revoke all on function public.transferir_vendas(uuid, uuid)                         from public, anon;
revoke all on function public.apagar_dados_do_grupo(text)                           from public, anon;

grant execute on function public.registrar_lider(text, text, text)                     to authenticated;
grant execute on function public.vincular_vendedor()                                   to authenticated;
grant execute on function public.definir_codigo_de_lider(text, text)                   to authenticated;
grant execute on function public.definir_codigo_de_vendedor(text, text)                to authenticated;
grant execute on function public.registrar_vendedor_autonomo(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.registrar_venda(integer, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.assinar_termo(text, text) to authenticated;
grant execute on function public.fechar_meta_do_vendedor(uuid, text)                   to authenticated;
grant execute on function public.transferir_vendas(uuid, uuid)                         to authenticated;
grant execute on function public.apagar_dados_do_grupo(text)                           to authenticated;
grant execute on function public.meu_papel(), public.meu_grupo(), public.e_dev(),
                          public.e_lider(), public.meu_vendedor_id(),
                          public.posso_ver(text), public.codigo_definido(text),
                          public.pode_corrigir_venda()
  to anon, authenticated;

-- ============================================================================
--  10. ARQUIVOS (buckets privados)
-- ----------------------------------------------------------------------------
--  termos       -> Alpha/<vendedor_id>/termo.pdf     (só a liderança do grupo)
--  comprovantes -> Alpha/<lote_id>.jpg               (a liderança e quem vendeu)
--
--  O grupo está na PRIMEIRA PASTA do caminho, e a política confere isso: um
--  líder do Alpha não abre um arquivo do Kombo nem sabendo o endereço.
-- ============================================================================

do $$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'storage' and table_name = 'objects') then
    raise notice 'Storage nao encontrado; crie os buckets privados "termos" e "comprovantes" pelo painel.';
    return;
  end if;

  insert into storage.buckets (id, name, public) values ('termos', 'termos', false)
    on conflict (id) do update set public = false;
  insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', false)
    on conflict (id) do update set public = false;

  execute 'drop policy if exists "termos: liderança do grupo" on storage.objects';
  execute 'drop policy if exists "comprovantes: do meu grupo" on storage.objects';
  -- nomes das versões anteriores
  execute 'drop policy if exists "termos: só quem está logado lê" on storage.objects';
  execute 'drop policy if exists "termos: só quem está logado envia" on storage.objects';
  execute 'drop policy if exists "termos: só quem está logado troca" on storage.objects';
  execute 'drop policy if exists "termos: só quem está logado remove" on storage.objects';

  execute $p$create policy "termos: liderança do grupo"
    on storage.objects for all to authenticated
    using (
      bucket_id = 'termos'
      and public.e_lider()
      and public.posso_ver((storage.foldername(name))[1])
    )
    with check (
      bucket_id = 'termos'
      and public.e_lider()
      and public.posso_ver((storage.foldername(name))[1])
    )$p$;

  execute $p$create policy "comprovantes: do meu grupo"
    on storage.objects for all to authenticated
    using (
      bucket_id = 'comprovantes'
      and public.posso_ver((storage.foldername(name))[1])
    )
    with check (
      bucket_id = 'comprovantes'
      and public.posso_ver((storage.foldername(name))[1])
    )$p$;

exception when others then
  raise notice 'Nao consegui configurar os buckets (%). Crie "termos" e "comprovantes" como PRIVADOS pelo painel, em Storage.', sqlerrm;
end
$$;

-- ============================================================================
--  11. REALTIME
-- ============================================================================

do $$
declare
  tabela text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Realtime: publication nao encontrada. Ligue em Database -> Replication.';
    return;
  end if;

  foreach tabela in array array['vendas', 'vendedores', 'config'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime'
                     and schemaname = 'public' and tablename = tabela) then
      begin
        execute format('alter publication supabase_realtime add table public.%I', tabela);
      exception when others then
        raise notice 'Realtime: nao consegui adicionar "%" (%).', tabela, sqlerrm;
      end;
    end if;
  end loop;
end
$$;

-- ============================================================================
--  PRÓXIMOS PASSOS
-- ----------------------------------------------------------------------------
--  1. Authentication -> Sign In / Providers -> Email. São DOIS interruptores:
--       "Enable Email provider" -> deixe LIGADO   (desligar derruba o login)
--       "Confirm email"         -> deixe DESLIGADO
--     Sem isso ninguém cria senha, e o envio gratuito do Supabase é limitado
--     a 3 e-mails por hora.
--
--  2. Crie o seu usuário em Authentication -> Users -> Add user
--     (marque "Auto Confirm User") e vire dev, trocando o e-mail abaixo:
--
--     insert into public.perfis (id, nome, papel, grupo)
--     select id, 'Dev', 'dev', null from auth.users where email = 'voce@email.com'
--     on conflict (id) do update set papel = 'dev', grupo = null;
--
--  3. Defina os códigos de liderança dos dois grupos (troque as palavras):
--
--     select public.definir_codigo_de_lider('Alpha', 'trocar-este-codigo');
--     select public.definir_codigo_de_lider('Kombo', 'trocar-este-tambem');
--
--     A partir daí, cada líder cria a própria conta no app usando o código
--     do grupo dele. Você não precisa criar conta para ninguém.
-- ============================================================================
