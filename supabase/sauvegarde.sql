-- Sauvegarde en ligne de Karniella (projet Supabase « karniella »).
--
-- À lancer une fois dans l'éditeur SQL de Supabase, APRÈS supabase/suivi.sql
-- (il réutilise le mot de passe du tableau de bord, table `reglages`).
--
-- Une seule ligne garde tout ce qui doit survivre à un changement d'appareil :
-- XP, achats et récompenses actives, progression (scores, records, erreurs,
-- jours de révision, leçons lues), badges et interros. js/sauvegarde.js la lit
-- et l'écrit avec le CODE DE SAUVEGARDE, que tonton choisit sur suivi.html.
-- La clé publique du site ne lit rien sans ce code.
--
-- Chaque écriture donne la version qu'elle a lue : si un autre appareil a
-- écrit entre-temps, la base refuse et renvoie l'état à jour. L'appareil
-- fusionne les deux et réessaie : rien ne se perd.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sauvegarde (
    id          int primary key default 1 check (id = 1),
    code        text,                                   -- hachage bcrypt du code
    etat        jsonb not null default '{}'::jsonb,
    version     bigint not null default 0,
    appareil    text,                                   -- le dernier qui a écrit
    modifie_le  timestamptz
);

alter table public.sauvegarde enable row level security;
revoke all on public.sauvegarde from anon, authenticated;
insert into public.sauvegarde (id) values (1) on conflict (id) do nothing;

-- Le code est-il le bon ? (usage interne, pas ouvert à la clé publique)
create or replace function public.sauvegarde_code_ok(code_saisi text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.sauvegarde s
        where s.id = 1 and s.code is not null and code_saisi is not null
          and s.code = extensions.crypt(code_saisi, s.code)
    );
$$;
revoke all on function public.sauvegarde_code_ok(text) from public, anon, authenticated;

-- Le mot de passe du tableau de bord est-il le bon ? (usage interne)
create or replace function public.sauvegarde_mdp_ok(mdp text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.reglages r
        where mdp is not null and r.mot_de_passe = extensions.crypt(mdp, r.mot_de_passe)
    );
$$;
revoke all on function public.sauvegarde_mdp_ok(text) from public, anon, authenticated;

-- Lire la sauvegarde. Mauvais code : { ok: false } après une seconde.
create or replace function public.sauvegarde_lire(code_saisi text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    s public.sauvegarde%rowtype;
begin
    if not public.sauvegarde_code_ok(code_saisi) then
        perform pg_sleep(1);   -- freine qui essaierait de deviner le code
        return jsonb_build_object('ok', false);
    end if;
    select * into s from public.sauvegarde where id = 1;
    return jsonb_build_object('ok', true, 'etat', s.etat, 'version', s.version, 'modifie_le', s.modifie_le);
end;
$$;
revoke all on function public.sauvegarde_lire(text) from public;
grant execute on function public.sauvegarde_lire(text) to anon, authenticated;

-- Écrire la sauvegarde, si personne n'a écrit depuis la version lue.
-- Sinon : { ok: false, conflit: true, etat, version } pour fusionner et réessayer.
create or replace function public.sauvegarde_ecrire(code_saisi text, etat_envoye jsonb, version_lue bigint, appareil_envoyeur text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    s public.sauvegarde%rowtype;
begin
    if not public.sauvegarde_code_ok(code_saisi) then
        perform pg_sleep(1);
        return jsonb_build_object('ok', false);
    end if;
    if etat_envoye is null or jsonb_typeof(etat_envoye) <> 'object' or pg_column_size(etat_envoye) > 2000000 then
        return jsonb_build_object('ok', false, 'erreur', 'etat');
    end if;
    select * into s from public.sauvegarde where id = 1 for update;
    if s.version is distinct from version_lue then
        return jsonb_build_object('ok', false, 'conflit', true, 'etat', s.etat, 'version', s.version);
    end if;
    update public.sauvegarde
       set etat = etat_envoye,
           version = s.version + 1,
           appareil = left(appareil_envoyeur, 64),
           modifie_le = now()
     where id = 1;
    return jsonb_build_object('ok', true, 'version', s.version + 1);
end;
$$;
revoke all on function public.sauvegarde_ecrire(text, jsonb, bigint, text) from public;
grant execute on function public.sauvegarde_ecrire(text, jsonb, bigint, text) to anon, authenticated;

-- Pour suivi.html : la sauvegarde, avec le mot de passe du tableau de bord.
create or replace function public.sauvegarde_suivi(mdp text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    s public.sauvegarde%rowtype;
begin
    if not public.sauvegarde_mdp_ok(mdp) then
        perform pg_sleep(1);
        raise exception 'mot de passe incorrect' using errcode = '28P01';
    end if;
    select * into s from public.sauvegarde where id = 1;
    return jsonb_build_object(
        'code_pose', s.code is not null,
        'etat', s.etat, 'version', s.version,
        'appareil', s.appareil, 'modifie_le', s.modifie_le
    );
end;
$$;
revoke all on function public.sauvegarde_suivi(text) from public;
grant execute on function public.sauvegarde_suivi(text) to anon, authenticated;

-- Pour suivi.html : poser ou changer le code de sauvegarde (8 à 64 caractères).
-- Les appareils reliés avec l'ancien code devront rouvrir le nouveau lien.
create or replace function public.sauvegarde_definir_code(mdp text, nouveau_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
    if not public.sauvegarde_mdp_ok(mdp) then
        perform pg_sleep(1);
        raise exception 'mot de passe incorrect' using errcode = '28P01';
    end if;
    if nouveau_code is null or char_length(nouveau_code) not between 8 and 64 then
        raise exception 'code de 8 à 64 caractères' using errcode = '22023';
    end if;
    update public.sauvegarde
       set code = extensions.crypt(nouveau_code, extensions.gen_salt('bf', 10))
     where id = 1;
    return true;
end;
$$;
revoke all on function public.sauvegarde_definir_code(text, text) from public;
grant execute on function public.sauvegarde_definir_code(text, text) to anon, authenticated;
