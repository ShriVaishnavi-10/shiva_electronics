-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: siva_electronics
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bank_accounts`
--

DROP TABLE IF EXISTS `bank_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `account_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bank_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `account_type` enum('Savings','Current','Cash','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Current',
  `opening_balance` decimal(12,2) DEFAULT '0.00',
  `current_balance` decimal(12,2) DEFAULT '0.00',
  `status` enum('Active','Inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Active',
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_gst` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_bank_accounts_is_gst` (`is_gst`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_accounts`
--

LOCK TABLES `bank_accounts` WRITE;
/*!40000 ALTER TABLE `bank_accounts` DISABLE KEYS */;
INSERT INTO `bank_accounts` VALUES (1,'SBI Main Account','324533333','State Bank India','Gugai, Salem','Current',10000.00,-78168.80,'Active',2,'2026-10-31 12:14:28',1);
/*!40000 ALTER TABLE `bank_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_sequences`
--

DROP TABLE IF EXISTS `branch_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `sequence_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `prefix` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_number` int DEFAULT '1',
  `last_number` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_seq` (`branch_id`,`sequence_type`),
  CONSTRAINT `branch_sequences_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_sequences`
--

LOCK TABLES `branch_sequences` WRITE;
/*!40000 ALTER TABLE `branch_sequences` DISABLE KEYS */;
INSERT INTO `branch_sequences` VALUES (1,2,'sale','SE-',1,9),(2,2,'quotation','SE-QUO-',1,0),(3,2,'purchase','SE-PUR-',1,2),(4,2,'receipt','SE-REC-',1,0),(5,2,'proforma','SE-PRO-',1,0),(6,2,'delivery_challan','SE-DC-',1,0),(23,2,'non_gst_sale','',1,2);
/*!40000 ALTER TABLE `branch_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `branch_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gst_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('Active','Inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_code` (`branch_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (2,'SHIVA ELECTRONICS','N-001','21-22, Main bazzar Street, Omalur.','Salem','Tamil Nadu',NULL,'9715761234','ambanibala@gmail.com','33CAEPS0894N1Z5','Active','2026-03-18 06:56:46','2026-11-02 06:52:25');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brand`
--

DROP TABLE IF EXISTS `brand`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brand` (
  `id` int NOT NULL AUTO_INCREMENT,
  `brand_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brand`
--

LOCK TABLES `brand` WRITE;
/*!40000 ALTER TABLE `brand` DISABLE KEYS */;
INSERT INTO `brand` VALUES (1,'LG','Active','2026-10-29 12:25:40'),(2,'OPPO','Active','2026-10-29 12:25:57'),(3,'Samsung','Active','2026-11-02 05:39:16');
/*!40000 ALTER TABLE `brand` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_location`
--

DROP TABLE IF EXISTS `business_location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_location` (
  `id` int NOT NULL AUTO_INCREMENT,
  `location_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `landmark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `zip_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mobile` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `alternate_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `images` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gst_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `account_holder` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bank_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `account_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ifsc_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `location_id` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_location`
--

LOCK TABLES `business_location` WRITE;
/*!40000 ALTER TABLE `business_location` DISABLE KEYS */;
INSERT INTO `business_location` VALUES (1,'LOC-0001','SHIVA ELECTRONICS','21-22, Main bazzar Street, Omalur.','Tamil Nadu','Salem',NULL,'9715761234','9003920469','ambanibala@gmail.com','http://localhost:5000/uploads/locations/img-1788586182704-496560558.png,http://localhost:5000/uploads/locations/img-1788610997711-139694859.png,http://localhost:5000/uploads/locations/img-1792750100540-387434991.png,http://localhost:5000/uploads/locations/img-1792831311387-904593504.jpeg,http://localhost:5000/uploads/locations/img-1793185783839-592985897.png,http://localhost:5000/uploads/locations/img-1793256327851-845810463.png','33CAEPS0894N1Z5',NULL,NULL,NULL,NULL,NULL,'2026-09-05 05:29:45','2026-11-02 06:52:26',2);
/*!40000 ALTER TABLE `business_location` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'active',
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'FURNITURES','2026-10-29 12:21:43','active',NULL),(2,'HOME APPLIENCES','2026-10-29 12:24:32','active',NULL),(3,'MOBILES','2026-10-29 12:24:47','active',NULL);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_settings`
--

DROP TABLE IF EXISTS `company_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gst_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company_logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` tinyint DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_settings`
--

LOCK TABLES `company_settings` WRITE;
/*!40000 ALTER TABLE `company_settings` DISABLE KEYS */;
INSERT INTO `company_settings` VALUES (1,'SHIVA ELECTRONICS','33CAEPS0894N1Z5','21-22, Main bazzar Street, Omalur.','Salem','Tamil Nadu','India','Salem','/uploads/logos/logo-1793255848250-888757222.png','2026-03-18 08:53:42','2026-11-02 06:52:26',1);
/*!40000 ALTER TABLE `company_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_followups`
--

DROP TABLE IF EXISTS `crm_followups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_followups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `followup_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `followup_title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `related_to` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'Lead',
  `entity_id` int DEFAULT NULL,
  `entity_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mobile_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `followup_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Call',
  `followup_date` date DEFAULT NULL,
  `followup_time` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `duration` int DEFAULT '15',
  `priority` varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Medium',
  `followup_status` varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Pending',
  `discussion_summary` text COLLATE utf8mb4_general_ci,
  `customer_requirement` text COLLATE utf8mb4_general_ci,
  `customer_response` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'Interested',
  `next_action` text COLLATE utf8mb4_general_ci,
  `attachment_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `assigned_to` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_by` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reminder_enabled` tinyint(1) DEFAULT '1',
  `reminder_before` varchar(50) COLLATE utf8mb4_general_ci DEFAULT '15 minutes',
  `next_followup_date` date DEFAULT NULL,
  `next_followup_time` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_crm_flw_status` (`followup_status`),
  KEY `idx_crm_flw_type` (`followup_type`),
  KEY `idx_crm_flw_priority` (`priority`),
  KEY `idx_crm_flw_date` (`followup_date`),
  KEY `idx_crm_flw_branch` (`branch_id`),
  KEY `idx_crm_flw_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_followups`
--

LOCK TABLES `crm_followups` WRITE;
/*!40000 ALTER TABLE `crm_followups` DISABLE KEYS */;
/*!40000 ALTER TABLE `crm_followups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_leads`
--

DROP TABLE IF EXISTS `crm_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `lead_title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `first_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `last_name` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company_name` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `designation` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mobile_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `email_address` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `whatsapp_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `lead_source` varchar(100) COLLATE utf8mb4_general_ci DEFAULT 'Showroom Walk-in',
  `lead_status` varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'New',
  `priority` varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Medium',
  `expected_budget` decimal(15,2) DEFAULT '0.00',
  `expected_closing_date` date DEFAULT NULL,
  `interested_product` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `assigned_to` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `followup_type` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `followup_date` date DEFAULT NULL,
  `followup_time` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `lead_notes` text COLLATE utf8mb4_general_ci,
  `branch_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_crm_leads_status` (`lead_status`),
  KEY `idx_crm_leads_priority` (`priority`),
  KEY `idx_crm_leads_branch` (`branch_id`),
  KEY `idx_crm_leads_created` (`created_at`),
  KEY `idx_crm_leads_followup` (`followup_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_leads`
--

LOCK TABLES `crm_leads` WRITE;
/*!40000 ALTER TABLE `crm_leads` DISABLE KEYS */;
/*!40000 ALTER TABLE `crm_leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `contact_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `alternate_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gst_no` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `address2` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Tamil Nadu',
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  `opening_balance` decimal(15,2) DEFAULT '0.00',
  `is_gst` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `contact_no` (`contact_no`),
  KEY `idx_customers_is_gst` (`is_gst`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (2,'Kali',NULL,'7890923456',NULL,NULL,NULL,NULL,NULL,NULL,'Tamil Nadu','India','2026-10-31 10:40:57',2,0.00,1),(4,'Hari',NULL,'8909056789',NULL,NULL,NULL,NULL,NULL,NULL,'Tamil Nadu','India','2026-11-02 05:14:06',2,0.00,1);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_cash_logs`
--

DROP TABLE IF EXISTS `daily_cash_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_cash_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `opening_balance` decimal(12,2) DEFAULT '0.00',
  `cash_sales` decimal(12,2) DEFAULT '0.00',
  `cash_purchases` decimal(12,2) DEFAULT '0.00',
  `cash_expenses` decimal(12,2) DEFAULT '0.00',
  `service_cash_in` decimal(12,2) DEFAULT '0.00',
  `closing_balance` decimal(12,2) DEFAULT '0.00',
  `actual_cash` decimal(12,2) DEFAULT '0.00',
  `difference` decimal(12,2) DEFAULT '0.00',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `status` enum('Open','Closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Open',
  `closed_at` timestamp NULL DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_gst` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_date_branch` (`date`,`branch_id`),
  KEY `idx_daily_cash_logs_is_gst` (`is_gst`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_cash_logs`
--

LOCK TABLES `daily_cash_logs` WRITE;
/*!40000 ALTER TABLE `daily_cash_logs` DISABLE KEYS */;
INSERT INTO `daily_cash_logs` VALUES (1,'2026-11-03',10000.00,0.00,0.00,0.00,0.00,10000.00,20000.00,10000.00,'','Closed','2026-11-03 06:08:32',2,'2026-11-03 06:07:34',1);
/*!40000 ALTER TABLE `daily_cash_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `demo_quotation_items`
--

DROP TABLE IF EXISTS `demo_quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `demo_quotation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `thickness` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `width` decimal(10,2) DEFAULT NULL,
  `height` decimal(10,2) DEFAULT NULL,
  `sqft` decimal(10,2) NOT NULL DEFAULT '0.00',
  `qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `rate` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quotation_id` (`quotation_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `demo_quotation_items_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `demo_quotations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `demo_quotation_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `demo_quotation_items`
--

LOCK TABLES `demo_quotation_items` WRITE;
/*!40000 ALTER TABLE `demo_quotation_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `demo_quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `demo_quotations`
--

DROP TABLE IF EXISTS `demo_quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `demo_quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quotation_date` date NOT NULL,
  `valid_till_date` date DEFAULT NULL,
  `reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `customer_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `contact_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `alternate_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pincode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gst_type` enum('exclusive','inclusive') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'exclusive',
  `gst_percent` decimal(5,2) NOT NULL DEFAULT '18.00',
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cgst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sgst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gst_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `terms_and_conditions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `is_dc` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `demo_quotations`
--

LOCK TABLES `demo_quotations` WRITE;
/*!40000 ALTER TABLE `demo_quotations` DISABLE KEYS */;
/*!40000 ALTER TABLE `demo_quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `expense_categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_categories`
--

LOCK TABLES `expense_categories` WRITE;
/*!40000 ALTER TABLE `expense_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `expense_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reference_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch_id` int NOT NULL,
  `category_id` int NOT NULL,
  `sub_category_id` int DEFAULT NULL,
  `expense_for_type` enum('None','User','Contact') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'None',
  `expense_for_id` int DEFAULT NULL,
  `tax_id` int DEFAULT NULL,
  `document_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `expense_date` date NOT NULL,
  `payment_mode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `is_refund` tinyint(1) DEFAULT '0',
  `payment_account_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_gst` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `idx_expenses_is_gst` (`is_gst`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_attendance`
--

DROP TABLE IF EXISTS `hrms_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `check_in` time DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `status` enum('Present','Late','Half Day','On Leave','Absent') COLLATE utf8mb4_general_ci DEFAULT 'Present',
  `notes` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_date` (`employee_id`,`attendance_date`),
  KEY `idx_hrms_att_date` (`attendance_date`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_attendance`
--

LOCK TABLES `hrms_attendance` WRITE;
/*!40000 ALTER TABLE `hrms_attendance` DISABLE KEYS */;
INSERT INTO `hrms_attendance` VALUES (1,1,'2026-11-02','09:28:00',NULL,'Present','On time','2026-11-02 05:29:38'),(2,2,'2026-11-02','09:45:00',NULL,'Late','Late by 15 mins due to traffic','2026-11-02 05:29:38'),(3,3,'2026-11-02','09:15:00',NULL,'Present','Opening shift','2026-11-02 05:29:38'),(4,4,'2026-11-02','09:20:00',NULL,'Present','On time','2026-11-02 05:29:38'),(5,5,'2026-11-02',NULL,NULL,'On Leave','Approved casual leave','2026-11-02 05:29:38'),(6,6,'2026-11-02','09:00:00',NULL,'Present','Management check-in','2026-11-02 05:29:38'),(11,16,'2026-11-03','18:51:00',NULL,'Late','Staff Web Self Punch','2026-11-03 13:21:04');
/*!40000 ALTER TABLE `hrms_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_candidates`
--

DROP TABLE IF EXISTS `hrms_candidates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_candidates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_opening_id` int DEFAULT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(25) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `experience_years` decimal(4,1) DEFAULT '0.0',
  `current_company` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `resume_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('Applied','Screening','Interviewing','Offered','Hired','Rejected') COLLATE utf8mb4_general_ci DEFAULT 'Applied',
  `interview_date` datetime DEFAULT NULL,
  `interview_feedback` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cand_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_candidates`
--

LOCK TABLES `hrms_candidates` WRITE;
/*!40000 ALTER TABLE `hrms_candidates` DISABLE KEYS */;
/*!40000 ALTER TABLE `hrms_candidates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_departments`
--

DROP TABLE IF EXISTS `hrms_departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_departments`
--

LOCK TABLES `hrms_departments` WRITE;
/*!40000 ALTER TABLE `hrms_departments` DISABLE KEYS */;
INSERT INTO `hrms_departments` VALUES (1,'Sales & Billing','Storefront sales executives and billing terminals','2026-11-02 05:29:38'),(2,'Technical & Service','Mobile, laptop, and electronic repairs & installation','2026-11-02 05:29:38'),(3,'Inventory & Stores','Stock keeping, receiving, warehousing, and dispatch','2026-11-02 05:29:38'),(4,'Accounts & Billing','Finance, ledger, invoices, tax, and GST compliance','2026-11-02 05:29:38'),(5,'Executive Management','Store management, administration, and team leadership','2026-11-02 05:29:38');
/*!40000 ALTER TABLE `hrms_departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_designations`
--

DROP TABLE IF EXISTS `hrms_designations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_designations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_id` int NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_designation_dept` (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_designations`
--

LOCK TABLES `hrms_designations` WRITE;
/*!40000 ALTER TABLE `hrms_designations` DISABLE KEYS */;
INSERT INTO `hrms_designations` VALUES (1,1,'Store Manager','Overall showroom operations and store revenue target','2026-11-02 11:15:51'),(2,1,'Senior Sales Executive','Mobiles and high-value appliances sales specialist','2026-11-02 11:15:51'),(3,1,'Cashier & Billing Officer','Counter billing, POS receipting and cash drawer handling','2026-11-02 11:15:51'),(4,2,'Hardware Service Technician','Mobile display, laptop motherboard & chip-level repair','2026-11-02 11:15:51'),(5,2,'Appliance Installation Tech','AC and washing machine on-site installation','2026-11-02 11:15:51'),(6,3,'Storekeeper & Inward Officer','Goods inward receiving, barcode verification, serial scanning','2026-11-02 11:15:51'),(7,4,'Accountant','GST filing, daily cash tally, ledger and banking audits','2026-11-02 11:15:51');
/*!40000 ALTER TABLE `hrms_designations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_employee_documents`
--

DROP TABLE IF EXISTS `hrms_employee_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_employee_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `document_type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `document_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `file_url` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_emp_docs` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_employee_documents`
--

LOCK TABLES `hrms_employee_documents` WRITE;
/*!40000 ALTER TABLE `hrms_employee_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `hrms_employee_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_employees`
--

DROP TABLE IF EXISTS `hrms_employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(25) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `department` varchar(100) COLLATE utf8mb4_general_ci DEFAULT 'Sales',
  `designation` varchar(100) COLLATE utf8mb4_general_ci DEFAULT 'Executive',
  `branch_id` int DEFAULT '2',
  `salary` decimal(12,2) DEFAULT '0.00',
  `joining_date` date DEFAULT NULL,
  `employment_type` enum('Full-Time','Part-Time','Contract','Trainee') COLLATE utf8mb4_general_ci DEFAULT 'Full-Time',
  `status` enum('Active','On Leave','Resigned','Terminated') COLLATE utf8mb4_general_ci DEFAULT 'Active',
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` int DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pin` varchar(20) COLLATE utf8mb4_general_ci DEFAULT '123456',
  `dob` date DEFAULT NULL,
  `gender` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pan_number` varchar(25) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `aadhaar_number` varchar(25) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `emergency_contact_name` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(25) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `bank_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ifsc_code` varchar(25) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reporting_manager_id` int DEFAULT NULL,
  `resignation_date` date DEFAULT NULL,
  `relieving_date` date DEFAULT NULL,
  `notice_period_days` int DEFAULT '30',
  `sales_person_id` int DEFAULT NULL,
  `profile_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `uq_hrms_employee_user` (`user_id`),
  KEY `idx_hrms_emp_status` (`status`),
  KEY `idx_hrms_emp_dept` (`department`),
  KEY `idx_hrms_emp_branch` (`branch_id`),
  CONSTRAINT `fk_hrms_employee_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_employees`
--

LOCK TABLES `hrms_employees` WRITE;
/*!40000 ALTER TABLE `hrms_employees` DISABLE KEYS */;
INSERT INTO `hrms_employees` VALUES (1,'EMP-001','Ramesh Kumar','ramesh@gmail.com','9626394336','Sales & Billing','Senior Sales Executive',2,28000.00,'2024-01-15','Full-Time','Active',NULL,'2026-11-02 05:29:38','2026-11-03 04:56:12',10,'$2b$10$fU.R3RUn5bu5le.lWkZoLel7.edYjbt.S9OZg3En3X1S.PdMgiUiK','123456',NULL,'Male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,30,3,NULL),(2,'EMP-002','Rajesh Kumar','rajesh@gmail.com','9876501234','Sales & Billing','Sales Executive',2,22000.00,'2024-02-01','Full-Time','Active',NULL,'2026-11-02 05:29:38','2026-11-03 04:58:35',11,'$2b$10$8tiBBRa5h17M/1/RTDdO3.CzJTCsWnKtx9weSc1yLHf08/VgoP7zq','123456',NULL,'Male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,30,NULL,NULL),(3,'EMP-003','Karthik Subramanian','karthik.tech@shiva.com','9840123456','Technical & Service','Lead Technician',2,32000.00,'2025-11-10','Full-Time','Active',NULL,'2026-11-02 05:29:38','2026-11-03 04:59:10',12,'$2b$10$UqiWO..isA8Lwa/0ZvwQFuWkdA.SHW2MOLKPflc3GVTwwDcqLfVyW','123456',NULL,'Male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,30,NULL,NULL),(4,'EMP-004','Priya Murugan','priya.accounts@shiva.com','9443210987','Accounts & Billing','Senior Accountant',2,35000.00,'2025-08-20','Full-Time','Active',NULL,'2026-11-02 05:29:38','2026-11-02 12:21:11',NULL,'$2b$10$af8UvvN/yHEeZ3xMiTgZrueq5/nMTtP1CdNwGevlTVyhVGw50HNCu','123456',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,30,NULL,NULL),(5,'EMP-005','Suresh Kumar','suresh.stores@shiva.com','9789012345','Inventory & Stores','Warehouse Incharge',2,26000.00,'2026-03-01','Full-Time','Active',NULL,'2026-11-02 05:29:38','2026-11-02 12:21:11',NULL,'$2b$10$af8UvvN/yHEeZ3xMiTgZrueq5/nMTtP1CdNwGevlTVyhVGw50HNCu','123456',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,30,NULL,NULL),(8,'EMP-007','Ramesh','ramesh@gmail.com','9898978909','Accounts & Billing','Executive',2,0.00,'2026-11-02','Full-Time','Active',NULL,'2026-11-02 13:22:22','2026-11-02 13:22:22',NULL,NULL,'123456','2002-10-19','Male','ABC89099','678956789090','Mother','8682933260','Salem, India',NULL,NULL,NULL,NULL,NULL,NULL,30,NULL,NULL),(13,'EMP-008','Cashier Debug','cdebug@siva.com',NULL,'Sales & Billing','Staff',1,0.00,'2026-11-03','Full-Time','Active',NULL,'2026-11-03 05:20:38','2026-11-03 05:20:38',NULL,'$2b$10$5cQ5oqmAScUlQA.TjKOupuEW.GvwoYEfsBOWH7t/ZrFzLXBM/zCAW','123456',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,30,NULL,NULL),(16,'EMP-009','Ramya','ramya@gmail.com','9898978908','Accounts & Billing','Cashier',2,50000.00,'2026-11-03','Full-Time','Active',NULL,'2026-11-03 05:26:21','2026-11-03 05:26:21',18,'$2b$10$VFN9hGP0.0iyeXSbdcnf/eOMA6D9QoQzuYGWwYZF9a67QLUDFMVY6','123456','2002-10-19','Female','ABC89090','678956789091','Mother','8682933268','Salem, India','HDFC BANK','890800999','IDBI8909',NULL,NULL,NULL,30,NULL,NULL),(17,'EMP-ADM','Administrator',NULL,NULL,'Management','General Manager',2,0.00,NULL,'Full-Time','Active',NULL,'2026-11-03 13:11:00','2026-11-03 13:11:00',1,NULL,'123456',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,30,NULL,NULL),(18,'EMP-SUPER','Clavis Tech',NULL,NULL,'Management','Super Administrator',2,0.00,NULL,'Full-Time','Active',NULL,'2026-11-03 13:11:00','2026-11-03 13:11:00',4,NULL,'123456',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,30,NULL,NULL);
/*!40000 ALTER TABLE `hrms_employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_expenses`
--

DROP TABLE IF EXISTS `hrms_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `expense_date` date NOT NULL,
  `category` enum('Travel','Food','Client Meeting','Store Supplies','Courier','Other') COLLATE utf8mb4_general_ci DEFAULT 'Other',
  `amount` decimal(10,2) NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `receipt_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected','Reimbursed') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `approved_by` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exp_emp` (`employee_id`),
  KEY `idx_exp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_expenses`
--

LOCK TABLES `hrms_expenses` WRITE;
/*!40000 ALTER TABLE `hrms_expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `hrms_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_incentive_rules`
--

DROP TABLE IF EXISTS `hrms_incentive_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_incentive_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `min_sales_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commission_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `fixed_bonus` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('Active','Inactive') COLLATE utf8mb4_general_ci DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_incentive_rules`
--

LOCK TABLES `hrms_incentive_rules` WRITE;
/*!40000 ALTER TABLE `hrms_incentive_rules` DISABLE KEYS */;
INSERT INTO `hrms_incentive_rules` VALUES (1,'Standard Showroom Commission',100000.00,1.50,500.00,'Active','2026-11-02 11:15:51'),(2,'High-Performance Bonus Club',500000.00,2.50,5000.00,'Active','2026-11-02 11:15:51');
/*!40000 ALTER TABLE `hrms_incentive_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_job_openings`
--

DROP TABLE IF EXISTS `hrms_job_openings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_job_openings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `department` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `openings_count` int DEFAULT '1',
  `experience_required` varchar(50) COLLATE utf8mb4_general_ci DEFAULT '0-2 Years',
  `salary_range` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('Open','In Review','Closed') COLLATE utf8mb4_general_ci DEFAULT 'Open',
  `description` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_job_openings`
--

LOCK TABLES `hrms_job_openings` WRITE;
/*!40000 ALTER TABLE `hrms_job_openings` DISABLE KEYS */;
/*!40000 ALTER TABLE `hrms_job_openings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_leaves`
--

DROP TABLE IF EXISTS `hrms_leaves`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_leaves` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `leave_type` enum('Casual','Sick','Earned','Emergency','Maternity','Unpaid') COLLATE utf8mb4_general_ci DEFAULT 'Casual',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_days` decimal(4,1) DEFAULT '1.0',
  `reason` text COLLATE utf8mb4_general_ci,
  `status` enum('Pending','Approved','Rejected') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `approved_by` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rejection_reason` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_hrms_leave_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_leaves`
--

LOCK TABLES `hrms_leaves` WRITE;
/*!40000 ALTER TABLE `hrms_leaves` DISABLE KEYS */;
INSERT INTO `hrms_leaves` VALUES (1,2,'Casual','2026-11-02','2026-11-02',1.0,'Personal family commitment','Pending',NULL,'2026-11-02 05:29:38',NULL),(2,5,'Sick','2026-11-02','2026-11-02',1.0,'Seasonal viral recovery','Approved',NULL,'2026-11-02 05:29:38',NULL);
/*!40000 ALTER TABLE `hrms_leaves` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_payroll`
--

DROP TABLE IF EXISTS `hrms_payroll`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_payroll` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month` varchar(7) COLLATE utf8mb4_general_ci NOT NULL,
  `employee_id` int NOT NULL,
  `total_working_days` decimal(4,1) DEFAULT '30.0',
  `present_days` decimal(4,1) DEFAULT '0.0',
  `paid_leaves` decimal(4,1) DEFAULT '0.0',
  `unpaid_leaves` decimal(4,1) DEFAULT '0.0',
  `overtime_hours` decimal(5,1) DEFAULT '0.0',
  `basic_salary` decimal(12,2) DEFAULT '0.00',
  `hra` decimal(12,2) DEFAULT '0.00',
  `conveyance` decimal(12,2) DEFAULT '0.00',
  `special_allowance` decimal(12,2) DEFAULT '0.00',
  `overtime_pay` decimal(12,2) DEFAULT '0.00',
  `sales_incentives` decimal(12,2) DEFAULT '0.00',
  `bonus` decimal(12,2) DEFAULT '0.00',
  `gross_salary` decimal(12,2) DEFAULT '0.00',
  `pf_deduction` decimal(12,2) DEFAULT '0.00',
  `esi_deduction` decimal(12,2) DEFAULT '0.00',
  `pt_deduction` decimal(12,2) DEFAULT '0.00',
  `advance_deduction` decimal(12,2) DEFAULT '0.00',
  `tds_deduction` decimal(12,2) DEFAULT '0.00',
  `total_deductions` decimal(12,2) DEFAULT '0.00',
  `net_salary` decimal(12,2) DEFAULT '0.00',
  `payment_status` enum('Draft','Approved','Paid') COLLATE utf8mb4_general_ci DEFAULT 'Draft',
  `payment_date` date DEFAULT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'Bank Transfer',
  `payment_reference` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_month` (`employee_id`,`month`),
  KEY `idx_payroll_month` (`month`),
  KEY `idx_payroll_status` (`payment_status`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_payroll`
--

LOCK TABLES `hrms_payroll` WRITE;
/*!40000 ALTER TABLE `hrms_payroll` DISABLE KEYS */;
INSERT INTO `hrms_payroll` VALUES (1,'2026-11',1,30.0,1.0,0.0,29.0,0.0,14000.00,8400.00,0.00,5600.00,0.00,0.00,0.00,28000.00,1680.00,0.00,200.00,0.00,0.00,1880.00,26120.00,'Draft',NULL,'Bank Transfer',NULL,NULL,'2026-11-02 11:51:15','2026-11-02 11:51:15'),(2,'2026-11',2,30.0,1.0,0.0,29.0,0.0,12000.00,7200.00,0.00,4800.00,0.00,0.00,0.00,24000.00,1440.00,0.00,200.00,0.00,0.00,1640.00,22360.00,'Draft',NULL,'Bank Transfer',NULL,NULL,'2026-11-02 11:51:15','2026-11-02 11:51:15'),(3,'2026-11',3,30.0,1.0,0.0,29.0,0.0,16000.00,9600.00,0.00,6400.00,0.00,0.00,0.00,32000.00,1800.00,0.00,200.00,0.00,0.00,2000.00,30000.00,'Draft',NULL,'Bank Transfer',NULL,NULL,'2026-11-02 11:51:15','2026-11-02 11:51:15'),(4,'2026-11',4,30.0,1.0,0.0,29.0,0.0,17500.00,10500.00,0.00,7000.00,0.00,0.00,0.00,35000.00,1800.00,0.00,200.00,0.00,0.00,2000.00,33000.00,'Draft',NULL,'Bank Transfer',NULL,NULL,'2026-11-02 11:51:15','2026-11-02 11:51:15'),(5,'2026-11',5,30.0,0.0,1.0,29.0,0.0,13000.00,7800.00,0.00,5200.00,0.00,0.00,0.00,26000.00,1560.00,0.00,200.00,0.00,0.00,1760.00,24240.00,'Draft',NULL,'Bank Transfer',NULL,NULL,'2026-11-02 11:51:15','2026-11-02 11:51:15'),(6,'2026-11',6,30.0,1.0,0.0,29.0,0.0,27500.00,16500.00,0.00,11000.00,0.00,0.00,0.00,55000.00,1800.00,0.00,200.00,0.00,0.00,2000.00,53000.00,'Draft',NULL,'Bank Transfer',NULL,NULL,'2026-11-02 11:51:15','2026-11-02 11:51:15');
/*!40000 ALTER TABLE `hrms_payroll` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_salary_advances`
--

DROP TABLE IF EXISTS `hrms_salary_advances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_salary_advances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `advance_amount` decimal(12,2) NOT NULL,
  `repayment_months` int NOT NULL DEFAULT '1',
  `monthly_deduction` decimal(12,2) NOT NULL,
  `remaining_amount` decimal(12,2) NOT NULL,
  `reason` text COLLATE utf8mb4_general_ci,
  `status` enum('Pending','Approved','Rejected','Fully Repaid') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `approved_by` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_adv_emp` (`employee_id`),
  KEY `idx_adv_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_salary_advances`
--

LOCK TABLES `hrms_salary_advances` WRITE;
/*!40000 ALTER TABLE `hrms_salary_advances` DISABLE KEYS */;
/*!40000 ALTER TABLE `hrms_salary_advances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hrms_sales_targets`
--

DROP TABLE IF EXISTS `hrms_sales_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hrms_sales_targets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `month` varchar(7) COLLATE utf8mb4_general_ci NOT NULL,
  `target_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `target_invoices` int DEFAULT '0',
  `notes` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_target_emp_month` (`employee_id`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hrms_sales_targets`
--

LOCK TABLES `hrms_sales_targets` WRITE;
/*!40000 ALTER TABLE `hrms_sales_targets` DISABLE KEYS */;
/*!40000 ALTER TABLE `hrms_sales_targets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_no`
--

DROP TABLE IF EXISTS `invoice_no`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_no` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `bill_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `serial_no` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invoice_no_branch_bill` (`branch_id`,`bill_type`),
  CONSTRAINT `fk_invoice_no_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_no`
--

LOCK TABLES `invoice_no` WRITE;
/*!40000 ALTER TABLE `invoice_no` DISABLE KEYS */;
INSERT INTO `invoice_no` VALUES (1,2,'purchase',1),(2,2,'sale',2);
/*!40000 ALTER TABLE `invoice_no` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_settings`
--

DROP TABLE IF EXISTS `invoice_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int DEFAULT NULL,
  `company_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gst_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pan_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `logo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `terms` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `bank_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `account_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ifsc_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `upi_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `invoice_settings_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_settings`
--

LOCK TABLES `invoice_settings` WRITE;
/*!40000 ALTER TABLE `invoice_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT '0.00',
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `card_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `card_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_for` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ref_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date` date DEFAULT NULL,
  `bank_account_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `permission_key` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_key` (`permission_key`)
) ENGINE=InnoDB AUTO_INCREMENT=835 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'dashboard','dashboard.view','View dashboard'),(2,'products','products.view','View products'),(3,'products','products.create','Create products'),(4,'products','products.edit','Edit products'),(5,'products','products.delete','Delete products'),(6,'category','category.view','View categories'),(7,'category','category.create','Create categories'),(8,'category','category.edit','Edit categories'),(9,'category','category.delete','Delete categories'),(10,'sales','sales.view','View sales'),(11,'sales','sales.create','Create sales'),(12,'sales','sales.edit','Edit sales'),(13,'sales','sales.delete','Delete sales'),(14,'quotations','quotations.view','View quotations'),(15,'quotations','quotations.create','Create quotations'),(16,'quotations','quotations.edit','Edit quotations'),(17,'quotations','quotations.delete','Delete quotations'),(18,'purchases','purchases.view','View purchases'),(19,'purchases','purchases.create','Create purchases'),(20,'purchases','purchases.edit','Edit purchases'),(21,'purchases','purchases.delete','Delete purchases'),(22,'stock','stock.view','View stock'),(23,'stock','stock.create','Create stock entries'),(24,'stock','stock.edit','Edit stock'),(25,'customers','customers.view','View customers'),(26,'customers','customers.create','Create customers'),(27,'customers','customers.edit','Edit customers'),(28,'customers','customers.delete','Delete customers'),(29,'vendors','vendors.view','View vendors'),(30,'vendors','vendors.create','Create vendors'),(31,'vendors','vendors.edit','Edit vendors'),(32,'vendors','vendors.delete','Delete vendors'),(33,'reports','reports.view','View reports'),(34,'settings','settings.view','View settings'),(35,'settings','settings.edit','Edit settings'),(36,'branches','branches.view','View branches'),(37,'branches','branches.create','Create branches'),(38,'branches','branches.edit','Edit branches'),(39,'users','users.view','View users'),(40,'users','users.create','Create users'),(41,'users','users.edit','Edit users'),(42,'users','users.delete','Delete users'),(48,'expenses','expenses.view','View expenses and categories'),(49,'expenses','expenses.create','Add expenses and categories'),(50,'expenses','expenses.edit','Edit expenses and categories'),(51,'expenses','expenses.delete','Delete expenses and categories'),(52,'tax_modules','tax_modules.view','View tax modules'),(53,'tax_modules','tax_modules.create','Create tax modules'),(54,'tax_modules','tax_modules.edit','Edit tax modules'),(55,'tax_modules','tax_modules.delete','Delete tax modules'),(56,'tax_groups','tax_groups.view','View tax groups'),(57,'tax_groups','tax_groups.create','Create tax groups'),(58,'tax_groups','tax_groups.edit','Edit tax groups'),(59,'tax_groups','tax_groups.delete','Delete tax groups'),(60,'ledger','ledger.view','View ledger'),(61,'ledger','ledger.create','Create ledger entries'),(62,'ledger','ledger.edit','Edit ledger entries'),(63,'ledger','ledger.delete','Delete ledger entries'),(64,'bank_accounts','bank_accounts.view','View bank accounts'),(65,'bank_accounts','bank_accounts.create','Create bank accounts'),(66,'bank_accounts','bank_accounts.edit','Edit bank accounts'),(67,'bank_accounts','bank_accounts.delete','Delete bank accounts'),(68,'day_closing','day_closing.view','View day closing'),(69,'day_closing','day_closing.create','Create day closing'),(70,'day_closing','day_closing.edit','Edit day closing'),(71,'day_closing','day_closing.delete','Delete day closing'),(72,'business_location','business_location.view','View business location'),(73,'business_location','business_location.create','Create business location'),(74,'business_location','business_location.edit','Edit business location'),(75,'business_location','business_location.delete','Delete business location'),(76,'hrms','hrms.view','View HRMS dashboard and employee information'),(77,'hrms','hrms.employees.create','Create HRMS employee records'),(78,'hrms','hrms.employees.edit','Edit HRMS employee records'),(79,'hrms','hrms.employees.delete','Delete HRMS employee records'),(80,'hrms','hrms.attendance.manage','Record and update employee attendance'),(81,'hrms','hrms.leave.create','Submit employee leave requests'),(82,'hrms','hrms.leave.approve','Approve or reject employee leave requests'),(83,'hrms','hrms.payroll.view','View HRMS payroll information'),(84,'hrms','hrms.payroll.edit','Manage HRMS payroll'),(85,'hrms','hrms.reports.view','View HRMS reports'),(86,'hrms','hrms.settings.edit','Manage HRMS settings');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `primary_units`
--

DROP TABLE IF EXISTS `primary_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `primary_units` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `unit_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unit_name` (`unit_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `primary_units`
--

LOCK TABLES `primary_units` WRITE;
/*!40000 ALTER TABLE `primary_units` DISABLE KEYS */;
INSERT INTO `primary_units` VALUES (1,'PCS','2026-10-29 12:27:03');
/*!40000 ALTER TABLE `primary_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_serial_numbers`
--

DROP TABLE IF EXISTS `product_serial_numbers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_serial_numbers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `unit_index` int DEFAULT '1',
  `imei_1` varchar(50) DEFAULT NULL,
  `imei_2` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'AVAILABLE',
  `sale_transaction_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_psn_product_id` (`product_id`),
  KEY `idx_psn_imei_1` (`imei_1`),
  KEY `idx_psn_imei_2` (`imei_2`),
  KEY `idx_psn_serial` (`serial_number`),
  KEY `idx_psn_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_serial_numbers`
--

LOCK TABLES `product_serial_numbers` WRITE;
/*!40000 ALTER TABLE `product_serial_numbers` DISABLE KEYS */;
INSERT INTO `product_serial_numbers` VALUES (1,7,1,'354891091234501','354891091234502','R58NA001XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(2,7,2,'354891091234511','354891091234512','R58NA002XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(3,7,3,'354891091234521','354891091234522','R58NA003XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(4,7,4,'354891091234531','354891091234532','R58NA004XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(5,7,5,'354891091234541','354891091234542','R58NA005XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(6,7,6,'354891091234551','354891091234552','R58NA006XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(7,7,7,'354891091234561','354891091234562','R58NA007XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(8,7,8,'354891091234571','354891091234572','R58NA008XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(9,7,9,'354891091234581','354891091234582','R58NA009XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(10,7,10,'354891091234591','354891091234592','R58NA010XY','AVAILABLE',NULL,'2026-11-02 11:05:58'),(11,7,11,'867124058912301','867124058912302','R58NB011ZW','AVAILABLE',NULL,'2026-11-02 11:05:58'),(12,7,12,'867124058912311','867124058912312','R58NB012ZW','AVAILABLE',NULL,'2026-11-02 11:05:58'),(13,7,13,'867124058912321','867124058912322','R58NB013ZW','AVAILABLE',NULL,'2026-11-02 11:05:58'),(14,7,14,'867124058912331','867124058912332','R58NB014ZW','AVAILABLE',NULL,'2026-11-02 11:05:58'),(15,7,15,'867124058912341','867124058912342','R58NB015ZW','AVAILABLE',NULL,'2026-11-02 11:05:58'),(16,7,16,'867124058912351','867124058912352','R58NB016ZW','AVAILABLE',NULL,'2026-11-02 11:05:58'),(17,7,17,'867124058912361','867124058912362','R58NB017ZW','AVAILABLE',NULL,'2026-11-02 11:05:58'),(18,7,18,'867124058912371','867124058912372','R58NB018ZW','AVAILABLE',NULL,'2026-11-02 11:05:58'),(19,7,19,'867124058912381','867124058912382','R58NB019ZW','AVAILABLE',NULL,'2026-11-02 11:05:58'),(20,7,20,'867124058912391','867124058912392','R58NB020ZW','AVAILABLE',NULL,'2026-11-02 11:05:58');
/*!40000 ALTER TABLE `product_serial_numbers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `subcategory_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `product_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `short_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `thickness` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `length` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `height` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `width` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sqft` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sqft_inches` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `unit` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `primary_unit` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `parameter` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `hsncode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tax` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'GST',
  `gst_rate` decimal(5,2) DEFAULT NULL,
  `min_order_quantity` int DEFAULT NULL,
  `price` decimal(12,2) DEFAULT NULL,
  `images` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Active',
  `is_insulation_subfield` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `receipt_no` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `barcode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `product_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `specifications` json DEFAULT NULL,
  `combos` json DEFAULT NULL,
  `freebies` json DEFAULT NULL,
  `quantity` decimal(12,3) DEFAULT '0.000',
  `serial_units` longtext COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `subcategory_id` (`subcategory_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,3,1,2,'oppo mobile A78','001',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PCS','PCS',NULL,'12345','GST',NULL,NULL,18000.00,NULL,'Active',0,'2026-10-29 12:28:11',2,NULL,NULL,0.00,'CTW-0001','mobiles','{\"ram\": \"128GB\", \"rom\": \"8GB\", \"color\": \"BLUE\", \"battery\": \"5000\", \"warranty\": \"2-YEAR\", \"back_camera\": \"50MP\", \"display_size\": \"5.5\", \"front_camera\": \"8MP\", \"model_number\": \"25413\", \"processor_os\": \"COLOR OS\"}',NULL,NULL,0.000,NULL),(4,2,2,1,'LG Fridge 3 star','1234',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'7214','GST',NULL,NULL,40000.00,NULL,'Active',0,'2026-11-02 06:39:05',2,NULL,NULL,5.00,'1001972594','home_appliances','{\"capacity\": \"3 litre\", \"warranty\": \"2 years\", \"color_finish\": \"Silver\", \"model_number\": \"34564\", \"power_consumption\": \"100W\"}',NULL,NULL,20.000,NULL),(5,2,3,1,'LG AC ','123',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PCS','PCS',NULL,'7809','GST',NULL,NULL,50000.00,NULL,'Active',0,'2026-11-02 06:42:47',2,NULL,NULL,5.00,'SE-0009','home_appliances','{\"capacity\": \"3 ton\", \"warranty\": \"3 years\", \"color_finish\": \"White\", \"model_number\": \"67999\", \"power_consumption\": \"250 W\"}',NULL,NULL,3.000,NULL),(6,3,1,3,'Samsung A4','5678',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PCS','PCS',NULL,'4345','GST',NULL,NULL,20000.00,NULL,'Active',0,'2026-11-02 10:02:25',2,NULL,NULL,5.00,'SE-00002','mobiles','{\"ram\": \"8gb\", \"rom\": \"8gb\", \"color\": \"red\", \"battery\": \"1200mah\", \"warranty\": \"2 years\", \"back_camera\": \"55mp\", \"display_size\": \"curved\", \"front_camera\": \"32mp\", \"model_number\": \"342333\", \"processor_os\": \"snapdragon\"}','[\"Bluetooth head band\", \"65W Fast Charger\"]','[\"Free 11D Tempered Glass\"]',10.000,NULL),(7,3,1,3,'Samsung A5','4567',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PCS','PCS',NULL,'78900','GST',NULL,NULL,20000.00,NULL,'Active',0,'2026-11-02 11:05:58',2,NULL,NULL,5.00,'SE-0003','mobiles','{\"ram\": \"8gb\", \"rom\": \"8gb\", \"color\": \"red\", \"battery\": \"1200mah\", \"warranty\": \"2 years\", \"back_camera\": \"55mp\", \"display_size\": \"curved\", \"front_camera\": \"30mp\", \"model_number\": \"8999\", \"processor_os\": \"snapdragon 8th gen\"}','[\"Bluetooth Neckband\", \"10,000mAh Power Bank\"]','[\"Free 11D Tempered Glass\", \"Free Transparent Back Case\"]',20.000,'[{\"imei_1\":\"354891091234501\",\"imei_2\":\"354891091234502\",\"serial_number\":\"R58NA001XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"354891091234511\",\"imei_2\":\"354891091234512\",\"serial_number\":\"R58NA002XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"354891091234521\",\"imei_2\":\"354891091234522\",\"serial_number\":\"R58NA003XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"354891091234531\",\"imei_2\":\"354891091234532\",\"serial_number\":\"R58NA004XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"354891091234541\",\"imei_2\":\"354891091234542\",\"serial_number\":\"R58NA005XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"354891091234551\",\"imei_2\":\"354891091234552\",\"serial_number\":\"R58NA006XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"354891091234561\",\"imei_2\":\"354891091234562\",\"serial_number\":\"R58NA007XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"354891091234571\",\"imei_2\":\"354891091234572\",\"serial_number\":\"R58NA008XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"354891091234581\",\"imei_2\":\"354891091234582\",\"serial_number\":\"R58NA009XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"354891091234591\",\"imei_2\":\"354891091234592\",\"serial_number\":\"R58NA010XY\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912301\",\"imei_2\":\"867124058912302\",\"serial_number\":\"R58NB011ZW\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912311\",\"imei_2\":\"867124058912312\",\"serial_number\":\"R58NB012ZW\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912321\",\"imei_2\":\"867124058912322\",\"serial_number\":\"R58NB013ZW\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912331\",\"imei_2\":\"867124058912332\",\"serial_number\":\"R58NB014ZW\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912341\",\"imei_2\":\"867124058912342\",\"serial_number\":\"R58NB015ZW\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912351\",\"imei_2\":\"867124058912352\",\"serial_number\":\"R58NB016ZW\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912361\",\"imei_2\":\"867124058912362\",\"serial_number\":\"R58NB017ZW\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912371\",\"imei_2\":\"867124058912372\",\"serial_number\":\"R58NB018ZW\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912381\",\"imei_2\":\"867124058912382\",\"serial_number\":\"R58NB019ZW\",\"status\":\"AVAILABLE\"},{\"imei_1\":\"867124058912391\",\"imei_2\":\"867124058912392\",\"serial_number\":\"R58NB020ZW\",\"status\":\"AVAILABLE\"}]');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_items`
--

DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `thickness` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `width` decimal(10,2) DEFAULT NULL,
  `length` decimal(10,2) DEFAULT NULL,
  `sqft` decimal(10,2) DEFAULT NULL,
  `qty` decimal(12,3) DEFAULT '1.000',
  `sqft_rate` decimal(10,2) DEFAULT NULL,
  `price` decimal(12,2) DEFAULT NULL,
  `margin` decimal(8,2) DEFAULT NULL,
  `hsncode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `selling_rate` decimal(10,2) DEFAULT NULL,
  `total` decimal(12,2) DEFAULT NULL,
  `primary_unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `discount` decimal(12,2) DEFAULT '0.00',
  `tax_group_id` int DEFAULT NULL,
  `margin_type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT '%',
  PRIMARY KEY (`id`),
  KEY `purchase_id` (`purchase_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_items`
--

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
INSERT INTO `purchase_items` VALUES (1,1,1,NULL,NULL,NULL,NULL,NULL,10.000,NULL,18000.00,NULL,'12345',18000.00,180000.00,'PCS',0.00,NULL,'%');
/*!40000 ALTER TABLE `purchase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_return_items`
--

DROP TABLE IF EXISTS `purchase_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_return_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_return_id` int NOT NULL,
  `purchase_item_id` int DEFAULT NULL,
  `product_id` int NOT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `hsncode` varchar(50) DEFAULT NULL,
  `return_qty` decimal(12,3) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `tax_group_id` int DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pri_return` (`purchase_return_id`),
  KEY `idx_pri_product` (`product_id`),
  CONSTRAINT `purchase_return_items_ibfk_1` FOREIGN KEY (`purchase_return_id`) REFERENCES `purchase_returns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_return_items`
--

LOCK TABLES `purchase_return_items` WRITE;
/*!40000 ALTER TABLE `purchase_return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_returns`
--

DROP TABLE IF EXISTS `purchase_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_returns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `return_no` varchar(100) NOT NULL,
  `purchase_id` int DEFAULT NULL,
  `purchase_no` varchar(100) DEFAULT NULL,
  `vendor_id` int NOT NULL,
  `return_date` date NOT NULL,
  `refund_type` enum('Bank / Cash Refund','Vendor Credit / Ledger') DEFAULT 'Bank / Cash Refund',
  `bank_account_id` int DEFAULT NULL,
  `payment_mode` varchar(50) DEFAULT 'Bank Transfer',
  `total_qty` decimal(12,3) DEFAULT '0.000',
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `grand_total` decimal(12,2) DEFAULT '0.00',
  `notes` text,
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_no` (`return_no`),
  KEY `idx_pr_vendor` (`vendor_id`),
  KEY `idx_pr_purchase` (`purchase_id`),
  KEY `idx_pr_branch` (`branch_id`),
  KEY `idx_pr_date` (`return_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_returns`
--

LOCK TABLES `purchase_returns` WRITE;
/*!40000 ALTER TABLE `purchase_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `po_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `vendor_id` int NOT NULL,
  `payment_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `paid_amount` decimal(12,2) DEFAULT '0.00',
  `due_amount` decimal(12,2) DEFAULT '0.00',
  `payment_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'paid',
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Received',
  `bank_account_id` int DEFAULT NULL,
  `vehicle_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `transport_charges` decimal(12,2) DEFAULT '0.00',
  `additional_charges` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_no` (`purchase_no`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchases`
--

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
INSERT INTO `purchases` VALUES (1,'CTW-PUR-0001',NULL,'2026-10-29',1,'Credit',180000.00,0.00,'paid','2026-10-30','2026-10-29 13:47:19',2,'Received',NULL,NULL,0.00,NULL);
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_items`
--

DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `product_model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `hsncode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `qty` decimal(10,2) DEFAULT '0.00',
  `rate_1` decimal(12,2) DEFAULT NULL,
  `rate_2` decimal(12,2) DEFAULT NULL,
  `rate_3` decimal(12,2) DEFAULT NULL,
  `rate_4` decimal(12,2) DEFAULT NULL,
  `discount` decimal(12,2) DEFAULT NULL,
  `total` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quotation_id` (`quotation_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `quotation_items_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotation_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_items`
--

LOCK TABLES `quotation_items` WRITE;
/*!40000 ALTER TABLE `quotation_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quotation_date` date DEFAULT NULL,
  `valid_till_date` date DEFAULT NULL,
  `valid_till` date DEFAULT NULL,
  `reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_id` int NOT NULL,
  `terms_and_conditions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `terms` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `show_price_totals` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  `transport_charges` decimal(10,2) DEFAULT NULL,
  `tax_group_id` int DEFAULT NULL,
  `gst_percent` decimal(5,2) DEFAULT NULL,
  `gst_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quotation_no` (`quotation_no`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `quotations_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotations`
--

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_perm` (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1033 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (990,1,1),(1006,1,2),(1003,1,3),(1004,1,4),(1005,1,5),(983,1,6),(984,1,7),(982,1,8),(985,1,9),(1012,1,10),(1013,1,11),(1014,1,12),(1015,1,13),(1007,1,18),(1008,1,19),(1009,1,20),(1010,1,21),(1018,1,22),(1017,1,23),(1016,1,24),(986,1,25),(987,1,26),(988,1,27),(989,1,28),(1022,1,29),(1021,1,30),(1020,1,31),(1019,1,32),(1011,1,33),(995,1,48),(998,1,49),(996,1,50),(997,1,51),(1002,1,60),(999,1,61),(1001,1,62),(1000,1,63),(981,1,64),(980,1,65),(979,1,66),(978,1,67),(991,1,68),(992,1,69),(993,1,70),(994,1,71),(658,5,1),(674,5,2),(671,5,3),(673,5,4),(672,5,5),(653,5,6),(650,5,7),(652,5,8),(651,5,9),(687,5,10),(684,5,11),(686,5,12),(685,5,13),(682,5,14),(679,5,15),(681,5,16),(680,5,17),(678,5,18),(675,5,19),(677,5,20),(676,5,21),(697,5,22),(695,5,23),(696,5,24),(657,5,25),(654,5,26),(656,5,27),(655,5,28),(713,5,29),(710,5,30),(712,5,31),(711,5,32),(683,5,33),(694,5,34),(693,5,35),(645,5,36),(643,5,37),(644,5,38),(709,5,39),(706,5,40),(708,5,41),(707,5,42),(666,5,48),(663,5,49),(665,5,50),(664,5,51),(705,5,52),(702,5,53),(704,5,54),(703,5,55),(701,5,56),(698,5,57),(700,5,58),(699,5,59),(670,5,60),(667,5,61),(669,5,62),(668,5,63),(642,5,64),(639,5,65),(641,5,66),(640,5,67),(662,5,68),(659,5,69),(661,5,70),(660,5,71),(649,5,72),(646,5,73),(648,5,74),(647,5,75),(1027,8,2),(1031,8,10),(1029,8,11),(1030,8,12),(1032,8,22),(1024,8,25),(1023,8,26),(1028,8,33),(1026,8,68),(1025,8,69);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Admin','Limited operational access','2026-03-18 05:55:42'),(3,'Staff','Limited operational access','2026-03-18 05:55:42'),(5,'super admin','Full system access','2026-05-20 04:11:01'),(7,'Sales Person','Sales Person with HRMS Self-Service access','2026-11-02 12:45:10'),(8,'Cashier','Billing Cashier with POS and Invoicing access','2026-11-03 05:13:07');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_person_payouts`
--

DROP TABLE IF EXISTS `sales_person_payouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_person_payouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_person_id` int NOT NULL,
  `month` varchar(7) COLLATE utf8mb4_general_ci NOT NULL,
  `total_sales` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commission_earned` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payout_date` date NOT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'Cash',
  `reference_no` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payouts_sp_month` (`sales_person_id`,`month`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_person_payouts`
--

LOCK TABLES `sales_person_payouts` WRITE;
/*!40000 ALTER TABLE `sales_person_payouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_person_payouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_persons`
--

DROP TABLE IF EXISTS `sales_persons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_persons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(25) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `commission_type` enum('percentage','fixed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'percentage',
  `commission_rate` decimal(8,2) NOT NULL DEFAULT '0.00',
  `target_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `branch_id` int DEFAULT NULL,
  `status` enum('Active','Inactive') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Active',
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_persons_status` (`status`),
  KEY `idx_sales_persons_branch` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_persons`
--

LOCK TABLES `sales_persons` WRITE;
/*!40000 ALTER TABLE `sales_persons` DISABLE KEYS */;
INSERT INTO `sales_persons` VALUES (3,'SP-001','Ramesh Kumar','9626394336','ramesh@gmail.com','percentage',0.00,0.00,2,'Active',NULL,'2026-10-30 11:25:28','2026-11-03 04:56:12'),(4,'SP-002','Rajesh','8907893455','rajesh@gmail.com','percentage',10.00,300000.00,2,'Active',NULL,'2026-10-30 12:04:21','2026-10-30 12:08:57');
/*!40000 ALTER TABLE `sales_persons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `secondary_units`
--

DROP TABLE IF EXISTS `secondary_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `secondary_units` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `unit_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unit_name` (`unit_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `secondary_units`
--

LOCK TABLES `secondary_units` WRITE;
/*!40000 ALTER TABLE `secondary_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `secondary_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_in`
--

DROP TABLE IF EXISTS `stock_in`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_in` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `qty` decimal(12,3) DEFAULT '0.000',
  `purchase_price` decimal(10,2) DEFAULT NULL,
  `total_purchase_price` decimal(12,2) DEFAULT NULL,
  `selling_price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `purchase_id` (`purchase_id`),
  CONSTRAINT `stock_in_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `stock_in_ibfk_2` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_in`
--

LOCK TABLES `stock_in` WRITE;
/*!40000 ALTER TABLE `stock_in` DISABLE KEYS */;
INSERT INTO `stock_in` VALUES (1,1,1,'2026-10-29',10.000,18000.00,180000.00,18000.00,'2026-10-29 13:47:19',2);
/*!40000 ALTER TABLE `stock_in` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stocks`
--

DROP TABLE IF EXISTS `stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `quantity` decimal(12,3) DEFAULT '0.000',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  CONSTRAINT `stocks_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stocks`
--

LOCK TABLES `stocks` WRITE;
/*!40000 ALTER TABLE `stocks` DISABLE KEYS */;
INSERT INTO `stocks` VALUES (1,1,8.000,'2026-11-02 05:14:51',NULL);
/*!40000 ALTER TABLE `stocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subcategories`
--

DROP TABLE IF EXISTS `subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subcategories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `subcategory_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'active',
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subcategories`
--

LOCK TABLES `subcategories` WRITE;
/*!40000 ALTER TABLE `subcategories` DISABLE KEYS */;
INSERT INTO `subcategories` VALUES (1,3,'TOUCH MOBILES','2026-10-29 12:28:40','active',NULL),(2,2,'Fridge','2026-11-02 05:55:22','active',NULL),(3,2,'AC','2026-11-02 06:41:32','active',NULL);
/*!40000 ALTER TABLE `subcategories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_group_taxes`
--

DROP TABLE IF EXISTS `tax_group_taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_group_taxes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tax_group_id` int NOT NULL,
  `tax_module_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_group_tax` (`tax_group_id`,`tax_module_id`),
  KEY `tax_module_id` (`tax_module_id`),
  CONSTRAINT `tax_group_taxes_ibfk_1` FOREIGN KEY (`tax_group_id`) REFERENCES `tax_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tax_group_taxes_ibfk_2` FOREIGN KEY (`tax_module_id`) REFERENCES `tax_modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_group_taxes`
--

LOCK TABLES `tax_group_taxes` WRITE;
/*!40000 ALTER TABLE `tax_group_taxes` DISABLE KEYS */;
INSERT INTO `tax_group_taxes` VALUES (6,1,5,'2026-05-15 11:30:18'),(7,1,6,'2026-05-15 11:30:18'),(8,2,8,'2026-06-29 10:32:26'),(9,2,7,'2026-06-29 10:32:26'),(10,3,10,'2026-06-29 10:32:51'),(11,3,9,'2026-06-29 10:32:51'),(12,4,12,'2026-06-29 10:33:13'),(13,4,11,'2026-06-29 10:33:13');
/*!40000 ALTER TABLE `tax_group_taxes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_groups`
--

DROP TABLE IF EXISTS `tax_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_groups`
--

LOCK TABLES `tax_groups` WRITE;
/*!40000 ALTER TABLE `tax_groups` DISABLE KEYS */;
INSERT INTO `tax_groups` VALUES (1,'GST 18%','2026-05-07 05:15:36','2026-05-15 11:30:18',2),(2,'GST 5%','2026-06-29 10:32:26','2026-06-29 10:32:26',2),(3,'GST 12%','2026-06-29 10:32:51','2026-06-29 10:32:51',2),(4,'GST 28%','2026-06-29 10:33:13','2026-06-29 10:33:13',2);
/*!40000 ALTER TABLE `tax_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_modules`
--

DROP TABLE IF EXISTS `tax_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tax_rate` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_modules`
--

LOCK TABLES `tax_modules` WRITE;
/*!40000 ALTER TABLE `tax_modules` DISABLE KEYS */;
INSERT INTO `tax_modules` VALUES (5,'CGST',9.00,'2026-05-07 05:18:30','2026-05-07 05:18:30',2),(6,'SGST',9.00,'2026-05-07 05:18:42','2026-05-07 05:18:42',2),(7,'SGST',2.50,'2026-06-29 10:30:27','2026-06-29 10:30:27',2),(8,'CGST',2.50,'2026-06-29 10:30:43','2026-06-29 10:30:43',2),(9,'CGST',6.00,'2026-06-29 10:31:18','2026-06-29 10:31:18',2),(10,'SGST',6.00,'2026-06-29 10:31:34','2026-06-29 10:31:34',2),(11,'CGST',14.00,'2026-06-29 10:31:45','2026-06-29 10:31:45',2),(12,'SGST',14.00,'2026-06-29 10:31:57','2026-06-29 10:31:57',2);
/*!40000 ALTER TABLE `tax_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_payments`
--

DROP TABLE IF EXISTS `transaction_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int NOT NULL,
  `business_id` int DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `card_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `card_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_for` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_ref_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bank_account_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_payments`
--

LOCK TABLES `transaction_payments` WRITE;
/*!40000 ALTER TABLE `transaction_payments` DISABLE KEYS */;
INSERT INTO `transaction_payments` VALUES (1,1,1,19591.20,'GPay',NULL,NULL,'Sale Balance Payment - Invoice #SE-01','FEEEEEE','2026-10-31 12:15:37','2026-10-31 12:15:37',1),(2,2,1,22240.00,'Cash',NULL,NULL,'Sale Balance Payment - Invoice #SE-02','TXN-1793596514755','2026-11-02 05:15:14','2026-11-02 05:15:14',1);
/*!40000 ALTER TABLE `transaction_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_sell_lines`
--

DROP TABLE IF EXISTS `transaction_sell_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_sell_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `hsncode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `transaction_id` int NOT NULL,
  `quantity` decimal(12,3) NOT NULL DEFAULT '1.000',
  `primary_unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pcs',
  `secondary_unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `unit_price_before_discount` decimal(12,2) DEFAULT NULL,
  `unit_price` decimal(12,2) DEFAULT NULL,
  `unit_price_inc_tax` decimal(12,2) DEFAULT NULL,
  `tax_group_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `discount_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'fixed',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_sell_lines`
--

LOCK TABLES `transaction_sell_lines` WRITE;
/*!40000 ALTER TABLE `transaction_sell_lines` DISABLE KEYS */;
INSERT INTO `transaction_sell_lines` VALUES (1,1,'oppo mobile A78','12345',1,1.000,'PCS',NULL,18000.00,18000.00,21240.00,1,'2026-10-31 12:13:08','2026-10-31 12:13:08','fixed',0.00),(2,1,'oppo mobile A78','12345',2,1.000,'PCS',NULL,18000.00,18000.00,21240.00,1,'2026-11-02 05:14:51','2026-11-02 05:14:51','fixed',0.00);
/*!40000 ALTER TABLE `transaction_sell_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'sell',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Final',
  `contact_id` int DEFAULT NULL,
  `sales_person_id` int DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `payment_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'paid',
  `invoice_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sales_date` date DEFAULT NULL,
  `total_before_tax` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `discount_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'fixed',
  `discount_amount` decimal(12,2) DEFAULT '0.00',
  `tax_group_id` int DEFAULT NULL,
  `final_amount` decimal(12,2) DEFAULT '0.00',
  `commission_amount` decimal(12,2) DEFAULT '0.00',
  `commission_status` varchar(30) COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT '1',
  `is_gst` tinyint(1) NOT NULL DEFAULT '1',
  `bill_to_company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bill_to_customer_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bill_to_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bill_to_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `bill_to_gstin` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bill_to_state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bill_to_state_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bill_to_place_of_supply` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bill_to_place_of_supply_state_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vehicle_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `transport_charges` decimal(12,2) DEFAULT '0.00',
  `additional_charges` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `eway_invoice_no` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `po_no` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `transport_mode` varchar(100) COLLATE utf8mb4_general_ci DEFAULT 'By Road',
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_no` (`invoice_no`),
  KEY `idx_transactions_is_gst` (`is_gst`),
  KEY `idx_tx_sales_person` (`sales_person_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,1,1,'sell','Final',2,3,NULL,'paid','SE-01','2026-10-31',18000.00,3240.00,'percentage',2160.00,1,19591.20,0.00,'Pending','2026-10-31 12:13:08','2026-10-31 12:15:37',2,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'TN-38-AB-2026',500.00,'[{\"id\":1793448291601,\"name\":\"Driver\",\"amount\":400}]',NULL,NULL,NULL,'By Road'),(2,1,1,'sell','Final',4,4,NULL,'paid','SE-02','2026-11-02',18000.00,3240.00,'fixed',0.00,1,22240.00,0.00,'Pending','2026-11-02 05:14:51','2026-11-02 05:15:14',2,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'TN-38-AE-1098',500.00,'[{\"id\":1793596479038,\"name\":\"Delivery Charges\",\"amount\":500}]','45677555',NULL,NULL,'By Road');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_branches`
--

DROP TABLE IF EXISTS `user_branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `branch_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_branch` (`user_id`,`branch_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `user_branches_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_branches_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_branches`
--

LOCK TABLES `user_branches` WRITE;
/*!40000 ALTER TABLE `user_branches` DISABLE KEYS */;
INSERT INTO `user_branches` VALUES (3,1,2),(6,4,2);
/*!40000 ALTER TABLE `user_branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `full_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `status` enum('Active','Inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `role_id` (`role_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2b$10$FQyPkodVLvwAwGJC6s.3OOFSwdGIgS3.A01a2TKlPVad0WPD2pzKG','Administrator','admin@gmail.com','',NULL,1,NULL,'Active','2026-03-18 06:14:32','2026-11-03 05:23:57'),(4,'clavis','$2b$10$7I1wvHwSny5ztCbhL.HEX./KkcVabDNz6XZdV8zN5nx3Zsv6eKoZ2','clavis tech',NULL,NULL,NULL,5,2,'Active','2026-05-20 04:33:08','2026-05-20 04:33:08'),(10,'ramesh_seller','$2b$10$fU.R3RUn5bu5le.lWkZoLel7.edYjbt.S9OZg3En3X1S.PdMgiUiK','Ramesh Kumar','ramesh@gmail.com','9626394336',NULL,7,2,'Active','2026-11-03 04:56:12','2026-11-03 04:56:12'),(11,'rajesh_login','$2b$10$8tiBBRa5h17M/1/RTDdO3.CzJTCsWnKtx9weSc1yLHf08/VgoP7zq','Rajesh Kumar','rajesh@gmail.com','9876501234',NULL,7,2,'Active','2026-11-03 04:58:35','2026-11-03 04:58:35'),(12,'karthik@gmail.com','$2b$10$UqiWO..isA8Lwa/0ZvwQFuWkdA.SHW2MOLKPflc3GVTwwDcqLfVyW','Karthik Subramanian','karthik.tech@shiva.com','9840123456',NULL,7,2,'Active','2026-11-03 04:59:10','2026-11-03 04:59:10'),(18,'ramya@gmail.com','$2b$10$VFN9hGP0.0iyeXSbdcnf/eOMA6D9QoQzuYGWwYZF9a67QLUDFMVY6','Ramya','ramya@gmail.com','9898978908',NULL,8,2,'Active','2026-11-03 05:26:21','2026-11-03 05:26:21');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_payments`
--

DROP TABLE IF EXISTS `vendor_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` int NOT NULL,
  `purchase_id` int DEFAULT NULL,
  `bank_account_id` int DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `paid_from` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cheque_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cheque_date` date DEFAULT NULL,
  `collection_person` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `fk_vendor_payment_bank` (`bank_account_id`),
  CONSTRAINT `fk_vendor_payment_bank` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `vendor_payments_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_payments`
--

LOCK TABLES `vendor_payments` WRITE;
/*!40000 ALTER TABLE `vendor_payments` DISABLE KEYS */;
INSERT INTO `vendor_payments` VALUES (1,1,1,NULL,'2026-10-29',50000.00,'Cash','Cash','CTW-PUR-0001',NULL,NULL,NULL,'Advance payment on credit purchase',2,'2026-10-29 13:47:19'),(2,1,1,1,'2026-10-31',130000.00,'Cheque','Bank',NULL,'5678998','2026-10-31','Ravi','For the july month',2,'2026-10-31 12:24:34');
/*!40000 ALTER TABLE `vendor_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vendor_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mobile` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gst_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vendor_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` int DEFAULT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `account_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ifsc_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bank_branch` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `upi_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `opening_balance` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_id` (`vendor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
INSERT INTO `vendors` VALUES (1,NULL,'company','company','9587463210','company@gmail.com','salem','636002',NULL,'Wholesaler','Active','2026-10-29 12:29:26',2,NULL,NULL,NULL,NULL,NULL,0.00);
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-04 10:50:53
