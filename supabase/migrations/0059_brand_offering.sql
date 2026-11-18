-- 0059 (19 Kasım pilot): markanın ne sattığı / hangi hizmeti verdiği ("gübre, zirai ilaç, tohum"). Sektörden bağımsız;
-- marka adı geçmeyen kategori soruları ve Google soru keşfi bununla kurulur.
alter table brands add column if not exists offering text check (offering is null or length(offering) <= 120);
