<template>
  <div class="agent-assistant">
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
      </a-card>

      <aside class="agent-assistant__side">
        <a-card :bordered="false" title="工具能力">
          <template #extra>
            <a-space>
              <a-button size="small" type="link" @click="enableAllTools">全部启用</a-button>
              <a-button size="small" type="link" danger @click="disableAllTools">全部停用</a-button>
            </a-space>
          </template>
          <a-spin :spinning="toolsLoading">
            <div class="agent-assistant__tools-list">
              <a-list :data-source="tools" size="small">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta :description="item.description">
                      <template #title>
                        <span
                          :class="{ 'agent-assistant__tool-disabled': !toolEnabled[item.name] }">
                          {{ item.name }}
                        </span>
                      </template>
                    </a-list-item-meta>
                    <template #actions>
                      <a-switch
                        :checked="toolEnabled[item.name]"
                        size="small"
                        @change="(val: boolean) => toggleTool(item.name, val)"
                      />
                    </template>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </a-spin>
        </a-card>

        <a-card :bordered="false" class="agent-assistant__tool-activity">
          <a-tabs v-model:activeKey="activityTab" size="small">
            <a-tab-pane key="calls" tab="最近工具调用">
              <a-empty v-if="!toolCalls.length" description="暂无工具调用"/>
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
            </a-tab-pane>
            <a-tab-pane key="approvals" tab="待确认操作">
              <a-empty v-if="!approvals.length" description="暂无待确认操作"/>
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
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </aside>
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
  </div>
</template>

<script setup lang="ts">
import {nextTick, onMounted, reactive, ref} from 'vue';
import {message} from 'ant-design-vue';

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
const activityTab = ref('calls');
const tools = ref<AgentTool[]>([]);
const toolEnabled = reactive<Record<string, boolean>>({});
const toolCalls = ref<AgentToolCall[]>([]);
const approvals = ref<AgentApproval[]>([]);
const messages = ref<ChatMessage[]>([]);

async function loadTools() {
  toolsLoading.value = true;
  try {
    tools.value = await getAgentTools();
    for (const tool of tools.value) {
      if (!(tool.name in toolEnabled)) {
        toolEnabled[tool.name] = true;
      }
    }
  } catch (error: any) {
    message.error(error?.message || '加载 Agent 工具失败');
  } finally {
    toolsLoading.value = false;
  }
}

async function send() {
  const text = draft.value.trim();
  if (!text || loading.value) return;

  messages.value.push({id: crypto.randomUUID(), role: 'user', content: text});
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

function toggleTool(name: string, enabled: boolean) {
  toolEnabled[name] = enabled;
}

function enableAllTools() {
  for (const tool of tools.value) {
    toolEnabled[tool.name] = true;
  }
}

function disableAllTools() {
  for (const tool of tools.value) {
    toolEnabled[tool.name] = false;
  }
}

onMounted(() => {
  void loadTools();
});
</script>
