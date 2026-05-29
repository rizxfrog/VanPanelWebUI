<template>
  <div class="agent-chat">
    <!-- Messages Area -->
    <div ref="scrollRef" class="agent-chat__messages">
      <div class="agent-chat__container">
        <!-- Welcome State -->
        <div v-if="!messages.length" class="agent-chat__welcome">
          <div class="agent-chat__logo">
            <Icon icon="solar:stars-bold-duotone" class="text-4xl" />
          </div>
          <h1 class="agent-chat__title">智能运维助手</h1>
          <p class="agent-chat__subtitle">基于 AI 的智能运维诊断与建议系统</p>
          <div class="agent-chat__suggestions">
            <div
              v-for="(suggestion, index) in suggestions"
              :key="index"
              class="agent-chat__suggestion-card"
              @click="selectSuggestion(suggestion)"
            >
              <Icon :icon="suggestion.icon" class="text-xl mb-2" />
              <span>{{ suggestion.text }}</span>
            </div>
          </div>
        </div>

        <!-- Message List -->
        <template v-else>
          <div
            v-for="message in messages"
            :key="message.id"
            :class="['agent-chat__message', `agent-chat__message--${message.role}`]"
          >
            <!-- Avatar -->
            <div class="agent-chat__avatar">
              <div
                v-if="message.role === 'assistant'"
                class="agent-chat__avatar-bot"
              >
                <Icon icon="solar:stars-bold-duotone" />
              </div>
              <div v-else class="agent-chat__avatar-user">
                <Icon icon="solar:user-bold-duotone" />
              </div>
            </div>

            <!-- Content -->
            <div class="agent-chat__content">
              <div class="agent-chat__header">
                <span class="agent-chat__role">
                  {{ message.role === 'assistant' ? 'AI 助手' : '用户' }}
                </span>
                <span class="agent-chat__time">{{ formatTime(message.time) }}</span>
              </div>

              <!-- Message Body -->
              <div class="agent-chat__body">
                <!-- Text Content -->
                <div v-if="message.type === 'text'" class="agent-chat__text">
                  {{ message.content }}
                </div>

                <!-- Markdown/Formatted Content -->
                <div
                  v-else-if="message.type === 'markdown'"
                  class="agent-chat__markdown"
                  v-html="renderMarkdown(message.content)"
                />

                <!-- Tool Call Block -->
                <div
                  v-else-if="message.type === 'tool_call'"
                  class="agent-chat__tool-call"
                >
                  <div class="agent-chat__tool-header">
                    <Icon icon="solar:code-square-bold-duotone" />
                    <span>正在调用工具</span>
                    <a-spin size="small" />
                  </div>
                  <div class="agent-chat__tool-name">{{ message.toolName }}</div>
                </div>

                <!-- Tool Result Block -->
                <div
                  v-else-if="message.type === 'tool_result'"
                  class="agent-chat__tool-result"
                >
                  <div class="agent-chat__tool-header">
                    <Icon icon="solar:check-circle-bold-duotone" class="text-green-500" />
                    <span>工具执行完成</span>
                  </div>
                  <pre class="agent-chat__tool-data">{{ message.result }}</pre>
                </div>

                <!-- Table Block -->
                <div
                  v-else-if="message.type === 'table'"
                  class="agent-chat__table-wrapper"
                >
                  <table class="agent-chat__table">
                    <thead>
                      <tr>
                        <th v-for="col in message.columns" :key="col">{{ col }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in message.data" :key="idx">
                        <td v-for="(val, col) in row" :key="col">{{ val }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Summary Block -->
                <div
                  v-else-if="message.type === 'summary'"
                  class="agent-chat__summary"
                >
                  <div class="agent-chat__summary-title">
                    <Icon icon="solar:target-bold-duotone" class="text-pink-500" />
                    <span>{{ message.title }}</span>
                  </div>
                  <div class="agent-chat__summary-content">{{ message.content }}</div>
                  <ul v-if="message.items" class="agent-chat__summary-list">
                    <li v-for="(item, idx) in message.items" :key="idx">
                      <Icon :icon="item.icon" :class="item.iconClass" />
                      <span v-html="item.text"></span>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Message Actions -->
              <div class="agent-chat__actions">
                <button
                  v-for="action in messageActions"
                  :key="action.key"
                  class="agent-chat__action-btn"
                  :title="action.label"
                  @click="handleAction(action.key, message)"
                >
                  <Icon :icon="action.icon" />
                </button>
                <span v-if="message.tokens" class="agent-chat__tokens">
                  +{{ message.tokens }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- Streaming Indicator (only when awaiting first response) -->
        <div v-if="streaming" class="agent-chat__message agent-chat__message--assistant">
          <div class="agent-chat__avatar">
            <div class="agent-chat__avatar-bot">
              <Icon icon="solar:stars-bold-duotone" />
            </div>
          </div>
          <div class="agent-chat__content">
            <div class="agent-chat__loading">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="agent-chat__input-wrapper">
      <div class="agent-chat__input-container">
        <div class="agent-chat__input-main">
          <button class="agent-chat__attach-btn">
            <Icon icon="solar:add-circle-bold-duotone" />
          </button>
          <textarea
            v-model="draft"
            :disabled="loading"
            :placeholder="inputPlaceholder"
            class="agent-chat__input"
            rows="1"
            @keydown="handleKeydown"
            @input="autoResize"
          />
          <div class="agent-chat__input-actions">
            <button
              class="agent-chat__mode-btn"
              :class="{ 'agent-chat__mode-btn--active': thinkingMode }"
              @click="thinkingMode = !thinkingMode"
            >
              <span>思考</span>
              <Icon icon="solar:alt-arrow-down-bold-duotone" />
            </button>
            <button class="agent-chat__voice-btn">
              <Icon icon="solar:microphone-bold-duotone" />
            </button>
            <button
              class="agent-chat__send-btn"
              :disabled="!draft.trim() || loading"
              @click="send"
            >
              <Icon icon="solar:arrow-up-bold-duotone" />
            </button>
          </div>
        </div>
      </div>
      <p class="agent-chat__footer">
        AI 生成的内容可能存在误差，请核实重要信息
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {nextTick, onMounted, ref, type UnwrapRef} from 'vue';
import { message } from 'ant-design-vue';
import { Icon } from '@iconify/vue';
import MarkdownIt from 'markdown-it';

import {
  getAgentTools,
  queryAgentStream,
  type AgentTool,
} from '#/api/core/system/agent';

import './agent-chat.css';

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
});

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  type: 'text' | 'markdown' | 'tool_call' | 'tool_result' | 'table' | 'summary';
  content?: string;
  time: Date;
  tokens?: number;
  toolName?: string;
  result?: any;
  columns?: string[];
  data?: Record<string, any>[];
  title?: string;
  items?: { icon: string; iconClass: string; text: string }[];
}

