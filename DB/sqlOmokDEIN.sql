-- --------------------------------------------------------
-- 호스트:                          127.0.0.1
-- 서버 버전:                        8.0.39 - MySQL Community Server - GPL
-- 서버 OS:                        Win64
-- HeidiSQL 버전:                  12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- game_db_05 데이터베이스 구조 내보내기
CREATE DATABASE IF NOT EXISTS `game_db_05` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `game_db_05`;

-- 테이블 game_db_05.game 구조 내보내기
CREATE TABLE IF NOT EXISTS `game` (
  `game_id` int NOT NULL AUTO_INCREMENT,
  `start_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` timestamp NULL DEFAULT NULL,
  `winner_id` int DEFAULT NULL,
  `timer_duration` int DEFAULT '30',
  PRIMARY KEY (`game_id`),
  KEY `winner_id` (`winner_id`),
  CONSTRAINT `game_ibfk_1` FOREIGN KEY (`winner_id`) REFERENCES `player` (`player_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 game_db_05.game:~0 rows (대략적) 내보내기
DELETE FROM `game`;

-- 테이블 game_db_05.move 구조 내보내기
CREATE TABLE IF NOT EXISTS `move` (
  `move_id` int NOT NULL AUTO_INCREMENT,
  `game_id` int DEFAULT NULL,
  `player_id` int DEFAULT NULL,
  `move_number` int NOT NULL,
  `x_coordinate` int NOT NULL,
  `y_coordinate` int NOT NULL,
  `move_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`move_id`),
  KEY `game_id` (`game_id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `move_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `game` (`game_id`) ON DELETE CASCADE,
  CONSTRAINT `move_ibfk_2` FOREIGN KEY (`player_id`) REFERENCES `player` (`player_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 game_db_05.move:~0 rows (대략적) 내보내기
DELETE FROM `move`;

-- 테이블 game_db_05.player 구조 내보내기
CREATE TABLE IF NOT EXISTS `player` (
  `player_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `join_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`player_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 game_db_05.player:~0 rows (대략적) 내보내기
DELETE FROM `player`;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
