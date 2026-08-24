<template>
  <div class="ai-assistant-container">
    <!-- 背景装饰 -->
    <div class="ai-background">
      <div class="ai-particles"></div>
      <div class="ai-gradient"></div>
    </div>

    <!-- 主内容区 -->
    <div class="ai-main-content">
      <!-- 头部 -->
      <div class="ai-header">
        <div class="ai-title">
          <el-icon class="ai-title-icon">
            <MagicStick />
          </el-icon>
          <h1>智能仓储AI助手</h1>
        </div>
        <div class="ai-subtitle">
          <p>基于人工智能的仓储管理咨询系统</p>
          <el-tag type="success" size="small">在线</el-tag>
        </div>
      </div>

      <!-- 对话区域 -->
      <div class="chat-container">
        <!-- 消息列表 -->
        <div class="message-list" ref="messageList">
          <!-- 动态消息列表 -->
          <template v-for="(message, index) in allMessages" :key="index">
            <!-- AI消息 -->
            <div class="message ai-message" v-if="message.type === 'ai'">
              <div class="message-avatar">
                <el-avatar :size="40" :src="AIAvatar">
                  <img src="https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png" />
                </el-avatar>
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="message-sender">AI助手</span>
                  <span class="message-time">{{ message.time }}</span>
                </div>
                <div class="message-text" v-html="message.content"></div>
              </div>
            </div>

            <!-- 用户消息 -->
            <div class="message user-message" v-else-if="message.type === 'user'">
              <div class="message-content">
                <div class="message-header">
                  <span class="message-sender">您</span>
                  <span class="message-time">{{ message.time }}</span>
                </div>
                <div class="message-text">{{ message.content }}</div>
              </div>
              <div class="message-avatar">
                <el-avatar :size="40" :src="userAvatar" />
              </div>
            </div>
          </template>

          

          <!-- 正在输入指示器 -->
          <div class="message ai-message" v-if="isTyping">
            <div class="message-avatar">
              <el-avatar :size="40" :src="AIAvatar" />
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 快速提问 -->
        <div class="quick-questions">
          <h4>快速提问：</h4>
          <div class="quick-buttons">
            <el-button v-for="(question, index) in quickQuestions" :key="index" @click="sendQuickQuestion(question)"
              class="quick-btn">
              {{ question }}
            </el-button>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <el-input v-model="userInput" placeholder="请输入您的问题..." type="textarea" :rows="2" resize="none"
            @keydown="handleKeydown" :disabled="isLoading">
            <template #append>
              <el-button type="primary" :icon="Promotion" @click="sendMessage" :loading="isLoading">
                发送
              </el-button>
            </template>
          </el-input>
          <div class="input-tips">
            <span>💡 提示：按 Enter 发送消息，Shift + Enter 换行</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 侧边栏 - 功能面板 -->
    <div class="ai-sidebar">
      <div class="sidebar-section">
        <h3><el-icon>
            <DataAnalysis />
          </el-icon> 实时数据</h3>
        <div class="realtime-stats">
          <div class="stat-item">
            <div class="stat-label">仓库温度</div>
            <div class="stat-value">22.5℃</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">湿度</div>
            <div class="stat-value">55%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">今日入库</div>
            <div class="stat-value">1,248件</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">今日出库</div>
            <div class="stat-value">956件</div>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <h3><el-icon>
            <Lightning />
          </el-icon> 智能建议</h3>
        <div class="suggestions">
          <div class="suggestion-item">
            <el-icon>
              <Warning />
            </el-icon>
            <span>101房3号货架库存偏低</span>
          </div>
          <div class="suggestion-item">
            <el-icon>
              <Sunny />
            </el-icon>
            <span>当前可优化空调能耗15%</span>
          </div>
          <div class="suggestion-item">
            <el-icon>
              <Timer />
            </el-icon>
            <span>建议调整B区补货时间</span>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <h3><el-icon>
            <Setting />
          </el-icon> 常用功能</h3>
        <div class="action-buttons">
          <el-button type="primary" plain @click="generateReport">
            <el-icon>
              <Document />
            </el-icon>
            生成日报
          </el-button>
          <el-button type="success" plain @click="optimizeStrategy">
            <el-icon>
              <TrendCharts />
            </el-icon>
            优化策略
          </el-button>
          <el-button type="info" plain @click="emergencyCheck">
            <el-icon>
              <Warning />
            </el-icon>
            应急检查
          </el-button>
          <el-button type="warning" plain @click="clearHistory">
            <el-icon>
              <Delete />
            </el-icon>
            清空历史
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import {
  MagicStick,
  Promotion,
  DataAnalysis,
  Lightning,
  Warning,
  Sunny,
  Timer,
  Setting,
  Document,
  TrendCharts
} from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'

const messageList = ref(null)
const userInput = ref('')

