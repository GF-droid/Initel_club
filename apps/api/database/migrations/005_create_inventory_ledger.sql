-- 库存流水（台账）。
--
-- 为什么需要它：在此之前，出库是直接 `UPDATE data101 SET number = ...`，
-- 改完不留任何痕迹，无法回答"三个月前谁把这批货出库了、当时余量是多少"。
--
-- 本表只追加、不修改、不删除。每一笔库存变动都写一条，包含变动前后的余量，
-- 因此任意时点的库存都可以由流水重新推导出来，也就能对账和追溯。
--
-- 约定：
--   operation  inbound  入库
--              outbound 出库
--              adjust   盘点/人工调整（正负都有可能，用 remark 说明原因）
--   quantity  始终为正数（变动幅度），方向由 operation 决定：
--               inbound → after = before + quantity
--               outbound → after = before - quantity
--               adjust  → after 由 after 列直接给出，不按公式推导
--   sku_name  冗余快照。SKU 改名或停用后，历史流水仍然可读。

CREATE TABLE IF NOT EXISTS `inventory_ledger` (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id          VARCHAR(16)  NOT NULL COMMENT '房间号',
  sku_code         VARCHAR(32)  NULL COMMENT '关联 sku.sku_code；历史数据可能为空',
  sku_name         VARCHAR(128) NOT NULL COMMENT '发生时点的名称快照',
  operation        VARCHAR(16)  NOT NULL COMMENT 'inbound / outbound / adjust',
  quantity         DECIMAL(14,3) NOT NULL COMMENT '变动幅度，正数',
  quantity_before  DECIMAL(14,3) NOT NULL COMMENT '变动前余量',
  quantity_after   DECIMAL(14,3) NOT NULL COMMENT '变动后余量',
  unit_price       DECIMAL(12,2) NULL COMMENT '该笔单价',
  amount           DECIMAL(14,2) NULL COMMENT '金额 = quantity * unit_price',
  order_no         VARCHAR(32)  NULL COMMENT '单据号，用于把一批操作归到同一张单',
  operator         VARCHAR(64)  NULL COMMENT '操作人',
  remark           VARCHAR(255) NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY `idx_ledger_room_time` (`room_id`, `created_at`),
  KEY `idx_ledger_sku_time` (`sku_code`, `created_at`),
  KEY `idx_ledger_order` (`order_no`),
  KEY `idx_ledger_operation` (`operation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
