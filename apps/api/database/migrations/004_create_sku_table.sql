-- 物资主数据（SKU）。
--
-- 背景：现有库存表 `data101`..`data119` 只用 `name` 字符串标识物资，
-- 无法区分同名不同规格，改名也会让历史数据断链。本表把"物资"抽成独立主数据，
-- 库存表通过新增的 `sku_code` 列引用它（见 006 号迁移）。
--
-- sku_code 设计说明：
--   形如 SKU-000001，由自增 id 派生，保证唯一且可读。
--   插入时先留 NULL 再回填，因此本列可空 —— MySQL 的唯一索引允许多个 NULL，
--   这样并发插入不会撞唯一键。
--
-- spec 使用 NOT NULL DEFAULT '' 而不是 NULL：
--   唯一索引中 NULL 互不相等，会让 UNIQUE(name, spec) 失去去重作用。

CREATE TABLE IF NOT EXISTS `sku` (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku_code      VARCHAR(32)  NULL COMMENT '业务编码，形如 SKU-000001，插入后由应用回填',
  name          VARCHAR(128) NOT NULL COMMENT '物资名称',
  spec          VARCHAR(128) NOT NULL DEFAULT '' COMMENT '规格型号，无规格填空串',
  category      VARCHAR(64)  NULL COMMENT '分类',
  unit          VARCHAR(16)  NULL COMMENT '计量单位',
  barcode       VARCHAR(64)  NULL COMMENT '条码',
  supplier      VARCHAR(128) NULL COMMENT '供应商',
  safety_stock  DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '安全库存下限，用于缺货预警',
  price         DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '参考单价',
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1 启用，0 停用',
  remark        VARCHAR(255) NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY `uk_sku_code` (`sku_code`),
  UNIQUE KEY `uk_sku_name_spec` (`name`, `spec`),
  KEY `idx_sku_category` (`category`),
  KEY `idx_sku_barcode` (`barcode`),
  KEY `idx_sku_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
