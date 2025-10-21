ALTER TABLE "chains" ALTER COLUMN "chain_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chains" ADD COLUMN "chain_deid" integer;--> statement-breakpoint
ALTER TABLE "chains" DROP COLUMN "debridge_id";--> statement-breakpoint
ALTER TABLE "chains" ADD CONSTRAINT "chains_chain_deid_unique" UNIQUE("chain_deid");