-- Yöntem kaydı (18 Kasım ölçüm standardı): bir ölçümün sonucu yöntem, sınıflandırıcı, soru seti ya da motor değişince
-- önceki ölçümle doğrudan karşılaştırılmamalı. Bu alanlar her yeni ölçümde işçi tarafından doldurulur; eski ölçümlerde boş kalır.
alter table runs add column if not exists method_version text;
alter table runs add column if not exists classifier_version text;
alter table runs add column if not exists prompt_set_hash text;
alter table runs add column if not exists engines text[];
-- API'nin cevapta bildirdiği gerçek model sürümü (responses.model istenen takma adı tutar)
alter table responses add column if not exists model_snapshot text;
