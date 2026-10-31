-- Leçons saisies par tonton sur saisie.html (projet Supabase « karniella »).
--
-- À lancer une fois dans l'éditeur SQL, après supabase/suivi.sql : le mot de
-- passe est celui du tableau de bord (table `reglages`).
--
-- - Le site LIT les leçons visibles avec la clé publique (js/lecons-saisies.js).
-- - Ajouter, modifier, effacer : seulement par les fonctions ci-dessous, qui
--   demandent le mot de passe.

create table if not exists public.lecon_saisie (
    id          bigint generated always as identity primary key,
    matiere     text not null check (char_length(matiere) between 1 and 40),
    titre       text not null check (char_length(btrim(titre)) between 1 and 200),
    contenu     text not null check (char_length(contenu) <= 60000),
    visible     boolean not null default true,
    cree_le     timestamptz not null default now(),
    modifie_le  timestamptz not null default now()
);

create index if not exists lecon_saisie_matiere on public.lecon_saisie (matiere, cree_le);

alter table public.lecon_saisie enable row level security;

revoke all on public.lecon_saisie from anon, authenticated;
grant select on public.lecon_saisie to anon, authenticated;

drop policy if exists "le site lit les leçons visibles" on public.lecon_saisie;
create policy "le site lit les leçons visibles" on public.lecon_saisie
    for select to anon, authenticated
    using (visible);

-- Vérifie le mot de passe. Réservée aux fonctions ci-dessous.
create or replace function public.verifier_mdp_tonton(mdp text)
returns void
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
end;
$$;

revoke all on function public.verifier_mdp_tonton(text) from public, anon, authenticated;

-- Toutes les leçons, même cachées : la liste de saisie.html.
create or replace function public.lecons_de_tonton(mdp text)
returns setof public.lecon_saisie
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
    perform public.verifier_mdp_tonton(mdp);
    return query
        select * from public.lecon_saisie l
        order by l.modifie_le desc;
end;
$$;

-- Ajoute une leçon (p_id vide) ou la modifie (p_id donné).
create or replace function public.enregistrer_lecon(
    mdp text, p_id bigint, p_matiere text, p_titre text, p_contenu text, p_visible boolean
)
returns public.lecon_saisie
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    resultat public.lecon_saisie;
begin
    perform public.verifier_mdp_tonton(mdp);
    if p_id is null then
        insert into public.lecon_saisie (matiere, titre, contenu, visible)
        values (p_matiere, btrim(p_titre), p_contenu, coalesce(p_visible, true))
        returning * into resultat;
    else
        update public.lecon_saisie
        set matiere = p_matiere, titre = btrim(p_titre), contenu = p_contenu,
            visible = coalesce(p_visible, true), modifie_le = now()
        where id = p_id
        returning * into resultat;
        if resultat.id is null then
            raise exception 'leçon introuvable';   -- supprimée entre-temps
        end if;
    end if;
    return resultat;
end;
$$;

create or replace function public.supprimer_lecon(mdp text, p_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
    perform public.verifier_mdp_tonton(mdp);
    delete from public.lecon_saisie where id = p_id;
end;
$$;

revoke all on function public.lecons_de_tonton(text) from public;
revoke all on function public.enregistrer_lecon(text, bigint, text, text, text, boolean) from public;
revoke all on function public.supprimer_lecon(text, bigint) from public;
grant execute on function public.lecons_de_tonton(text) to anon, authenticated;
grant execute on function public.enregistrer_lecon(text, bigint, text, text, text, boolean) to anon, authenticated;
grant execute on function public.supprimer_lecon(text, bigint) to anon, authenticated;
