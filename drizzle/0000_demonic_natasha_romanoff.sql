CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`contact_user_id` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`memos` text DEFAULT '[]' NOT NULL,
	`facts` text DEFAULT '[]' NOT NULL,
	`alert_level` text DEFAULT 'normal' NOT NULL,
	`alert_suggested` integer DEFAULT false NOT NULL,
	`alert_reason` text,
	`hud_text` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_owner_target_idx` ON `contacts` (`owner_id`,`contact_user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`device_token` text NOT NULL,
	`public_code` text NOT NULL,
	`name` text NOT NULL,
	`reading` text DEFAULT '' NOT NULL,
	`org` text DEFAULT '' NOT NULL,
	`latitude` real,
	`longitude` real,
	`location_accuracy` real,
	`location_enabled` integer DEFAULT false NOT NULL,
	`last_seen` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_device_token_idx` ON `users` (`device_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_public_code_idx` ON `users` (`public_code`);