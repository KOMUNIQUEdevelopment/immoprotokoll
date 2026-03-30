ALTER TABLE "sync_protocols" DROP CONSTRAINT "sync_protocols_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "sync_protocols" ADD CONSTRAINT "sync_protocols_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;