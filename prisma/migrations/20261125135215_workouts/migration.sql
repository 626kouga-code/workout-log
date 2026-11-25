-- CreateTable
CREATE TABLE `workouts` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `performed_on` DATE NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `note` VARCHAR(500) NOT NULL DEFAULT '',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `client_updated_at` DATETIME(3) NOT NULL,

    INDEX `workouts_user_id_performed_on_idx`(`user_id`, `performed_on`),
    INDEX `workouts_user_id_finished_at_idx`(`user_id`, `finished_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_exercises` (
    `id` CHAR(36) NOT NULL,
    `workout_id` CHAR(36) NOT NULL,
    `exercise_id` CHAR(36) NOT NULL,
    `sort_order` SMALLINT NOT NULL,
    `rest_seconds` SMALLINT NOT NULL DEFAULT 90,
    `client_updated_at` DATETIME(3) NOT NULL,

    INDEX `workout_exercises_workout_id_sort_order_idx`(`workout_id`, `sort_order`),
    INDEX `workout_exercises_exercise_id_idx`(`exercise_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_sets` (
    `id` CHAR(36) NOT NULL,
    `workout_exercise_id` CHAR(36) NOT NULL,
    `sort_order` SMALLINT NOT NULL,
    `weight_kg` DECIMAL(6, 2) NULL,
    `reps` SMALLINT NULL,
    `duration_seconds` INTEGER NULL,
    `distance_m` INTEGER NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `client_updated_at` DATETIME(3) NOT NULL,

    INDEX `workout_sets_workout_exercise_id_sort_order_idx`(`workout_exercise_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `applied_changes` (
    `change_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `applied_at` DATETIME(3) NOT NULL,

    INDEX `applied_changes_user_id_applied_at_idx`(`user_id`, `applied_at`),
    PRIMARY KEY (`change_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deleted_records` (
    `entity` VARCHAR(20) NOT NULL,
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `deleted_at` DATETIME(3) NOT NULL,

    INDEX `deleted_records_user_id_deleted_at_idx`(`user_id`, `deleted_at`),
    PRIMARY KEY (`entity`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `workouts` ADD CONSTRAINT `workouts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_exercises` ADD CONSTRAINT `workout_exercises_workout_id_fkey` FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_exercises` ADD CONSTRAINT `workout_exercises_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_sets` ADD CONSTRAINT `workout_sets_workout_exercise_id_fkey` FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applied_changes` ADD CONSTRAINT `applied_changes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deleted_records` ADD CONSTRAINT `deleted_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
