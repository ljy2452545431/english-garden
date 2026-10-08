-- 已应用初次迁移的实例补丁：UUID 引用按类型比较，覆盖大小写。
begin;
create or replace function public.garden_mark_board_asset_deleting(p_id uuid,p_user uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(71420805);
 if exists(select 1 from public.garden_boards b cross join lateral jsonb_array_elements(b.document->'nodes') n where n->>'kind'='image' and (n->>'assetId')::uuid=p_id) then return false;end if;
 update public.garden_board_assets set deleting=true where id=p_id and user_id=p_user;return found;
end $$;
commit;
