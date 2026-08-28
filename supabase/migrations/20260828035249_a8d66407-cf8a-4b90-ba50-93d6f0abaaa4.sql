do $$
declare
  r record;
  tgt text;
  is_nullable boolean;
  action text;
begin
  for r in
    select c.table_name, c.column_name,
           left(c.column_name, length(c.column_name)-3) as base,
           (c.is_nullable = 'YES') as nullable
    from information_schema.columns c
    join information_schema.tables t
      on t.table_name = c.table_name and t.table_schema = 'public' and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.column_name like '%\_id'
      and c.data_type = 'uuid'
      and c.column_name not in ('user_id','created_by','owner_id','invited_by','id','referred_user_id','stripe_id','entity_id','actor_id')
  loop
    tgt := null;

    if r.column_name in ('page_id','source_page_id','target_page_id','generated_page_id') then
      tgt := 'generated_pages';
    else
      select table_name into tgt from information_schema.tables
      where table_schema='public' and table_type='BASE TABLE' and table_name = r.base || 's' limit 1;
      if tgt is null then
        select table_name into tgt from information_schema.tables
        where table_schema='public' and table_type='BASE TABLE' and table_name = r.base limit 1;
      end if;
    end if;

    if tgt is null or tgt = r.table_name then
      continue;
    end if;

    -- target must have a single-column uuid primary key named id
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name = tgt and column_name='id' and data_type='uuid'
    ) then
      continue;
    end if;

    -- skip if a foreign key already exists on this column
    if exists (
      select 1
      from pg_constraint con
      join pg_class cl on cl.oid = con.conrelid
      join pg_namespace ns on ns.oid = cl.relnamespace
      join unnest(con.conkey) as k(attnum) on true
      join pg_attribute a on a.attrelid = cl.oid and a.attnum = k.attnum
      where con.contype='f' and ns.nspname='public'
        and cl.relname = r.table_name and a.attname = r.column_name
    ) then
      continue;
    end if;

    action := case when r.nullable then 'set null' else 'cascade' end;

    begin
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete %s not valid',
        r.table_name,
        r.table_name || '_' || r.column_name || '_fkey',
        r.column_name,
        tgt,
        action
      );
    exception when others then
      raise notice 'skipped %.%: %', r.table_name, r.column_name, sqlerrm;
    end;
  end loop;
end $$;