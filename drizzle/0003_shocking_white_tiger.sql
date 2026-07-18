ALTER TABLE `users` ADD `email` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);