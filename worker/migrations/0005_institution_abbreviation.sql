-- Short display label for comparative views (chips, legend, chart tooltips)
-- where "Universidad Tecnológica de Bolívar" is too long to read as a data
-- label - full names stay for prose contexts (Overview's banner, the
-- sidebar selector) where identifying the institution matters more than
-- density.
ALTER TABLE institutions ADD COLUMN abbreviation TEXT;

UPDATE institutions SET abbreviation = 'UTB' WHERE id = 'utb';