interface Suggestion {
  icon: string;
  text: string;
  prompt: string;
}

const draft = ref('');
const loading = ref(false);
const streaming = ref(false);
const sessionId = ref<string>();
const scrollRef = ref<HTMLElement>();
const thinkingMode = ref(false);
const messages = ref<ChatMessage[]>([]);
const tools = ref<AgentTool[]>([]);

const inputPlaceholder = '有什么我能帮您的吗？';

const suggestions: Suggestion[] = [
  {
    icon: 'solar:chart-2-bold-duotone',
    text: '分析系统性能',
    prompt: '帮我分析当前系统性能状况，包括 CPU、内存和磁盘使用情况。',
  },
  {
    icon: 'solar:box-bold-duotone',
    text: '检查容器状态',
    prompt: '检查所有容器的运行状态，找出可能存在的问题。',
  },
  {
    icon: 'solar:shield-warning-bold-duotone',
    text: '安全风险评估',
    prompt: '对当前系统进行安全风险评估，识别潜在的安全隐患。',
  },
  {
    icon: 'solar:cpu-bold-duotone',
    text: '资源优化建议',
    prompt: '分析系统资源使用情况，给出优化建议。',
  },
];

const messageActions = [
  { key: 'copy', icon: 'solar:copy-bold-duotone', label: '复制' },
  { key: 'like', icon: 'solar:like-bold-duotone', label: '赞同' },
  { key: 'dislike', icon: 'solar:dislike-bold-duotone', label: '不赞同' },
  { key: 'share', icon: 'solar:share-bold-duotone', label: '分享' },
  { key: 'retry', icon: 'solar:refresh-circle-bold-duotone', label: '重新生成' },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(content: UnwrapRef<ChatMessage["content"]> | undefined): string {
  if (!content) return '';
  return md.render(content);
}

function autoResize(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  target.style.height = 'auto';
  target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

function selectSuggestion(suggestion: Suggestion) {
  draft.value = suggestion.prompt;
  send();
}

function handleAction(key: string, msg: ChatMessage) {
  switch (key) {
    case 'copy':
      navigator.clipboard.writeText(msg.content || '');
      message.success('已复制到剪贴板');
      break;
    case 'like':
    case 'dislike':
      // TODO: Send feedback to backend
      break;
    case 'retry':
      // TODO: Retry last message
      break;
  }
}

async function scrollToBottom() {
  await nextTick();
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
  }
}

async function send() {
  const text = draft.value.trim();
  if (!text || loading.value) return;

  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    type: 'text',
    content: text,
    time: new Date(),
  };
  messages.value.push(userMessage);
  draft.value = '';
  loading.value = true;
  streaming.value = true;

  // Reset textarea height
  const textarea = document.querySelector('.agent-chat__input') as HTMLTextAreaElement;
  if (textarea) textarea.style.height = 'auto';

  await scrollToBottom();

  try {
    let assistantMessage: ChatMessage | null = null;

    let streamError: Error | undefined;
    await queryAgentStream(text, sessionId.value, {
      onStart(data) {
        sessionId.value = data.session_id || data.sessionId || sessionId.value;
      },
      onDelta(content) {
        if (!assistantMessage) {
          streaming.value = false;
          assistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            type: 'markdown',
            content: '',
            time: new Date(),
          };
          messages.value.push(assistantMessage);
        }
        assistantMessage.content += content;
        void scrollToBottom();
      },
      onDone(data) {
        streaming.value = false;
        if (!assistantMessage) {
          assistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            type: 'markdown',
            content: '',
            time: new Date(),
          };
          messages.value.push(assistantMessage);
        }
        const result = data.result || {};
        sessionId.value =
          data.session_id ||
          data.sessionId ||
          result.session_id ||
          result.sessionId ||
          sessionId.value;
        if (!assistantMessage.content && result.answer) {
          assistantMessage.content = result.answer;
        }
        if (!assistantMessage.content) {
          assistantMessage.content = '（模型未返回内容，请检查后端日志或确认 LLM 配置是否正确）';
        }
      },
      onError(error) {
        streamError = error;
      },
    });
    if (streamError) throw streamError;
  } catch (error: any) {
    streaming.value = false;
    message.error(error?.message || 'Agent 请求失败');
  } finally {
    loading.value = false;
    streaming.value = false;
    await scrollToBottom();
  }
}

async function loadTools() {
  try {
    tools.value = await getAgentTools();
  } catch (error: any) {
    // Silent fail
  }
}

onMounted(() => {
  void loadTools();
});
</script>
