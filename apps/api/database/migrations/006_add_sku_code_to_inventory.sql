-- 给各房间库存表补一个 `sku_code` 列，用于关联 004 号迁移建立的物资主数据。
--
-- ⚠️ 两点注意：
--
-- 1) 本迁移【不是幂等的】，请只执行一次。重复执行会报
--    "Duplicate column name 'sku_code'"，忽略即可（列已经在了）。
--    之所以不写成幂等版本，是因为要在纯 SQL 里判断列是否存在必须用存储过程，
--    而 DELIMITER 是 mysql 客户端指令，项目部署脚本走 mysql2 执行会解析失败。
--
-- 2) 如果某个房间的库存表还不存在，对应的 ALTER 会报
--    "Table '...' doesn't exist"，忽略该条、继续执行其余的即可。
--    项目代码对 sku_code 的写入是"尽力而为"的：即使本迁移没执行，
--    出入库也能正常工作，只是不写这层关联（流水表仍会正常记录）。
--
-- 执行方式：
--   mysql -h <host> -u <user> -p <db> < 006_add_sku_code_to_inventory.sql

ALTER TABLE `data101` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data101_sku` (`sku_code`);
ALTER TABLE `data102` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data102_sku` (`sku_code`);
ALTER TABLE `data108` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data108_sku` (`sku_code`);
ALTER TABLE `data109` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data109_sku` (`sku_code`);
ALTER TABLE `data113` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data113_sku` (`sku_code`);
ALTER TABLE `data115` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data115_sku` (`sku_code`);
ALTER TABLE `data116` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data116_sku` (`sku_code`);
ALTER TABLE `data117` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data117_sku` (`sku_code`);
ALTER TABLE `data118` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data118_sku` (`sku_code`);
ALTER TABLE `data119` ADD COLUMN `sku_code` VARCHAR(32) NULL COMMENT '关联 sku.sku_code', ADD KEY `idx_data119_sku` (`sku_code`);
