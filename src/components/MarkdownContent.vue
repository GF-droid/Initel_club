<template>
  <div class="markdown-body" v-html="rendered"></div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{ content: string }>()

// gfm 启用表格/删除线/任务列表；breaks 让单个换行也变成 <br>，
// 这更符合大模型在对话里写回答的习惯。
marked.setOptions({ gfm: true, breaks: true })

// 模型输出属于不可信内容，必须净化后再交给 v-html。
// 它的提示词里嵌入了数据库快照，而 operation_logs.message 等字段可以被
// 硬件侧写入，理论上存在把 HTML 载荷带进页面的链路。
// marked.parse 在未传 async: true 时是同步返回字符串的，这里的断言是为兼容不同版本的类型定义。
const rendered = computed(() => DOMPurify.sanitize(marked.parse(props.content ?? '') as string))
</script>

<style scoped>
/* 内容由 v-html 注入，不会带 scoped 属性，因此必须用 :deep() 才能命中 */
.markdown-body { color: #d7e0e7; font-size: 13px; line-height: 1.75; overflow-wrap: anywhere; }
.markdown-body :deep(p) { margin: 0 0 10px; }
.markdown-body :deep(h1), .markdown-body :deep(h2), .markdown-body :deep(h3), .markdown-body :deep(h4), .markdown-body :deep(h5), .markdown-body :deep(h6) { margin: 14px 0 8px; color: #edf3f8; font-weight: 600; line-height: 1.4; }
.markdown-body :deep(h1) { font-size: 18px; }
.markdown-body :deep(h2) { font-size: 16px; }
.markdown-body :deep(h3) { font-size: 14.5px; }
.markdown-body :deep(h4), .markdown-body :deep(h5), .markdown-body :deep(h6) { font-size: 13px; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { margin: 0 0 10px; padding-left: 20px; }
.markdown-body :deep(li) { margin: 3px 0; }
.markdown-body :deep(strong) { color: #edf3f8; font-weight: 600; }
.markdown-body :deep(em) { color: #c6d0d9; }
.markdown-body :deep(del) { color: #8e9ca8; }
.markdown-body :deep(a) { color: #83c3ef; text-decoration: underline; }
.markdown-body :deep(code) { padding: 1px 5px; border: 1px solid #414b55; border-radius: 4px; background: #252a2f; color: #9fd4f5; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 12px; }
.markdown-body :deep(pre) { margin: 0 0 10px; padding: 10px 12px; overflow-x: auto; border: 1px solid #414b55; border-radius: 6px; background: #252a2f; }
.markdown-body :deep(pre code) { padding: 0; border: 0; background: none; color: #d7e0e7; }
.markdown-body :deep(blockquote) { margin: 0 0 10px; padding: 6px 12px; border-left: 3px solid #4a5661; background: #252a2f; color: #aebbc6; }
.markdown-body :deep(hr) { margin: 14px 0; border: 0; border-top: 1px solid #414b55; }
.markdown-body :deep(table) { width: 100%; margin: 0 0 10px; border-collapse: collapse; font-size: 12px; }
.markdown-body :deep(th), .markdown-body :deep(td) { padding: 6px 8px; border: 1px solid #414b55; text-align: left; vertical-align: top; }
.markdown-body :deep(th) { background: #292f35; color: #aebbc6; font-weight: 600; }
.markdown-body :deep(img) { max-width: 100%; }
.markdown-body :deep(p:last-child), .markdown-body :deep(ul:last-child), .markdown-body :deep(ol:last-child), .markdown-body :deep(pre:last-child), .markdown-body :deep(blockquote:last-child), .markdown-body :deep(table:last-child), .markdown-body :deep(h1:last-child), .markdown-body :deep(h2:last-child), .markdown-body :deep(h3:last-child) { margin-bottom: 0; }
</style>
