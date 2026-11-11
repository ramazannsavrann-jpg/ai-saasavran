-- 0014: (1) Soru etiketi (koşullu görünürlük haritası için), (2) yardımcı ücretli çağrıların (LLM sınıflandırma) kaydı.
-- Yalnız ekleme yapar.

-- (1) Soruya isteğe bağlı kısa etiket: "ucuz", "premium", "Almanya", "kurumsal" gibi. Rapor etiketlere göre de kırılım verir.
alter table prompts add column segment text check (segment is null or length(trim(segment)) between 1 and 40);

-- (2) Ölçüm çağrısı olmayan ücretli çağrılar (ör. "önerildi mi" sınıflandırması). Aylık sorgu kotasına sayılmaz
--     (task <> 'query_engine'), ama ücretli harcama tavanına sayılır; tavan aşılırsa alan durdurulur.
create or replace function record_aux_call(
  p_workspace uuid, p_run uuid, p_task text, p_provider text, p_model text, p_in int, p_out int, p_cost numeric
) returns void language plpgsql security definer set search_path = public as $$
declare paid numeric; cap numeric;
begin
  if p_task = 'query_engine' or length(coalesce(p_task, '')) = 0 then raise exception 'Geçersiz görev'; end if;
  insert into cost_ledger(workspace_id, run_id, task, provider, model, input_tokens, output_tokens,
                          tool_calls, cost_usd, billing, paid_equivalent_usd, ok)
  values (p_workspace, p_run, p_task, p_provider, p_model, p_in, p_out, 0, p_cost, 'paid', p_cost, true);
  if p_run is not null then update runs set cost_usd = cost_usd + p_cost where id = p_run; end if;
  select coalesce(sum(cost_usd) filter (where billing = 'paid'), 0) into paid
    from cost_ledger where workspace_id = p_workspace and created_at >= date_trunc('month', now());
  select pl.monthly_paid_cap_usd into cap from workspaces w join plans pl on pl.id = w.plan where w.id = p_workspace;
  if paid > cap then
    update workspaces set status = 'paused', paused_reason = 'monthly_cost_cap', paused_at = now() where id = p_workspace;
  end if;
end $$;
revoke all on function record_aux_call(uuid, uuid, text, text, text, int, int, numeric) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function record_aux_call(uuid, uuid, text, text, text, int, int, numeric) from anon, authenticated;
    grant execute on function record_aux_call(uuid, uuid, text, text, text, int, int, numeric) to service_role;
  end if;
end $$;