// API 配置
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/ai`
const sessionId = ref(`session_${Date.now()}_${Math.random().toString(36).substr(2)}`)

// 使用统一的消息数组
const allMessages = ref([
  {
    type: 'ai',
    content: '您好！我是智能仓储AI助手，我可以为您提供以下帮助：<ul class="ai-capabilities"><li>📊 仓库数据分析与预测</li><li>🔧 设备运行状态监控建议</li><li>📈 库存优化策略咨询</li><li>🚚 出入库流程优化建议</li><li>💡 节能降耗方案推荐</li></ul>请问有什么可以帮您的吗？',
    time: '现在'
  }
])

const isLoading = ref(false)
const isTyping = ref(false)
const showExample = ref(true)
const userAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
const AIAvatar = 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png'

// 快速提问
const quickQuestions = ref([
  '分析今日库存数据',
  '优化仓库布局建议',
  '设备维护提醒',
  '节能方案推荐',
  '生成运营报告'
])

// 初始化时加载快速建议
onMounted(() => {
  loadQuickSuggestions()
  scrollToBottom()
})

// 加载快速建议
const loadQuickSuggestions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/quick-suggestions`)
    const data = await response.json()
    if (data.suggestions) {
      quickQuestions.value = data.suggestions.map(s => s.question)
    }
  } catch (error) {
    console.log('使用默认快速问题')
  }
}

// 处理键盘事件
const handleKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// 发送消息到API
const sendMessageToAPI = async (message) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        sessionId: sessionId.value,
        history: allMessages.value
          .filter(msg => msg.type === 'user' || msg.type === 'ai')
          .map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      return {
        content: formatAIResponse(data.response),
        time: '刚刚'
      }
    } else {
      throw new Error(data.error || 'API调用失败')
    }
  } catch (error) {
    console.error('API调用错误:', error)
    // 返回一个友好的错误消息
    return {
      content: `抱歉，暂时无法连接到AI助手。<br><br>错误信息：${error.message}<br><br>您可以：<br>1. 检查网络连接<br>2. 稍后重试<br>3. 使用模拟回复模式`,
      time: '刚刚'
    }
  }
}

// 格式化AI响应（将Markdown转换为HTML）
const formatAIResponse = (text) => {
  if (!text) return text

  // 简单的Markdown转换
  let html = text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/^# (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h4>$1</h4>')

  // 如果包含列表项，添加ul标签
  if (html.includes('<li>')) {
    html = html.replace(/<li>(.*?)<\/li>/g, '<li>$1</li>')
    html = html.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>')
  }

  return html
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim()) {
    ElMessage.warning('请输入内容')
    return
  }

  // 添加用户消息
  allMessages.value.push({
    type: 'user',
    content: userInput.value,
    time: '刚刚'
  })

  // 清空输入框
  const question = userInput.value
  userInput.value = ''

  // 如果有示例消息，隐藏它
  if (showExample.value) {
    showExample.value = false
  }

  // 显示加载状态
  isLoading.value = true
  isTyping.value = true

  // 滚动到底部
  scrollToBottom()

  try {
    // 调用API获取回复
    const aiResponse = await sendMessageToAPI(question)

    // 隐藏打字动画
    isTyping.value = false

    // 添加AI回复消息
    allMessages.value.push({
      type: 'ai',
      content: aiResponse.content,
      time: aiResponse.time
    })

  } catch (error) {
    console.error('发送消息错误:', error)
    // 显示错误消息
    allMessages.value.push({
      type: 'ai',
      content: `抱歉，处理您的请求时出现错误：${error.message}<br>请稍后重试。`,
      time: '刚刚'
    })
  } finally {
    isLoading.value = false
    isTyping.value = false
    scrollToBottom()
  }
}

// 发送快速提问
const sendQuickQuestion = async (question) => {
  userInput.value = question
  await sendMessage()
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageList.value) {
      messageList.value.scrollTop = messageList.value.scrollHeight
    }
  })
}

// 功能按钮
const generateReport = async () => {
  try {
    const loading = ElLoading.service({
      lock: true,
      text: '正在生成报告...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    const response = await fetch(`${API_BASE_URL}/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType: '月度运营报告',
        dateRange: '最近30天'
      })
    })

    const data = await response.json()

    if (data.success) {
      allMessages.value.push({
        type: 'ai',
        content: `📋 <strong>报告生成完成</strong><br><br>${formatAIResponse(data.report)}<br><br><el-button type="primary" size="small">下载报告</el-button>`,
        time: '刚刚'
      })
    } else {
      throw new Error(data.error)
    }

    loading.close()
    scrollToBottom()

  } catch (error) {
    ElMessage.error(`生成报告失败: ${error.message}`)
    allMessages.value.push({
      type: 'ai',
      content: '报告生成失败，请稍后重试。',
      time: '刚刚'
    })
    scrollToBottom()
  }
}

const optimizeStrategy = () => {
  // 使用API获取优化策略
  userInput.value = '请分析当前的仓储运营数据，提供优化策略建议'
  sendMessage()
}

const emergencyCheck = () => {
  // 使用API获取应急检查
  userInput.value = '进行全面的应急系统检查，包括消防、安防、电力等系统'
  sendMessage()
}

