-- 在现有真实双人成员上进行低频契约检查。所有测试数据最终回滚。
begin;
do $$
declare member_id uuid;asset_id uuid:=gen_random_uuid();board_id uuid;created jsonb;updated jsonb;
 empty_document jsonb:='{"schema":1,"width":1200,"height":800,"background":"#FFFFFF","nodes":[]}';
 image_document jsonb;bad jsonb;reserved boolean;
begin
 select id into member_id from public.members order by id limit 1;
 if member_id is null then raise exception 'TEST_MEMBER_MISSING';end if;
 if not public.garden_valid_board(empty_document) then raise exception 'VALID_DOCUMENT_REJECTED';end if;
 if public.garden_valid_board(empty_document||'{"width":0}') or public.garden_valid_board(empty_document||'{"extra":"forbidden"}') then raise exception 'INVALID_DOCUMENT_ACCEPTED';end if;
 if public.garden_valid_board(empty_document||'{"nodes":[{"id":"wrong"}]}') then raise exception 'INVALID_NODE_ACCEPTED';end if;
 if has_table_privilege('anon','public.garden_boards','SELECT') or has_table_privilege('authenticated','public.garden_board_assets','SELECT') or has_function_privilege('authenticated','public.garden_create_board(uuid,text,jsonb)','EXECUTE') then raise exception 'CLIENT_PERMISSION_LEAK';end if;
 if not has_table_privilege('service_role','public.garden_boards','SELECT') then raise exception 'SERVICE_PERMISSION_MISSING';end if;
 if (select count(*) from pg_class where oid in ('public.garden_boards'::regclass,'public.garden_board_assets'::regclass) and relrowsecurity)=2 then null;else raise exception 'RLS_MISSING';end if;
 if (select public from storage.buckets where id='garden-board-assets') is distinct from false then raise exception 'BUCKET_NOT_PRIVATE';end if;
 reserved:=public.garden_reserve_board_asset(asset_id,member_id,'image/png',8);
 if not reserved then raise exception 'NO_ROOM_FOR_TEST_ASSET';end if;
 image_document:=empty_document||jsonb_build_object('nodes',jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'kind','image','x',0,'y',0,'width',200,'height',100,'rotation',0,'fill','transparent','color','#112233','fontSize',20,'text','','assetId',upper(asset_id::text),'points','[]'::jsonb)));
 if not public.garden_valid_board(image_document) then raise exception 'VALID_IMAGE_DOCUMENT_REJECTED';end if;
 created:=public.garden_create_board(member_id,'契约临时画布',image_document);
 if created is null then raise exception 'NO_ROOM_FOR_TEST_BOARD';end if;
 board_id:=(created->>'id')::uuid;
 if public.garden_mark_board_asset_deleting(asset_id,member_id) then raise exception 'REFERENCED_IMAGE_DELETED';end if;
 updated:=public.garden_update_board(board_id,0,'契约更新',empty_document);
 if updated->>'version'<>'1' then raise exception 'VERSION_NOT_INCREMENTED';end if;
 if public.garden_update_board(board_id,0,'旧版本',empty_document) is not null then raise exception 'STALE_VERSION_ACCEPTED';end if;
 if not public.garden_mark_board_asset_deleting(asset_id,member_id) then raise exception 'UNREFERENCED_IMAGE_NOT_DELETABLE';end if;
 begin
  perform public.garden_update_board(board_id,1,'删除中图片',image_document);
  raise exception 'DELETING_IMAGE_REFERENCED';
 exception when raise_exception then
  if sqlerrm<>'BOARD_ASSET_INVALID' then raise;end if;
 end;
 bad:=image_document;
 bad:=jsonb_set(bad,'{nodes,0,assetId}',to_jsonb(gen_random_uuid()::text));
 begin
  perform public.garden_update_board(board_id,1,'不存在图片',bad);
  raise exception 'MISSING_IMAGE_REFERENCED';
 exception when raise_exception then
  if sqlerrm<>'BOARD_ASSET_INVALID' then raise;end if;
 end;
end $$;
set local role anon;
do $$begin
 begin perform 1 from public.garden_boards limit 1;raise exception 'ANON_TABLE_READ_ALLOWED';exception when insufficient_privilege then null;end;
 begin perform public.garden_create_board(gen_random_uuid(),'非法访问','{}');raise exception 'ANON_RPC_ALLOWED';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
do $$begin
 begin perform 1 from public.garden_board_assets limit 1;raise exception 'AUTHENTICATED_TABLE_READ_ALLOWED';exception when insufficient_privilege then null;end;
 begin perform public.garden_mark_board_asset_deleting(gen_random_uuid(),gen_random_uuid());raise exception 'AUTHENTICATED_RPC_ALLOWED';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'passed' as status,'document bounds, asset reference/delete locking, optimistic versions, private bucket and RLS/grants' as checks,'all mutations rolled back' as cleanup;
rollback;
