const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 15010;

// 中间件
app.use(cors());
app.use(express.json());

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || '111.230.197.156',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'jiuhe'
};

// 房间列表
const rooms = ['101', '102', '108', '109', '113', '115', '116', '117', '118', '119'];

// 创建数据库连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 安全地获取表名
function getTableName(roomId) {
  return `\`${roomId}\``;
}

// 专门处理纯数字表名的查询函数
async function executeQueryForNumericTable(tableName, limit = 10) {
  const connection = await pool.getConnection();
  try {
    // 对于纯数字表名，直接在SQL中拼接LIMIT值，避免参数绑定问题
    const sql = `SELECT wendu, shidu, time FROM \`${tableName}\` ORDER BY time DESC LIMIT ${limit}`;
    console.log(`🔍 执行SQL: ${sql}`);

    const [rows] = await connection.execute(sql);
    return rows;
  } finally {
    connection.release();
  }
}

// 处理带时间范围的查询
async function executeQueryWithTimeRange(tableName, startTime, endTime, limit = 50) {
  const connection = await pool.getConnection();
  try {
    let sql = `SELECT wendu, shidu, time FROM \`${tableName}\``;

    if (startTime && endTime) {
      sql += ` WHERE time BETWEEN '${startTime}' AND '${endTime}'`;
    }

    sql += ` ORDER BY time DESC LIMIT ${limit}`;
    console.log(`🔍 执行SQL: ${sql}`);

    const [rows] = await connection.execute(sql);
    return rows;
  } finally {
    connection.release();
  }
}

// 四舍五入到小数点后一位的函数
function roundToOneDecimal(num) {
  return Math.round(num * 10) / 10;
}

