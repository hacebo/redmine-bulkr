ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "redmine_credentials" ADD COLUMN "redmine_user_id" text NOT NULL;