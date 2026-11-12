-- 0027: Otomatik soru önerisi. Kullanıcı "Bana soru öner" deyince sunucu (Cloudflare fonksiyonu) markanın sektörüne,
-- şehrine ve rakiplerine göre ücretsiz Gemini'den müşteri gözüyle soru taslakları ister. Kullanıcı seçip ekler.
-- Sınır: çalışma alanı başına günde 5 öneri isteği; ortak ücretsiz Gemini günlük tavanından düşer.
-- Gemini'nin ücretsiz katmanının kullanılamadığı ülkelerdeki markalarda (AEA, İsviçre, Birleşik Krallık) kapalı.
create table question_suggestions (
  id           bigint generated always as identity primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id     uuid not null references brands(id) on delete cascade,
  user_id      uuid not null,
  created_at   timestamptz not null default now()
);
create index on question_suggestions (workspace_id, created_at);
alter table question_suggestions enable row level security;
create policy question_suggestions_read on question_suggestions for select using (is_member(workspace_id));

create or replace function reserve_question_suggestion(p_brand uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b record; used int;
begin
  select * into b from brands where id = p_brand and not is_competitor;
  if not found then raise exception 'Marka bulunamadı'; end if;
  if not is_member(b.workspace_id, 'editor') then raise exception 'Yetki yok'; end if;
  if b.data_origin = 'simulated' then raise exception 'Demo markada soru önerisi yok'; end if;
  if gemini_free_restricted(b.country) then raise exception 'Bu ülkedeki markalar için otomatik soru önerisi kullanılamıyor'; end if;
  if (select count(*) from question_suggestions where workspace_id = b.workspace_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Bugünlük soru önerisi hakkınız doldu (günde 5). Yarın tekrar deneyin.';
  end if;
  insert into provider_daily_usage(provider, day, calls) values ('gemini', current_date, 0) on conflict do nothing;
  update provider_daily_usage set calls = calls + 1 where provider = 'gemini' and day = current_date and calls + 1 <= 440 returning calls into used;
  if used is null then raise exception 'Öneri servisi bugün yoğun. Yarın tekrar deneyin.'; end if;
  insert into question_suggestions (workspace_id, brand_id, user_id) values (b.workspace_id, b.id, auth.uid());
  return jsonb_build_object(
    'name', b.name, 'sector', b.sector, 'city', b.city, 'country', coalesce(b.country, 'TR'), 'website', b.website,
    'competitors', coalesce((select jsonb_agg(c.name order by c.name) from brands c where c.owner_brand_id = b.id and c.is_competitor), '[]'::jsonb),
    'existing', coalesce((select jsonb_agg(p.text order by p.created_at) from prompts p where p.brand_id = b.id), '[]'::jsonb)
  );
end $$;

revoke all on function reserve_question_suggestion(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function reserve_question_suggestion(uuid) from anon;
    grant execute on function reserve_question_suggestion(uuid) to authenticated;
    revoke all on question_suggestions from anon;
    revoke insert, update, delete on question_suggestions from authenticated;
  end if;
end $$;
