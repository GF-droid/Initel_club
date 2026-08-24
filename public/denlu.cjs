// server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

// 中间件
app.use(cors({
  origin: 'http://localhost:15011', // 你的前端地址
  credentials: true
}));
app.use(express.json());

// 数据库连接
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: '111',
  waitForConnections: true,
  connectionLimit: 10
});

// 登录接口
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('收到登录请求:', username);

  try {
    // 查询用户
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = users[0];

    // 验证密码（实际项目中应该使用加密验证）
    if (user.password === password) {
      // 登录成功
      return res.status(200).json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        }
      });
    } else {
      // 密码错误
      return res.status(401).json({
        success: false,
        message: '密码错误'
      });
    }

  } catch (error) {
    console.error('登录错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
