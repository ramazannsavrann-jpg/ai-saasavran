-- 0077: Canlı aramalı tam ölçüm artık 4 motor (24 Kasım, #180: Gemini canlı aramayla müşteri ölçümlerinde).
-- Soru başına: ChatGPT 2 + Gemini 2 + Claude 1 + Perplexity 1 = 6 soru hakkı (önce Gemini yoktu: 4).
-- Haftalık hafif ölçüm (yalnız ChatGPT, 1 kez) ve aramasız ölçüm değişmedi. Paket tavanları (pricing.ts) 4 motoru zaten içeriyordu.
create or replace function run_call_estimate(p_plan text, p_type measurement_type, p_prompts int, p_light boolean default false) returns int
language sql immutable as $$
  select p_prompts * case
    when p_type = 'simulated' then 0
    when p_light then 1
    when p_type = 'live_search' then 6
    when p_plan = 'free' then 1
    else 2 end;
$$;
