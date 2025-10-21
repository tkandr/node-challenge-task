CREATE TABLE "chain_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"token_id" uuid NOT NULL,
	"chain_id" uuid NOT NULL,
	"address" "bytea" NOT NULL,
	"decimals" smallint DEFAULT 0 NOT NULL,
	"is_native" boolean DEFAULT false NOT NULL,
	"is_protected" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"last_update_author" varchar(255),
	"current_price" numeric(30, 0),
	"last_price_update" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chains" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" varchar(100) NOT NULL,
	"chain_id" integer NOT NULL,
	"debridge_id" varchar(100),
	"is_enabled" boolean DEFAULT true NOT NULL,
	"rpc_url" text,
	"explorer_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chains_chain_id_unique" UNIQUE("chain_id")
);
--> statement-breakpoint
CREATE TABLE "price_change_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"chain_token_id" uuid NOT NULL,
	"price" numeric(30, 0) NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"canonical_name" varchar(255) NOT NULL,
	"description" text,
	"website_url" text,
	"logo_big_url" text,
	"logo_small_url" text,
	"logo_thumb_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chain_tokens" ADD CONSTRAINT "chain_tokens_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_tokens" ADD CONSTRAINT "chain_tokens_chain_id_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."chains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_log" ADD CONSTRAINT "price_change_log_chain_token_id_chain_tokens_id_fk" FOREIGN KEY ("chain_token_id") REFERENCES "public"."chain_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chain_tokens_chain_address_idx" ON "chain_tokens" USING btree ("chain_id","address");--> statement-breakpoint
CREATE INDEX "chain_tokens_token_id_idx" ON "chain_tokens" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "chain_tokens_chain_id_idx" ON "chain_tokens" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "chain_tokens_address_idx" ON "chain_tokens" USING btree ("address");--> statement-breakpoint
CREATE INDEX "price_change_log_chain_token_time_idx" ON "price_change_log" USING btree ("chain_token_id","changed_at");