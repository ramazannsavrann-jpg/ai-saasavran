-- 0006: Marka bilgisi değişince kayıtlı cevapları ücretsiz yeniden analiz et.
-- Takma ad, ad ya da web sitesi değişince (veya rakip eklenip silinince) ana marka işaretlenir; işçi işaretli markaların
-- tüm ölçümlerini güncel kurallarla yeniden hesaplar (API çağrısı yok).

alter table brands add column reanalyze_requested_at timestamptz;

create or replace function flag_reanalysis() returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if tg_op = 'DELETE' then
    target := coalesce(old.owner_brand_id, old.id);
    if old.is_competitor then update brands set reanalyze_requested_at = now() where id = target; end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and new.name is not distinct from old.name and new.aliases is not distinct from old.aliases
     and new.website is not distinct from old.website then
    return new;
  end if;
  if tg_op = 'INSERT' and not new.is_competitor then return new; end if;  -- yeni markanın henüz ölçümü yok
  target := case when new.is_competitor then new.owner_brand_id else new.id end;
  if target = new.id then new.reanalyze_requested_at := now();
  else update brands set reanalyze_requested_at = now() where id = target; end if;
  return new;
end $$;

create trigger zzz_flag_reanalysis_ins_upd before insert or update of name, aliases, website on brands
  for each row execute function flag_reanalysis();
create trigger zzz_flag_reanalysis_del after delete on brands
  for each row execute function flag_reanalysis();

-- İşçi için: yeniden analiz bekleyen markalar (yalnız sunucu)
create or replace function pending_reanalysis(p_limit int default 20) returns setof uuid
language sql security definer set search_path = public as $$
  select id from brands where reanalyze_requested_at is not null and not is_competitor
   order by reanalyze_requested_at limit p_limit;
$$;
revoke all on function pending_reanalysis(int) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function pending_reanalysis(int) from anon, authenticated;
  end if;
end $$;
