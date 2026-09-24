CREATE TABLE `alerts` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`well_id` char(36) NOT NULL,
	`risk_id` char(36),
	`alert_type` varchar(60) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`payload` json NOT NULL,
	`seen_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_alert_well` ON `alerts` (`well_id`);--> statement-breakpoint
CREATE INDEX `idx_alert_type` ON `alerts` (`alert_type`);--> statement-breakpoint
CREATE INDEX `idx_alert_seen` ON `alerts` (`seen_at`);--> statement-breakpoint
CREATE INDEX `idx_alert_created` ON `alerts` (`created_at`);