// 清空对话历史
const clearHistory = async () => {
  try {
    await fetch(`${API_BASE_URL}/chat/history/${sessionId.value}`, {
      method: 'DELETE'
    })

    allMessages.value = [{
      type: 'ai',
      content: '您好！我是智能仓储AI助手，对话历史已清空。请问有什么可以帮您的吗？',
      time: '现在'
    }]

    ElMessage.success('对话历史已清空')
    showExample.value = true
    scrollToBottom()

  } catch (error) {
    ElMessage.error('清空历史失败')
  }
}
</script>

<style scoped>
.ai-assistant-container {
  height: 95vh;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  display: flex;
  overflow: hidden;
  position: relative;
}

/* 背景装饰 */
.ai-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.ai-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(64, 158, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(103, 194, 58, 0.1) 0%, transparent 50%);
}

.ai-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(0, 0, 0, 0.3), transparent);
}

/* 主内容区 */
.ai-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  z-index: 1;
}

/* 头部 */
.ai-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.ai-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 10px;
}

.ai-title-icon {
  font-size: 32px;
  color: #409EFF;
}

.ai-title h1 {
  color: white;
  font-size: 32px;
  margin: 0;
  background: linear-gradient(45deg, #409EFF, #67C23A);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ai-subtitle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.ai-subtitle p {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

/* 对话区域 */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

/* 消息列表容器 */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
}

/* 消息样式 */
.message {
  display: flex;
  margin-bottom: 20px;
  animation: fadeInUp 0.3s ease-out;
  align-items: flex-start;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* AI消息 - 左对齐 */
.ai-message {
  justify-content: flex-start;
  align-self: flex-start;
  max-width: 85%;
}

/* 用户消息 - 右对齐 */
.user-message {
  justify-content: flex-end;
  align-self: flex-end;
  max-width: 85%;
}

/* 消息内容容器 */
.message-content {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 15px;
  backdrop-filter: blur(5px);
  word-break: break-word;
  flex: 1;
}

/* AI消息样式 */
.ai-message .message-content {
  background: rgba(64, 158, 255, 0.15);
  border-left: 3px solid #409EFF;
  margin-right: auto;
  margin-left: 15px;
}

/* 用户消息样式 */
.user-message .message-content {
  background: rgba(103, 194, 58, 0.15);
  border-right: 3px solid #67C23A;
  margin-left: auto;
  margin-right: 15px;
  text-align: right;
}

.message-avatar {
  flex-shrink: 0;
  margin: 0 15px;
  display: flex;
  align-items: center;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-sender {
  font-weight: bold;
  color: white;
}

.message-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.message-text {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}

.ai-capabilities {
  margin: 10px 0;
  padding-left: 20px;
}

.ai-capabilities li {
  color: rgba(255, 255, 255, 0.8);
  margin: 5px 0;
}

/* 分析结果 */
.analysis-result {
  margin-top: 10px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 15px;
  text-align: center;
  margin-bottom: 10px;
}

.stat-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-bottom: 5px;
}

.stat-value {
  color: white;
  font-size: 24px;
  font-weight: bold;
  margin: 5px 0;
}

.stat-trend {
  font-size: 12px;
}

.stat-trend.up {
  color: #67C23A;
}

.stat-trend.down {
  color: #F56C6C;
}

.analysis-suggestion {
  background: rgba(255, 255, 255, 0.1);
  padding: 10px;
  border-radius: 8px;
  margin-top: 10px;
  border-left: 3px solid #E6A23C;
}

/* 正在输入指示器 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #409EFF;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {

  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }

  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

/* 快速提问 */
.quick-questions {
  padding: 15px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.quick-questions h4 {
  color: white;
  margin-bottom: 10px;
}

.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.quick-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  transition: all 0.3s ease;
}

.quick-btn:hover {
  background: rgba(64, 158, 255, 0.3) !important;
  transform: translateY(-2px);
}

/* 输入区域 */
.input-area {
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
}

.input-tips {
  margin-top: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

/* 侧边栏 */
.ai-sidebar {
  width: 300px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  overflow-y: auto;
}

.sidebar-section {
  margin-bottom: 30px;
}

.sidebar-section h3 {
  color: white;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* 实时数据 */
.realtime-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 15px;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.stat-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-bottom: 5px;
}

.stat-value {
  color: white;
  font-size: 18px;
  font-weight: bold;
}

/* 智能建议 */
.suggestions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  transition: all 0.3s ease;
}

.suggestion-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(5px);
}

.suggestion-item .el-icon {
  color: #E6A23C;
}

/* 功能按钮 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-buttons .el-button {
  justify-content: flex-start;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: white !important;
  transition: all 0.3s ease;
}

.action-buttons .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

/* 滚动条样式 */
.message-list::-webkit-scrollbar,
.ai-sidebar::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track,
.ai-sidebar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.message-list::-webkit-scrollbar-thumb,
.ai-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover,
.ai-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-assistant-container {
    flex-direction: column;
  }

  .ai-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .message-content {
    max-width: 85%;
  }

  .ai-title h1 {
    font-size: 24px;
  }
}
</style>
