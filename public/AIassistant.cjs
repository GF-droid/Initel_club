require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 创建 OpenAI 客户端（指向 Moonshot）
const client = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY,
  baseURL: "https://api.moonshot.cn/v1",
});

// 对话历史存储（简单的内存存储，生产环境需要用数据库）
const chatHistories = new Map();

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AI Assistant API' });
});

// 对话接口
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default', history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    // 获取或初始化对话历史
    if (!chatHistories.has(sessionId)) {
      chatHistories.set(sessionId, []);
    }
    const sessionHistory = chatHistories.get(sessionId);

    // 构建消息数组
    const messages = [
      {
        role: "system",
        content: `你是智能仓储AI助手，专门为仓库管理系统提供专业的咨询和建议。你的专长包括：
        1. 📊 仓库数据分析与预测
        2. 🔧 设备运行状态监控
        3. 📈 库存优化策略
        4. 🚚 出入库流程优化
        5. 💡 节能降耗方案
        6. ⚡ 应急处理建议
        7. 📋 运营报告生成

        请以专业、友好的方式回答问题，并根据仓储管理的专业知识提供实用建议。`
      },
      ...sessionHistory.slice(-10), // 保留最近10条历史
      { role: "user", content: message }
    ];

    console.log('发送到API的消息:', {
      model: "moonshot-v1-8k",
      messageCount: messages.length
    });

    // 调用 Moonshot API
    const completion = await client.chat.completions.create({
      model: "moonshot-v1-8k", // 或 "moonshot-v1-32k", "moonshot-v1-128k"
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9,
    });

    const aiResponse = completion.choices[0].message.content;

    // 更新对话历史
    sessionHistory.push(
      { role: "user", content: message },
      { role: "assistant", content: aiResponse }
    );

    // 限制历史记录长度
    if (sessionHistory.length > 20) {
      chatHistories.set(sessionId, sessionHistory.slice(-20));
    }

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      tokens: completion.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('API调用错误:', error);

    // 友好的错误消息
    let errorMessage = 'AI服务暂时不可用，请稍后重试';
    if (error.status === 401) {
      errorMessage = 'API认证失败，请检查API密钥配置';
    } else if (error.status === 429) {
      errorMessage = '请求过于频繁，请稍后重试';
    } else if (error.message.includes('timeout')) {
      errorMessage = '请求超时，请检查网络连接';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 快速建议接口（预定义问题）
app.get('/api/quick-suggestions', (req, res) => {
  const suggestions = [
    { id: 1, question: '分析今日库存周转情况', category: 'analysis' },
    { id: 2, question: '给出仓库布局优化建议', category: 'optimization' },
    { id: 3, question: '检查设备维护状态', category: 'maintenance' },
    { id: 4, question: '推荐节能降耗方案', category: 'energy' },
    { id: 5, question: '生成月度运营报告', category: 'report' },
    { id: 6, question: '应急处理流程建议', category: 'emergency' },
    { id: 7, question: '员工排班优化建议', category: 'management' },
    { id: 8, question: '货物存储环境监控', category: 'monitoring' }
  ];
  res.json({ suggestions });
});

// 生成报告接口
app.post('/api/generate-report', async (req, res) => {
  try {
    const { reportType, dateRange } = req.body;

    const prompt = `根据${dateRange || '最近30天'}的仓储数据，生成一份详细的${reportType || '运营'}报告。
    报告应包括：
    1. 数据概览和关键指标
    2. 问题分析和识别
    3. 优化建议和改进措施
    4. 预测和下一步计划
    
    请以专业报告的形式呈现。`;

    const completion = await client.chat.completions.create({
      model: "moonshot-v1-8k",
      messages: [
        { role: "system", content: "你是专业的仓储管理分析师，擅长生成详细的数据分析报告。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    res.json({
      success: true,
      report: completion.choices[0].message.content,
      generatedAt: new Date().toISOString(),
      type: reportType || '运营报告'
    });

  } catch (error) {
    console.error('生成报告错误:', error);
    res.status(500).json({
      success: false,
      error: '生成报告失败，请稍后重试'
    });
  }
});

// 清空对话历史
app.delete('/api/chat/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  chatHistories.delete(sessionId);
  res.json({ success: true, message: '对话历史已清空' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 AI助手API服务运行在 http://localhost:${PORT}`);
  console.log(`📚 API文档:`);
  console.log(`   POST /api/chat - 对话接口`);
  console.log(`   GET /api/quick-suggestions - 获取快速建议`);
  console.log(`   POST /api/generate-report - 生成报告`);
  console.log(`   DELETE /api/chat/history/:sessionId - 清空对话历史`);
});
