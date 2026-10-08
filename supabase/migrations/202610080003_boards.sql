-- 私密创作画布与图片。浏览器无表、RPC 或 Storage 直连权限。
begin;
do $$begin
 if to_regclass('public.garden_boards') is not null or to_regclass('public.garden_board_assets') is not null or exists(select 1 from storage.buckets where id='garden-board-assets') then
  raise exception 'BOARD_MIGRATION_ALREADY_EXISTS: existing data preserved';
 end if;
end $$;
create function public.garden_valid_board(value jsonb) returns boolean
language plpgsql immutable set search_path=public as $$
declare item jsonb;p jsonb;field_key text;ids text[]:='{}';
begin
 if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>524288 then return false;end if;
 if (select count(*) from jsonb_object_keys(value))<>5 or exists(select 1 from jsonb_object_keys(value) k where k not in ('schema','width','height','background','nodes')) then return false;end if;
 if value->'schema' is distinct from '1'::jsonb or jsonb_typeof(value->'nodes') is distinct from 'array' or jsonb_typeof(value->'background') is distinct from 'string' or value->>'background' !~* '^#[a-f0-9]{6}$' then return false;end if;
 foreach field_key in array array['width','height'] loop
  if jsonb_typeof(value->field_key) is distinct from 'number' or (value->>field_key)::numeric not between 200 and 4096 then return false;end if;
 end loop;
 if jsonb_array_length(value->'nodes')>100 then return false;end if;
 for item in select * from jsonb_array_elements(value->'nodes') loop
  if jsonb_typeof(item) is distinct from 'object' then return false;end if;
  if (select count(*) from jsonb_object_keys(item))<>13 or exists(select 1 from jsonb_object_keys(item) k where k not in ('id','kind','x','y','width','height','rotation','fill','color','fontSize','text','assetId','points')) then return false;end if;
  if jsonb_typeof(item->'id') is distinct from 'string' or item->>'id' !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' or item->>'id'=any(ids) then return false;end if;
  ids:=array_append(ids,item->>'id');
  if jsonb_typeof(item->'kind') is distinct from 'string' or item->>'kind' not in ('text','note','image','rect','ellipse','stroke') then return false;end if;
  foreach field_key in array array['x','y','width','height','rotation','fontSize'] loop
   if jsonb_typeof(item->field_key) is distinct from 'number' then return false;end if;
  end loop;
  if (item->>'x')::numeric not between -4096 and 4096 or (item->>'y')::numeric not between -4096 and 4096 or (item->>'width')::numeric not between 1 and 4096 or (item->>'height')::numeric not between 1 and 4096 or (item->>'rotation')::numeric not between -180 and 180 or (item->>'fontSize')::numeric not between 8 and 120 then return false;end if;
  if jsonb_typeof(item->'fill') is distinct from 'string' or (item->>'fill'<>'transparent' and item->>'fill' !~* '^#[a-f0-9]{6}$') or jsonb_typeof(item->'color') is distinct from 'string' or item->>'color' !~* '^#[a-f0-9]{6}$' or jsonb_typeof(item->'text') is distinct from 'string' or char_length(item->>'text')>4000 then return false;end if;
  if item->>'kind'='image' then
   if jsonb_typeof(item->'assetId') is distinct from 'string' or item->>'assetId' !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then return false;end if;
  elsif item->'assetId' is distinct from 'null'::jsonb then return false;end if;
  if jsonb_typeof(item->'points') is distinct from 'array' then return false;end if;
  if jsonb_array_length(item->'points')>2000 or (item->>'kind'='stroke' and jsonb_array_length(item->'points')<2) or (item->>'kind'<>'stroke' and jsonb_array_length(item->'points')<>0) then return false;end if;
  for p in select * from jsonb_array_elements(item->'points') loop
   if jsonb_typeof(p) is distinct from 'array' then return false;end if;
   if jsonb_array_length(p)<>2 or jsonb_typeof(p->0) is distinct from 'number' or jsonb_typeof(p->1) is distinct from 'number' or (p->>0)::numeric not between -4096 and 4096 or (p->>1)::numeric not between -4096 and 4096 then return false;end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