// 时间格式化函数
function formatTimeForChart(timeString) {
  try {
    const date = new Date(timeString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch (error) {
    return timeString;
  }
}

// 格式化日期时间（完整显示）
function formatDateTime(timeString) {
  try {
    const date = new Date(timeString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  } catch (error) {
    return timeString;
  }
}

// 获取所有房间最新数据的函数
async function getAllRoomData() {
  const roomData = {};

  try {
    console.log('🔄 开始获取所有房间数据...');

    const promises = rooms.map(async (room) => {
      try {
        console.log(`🔍 尝试获取房间 ${room} 数据...`);

        // 使用新的查询函数
        const rows = await executeQueryForNumericTable(room, 1);

        console.log(`✅ 房间 ${room} 查询结果:`, rows);

        if (rows.length > 0) {
          const roundedWendu = roundToOneDecimal(rows[0].wendu);
          const roundedShidu = roundToOneDecimal(rows[0].shidu);

          roomData[`temp${rooms.indexOf(room) + 1}`] = roundedWendu;
          roomData[`hum${rooms.indexOf(room) + 1}`] = roundedShidu;
          console.log(`🎯 房间 ${room} 数据: 温度=${roundedWendu}, 湿度=${roundedShidu}`);
        } else {
          roomData[`temp${rooms.indexOf(room) + 1}`] = 0;
          roomData[`hum${rooms.indexOf(room) + 1}`] = 0;
          console.log(`⚠️ 房间 ${room} 无数据`);
        }
      } catch (error) {
        console.error(`💥 获取房间 ${room} 数据失败:`, error.message);
        roomData[`temp${rooms.indexOf(room) + 1}`] = 0;
        roomData[`hum${rooms.indexOf(room) + 1}`] = 0;
      }
    });

    await Promise.all(promises);
    console.log('🎉 所有房间数据获取完成');
    return roomData;
  } catch (error) {
    console.error('💥 获取房间数据失败:', error);
    throw error;
  }
}

// 1. 获取所有房间最新数据（用于卡片显示）
app.get('/data/all', async (req, res) => {
  try {
    console.log('📡 接收到 /data/all 请求');
    const roomData = await getAllRoomData();

    const roomDataArray = rooms.map((room, index) => {
      return {
        wendu: roomData[`temp${index + 1}`] || 0,
        shidu: roomData[`hum${index + 1}`] || 0,
        time: new Date().toISOString()
      };
    });

    res.json(roomDataArray);
  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  }
});

// 2. 获取单个房间历史数据（用于图表显示）
app.get('/data/:roomId', async (req, res) => {
  const roomId = req.params.roomId;
  const limit = parseInt(req.query.limit) || 10;

  console.log(`📡 接收到房间 ${roomId} 图表数据请求，限制 ${limit} 条`);

  if (!rooms.includes(roomId)) {
    return res.status(400).json({
      success: false,
      message: '房间号不存在'
    });
  }

  try {
    // 使用新的查询函数
    const rows = await executeQueryForNumericTable(roomId, limit);

    console.log(`✅ 表 ${roomId} 查询到 ${rows.length} 条记录`);

    // 对数据进行四舍五入和时间格式化
    const processedRows = rows.map(row => ({
      wendu: roundToOneDecimal(row.wendu),
      shidu: roundToOneDecimal(row.shidu),
      time: formatTimeForChart(row.time)
    }));

    // 按时间正序返回（从旧到新）
    res.json(processedRows.reverse());
  } catch (error) {
    console.error(`获取表 ${roomId} 数据失败:`, error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  }
});

// 3. 获取详细历史数据（完整时间戳）
app.get('/data/history/:roomId', async (req, res) => {
  const roomId = req.params.roomId;
  const limit = parseInt(req.query.limit) || 50;
  const startTime = req.query.startTime;
  const endTime = req.query.endTime;

  console.log(`📡 接收到房间 ${roomId} 详细历史数据请求，限制 ${limit} 条`);

  if (!rooms.includes(roomId)) {
    return res.status(400).json({
      success: false,
      message: '房间号不存在'
    });
  }

  try {
    let rows;

    if (startTime && endTime) {
      // 使用时间范围查询
      rows = await executeQueryWithTimeRange(roomId, startTime, endTime, limit);
    } else {
      // 使用普通查询
      rows = await executeQueryForNumericTable(roomId, limit);
    }

    console.log(`✅ 表 ${roomId} 查询到 ${rows.length} 条历史记录`);

    // 处理数据，保留完整时间信息
    const processedRows = rows.map(row => ({
      wendu: roundToOneDecimal(row.wendu),
      shidu: roundToOneDecimal(row.shidu),
      time: formatDateTime(row.time),
      timestamp: row.time
    }));

    // 按时间正序返回
    res.json({
      success: true,
      data: processedRows.reverse(),
      roomId: roomId,
      total: rows.length,
      timeRange: {
        start: startTime,
        end: endTime
      }
    });
  } catch (error) {
    console.error(`获取房间 ${roomId} 历史数据失败:`, error);
    res.status(500).json({
      success: false,
      message: '获取历史数据失败',
      error: error.message
    });
  }
});

// 4. 获取多个房间的历史数据对比
app.get('/data/compare', async (req, res) => {
  const roomIds = req.query.rooms ? req.query.rooms.split(',') : ['101', '102'];
  const limit = parseInt(req.query.limit) || 10;
  const dataType = req.query.type || 'wendu';

  console.log(`📡 接收到多房间数据对比请求: ${roomIds.join(', ')}, 类型: ${dataType}`);

  try {
    const results = {};

    const promises = roomIds.map(async (roomId) => {
      if (!rooms.includes(roomId)) {
        results[roomId] = { error: '房间号不存在' };
        return;
      }

      try {
        const rows = await executeQueryForNumericTable(roomId, limit);

        const processedRows = rows.map(row => ({
          value: roundToOneDecimal(row[dataType]),
          time: formatTimeForChart(row.time)
        }));

        results[roomId] = {
          data: processedRows.reverse(),
          roomName: `${roomId}房间`
        };
      } catch (error) {
        results[roomId] = { error: error.message };
      }
    });

    await Promise.all(promises);

    res.json({
      success: true,
      dataType: dataType,
      results: results
    });
  } catch (error) {
    console.error('多房间数据对比失败:', error);
    res.status(500).json({
      success: false,
      message: '数据对比失败',
      error: error.message
    });
  }
});

// 健康检查接口
app.get('/data/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();

    res.json({
      success: true,
      message: '服务运行正常',
      database: '连接正常',
      timestamp: new Date().toISOString(),
      totalRooms: rooms.length,
      rooms: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '数据库连接异常',
      error: error.message
    });
  }
});

// 修改获取表名的函数，使用现有的 data 表
function getInboundTableName(roomId) {
  return `\`data${roomId}\``;
}

// 原有的监控数据表名函数保持不变
function getTableName(roomId) {
  return `\`${roomId}\``;
}

// 入库接口 - 使用 data 表
app.post('/inbound', async (req, res) => {
  const { home, name, number, price, unity, content } = req.body;

  console.log('📦 收到入库请求:', { home, name, number, price, unity, content });

  // 验证必填字段
  if (!home || !name || number === undefined || price === undefined) {
    return res.status(400).json({
      success: false,
      message: '缺少必填字段: home, name, number, price'
    });
  }

  // 验证房间号是否有效
  if (!rooms.includes(home)) {
    return res.status(400).json({
      success: false,
      message: '无效的房间号'
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const tableName = getInboundTableName(home); // 使用 data 表

    console.log(`📊 使用表: ${tableName}`);

    // 获取当前时间
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    console.log(`⏰ 入库时间: ${currentTime}`);

    // 插入数据，包含时间字段
    const insertQuery = `
      INSERT INTO ${tableName} (home, name, number, price, unity, content, time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    console.log(`🔍 执行SQL: ${insertQuery}`);

    const [result] = await connection.execute(insertQuery, [
      home, name, number, price, unity, content, currentTime
    ]);

    console.log('✅ 入库成功，ID:', result.insertId);

    res.json({
      success: true,
      message: '入库成功',
      data: {
        id: result.insertId,
        home,
        name,
        number,
        price,
        unity,
        content,
        time: currentTime
      }
    });

  } catch (error) {
    console.error('❌ 入库操作错误:', error);
    res.status(500).json({
      success: false,
      message: '入库失败，请稍后重试',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// 获取房间物品列表接口 - 使用 data 表（修复排序字段）
app.get('/inbound/:roomId', async (req, res) => {
  const { roomId } = req.params;

  console.log(`📦 获取房间 ${roomId} 物品列表`);

  if (!rooms.includes(roomId)) {
    return res.status(400).json({
      success: false,
      message: '无效的房间号'
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const tableName = getInboundTableName(roomId); // 使用 data 表

    console.log(`📊 查询表: ${tableName}`);

    // 修复：使用实际存在的字段排序，或者不排序
    const [rows] = await connection.execute(`
      SELECT * FROM ${tableName} ORDER BY id DESC
    `);

    console.log(`✅ 查询到 ${rows.length} 条记录`);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('❌ 获取物品列表错误:', error);

    // 如果 id 字段也不存在，尝试不排序
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      try {
        const [rows] = await connection.execute(`SELECT * FROM ${tableName}`);
        console.log(`✅ 查询到 ${rows.length} 条记录（无排序）`);

        res.json({
          success: true,
          data: rows
        });
        return;
      } catch (secondError) {
        console.error('❌ 无排序查询也失败:', secondError);
      }
    }

    res.status(500).json({
      success: false,
      message: '获取物品列表失败',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// 获取房间物品列表接口 - 简单版（不排序）
app.post('/query', async (req, res) => {
  const { tableName } = req.query;

  console.log('📦 收到查询请求，tableName:', tableName);

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: '缺少 tableName 参数'
    });
  }

  const roomId = tableName.replace('data', '');

  if (!rooms.includes(roomId)) {
    return res.status(400).json({
      success: false,
      message: '无效的房间号'
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const finalTableName = getInboundTableName(roomId);

    console.log(`📊 使用表: ${finalTableName}`);

    // 简单查询，不排序
    const [rows] = await connection.execute(`SELECT * FROM ${finalTableName}`);

    console.log(`✅ 查询到 ${rows.length} 条记录`);

    res.json(rows);

  } catch (error) {
    console.error('❌ 获取物品列表错误:', error);

    res.status(500).json({
      error: '获取物品列表失败',
      message: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// 出库接口 - 只更新库存数量，不删除记录
app.post('/outbound', async (req, res) => {
  const { home, name, number, unity, content } = req.body;

  console.log('📤 收到出库请求:', { home, name, number, unity, content });

  // 验证必填字段
  if (!home || !name || number === undefined) {
    return res.status(400).json({
      success: false,
      message: '缺少必填字段: home, name, number'
    });
  }

  // 验证房间号是否有效
  if (!rooms.includes(home)) {
    return res.status(400).json({
      success: false,
      message: '无效的房间号'
    });
  }

  // 验证数量必须大于0
  if (number <= 0) {
    return res.status(400).json({
      success: false,
      message: '出库数量必须大于0'
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const tableName = getInboundTableName(home);

    console.log(`📊 使用表: ${tableName}`);

    // 1. 首先检查库存是否足够
    const checkStockQuery = `
      SELECT id, name, number, unity, price, content
      FROM ${tableName} 
      WHERE name = ? AND number >= ?
      ORDER BY id DESC 
      LIMIT 1
    `;

    console.log(`🔍 检查库存SQL: ${checkStockQuery}`, [name, number]);
    const [stockRows] = await connection.execute(checkStockQuery, [name, number]);

    if (stockRows.length === 0) {
      console.log(`❌ 库存不足，物品: ${name}, 需求数量: ${number}`);

      const [itemExists] = await connection.execute(
        `SELECT name, number FROM ${tableName} WHERE name = ? ORDER BY id DESC LIMIT 1`,
        [name]
      );

      if (itemExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: `库存不足: ${name}，当前库存 ${itemExists[0].number}，出库数量 ${number}`
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `物品不存在: ${name}`
        });
      }
    }

    const stockItem = stockRows[0];
    console.log(`📦 库存信息:`, stockItem);

    // 2. 更新库存数量（减少）
    const remainingNumber = stockItem.number - number;

    const updateStockQuery = `
      UPDATE ${tableName} 
      SET number = ? 
      WHERE id = ?
    `;

    console.log(`🔍 更新库存SQL: ${updateStockQuery}`, [remainingNumber, stockItem.id]);
    const [updateResult] = await connection.execute(updateStockQuery, [remainingNumber, stockItem.id]);

    if (updateResult.affectedRows === 0) {
      console.log('❌ 更新库存失败');
      return res.status(500).json({
        success: false,
        message: '更新库存失败'
      });
    }

    console.log('✅ 库存更新成功，剩余数量:', remainingNumber);

    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    res.json({
      success: true,
      message: '出库成功',
      data: {
        home,
        name,
        outbound_number: number,
        remaining_number: remainingNumber,
        unity: unity || stockItem.unity,
        content: content || '出库操作',
        time: currentTime
      }
    });

  } catch (error) {
    console.error('❌ 出库操作错误:', error);
    res.status(500).json({
      success: false,
      message: '出库失败，请稍后重试',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// 获取所有物品数据接口 - 修复字段问题
app.get('/all', async (req, res) => {
  console.log('📋 收到获取所有物品数据请求');

  let connection;
  try {
    connection = await pool.getConnection();
    let allItems = [];

    // 遍历所有房间表，获取数据
    for (const room of rooms) {
      const tableName = getInboundTableName(room);

      try {
        // 先检查表结构
        const [structure] = await connection.execute(`DESCRIBE ${tableName}`);
        const fieldNames = structure.map(field => field.Field);

        // 根据实际字段构建查询
        let orderField = 'id'; // 默认按id排序
        if (fieldNames.includes('time')) {
          orderField = 'time';
        } else if (fieldNames.includes('created_at')) {
          orderField = 'created_at';
        }

        // 查询该房间的所有物品
        const [rows] = await connection.execute(`
          SELECT 
            home,
            name,
            number as quantity,
            price as unitPrice,
            unity as unit,
            content as notes,
            time as updateTime
          FROM ${tableName} 
          WHERE number > 0
          ORDER BY ${orderField} DESC
        `);

        // 为每条记录添加房间名
        const roomItems = rows.map(item => ({
          ...item,
          roomName: `${item.home}房间`
        }));

        allItems = allItems.concat(roomItems);

        console.log(`✅ 房间 ${room} 查询到 ${rows.length} 条记录`);

      } catch (error) {
        console.error(`❌ 获取房间 ${room} 数据错误:`, error.message);
        // 继续处理其他房间，不中断整个流程
      }
    }

    console.log(`🎉 总共获取到 ${allItems.length} 条物品记录`);

    res.json(allItems);

  } catch (error) {
    console.error('❌ 获取所有物品数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 监控房间: ${rooms.join(', ')}`);
  console.log(`🔗 主要接口:`);
  console.log(`  实时数据: http://localhost:${PORT}/data/all`);
  console.log(`  图表数据: http://localhost:${PORT}/data/101`);
  console.log(`  历史数据: http://localhost:${PORT}/data/history/101`);
  console.log(`  数据对比: http://localhost:${PORT}/data/compare?rooms=101,102`);
  console.log(`  健康检查: http://localhost:${PORT}/data/health`);
});
