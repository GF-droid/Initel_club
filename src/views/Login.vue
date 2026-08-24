<template>
    <div :class="{ container: true, 'sign-up-model': vari }" @mousemove="moveLightDots">
        <!-- 背景装饰元素 -->
        <div class="background-elements">
            <div class="floating-circle circle-1"></div>
            <div class="floating-circle circle-2"></div>
            <div class="floating-circle circle-3"></div>
            <div class="floating-circle circle-4"></div>
            <div class="grid-pattern"></div>
        </div>

        <div class="inner-left-container">
            <div class="login-content">
                <h1 class="cool-title">智能仓储控制中心</h1>
                <p class="subtitle">Intelligent Warehouse Control System</p>
                <div class="feature-list">
                    <br>
                    <br><br><br><br>
                    <br><br>
                </div>
            </div>
        </div>

        <div class="inner-sign-up-container">
            <login-form
                ref="loginFormRef"
                :class="{ 'sign-up-model': vari }"
                @switch-to-register="vari = true"
            ></login-form>
            <register-form
                :class="{ 'sign-up-model': vari }"
                @switch-to-login="vari = false"
            ></register-form>
        </div>

        <!-- 鼠标光点效果 -->
        <div id="lightDotsContainer"></div>

        <!-- 底部信息 -->
        <div class="footer">
            <p>© 2025 智能仓储系统 </p>
        </div>
    </div>
</template>

<script lang='ts' setup name="Login">
import { ref } from 'vue'
import loginForm from '@/components/login/loginForm.vue'
import registerForm from '@/components/login/registerForm.vue'
import { UseAuth } from '@/utils/auth';

let vari = ref(false)
const loginFormRef = ref()
const clickCount = ref(0)
const { compare } = UseAuth()

const handleImageClick = () => {
    clickCount.value++
    if (clickCount.value === 3) {
        const password = prompt('请输入密码:')
        if (password !== null) {
            compare(password)
        }
        clickCount.value = 0
    }
}

// 鼠标光点效果
const moveLightDots = (event: MouseEvent) => {
    const container = document.getElementById('lightDotsContainer')
    if (!container) return

    // 限制光点数量
    if (container.children.length > 10) {
        container.removeChild(container.children[0])
    }

    const dot = document.createElement('div')
    dot.className = 'light-dot'
    dot.style.left = `${event.clientX}px`
    dot.style.top = `${event.clientY}px`
    container.appendChild(dot)

    // 自动移除光点
    setTimeout(() => {
        if (dot.parentNode) {
            dot.parentNode.removeChild(dot)
        }
    }, 1000)
}
</script>