create table public.garden_board_assets(
 id uuid primary key,user_id uuid not null references public.members(id) on delete cascade,
 mime text not null check(mime in ('image/png','image/jpeg','image/webp')),
 size integer not null check(size between 1 and 3145728),deleting boolean not null default false,
 created_at timestamptz not null default now()
);
create index garden_board_assets_owner on public.garden_board_assets(user_id);
create table public.garden_boards(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.members(id) on delete cascade,
 title text not null check(title=btrim(title) and char_length(title) between 1 and 80),
 document jsonb not null check(public.garden_valid_board(document)),version integer not null default 0 check(version>=0),
 updated_at timestamptz not null default now()
);
create index garden_boards_owner on public.garden_boards(user_id);
create index garden_boards_latest on public.garden_boards(updated_at desc,id desc);
-- 保存与图片删除共用事务锁，避免检查引用后被另一请求重新引用。
create function public.garden_board_guard() returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(71420805);
 if tg_op='INSERT' and (select count(*) from public.garden_boards where user_id=new.user_id)>=10 then raise exception 'BOARD_QUOTA';end if;
 if exists(select 1 from (select distinct (n->>'assetId')::uuid as id from jsonb_array_elements(new.document->'nodes') n where n->>'kind'='image') wanted left join public.garden_board_assets a on a.id=wanted.id where a.id is null or a.deleting) then raise exception 'BOARD_ASSET_INVALID';end if;
 return new;
end $$;
create trigger garden_board_guard before insert or update on public.garden_boards for each row execute function public.garden_board_guard();
create function public.garden_create_board(p_user uuid,p_title text,p_document jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 insert into public.garden_boards(user_id,title,document) values(p_user,p_title,p_document) returning to_jsonb(garden_boards.*) into result;return result;
exception when raise_exception then if sqlerrm='BOARD_QUOTA' then return null;end if;raise;
end $$;
create function public.garden_update_board(p_id uuid,p_version integer,p_title text,p_document jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 -- 先获取同一个锁，再获取行锁，保持与图片删除一致的锁顺序。
 perform pg_advisory_xact_lock(71420805);
 update public.garden_boards set title=p_title,document=p_document,version=version+1,updated_at=now() where id=p_id and version=p_version returning to_jsonb(garden_boards.*) into result;return result;
end $$;
create function public.garden_reserve_board_asset(p_id uuid,p_user uuid,p_mime text,p_size integer) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,71420806));
 if (select count(*)>=20 or coalesce(sum(size),0)+p_size>31457280 from public.garden_board_assets where user_id=p_user) then return false;end if;
 insert into public.garden_board_assets(id,user_id,mime,size) values(p_id,p_user,p_mime,p_size);return true;
end $$;
create function public.garden_mark_board_asset_deleting(p_id uuid,p_user uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(71420805);
 if exists(select 1 from public.garden_boards b cross join lateral jsonb_array_elements(b.document->'nodes') n where n->>'kind'='image' and (n->>'assetId')::uuid=p_id) then return false;end if;
 update public.garden_board_assets set deleting=true where id=p_id and user_id=p_user;return found;
end $$;
alter table public.garden_boards enable row level security;
alter table public.garden_board_assets enable row level security;
revoke all on public.garden_boards,public.garden_board_assets from public,anon,authenticated;
grant select,insert,update,delete on public.garden_boards,public.garden_board_assets to service_role;
revoke all on function public.garden_valid_board(jsonb),public.garden_board_guard(),public.garden_create_board(uuid,text,jsonb),public.garden_update_board(uuid,integer,text,jsonb),public.garden_reserve_board_asset(uuid,uuid,text,integer),public.garden_mark_board_asset_deleting(uuid,uuid) from public,anon,authenticated;
grant execute on function public.garden_valid_board(jsonb),public.garden_board_guard(),public.garden_create_board(uuid,text,jsonb),public.garden_update_board(uuid,integer,text,jsonb),public.garden_reserve_board_asset(uuid,uuid,text,integer),public.garden_mark_board_asset_deleting(uuid,uuid) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('garden-board-assets','garden-board-assets',false,3145728,array['image/png','image/jpeg','image/webp']);
-- 未添加 storage.objects 的 anon/authenticated 策略，只有后端 service_role 可操作。
commit;

