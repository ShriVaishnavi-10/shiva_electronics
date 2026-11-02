-- Backup of users table for sri_sivalinga
-- Created on 2026-10-23

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `email`, `phone`, `role`, `role_id`, `branch_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2b$10$Ci9Ki4DU7EImGuGxmd7ckeom5LTPPOM3ORqD9vcPm1qSMHD.GXhUm', 'Administrator', '', '', NULL, 1, NULL, 'Active', '2026-03-18 11:44:32', '2026-05-25 13:03:56'),
(4, 'clavis', '$2b$10$7I1wvHwSny5ztCbhL.HEX./KkcVabDNz6XZdV8zN5nx3Zsv6eKoZ2', 'clavis tech', NULL, NULL, NULL, 5, 2, 'Active', '2026-05-20 10:03:08', '2026-05-20 10:03:08'),
(5, 'user', '$2b$10$pysrvMO9D/zARLoFHxUqV.qBU8P56HPnZ3Z6MvG0TbhrPuWmMQebi', 'AAA', NULL, NULL, NULL, 6, 2, 'Active', '2026-09-11 14:18:22', '2026-09-11 14:18:22'),
(6, 'non', '$2b$10$fnb6.9Wl7qVUZLb73k2rhONkhApXOJokZlp7heTTSkjboNpJJpPOe', 'AAA', NULL, NULL, NULL, 6, 2, 'Active', '2026-09-11 15:07:57', '2026-09-11 15:07:57')
ON DUPLICATE KEY UPDATE id=VALUES(id);
