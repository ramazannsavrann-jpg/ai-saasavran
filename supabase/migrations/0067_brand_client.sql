-- Ajans paneli (22 Kasım 2026): markayı bir müşteriye bağlamak için serbest metin "müşteri adı".
-- Yalnız gruplama ve filtre içindir; yetki vermez (erişim yine çalışma alanı üyeliğiyle, mevcut RLS aynen geçerli).
-- Müşteriye erişim: girişsiz, salt okunur paylaşılan rapor bağlantısı (report_shares; Elmas'ta ajans markasıyla).
alter table brands add column if not exists client_name text
  check (client_name is null or length(btrim(client_name)) between 1 and 80);
create index if not exists brands_workspace_client_idx on brands (workspace_id, client_name) where client_name is not null;
