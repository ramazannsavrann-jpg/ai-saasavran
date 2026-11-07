-- 0011: Haftalık e-posta özeti. Kullanıcı başına tercih (açık/kapalı, dil) ve tek tıkla abonelikten çıkma anahtarı.
-- Özet verisi yalnız sunucuya (service role) açıktır; e-posta adresi Supabase Auth'tan sunucuda okunur.
create table email_prefs (
  user_id        uuid primary key,
  weekly         boolean not null default true,
  lang           text not null default 'en' check (lang in ('en', 'tr')),
  token          uuid not null unique default gen_random_uuid(),
  last_weekly_at timestamptz,
  updated_at     timestamptz not null default now()
);
alter table email_prefs enable row level security;  -- doğrudan erişim yok; yalnız aşağıdaki fonksiyonlar

-- Kullanıcı: dil ve haftalık özet tercihi (kendi kaydı)
create or replace function set_email_prefs(p_lang text default null, p_weekly boolean default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  insert into email_prefs (user_id, lang, weekly) values (auth.uid(), coalesce(p_lang, 'en'), coalesce(p_weekly, true))
  on conflict (user_id) do update set
    lang = coalesce(p_lang, email_prefs.lang), weekly = coalesce(p_weekly, email_prefs.weekly), updated_at = now();
end $$;
create or replace function my_email_prefs() returns table (weekly boolean, lang text)
language sql stable security definer set search_path = public as $$
  select coalesce(p.weekly, true), coalesce(p.lang, 'en') from (select auth.uid() uid) u left join email_prefs p on p.user_id = u.uid;
$$;

-- Sunucu: e-postadaki bağlantıyla abonelikten çıkma
create or replace function unsubscribe_weekly(p_token uuid) returns boolean
language sql security definer set search_path = public as $$
  update email_prefs set weekly = false, updated_at = now() where token = p_token returning true;
$$;

-- Sunucu: özet gönderilecek kullanıcılar ve markaları (son 7 gün ile önceki 7 gün; yalnız gerçek ölçümler)
create or replace function weekly_digest() returns table (
  user_id uuid, lang text, token uuid, brand_id uuid, brand_name text, workspace_name text,
  cur_n int, cur_mention int, cur_recommend int, prev_n int, prev_mention int, prev_recommend int,
  top_competitor text, top_competitor_rec int
) language sql stable security definer set search_path = public as $$
  with targets as (
    select m.user_id, coalesce(p.lang, 'en') lang, p.token, b.id brand_id, b.name brand_name, w.name workspace_name
      from workspace_members m
      join workspaces w on w.id = m.workspace_id and w.kind in ('business', 'agency')
      join brands b on b.workspace_id = w.id and not b.is_competitor
      left join email_prefs p on p.user_id = m.user_id
     where coalesce(p.weekly, true) and (p.last_weekly_at is null or p.last_weekly_at < now() - interval '6 days')
  ), resp as (
    select r.id resp_id, ru.brand_id, ru.created_at > now() - interval '7 days' as cur
      from responses r join runs ru on ru.id = r.run_id
     where ru.status = 'done' and ru.data_origin = 'live_api' and ru.trigger <> 'seed'
       and ru.created_at > now() - interval '14 days'
       and ru.brand_id in (select t.brand_id from targets t)
  ), agg as (
    select re.brand_id,
      count(*) filter (where re.cur)::int cur_n,
      count(*) filter (where re.cur and mn.mentioned)::int cur_m,
      count(*) filter (where re.cur and mn.recommended)::int cur_r,
      count(*) filter (where not re.cur)::int prev_n,
      count(*) filter (where not re.cur and mn.mentioned)::int prev_m,
      count(*) filter (where not re.cur and mn.recommended)::int prev_r
      from resp re left join mentions mn on mn.response_id = re.resp_id and mn.brand_id = re.brand_id
     group by re.brand_id
  ), comp as (
    select distinct on (re.brand_id) re.brand_id, cb.name, count(*) filter (where mn.recommended)::int rec
      from resp re
      join mentions mn on mn.response_id = re.resp_id
      join brands cb on cb.id = mn.brand_id and cb.is_competitor and cb.owner_brand_id = re.brand_id
     where re.cur
     group by re.brand_id, cb.name
     order by re.brand_id, rec desc, cb.name
  )
  select t.user_id, t.lang, t.token, t.brand_id, t.brand_name, t.workspace_name,
         a.cur_n, a.cur_m, a.cur_r, a.prev_n, a.prev_m, a.prev_r, c.name, c.rec
    from targets t join agg a on a.brand_id = t.brand_id and a.cur_n > 0
    left join comp c on c.brand_id = t.brand_id
   order by t.user_id, t.brand_name;
$$;

-- Sunucu: gönderildi olarak işaretle (kayıt yoksa oluşturur; abonelik anahtarı da böylece üretilir)
create or replace function mark_weekly_sent(p_user uuid) returns uuid
language sql security definer set search_path = public as $$
  insert into email_prefs (user_id, last_weekly_at) values (p_user, now())
  on conflict (user_id) do update set last_weekly_at = now()
  returning token;
$$;
create or replace function ensure_email_token(p_user uuid) returns uuid
language sql security definer set search_path = public as $$
  insert into email_prefs (user_id) values (p_user) on conflict (user_id) do update set updated_at = email_prefs.updated_at
  returning token;
$$;

revoke all on function set_email_prefs(text, boolean) from public;
revoke all on function my_email_prefs() from public;
revoke all on function unsubscribe_weekly(uuid) from public;
revoke all on function weekly_digest() from public;
revoke all on function mark_weekly_sent(uuid) from public;
revoke all on function ensure_email_token(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function set_email_prefs(text, boolean) to authenticated;
    grant execute on function my_email_prefs() to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function unsubscribe_weekly(uuid) from anon, authenticated;
    revoke all on function weekly_digest() from anon, authenticated;
    revoke all on function mark_weekly_sent(uuid) from anon, authenticated;
    revoke all on function ensure_email_token(uuid) from anon, authenticated;
  end if;
end $$;
