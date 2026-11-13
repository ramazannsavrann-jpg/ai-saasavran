-- 0033: Kazanma kampanyası. İyileştirme rehberindeki bir maddeden hazır görev listesi oluşur; kampanya bir aksiyon kaydıdır
-- (başlangıç tarihi done_on), böylece önce/sonra karşılaştırması mevcut aksiyon takibiyle aynı şekilde yapılır.
alter table brand_actions add column rec_id text check (rec_id is null or length(rec_id) <= 60);
alter table brand_actions add column tasks jsonb check (tasks is null or (jsonb_typeof(tasks) = 'array' and jsonb_array_length(tasks) between 1 and 20 and length(tasks::text) <= 8000));
