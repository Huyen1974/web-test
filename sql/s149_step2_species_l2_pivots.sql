-- S149 Step 2: Fill species field + L2 dedicated pivots
-- Điều 26 v4.0 §II-BIS: species trên pivot_definitions + L2 drill-down

-- ===================================================================
-- VIỆC 2A: Fill species field trên pivot_definitions
-- JOIN species_collection_map (is_primary) để map source_object → species_code
-- ===================================================================
UPDATE pivot_definitions pd
SET species = scm.species_code
FROM species_collection_map scm
WHERE pd.source_object = scm.collection_name
  AND scm.is_primary = true
  AND (pd.species IS NULL OR pd.species = '');

-- ===================================================================
-- VIỆC 2B: L2 dedicated pivots — GROUP BY species per composition_level
-- Mỗi layer (atom/molecule/compound) cần 1 pivot tổng hợp per species
-- Dùng meta_catalog (managed active) grouped by species field
-- ===================================================================

-- L2-ATOM: meta_catalog managed active atoms grouped by entity_type (= proxy for species)
INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, is_active, display_order)
SELECT 'PIV-201', 'L2 Atom: theo loài', 'meta_catalog',
  '{"filters":[{"field":"status","op":"=","value":"active"},{"field":"identity_class","op":"=","value":"managed"},{"field":"composition_level","op":"=","value":"atom"}]}'::jsonb,
  '{"groups":[{"field":"entity_type","alias":"species"}]}'::jsonb,
  '{"metrics":[{"func":"count","field":"*","alias":"total"},{"func":"sum","field":"record_count","alias":"entities"}]}'::jsonb,
  'l2-drill', 'atom', true, 201
WHERE NOT EXISTS (SELECT 1 FROM pivot_definitions WHERE code = 'PIV-201');

-- L2-MOLECULE
INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, is_active, display_order)
SELECT 'PIV-202', 'L2 Molecule: theo loài', 'meta_catalog',
  '{"filters":[{"field":"status","op":"=","value":"active"},{"field":"identity_class","op":"=","value":"managed"},{"field":"composition_level","op":"=","value":"molecule"}]}'::jsonb,
  '{"groups":[{"field":"entity_type","alias":"species"}]}'::jsonb,
  '{"metrics":[{"func":"count","field":"*","alias":"total"},{"func":"sum","field":"record_count","alias":"entities"}]}'::jsonb,
  'l2-drill', 'molecule', true, 202
WHERE NOT EXISTS (SELECT 1 FROM pivot_definitions WHERE code = 'PIV-202');

-- L2-COMPOUND
INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, is_active, display_order)
SELECT 'PIV-203', 'L2 Compound: theo loài', 'meta_catalog',
  '{"filters":[{"field":"status","op":"=","value":"active"},{"field":"identity_class","op":"=","value":"managed"},{"field":"composition_level","op":"=","value":"compound"}]}'::jsonb,
  '{"groups":[{"field":"entity_type","alias":"species"}]}'::jsonb,
  '{"metrics":[{"func":"count","field":"*","alias":"total"},{"func":"sum","field":"record_count","alias":"entities"}]}'::jsonb,
  'l2-drill', 'compound', true, 203
WHERE NOT EXISTS (SELECT 1 FROM pivot_definitions WHERE code = 'PIV-203');

-- L2-MATERIAL (currently 0 entities but ready for future)
INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, is_active, display_order)
SELECT 'PIV-204', 'L2 Material: theo loài', 'meta_catalog',
  '{"filters":[{"field":"status","op":"=","value":"active"},{"field":"identity_class","op":"=","value":"managed"},{"field":"composition_level","op":"=","value":"material"}]}'::jsonb,
  '{"groups":[{"field":"entity_type","alias":"species"}]}'::jsonb,
  '{"metrics":[{"func":"count","field":"*","alias":"total"},{"func":"sum","field":"record_count","alias":"entities"}]}'::jsonb,
  'l2-drill', 'material', true, 204
WHERE NOT EXISTS (SELECT 1 FROM pivot_definitions WHERE code = 'PIV-204');

-- L2-PRODUCT
INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, is_active, display_order)
SELECT 'PIV-205', 'L2 Product: theo loài', 'meta_catalog',
  '{"filters":[{"field":"status","op":"=","value":"active"},{"field":"identity_class","op":"=","value":"managed"},{"field":"composition_level","op":"=","value":"product"}]}'::jsonb,
  '{"groups":[{"field":"entity_type","alias":"species"}]}'::jsonb,
  '{"metrics":[{"func":"count","field":"*","alias":"total"},{"func":"sum","field":"record_count","alias":"entities"}]}'::jsonb,
  'l2-drill', 'product', true, 205
WHERE NOT EXISTS (SELECT 1 FROM pivot_definitions WHERE code = 'PIV-205');

-- L2-BUILDING
INSERT INTO pivot_definitions (code, name, source_object, filter_spec, group_spec, metric_spec, registry_group, composition_level, is_active, display_order)
SELECT 'PIV-206', 'L2 Building: theo loài', 'meta_catalog',
  '{"filters":[{"field":"status","op":"=","value":"active"},{"field":"identity_class","op":"=","value":"managed"},{"field":"composition_level","op":"=","value":"building"}]}'::jsonb,
  '{"groups":[{"field":"entity_type","alias":"species"}]}'::jsonb,
  '{"metrics":[{"func":"count","field":"*","alias":"total"},{"func":"sum","field":"record_count","alias":"entities"}]}'::jsonb,
  'l2-drill', 'building', true, 206
WHERE NOT EXISTS (SELECT 1 FROM pivot_definitions WHERE code = 'PIV-206');

-- Refresh pivot_results for new L2 pivots
SELECT refresh_pivot_results();
