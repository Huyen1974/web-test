-- S134: Grant SELECT/INSERT on measurement tables to incomex user
-- Tables created by directus user, runner connects as incomex

GRANT SELECT ON law_catalog TO incomex;
GRANT SELECT ON measurement_registry TO incomex;
GRANT SELECT, INSERT ON measurement_log TO incomex;
GRANT UPDATE ON measurement_registry TO incomex;

-- Also grant on all other tables incomex might need
GRANT SELECT ON ALL TABLES IN SCHEMA public TO incomex;
