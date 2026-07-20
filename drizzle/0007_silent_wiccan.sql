ALTER TABLE `users` ADD `policy_version` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `terms_accepted_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `privacy_accepted_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `image_consent_accepted_at` text;