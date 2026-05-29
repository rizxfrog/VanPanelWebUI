<template>
  <div class="agent-assistant">
<!--    <section class="agent-assistant__hero">
      <div>
        <p class="agent-assistant__eyebrow">Secure AI Ops Agent</p>
        <h1>智能运维助手</h1>
        <p>
          面向诊断、建议和受控执行。高风险操作会被安全护栏阻断，低风险变更需要你确认。
        </p>
      </div>
      <a-space wrap>
        <a-tag color="green">Risk Guard</a-tag>
        <a-tag color="blue">Tool Router</a-tag>
        <a-tag color="gold">Audit Trail</a-tag>
      </a-space>
    </section>-->

    <div class="agent-assistant__grid">
      <a-card :bordered="false" class="agent-assistant__chat">
        <div ref="scrollRef" class="agent-assistant__messages">
          <div
            v-for="item in messages"
            :key="item.id"
            :class="['agent-assistant__message', `is-${item.role}`]"
          >
            <div class="agent-assistant__bubble">
              <div class="agent-assistant__content">{{ item.content }}</div>
            </div>
          </div>
        </div>

        <div class="agent-assistant__composer">
          <a-textarea
            v-model:value="draft"
            :auto-size="{ minRows: 2, maxRows: 5 }"
            placeholder="例如：帮我分析磁盘为什么满了，或者检查容器状态"
            @press-enter="handleEnter"
          />
          <a-button type="primary" :loading="loading" @click="send">
            发送
          </a-button>
        </div>
      </a-card>

      <aside class="agent-assistant__side">
        <a-card :bordered="false" title="工具能力">
          <a-spin :spinning="toolsLoading">
            <a-list :data-source="tools" size="small">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta :description="item.description">
                    <template #title>{{ item.name }}</template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </a-spin>
        </a-card>

        <a-card :bordered="false" title="最近工具调用">
          <a-empty v-if="!toolCalls.length" description="暂无工具调用" />
          <a-timeline v-else>
            <a-timeline-item
              v-for="call in toolCalls"
              :key="call.id"
              :color="callColor(call.status)"
            >
              <div class="agent-assistant__tool-name">{{ call.name }}</div>
              <div class="agent-assistant__muted">{{ call.status }}</div>
              <pre v-if="call.error">{{ call.error }}</pre>
            </a-timeline-item>
          </a-timeline>
        </a-card>

        <a-card :bordered="false" title="待确认操作">
          <a-empty v-if="!approvals.length" description="暂无待确认操作" />
          <div
            v-for="approval in approvals"
            :key="approval.id"
            class="agent-assistant__approval"
          >
            <div class="agent-assistant__tool-name">
              {{ approval.toolCall.name }}
            </div>
            <div class="agent-assistant__muted">
              {{ JSON.stringify(approval.toolCall.args || {}) }}
            </div>
            <a-space>
              <a-button
                size="small"
                type="primary"
                @click="confirmApproval(approval.id)"
              >
                确认执行
              </a-button>
              <a-button size="small" @click="rejectApproval(approval.id)">
                拒绝
              </a-button>
            </a-space>
          </div>
        </a-card>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';

import {
  confirmAgentApproval,
  getAgentTools,
  queryAgentStream,
  rejectAgentApproval,
  type AgentApproval,
  type AgentTool,
  type AgentToolCall,
} from '#/api/core/system/agent';

import './agent-assistant.css';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

const draft = ref('');
const loading = ref(false);
const toolsLoading = ref(false);
const sessionId = ref<string>();
const scrollRef = ref<HTMLElement>();
const tools = ref<AgentTool[]>([]);
const toolCalls = ref<AgentToolCall[]>([]);
const approvals = ref<AgentApproval[]>([]);
const messages = ref<ChatMessage[]>([
  {
    id: 'welcome',
    role: 'assistant',
    content: '请描述你要诊断的问题。我会先给出只读诊断和建议，涉及变更时会要求确认。',
  },
]);

async function loadTools() {
  toolsLoading.value = true;
  try {
    tools.value = await getAgentTools();
  } catch (error: any) {
    message.error(error?.message || '加载 Agent 工具失败');
  } finally {
    toolsLoading.value = false;
  }
}

async function send() {
  const text = draft.value.trim();
  if (!text || loading.value) return;

  messages.value.push({ id: crypto.randomUUID(), role: 'user', content: text });
  draft.value = '';
  loading.value = true;
  await scrollToBottom();

  try {
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    };
    messages.value.push(assistantMessage);

    let streamError: Error | undefined;
    await queryAgentStream(text, sessionId.value, {
      onStart(data) {
        sessionId.value = data.session_id || data.sessionId || sessionId.value;
      },
      onDelta(content) {
        assistantMessage.content += content;
        void scrollToBottom();
      },
      onDone(data) {
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
        // 如果流结束但没有任何内容，显示提示
        if (!assistantMessage.content) {
          assistantMessage.content = '（模型未返回内容，请检查后端日志或确认 LLM 配置是否正确）';
        }
        toolCalls.value = [];
        approvals.value = [];
      },
      onError(error) {
        streamError = error;
      },
    });
    if (streamError) {
      throw streamError;
    }
  } catch (error: any) {
    message.error(error?.message || 'Agent 请求失败');
  } finally {
    loading.value = false;
    await scrollToBottom();
  }
}

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey) return;
  event.preventDefault();
  void send();
}

async function confirmApproval(id: string) {
  try {
    await confirmAgentApproval(id);
    approvals.value = approvals.value.filter((item) => item.id !== id);
    message.success('已确认执行');
  } catch (error: any) {
    message.error(error?.message || '确认执行失败');
  }
}

async function rejectApproval(id: string) {
  try {
    await rejectAgentApproval(id);
    approvals.value = approvals.value.filter((item) => item.id !== id);
    message.success('已拒绝');
  } catch (error: any) {
    message.error(error?.message || '拒绝失败');
  }
}

function callColor(status: string) {
  if (status === 'completed') return 'green';
  if (status === 'blocked' || status === 'failed') return 'red';
  if (status === 'pending_approval') return 'orange';
  return 'blue';
}

async function scrollToBottom() {
  await nextTick();
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
  }
}

onMounted(() => {
  void loadTools();
});
</script>
