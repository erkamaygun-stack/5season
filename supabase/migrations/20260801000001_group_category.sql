-- Grupları "Spor Okulu" ve "Altyapı" olarak kategorilere ayırmak için kolon ekler.
-- Mevcut gruplar varsayılan olarak 'spor_okulu' olur, idareci sonradan düzeltir.
alter table groups
  add column category text not null default 'spor_okulu'
  check (category in ('spor_okulu', 'altyapi'));
