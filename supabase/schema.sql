-- Run once in a new dedicated Supabase project. No player data is seeded here.
create table public.league_admins (
 user_id uuid primary key references auth.users(id),
 email text not null unique,
 role text not null check (role in ('owner','admin')),
 active boolean not null default true,
 invited_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create unique index one_league_owner on public.league_admins (role) where role='owner';
create table public.league_state (
 id integer primary key check(id=1),
 data jsonb not null,
 version integer not null default 1,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
create table public.league_changes (
 id bigint generated always as identity primary key,
 actor uuid not null references auth.users(id),
 version integer not null,
 operation text not null,
 changed_at timestamptz not null default now()
);
alter table public.league_admins enable row level security;
alter table public.league_state enable row level security;
alter table public.league_changes enable row level security;
-- All application data is accessed through verified server routes.
revoke all on public.league_admins,public.league_state,public.league_changes from anon,authenticated;
grant all on public.league_admins,public.league_state,public.league_changes to service_role;
grant usage,select on sequence public.league_changes_id_seq to service_role;
create function public.save_league(p_actor uuid,p_version integer,p_data jsonb,p_import boolean default false)
returns integer language plpgsql security invoker set search_path=public as $$
declare next_version integer; member_role text;
begin
 select role into member_role from league_admins where user_id=p_actor and active=true;
 if member_role is null then raise exception 'Administrator access required'; end if;
 if p_import and member_role <> 'owner' then raise exception 'Owner access required'; end if;
 update league_state set data=p_data,version=version+1,updated_by=p_actor,updated_at=now()
 where id=1 and version=p_version and (not p_import or (jsonb_array_length(data->'players')=0 and jsonb_array_length(data->'rounds')=0))
 returning version into next_version;
 if next_version is not null then
  insert into league_changes(actor,version,operation) values(p_actor,next_version,case when p_import then 'import' else 'save' end);
 end if;
 return next_version;
end;
$$;
revoke all on function public.save_league(uuid,integer,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_league(uuid,integer,jsonb,boolean) to service_role;
