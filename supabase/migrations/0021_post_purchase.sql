-- 0021: "Satın aldıktan sonra" soru niyeti: garanti, iade, kurulum, servis gibi sorular.
-- Bu sorular çoğunlukla marka adını içerir ve raporda "markalı soru" olarak ayrı gösterilir.
alter type prompt_intent add value if not exists 'post_purchase';
