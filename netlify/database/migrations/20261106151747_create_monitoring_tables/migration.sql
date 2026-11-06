CREATE TABLE "events" (
	"id" serial PRIMARY KEY,
	"station_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" text PRIMARY KEY,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_station_id_stations_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id");