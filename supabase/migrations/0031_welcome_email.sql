-- 0031: Hoş geldin e-postası. E-postasını doğrulayan yeni kullanıcıya bir kez, neler yapabileceğini anlatan e-posta gider
-- (işçi, Resend). Bu özellikten önce kaydolanlara gönderilmez.
alter table email_prefs add column welcome_sent_at timestamptz;

create or replace function pending_welcome_emails(p_limit int default 50)
returns table (user_id uuid, email text, lang text)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select u.id, u.email::text,
           coalesce(p.lang, case when u.raw_user_meta_data->>'lang' in ('en', 'tr') then u.raw_user_meta_data->>'lang' end, 'en')
      from auth.users u left join email_prefs p on p.user_id = u.id
     where u.email is not null and u.email_confirmed_at is not null
       and u.created_at >= timestamptz '2026-11-12 00:00:00+00' and u.created_at > now() - interval '7 days'
       and (p.welcome_sent_at is null)
     order by u.created_at
     limit p_limit;
end $$;

create or replace function mark_welcome_sent(p_user uuid, p_lang text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into email_prefs (user_id, lang, welcome_sent_at) values (p_user, case when p_lang in ('en', 'tr') then p_lang else 'en' end, now())
  on conflict (user_id) do update set welcome_sent_at = now();
end $$;

do $$
declare f text;
begin
  foreach f in array array['pending_welcome_emails(int)', 'mark_welcome_sent(uuid, text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;
