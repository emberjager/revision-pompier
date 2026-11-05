-- Révisions Sapeur-Pompier : tables Supabase
-- À coller dans Supabase > SQL Editor > New query, puis « Run ».
-- Chaque utilisateur ne peut lire et modifier que ses propres données (Row Level Security).

-- Profil : pseudo affiché (servira au futur classement du CIS)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text,
  created_at timestamptz not null default now()
);

-- Progression : objectif, thèmes, résultats QCM, cartes, cas pratiques
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "profil: lire le sien" on public.profiles;
drop policy if exists "profil: créer le sien" on public.profiles;
drop policy if exists "profil: modifier le sien" on public.profiles;
create policy "profil: lire le sien" on public.profiles for select using (auth.uid() = id);
create policy "profil: créer le sien" on public.profiles for insert with check (auth.uid() = id);
create policy "profil: modifier le sien" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "progression: lire la sienne" on public.progress;
drop policy if exists "progression: créer la sienne" on public.progress;
drop policy if exists "progression: modifier la sienne" on public.progress;
create policy "progression: lire la sienne" on public.progress for select using (auth.uid() = user_id);
create policy "progression: créer la sienne" on public.progress for insert with check (auth.uid() = user_id);
create policy "progression: modifier la sienne" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
