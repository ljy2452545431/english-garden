-- 首次在新 Supabase 项目的 SQL Editor 执行。账号密码仅由 Auth 管理。
create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40)
);
create function public.garden_member_limit() returns trigger language plpgsql set search_path=public as $$
begin
  perform pg_advisory_xact_lock(71420801);
  if (select count(*) from public.members)>=2 then raise exception '最多两个成员'; end if;
  return new;
end $$;
create trigger garden_two_members before insert on public.members for each row execute function public.garden_member_limit();
create table public.states (
  user_id uuid primary key references public.members(id) on delete cascade,
  version bigint not null default 0 check(version>=0),
  body jsonb not null default '{}' check(jsonb_typeof(body)='object' and octet_length(body::text)<=1048576)
);
create function public.garden_init_state() returns trigger language plpgsql set search_path=public as $$
begin insert into public.states(user_id) values(new.id); return new;end $$;
create trigger garden_init_state after insert on public.members for each row execute function public.garden_init_state();
create table public.messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.members(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create table public.recordings (
  id uuid primary key,
  user_id uuid not null references public.members(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 80),
  mime text not null check(mime in ('audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/aac')),
  size integer not null check(size between 1 and 5242880),
  shared boolean not null default false,
  created_at timestamptz not null default now()
);
create index recordings_owner on public.recordings(user_id);
create index messages_latest on public.messages(id desc);
create table public.garden_limits(key text primary key,window_start timestamptz not null,hits integer not null);
create table public.garden_ai_leases(id uuid primary key,user_id uuid not null references public.members(id),expires_at timestamptz not null);
create table public.garden_revoked_sessions(token_hash text primary key,expires_at timestamptz not null);

alter table public.members enable row level security;
alter table public.states enable row level security;
alter table public.messages enable row level security;
alter table public.recordings enable row level security;
alter table public.garden_limits enable row level security;
alter table public.garden_ai_leases enable row level security;
alter table public.garden_revoked_sessions enable row level security;
-- 全部数据仅通过 garden API 读取：Auth 登出不立刻使旧 JWT 失效，
-- 直接 authenticated 读取会绕过 garden_revoked_sessions 的撤销校验。
-- RLS 启用且无 anon/authenticated 策略，同时移除直接表权限。
revoke all on public.members,public.states,public.messages,public.recordings,public.garden_limits,public.garden_ai_leases,public.garden_revoked_sessions from anon,authenticated;
grant all on public.members,public.states,public.messages,public.recordings,public.garden_limits,public.garden_ai_leases,public.garden_revoked_sessions to service_role;
grant usage,select on sequence public.messages_id_seq to service_role;

create function public.garden_save_state(p_user uuid,p_version bigint,p_state jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if p_version<0 or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>1048576 then raise exception 'STATE_INVALID';end if;
 update public.states set body=p_state,version=version+1 where user_id=p_user and version=p_version returning jsonb_build_object('version',version,'state',body) into result;
 return result;
end $$;
create function public.garden_space_users() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'displayName',m.display_name,'state',jsonb_build_object('completed',case when jsonb_typeof(s.body->'completed')='array' then s.body->'completed' else '[]'::jsonb end)) order by m.id),'[]'::jsonb) from public.members m join public.states s on m.id=s.user_id;
$$;
create function public.garden_take_limit(p_key text,p_max integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$
declare count_now integer;time_now timestamptz:=clock_timestamp();
begin
 delete from public.garden_limits where window_start<time_now-interval '2 days';
 insert into public.garden_limits values(p_key,time_now,1)
 on conflict(key) do update set hits=case when garden_limits.window_start<=time_now-make_interval(secs=>p_seconds) then 1 else garden_limits.hits+1 end,
 window_start=case when garden_limits.window_start<=time_now-make_interval(secs=>p_seconds) then time_now else garden_limits.window_start end returning hits into count_now;
 return count_now<=p_max;
end $$;
create function public.garden_acquire_ai(p_user uuid,p_lease uuid) returns text language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(71420802);
 if not exists(select 1 from public.members where id=p_user) then return 'forbidden';end if;
 if not public.garden_take_limit('ai:'||p_user::text,3,60) then return 'rate';end if;
 delete from public.garden_ai_leases where expires_at<=clock_timestamp();
 if (select count(*) from public.garden_ai_leases)>=2 then return 'busy';end if;
 insert into public.garden_ai_leases values(p_lease,p_user,clock_timestamp()+interval '45 seconds');
 return 'ok';
end $$;
create function public.garden_reserve_recording(p_id uuid,p_user uuid,p_title text,p_mime text,p_size integer,p_shared boolean) returns boolean language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,71420803));
 if (select count(*) from public.recordings where user_id=p_user)>=20 then return false;end if;
 insert into public.recordings(id,user_id,title,mime,size,shared) values(p_id,p_user,p_title,p_mime,p_size,p_shared);return true;
end $$;
revoke all on function public.garden_save_state(uuid,bigint,jsonb),public.garden_space_users(),public.garden_take_limit(text,integer,integer),public.garden_acquire_ai(uuid,uuid),public.garden_reserve_recording(uuid,uuid,text,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.garden_save_state(uuid,bigint,jsonb),public.garden_space_users(),public.garden_take_limit(text,integer,integer),public.garden_acquire_ai(uuid,uuid),public.garden_reserve_recording(uuid,uuid,text,text,integer,boolean) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('garden-recordings','garden-recordings',false,5242880,array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/aac']);
-- 不添加 storage.objects 的 anon/authenticated 策略：只有 garden 服务端 service_role 可以访问该私有桶。
