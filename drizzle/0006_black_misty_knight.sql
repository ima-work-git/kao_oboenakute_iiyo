ALTER TABLE `contacts` ADD `nickname` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `exchanged_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `exchange_latitude` real;--> statement-breakpoint
ALTER TABLE `contacts` ADD `exchange_longitude` real;--> statement-breakpoint
ALTER TABLE `contacts` ADD `exchange_accuracy` real;--> statement-breakpoint
ALTER TABLE `contacts` ADD `portrait_previous_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `portrait_previous_full_body_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `portrait_previous_mode` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `portrait_previous_updated_at` text;