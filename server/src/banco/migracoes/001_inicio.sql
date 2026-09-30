-- Primeira versão do banco do CROMA.
-- Cada tabela tem colunas legíveis (para abrir num programa de banco e
-- entender) e a coluna `dados` com o objeto completo que o servidor usa.
-- O servidor guarda só o que mudou desde a última gravação.

-- configurações soltas do servidor (próximos ids, chave do mestre, cena ao vivo...)
create table config (
  chave text primary key,
  valor jsonb not null
);

-- campanha = grupo de cenas ligadas; o id é o menor id de cena do grupo
create table campanhas (
  id integer primary key,
  titulo text not null,
  subtitulo text not null default '',
  dados jsonb not null
);

-- registro de ações de cada campanha (as últimas 60)
create table registro (
  id text primary key,
  campanha_id integer not null references campanhas (id) on delete cascade,
  em timestamptz not null,
  icone text not null,
  texto text not null,
  dados jsonb not null
);
create index registro_campanha on registro (campanha_id, em);

-- cenas (cômodos): planta, porta, clima
create table cenas (
  id integer primary key,
  nome text not null,
  andar text,
  descricao text not null default '',
  dados jsonb not null
);

-- mobis de chão
create table mobis (
  id integer primary key,
  cena_id integer not null references cenas (id) on delete cascade,
  ordem integer not null,
  tipo text not null,
  x integer not null,
  y integer not null,
  dados jsonb not null
);
create index mobis_cena on mobis (cena_id, ordem);

-- mobis de parede
create table mobis_parede (
  id integer primary key,
  cena_id integer not null references cenas (id) on delete cascade,
  ordem integer not null,
  tipo text not null,
  dados jsonb not null
);
create index mobis_parede_cena on mobis_parede (cena_id, ordem);

-- peças (personagens) no tabuleiro
create table pecas (
  id integer primary key,
  cena_id integer not null references cenas (id) on delete cascade,
  ordem integer not null,
  nome text not null,
  dados jsonb not null
);
create index pecas_cena on pecas (cena_id, ordem);

-- personagens (folhas de sprite e retratos)
create table personagens (
  id integer primary key,
  ordem integer not null,
  nome text not null,
  dados jsonb not null
);

-- quem já entrou (nome, aparência)
create table usuarios (
  nome text primary key,
  dados jsonb not null
);

-- fichas de personagem (as escolhas; os números saem do motor de regras)
create table fichas (
  id integer primary key,
  nome text not null,
  campanha_id integer,
  personagem_id integer,
  nex integer not null,
  classe text,
  criada_em timestamptz not null,
  atualizada_em timestamptz not null,
  dados jsonb not null
);
