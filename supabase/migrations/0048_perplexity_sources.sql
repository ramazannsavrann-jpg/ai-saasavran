-- 0048: Perplexity kaynak düzeltmesi (18 Kasım 2026, sahip kararı "A").
-- Eskiden Perplexity cevabında metin içi alıntı yoksa aramanın bulduğu tüm siteler (her cevapta 15) kaynak sayılıyordu.
-- Artık yalnız cevabın gösterdiği bağlantılar kaynaktır. Geçmiş Perplexity cevaplarında (hepsi Growth Lab, müşteri yok)
-- metin içi alıntı hiç yoktu; kaynak listesi cevap metnindeki bağlantılarla yeniden yazılır (yoksa boş).
update responses r
   set cited_urls = coalesce((
         select array_agg(distinct regexp_replace(m[1], '[.,;:!?]+$', ''))
           from regexp_matches(r.answer_text, '(https?://[^\s)\]>"''<]+)', 'g') as m
       ), '{}')
 where r.provider = 'perplexity'
   and r.created_at < '2026-11-18 08:00:00+00';
