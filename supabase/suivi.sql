-- Suivi de l'activité de Karniella (projet Supabase « karniella »).
--
-- Le site écrit dans `activite` avec la clé publique (js/suivi.js) : il peut
-- AJOUTER des lignes, jamais les lire, les modifier ni les effacer.
-- La page suivi.html lit les lignes par la fonction `tableau_suivi`, qui
-- demande le mot de passe du tableau de bord (haché dans `reglages`).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.activite (
    id          bigint generated always as identity primary key,
    appareil    text not null check (char_length(appareil) between 4 and 64),
    type        text not null check (type in ('visite', 'temps', 'quiz', 'question')),
    page        text check (char_length(page) <= 120),
    matiere     text check (char_length(matiere) <= 40),
    score       int  check (score between 0 and 1000),
    total       int  check (total between 0 and 1000),
    duree       int  check (duree between 0 and 86400),
    serie       text check (char_length(serie) <= 80),
    -- Quiz : une entrée par question, { q, r (sa réponse), b (la bonne), ok }.
    details     jsonb check (details is null or (jsonb_typeof(details) = 'array' and pg_column_size(details) < 30000)),
    date_client timestamptz,
    cree_le     timestamptz not null default now()
);

create index if not exists activite_cree_le on public.activite (cree_le desc);

alter table public.activite enable row level security;

drop policy if exists "le site ajoute" on public.activite;
create policy "le site ajoute" on public.activite
    for insert to anon, authenticated
    with check (true);

revoke all on public.activite from anon, authenticated;
grant insert (appareil, type, page, matiere, score, total, duree, serie, details, date_client)
    on public.activite to anon, authenticated;

-- Une seule ligne : le hachage du mot de passe du tableau de bord.
create table if not exists public.reglages (
    id            int primary key default 1 check (id = 1),
    mot_de_passe  text not null
);
alter table public.reglages enable row level security;
revoke all on public.reglages from anon, authenticated;

-- Lecture pour le tableau de bord : les 120 derniers jours, si le mot de passe est bon.
create or replace function public.tableau_suivi(mdp text)
returns setof public.activite
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
    if not exists (
        select 1 from public.reglages r
        where r.mot_de_passe = extensions.crypt(mdp, r.mot_de_passe)
    ) then
        perform pg_sleep(1);   -- freine qui essaierait de deviner le mot de passe
        raise exception 'mot de passe incorrect' using errcode = '28P01';
    end if;
    return query
        select * from public.activite a
        where a.cree_le > now() - interval '120 days'
        order by a.cree_le desc
        limit 20000;
end;
$$;

revoke all on function public.tableau_suivi(text) from public;
grant execute on function public.tableau_suivi(text) to anon, authenticated;

-- Pour poser ou changer le mot de passe (à lancer dans l'éditeur SQL) :
-- insert into public.reglages (id, mot_de_passe)
-- values (1, extensions.crypt('NOUVEAU-MOT-DE-PASSE', extensions.gen_salt('bf', 10)))
-- on conflict (id) do update set mot_de_passe = excluded.mot_de_passe;
