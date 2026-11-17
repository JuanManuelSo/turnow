ALTER TABLE "app"."business_members" DROP CONSTRAINT "business_members_role_check";--> statement-breakpoint
ALTER TABLE "app"."business_members" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."business_members" ADD CONSTRAINT "business_members_location_fk" FOREIGN KEY ("business_id","location_id") REFERENCES "app"."locations"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_members_location_operator_unique" ON "app"."business_members" USING btree ("business_id","location_id") WHERE "app"."business_members"."role" = 'location_operator';--> statement-breakpoint
ALTER TABLE "app"."business_members" ADD CONSTRAINT "business_members_role_scope_check" CHECK (("app"."business_members"."role" = 'owner' and "app"."business_members"."location_id" is null) or ("app"."business_members"."role" = 'location_operator' and "app"."business_members"."location_id" is not null));
--> statement-breakpoint