<style scoped>
.container {
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #0D47A1 0%, #1976D2 50%, #42A5F5 100%);
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: row;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 背景装饰元素 */
.background-elements {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.floating-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    animation: float 6s ease-in-out infinite;
}

.circle-1 {
    width: 200px;
    height: 200px;
    top: 10%;
    left: 5%;
    animation-delay: 0s;
}

.circle-2 {
    width: 150px;
    height: 150px;
    top: 60%;
    left: 80%;
    animation-delay: 2s;
}

.circle-3 {
    width: 100px;
    height: 100px;
    top: 20%;
    left: 85%;
    animation-delay: 4s;
}

.circle-4 {
    width: 120px;
    height: 120px;
    top: 70%;
    left: 10%;
    animation-delay: 1s;
}

.grid-pattern {
    position: absolute;
    width: 100%;
    height: 100%;
    background-image:
        linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 50px 50px;
    opacity: 0.3;
}

@keyframes float {

    0%,
    100% {
        transform: translateY(0px) rotate(0deg);
    }

    50% {
        transform: translateY(-20px) rotate(180deg);
    }
}

.container::before {
    content: '';
    width: 2000px;
    height: 2000px;
    background: linear-gradient(45deg, rgba(33, 150, 243, 0.8), rgba(66, 165, 245, 0.6));
    position: absolute;
    border-radius: 50%;
    transform: translateY(-50%);
    right: 50%;
    top: -20%;
    transition: all 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    z-index: 2;
    animation: pulse 4s infinite;
    box-shadow:
        0 0 80px rgba(33, 150, 243, 0.4),
        inset 0 0 60px rgba(255, 255, 255, 0.1);
}

@keyframes pulse {
    0% {
        transform: scale(1) translateY(-50%);
        box-shadow:
            0 0 80px rgba(33, 150, 243, 0.4),
            inset 0 0 60px rgba(255, 255, 255, 0.1);
    }

    50% {
        transform: scale(1.05) translateY(-50%);
        box-shadow:
            0 0 120px rgba(33, 150, 243, 0.6),
            inset 0 0 80px rgba(255, 255, 255, 0.2);
    }

    100% {
        transform: scale(1) translateY(-50%);
        box-shadow:
            0 0 80px rgba(33, 150, 243, 0.4),
            inset 0 0 60px rgba(255, 255, 255, 0.1);
    }
}

.inner-left-container {
    width: 0;
    flex: 1;
    z-index: 3;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 3rem 10% 2rem 10%;
    pointer-events: all;
}

.inner-right-container {
    width: 0;
    flex: 1;
    z-index: 3;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 3rem 10% 2rem 10%;
    pointer-events: none;
}

.login-content {
    color: white;
    text-align: left;
}

.subtitle {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.9;
    font-weight: 300;
}

.feature-list {
    margin-top: 2rem;
}

.feature-item {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    opacity: 0.9;
    transition: all 0.3s ease;
}

.feature-item:hover {
    opacity: 1;
    transform: translateX(10px);
}

.feature-icon {
    margin-right: 1rem;
    font-size: 1.5rem;
}

.welcome-content {
    color: white;
    text-align: left;
}

.welcome-content h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, #ffffff, #e3f2fd);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.welcome-content p {
    font-size: 1.1rem;
    opacity: 0.8;
}

.container .inner-right-container .register-content,
.container .inner-right-container .image {
    transform: translateX(800px);
    transition: 1s all cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.container .inner-left-container .login-content,
.container .inner-left-container .image {
    transform: translateX(0px);
    transition: 1s all cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.inner-sign-up-container {
    width: 50%;
    height: 50%;
    position: absolute;
    right: 0;
    top: 25%;
    transition: all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    z-index: 4;
    transition-delay: 0.35s;
    display: grid;
    grid-template-columns: 1fr;
}

.container.sign-up-model::before {
    transform: translate(100%, -50%);
    transition: all 2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    right: 52%;
}

.container.sign-up-model .inner-right-container .register-content,
.container.sign-up-model .inner-right-container .image {
    transform: translateX(0px);
    transition: 1s all cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.container.sign-up-model .inner-left-container .login-content,
.container.sign-up-model .inner-left-container .image {
    transform: translateX(-800px);
    transition: 1s all cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.container.sign-up-model .inner-sign-up-container {
    width: 50%;
    height: 50%;
    position: absolute;
    right: 50%;
    transition: all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    z-index: 4;
    transition-delay: 0.35s;
}

.container.sign-up-model .inner-right-container {
    pointer-events: all;
}

.container.sign-up-model .inner-left-container {
    pointer-events: none;
}

/* 鼠标光点效果 */
.light-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 70%);
    pointer-events: none;
    animation: dot-fade 1s ease-out forwards;
}

@keyframes dot-fade {
    0% {
        opacity: 1;
        transform: scale(1);
    }

    100% {
        opacity: 0;
        transform: scale(0);
    }
}

/* 标题样式 */
h1.cool-title {
    color: transparent;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, #ffffff, #bbdefb, #90caf9, #64b5f6, #42a5f5);
    background-size: 400% 400%;
    -webkit-background-clip: text;
    background-clip: text;
    animation: rainbow-light 8s ease-in-out infinite;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
}

@keyframes rainbow-light {

    0%,
    100% {
        background-position: 0% 50%;
    }

    50% {
        background-position: 100% 50%;
    }
}

/* 底部信息 */
.footer {
    position: absolute;
    bottom: 2rem;
    left: 0;
    width: 100%;
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    z-index: 3;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .container {
        flex-direction: column;
    }

    h1.cool-title {
        font-size: 2.5rem;
    }

    .inner-sign-up-container {
        width: 80%;
        height: 60%;
    }
}

/* 玻璃态效果 */
.glass-effect {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 15px;
}
</style>
