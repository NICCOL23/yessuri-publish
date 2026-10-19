-- Dedicated YESSURI project only. No customer sample data.
begin;

create schema if not exists board_private;
revoke all on schema board_private from public, anon, authenticated;
grant usage on schema board_private to service_role;

create table if not exists public.board_questions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  nickname text not null check (char_length(nickname) between 1 and 30),
  district text not null check (district in ('중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군')),
  group_id text not null check (group_id in ('general','electric','water','life','computer','unknown')),
  work_id text,
  title text not null check (char_length(title) between 2 and 120),
  body text not null check (char_length(body) between 10 and 10000),
  state text not null default 'pending' check (state in ('pending','published','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.board_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  role_label text not null default '답변 담당자',
  experience text,
  active boolean not null default true
);

create table if not exists public.board_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.board_questions(id) on delete cascade,
  author_id uuid not null references public.board_admins(user_id),
  body text not null check (char_length(body) between 1 and 15000),
  related_work_id text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_photos (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.board_questions(id) on delete cascade,
  storage_path text not null unique,
  position smallint not null check (position between 0 and 2),
  content_type text not null check (content_type in ('image/jpeg','image/png')),
  bytes integer not null check (bytes between 1 and 2097152),
  created_at timestamptz not null default now(),
  unique(question_id, position)
);

create table if not exists public.board_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.board_questions(id) on delete cascade,
  reason text not null check (reason in ('spam','privacy','abuse','other')),
  note text not null default '' check (char_length(note) <= 1000),
  state text not null default 'open' check (state in ('open','reviewed')),
  created_at timestamptz not null default now()
);

create table if not exists board_private.credentials (
  question_id uuid primary key references public.board_questions(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists board_private.edit_sessions (
  token_hash text primary key,
  question_id uuid not null references public.board_questions(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists board_private.rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
create table if not exists board_private.audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  question_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);

-- No direct browser access, including for authenticated administrators.
-- All operations must pass through the server endpoint and its checks.
alter table public.board_questions enable row level security;
alter table public.board_admins enable row level security;
alter table public.board_answers enable row level security;
alter table public.board_photos enable row level security;
alter table public.board_reports enable row level security;
alter table board_private.credentials enable row level security;
alter table board_private.edit_sessions enable row level security;
alter table board_private.rate_limits enable row level security;
alter table board_private.audit enable row level security;

revoke all on public.board_questions, public.board_admins, public.board_answers,
  public.board_photos, public.board_reports from public, anon, authenticated;
revoke all on all tables in schema board_private from public, anon, authenticated;
grant all on public.board_questions, public.board_admins, public.board_answers,
  public.board_photos, public.board_reports to service_role;
grant all on all tables in schema board_private to service_role;
grant usage, select on all sequences in schema board_private to service_role;

create index if not exists board_questions_feed on public.board_questions(created_at desc, id desc) where state = 'published';
create index if not exists board_questions_group on public.board_questions(group_id, created_at desc) where state = 'published';
create index if not exists board_answers_question on public.board_answers(question_id) where published;
create index if not exists board_reports_pending on public.board_reports(created_at) where state = 'open';
create index if not exists board_sessions_expiry on board_private.edit_sessions(expires_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-photos', 'board-photos', false, 2097152, array['image/jpeg','image/png'])
on conflict (id) do nothing;

commit;
