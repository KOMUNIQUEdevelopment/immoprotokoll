-- Align sync_protocols.data->>'propertyId' with the authoritative property_id column.
-- This one-time repair corrects any rows where the client-persisted JSON diverged
-- from the server-authoritative column (possible before canonical payload enforcement).
UPDATE "sync_protocols"
SET "data" = jsonb_set("data", '{propertyId}', to_jsonb("property_id"), true)
WHERE "property_id" IS NOT NULL
  AND ("data"->>'propertyId') IS DISTINCT FROM "property_id";

UPDATE "sync_protocols"
SET "data" = "data" - 'propertyId'
WHERE "property_id" IS NULL
  AND "data" ? 'propertyId';
