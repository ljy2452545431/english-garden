-- 共享外观独立于学习记录。浏览器只能走 garden API，不能绕过退出撤销校验。
create function public.garden_valid_appearance(value jsonb) returns boolean
language plpgsql immutable set search_path=public as $$
declare choices jsonb := '{"theme":["garden","cream","rose","ocean","night"],"density":["comfortable","compact"],"font":["normal","large"],"motion":["full","low","none"],"card":["soft","outlined","flat"],"texture":["plain","dots","grid"],"corners":["rounded","square"],"accent":["theme","ink","berry","blue","forest"],"layout":["balanced","focus"]}';
 key text;allowed jsonb;item jsonb;ids text[] := '{}';
begin
 if value is null or jsonb_typeof(value)<>'object' or octet_length(value::text)>4096 then return false;end if;
 for key in select jsonb_object_keys(value) loop
  if not choices ? key and key not in ('order','hidden','decorations') then return false;end if;
 end loop;
 for key,allowed in select * from jsonb_each(choices) loop
  if jsonb_typeof(value->key) is distinct from 'string' or not allowed ? (value->>key) then return false;end if;
 end loop;
 if jsonb_typeof(value->'order') is distinct from 'array' or jsonb_typeof(value->'hidden') is distinct from 'array' then return false;end if;
 if jsonb_array_length(value->'order')<>4 or jsonb_array_length(value->'hidden')>3 then return false;end if;
 if (select count(distinct v) from jsonb_array_elements(value->'order') v)<>4 or
    exists(select 1 from jsonb_array_elements(value->'order') v where v not in ('"tasks"'::jsonb,'"timer"'::jsonb,'"growth"'::jsonb,'"note"'::jsonb)) then return false;end if;
 if (select count(distinct v) from jsonb_array_elements(value->'hidden') v)<>jsonb_array_length(value->'hidden') or
    exists(select 1 from jsonb_array_elements(value->'hidden') v where v not in ('"timer"'::jsonb,'"growth"'::jsonb,'"note"'::jsonb)) then return false;end if;
 if value ? 'decorations' then
  if jsonb_typeof(value->'decorations')<>'array' then return false;end if;
  if jsonb_array_length(value->'decorations')>8 then return false;end if;
  for item in select * from jsonb_array_elements(value->'decorations') loop
   if jsonb_typeof(item)<>'object' then return false;end if;
   if (select count(*) from jsonb_object_keys(item))<>5 or exists(select 1 from jsonb_object_keys(item) k where k not in ('id','kind','x','y','rotation')) then return false;end if;
   if jsonb_typeof(item->'id') is distinct from 'string' or (item->>'id') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' or (item->>'id')=any(ids) then return false;end if;
   ids := array_append(ids,item->>'id');
   if jsonb_typeof(item->'kind') is distinct from 'string' or item->>'kind' not in ('leaf','sun','heart','book') then return false;end if;
   if jsonb_typeof(item->'x') is distinct from 'number' or jsonb_typeof(item->'y') is distinct from 'number' or jsonb_typeof(item->'rotation') is distinct from 'number' then return false;end if;
   if (item->>'x')::numeric not between 0 and 1 or (item->>'y')::numeric not between 0 and 1 or (item->>'rotation')::numeric not between -30 and 30 then return false;end if;
  end loop;
 end if;
 return true;
end $$;

create table public.garden_looks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.members(id) on delete cascade,
 name text not null check(name=btrim(name) and char_length(name) between 1 and 24),
 appearance jsonb not null check(public.garden_valid_appearance(appearance)),
 created_at timestamptz not null default now()
);
create index garden_looks_owner on public.garden_looks(user_id);
create index garden_looks_latest on public.garden_looks(created_at desc,id desc);
-- 同一作者锁覆盖插入和计数，跨 Edge 实例同时保存也不能越过 6 套。
create function public.garden_look_quota() returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,71420804));
 if (select count(*) from public.garden_looks where user_id=new.user_id)>=6 then raise exception 'LOOK_QUOTA';end if;
 return new;
end $$;
create trigger garden_look_quota before insert on public.garden_looks for each row execute function public.garden_look_quota();
create function public.garden_create_look(p_user uuid,p_name text,p_appearance jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 insert into public.garden_looks(user_id,name,appearance) values(p_user,p_name,p_appearance) returning to_jsonb(garden_looks.*) into result;
 return result;
exception when raise_exception then
 if sqlerrm='LOOK_QUOTA' then return null;end if;
 raise;
end $$;
alter table public.garden_looks enable row level security;
revoke all on public.garden_looks from public,anon,authenticated;
grant select,insert,delete on public.garden_looks to service_role;
revoke all on function public.garden_valid_appearance(jsonb),public.garden_look_quota(),public.garden_create_look(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.garden_valid_appearance(jsonb),public.garden_look_quota(),public.garden_create_look(uuid,text,jsonb) to service_role;
