<template>
  <div class="terminal-page">
    <div class="terminal-toolbar">
      <a-select
        v-model:value="selectedTargetKey"
        class="terminal-target-select"
        placeholder="选择终端目标"
      >
        <a-select-option
          v-for="target in targets"
          :key="`${target.type}:${target.id}`"
          :value="`${target.type}:${target.id}`"
        >
          {{ target.name }}
        </a-select-option>
      </a-select>
      <a-button type="primary" @click="openSession">打开终端</a-button>
      <a-input-search
        v-model:value="quickCommand"
        class="terminal-command"
        enter-button="发送"
        placeholder="快捷命令"
        @search="sendQuickCommand"
      />
    </div>

    <a-tabs
      v-model:active-key="activeClientId"
      type="editable-card"
      @edit="handleTabEdit"
    >
      <a-tab-pane
        v-for="session in sessions"
        :key="session.clientId"
        :tab="session.title"
      >
        <div
          :ref="(el) => bindTerminalRef(session.clientId, el)"
          class="terminal-screen"
        ></div>
      </a-tab-pane>
    </a-tabs>

    <a-empty v-if="sessions.length === 0" description="请选择目标并打开终端" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { message } from 'ant-design-vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

import { useAccessStore } from '@vben/stores';

import { getTerminalTargets } from '#/api/core/system/terminal';

import {
  decodeTerminalMessage,
  encodeTerminalMessage,
  terminalWsUrl,
  type TerminalTarget,
  type TerminalTargetType,
} from './terminal-protocol';

import './terminal-manager.css';

interface TerminalSession {
  clientId: string;
  fitAddon: FitAddon;
  serverSessionId?: string;
  socket: WebSocket;
  target: TerminalTarget;
  terminal: Terminal;
  title: string;
}

const accessStore = useAccessStore();
const targets = ref<TerminalTarget[]>([]);
const selectedTargetKey = ref<string>();
const activeClientId = ref<string>();
const quickCommand = ref('');
const sessions = ref<TerminalSession[]>([]);
const terminalRefs = new Map<string, HTMLElement>();

function bindTerminalRef(
  clientId: string,
  el: ComponentPublicInstance | Element | null,
) {
  if (el instanceof HTMLElement) {
    terminalRefs.set(clientId, el);
  }
}

function currentSession() {
  return sessions.value.find((item) => item.clientId === activeClientId.value);
}

async function loadTargets() {
  try {
    targets.value = await getTerminalTargets();
    const local = targets.value.find((item) => item.type === 'local');
    selectedTargetKey.value = local ? `${local.type}:${local.id}` : undefined;
  } catch {
    message.error('加载终端目标失败');
  }
}

async function openSession() {
  if (!selectedTargetKey.value) {
    message.warning('请选择终端目标');
    return;
  }
  const [targetType, targetId] = selectedTargetKey.value.split(':') as [
    TerminalTargetType,
    string,
  ];
  const target = targets.value.find(
    (item) => item.type === targetType && item.id === targetId,
  );
  const token = accessStore.accessToken;
  if (!target || !token) {
    message.error('无法打开终端');
    return;
  }

  const socket = new WebSocket(terminalWsUrl(token));
  const terminal = new Terminal({
    cursorBlink: true,
    fontFamily: 'Menlo, Monaco, Consolas, monospace',
    fontSize: 14,
    theme: {
      background: '#05070a',
      foreground: '#d8dee9',
    },
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  const clientId = `terminal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const session: TerminalSession = {
    clientId,
    fitAddon,
    socket,
    target,
    terminal,
    title: target.name,
  };
  sessions.value.push(session);
  activeClientId.value = clientId;

  await nextTick();
  const element = terminalRefs.get(clientId);
  if (element) {
    terminal.open(element);
    fitAddon.fit();
  }

  socket.onopen = () => {
    socket.send(
      encodeTerminalMessage({
        cols: terminal.cols,
        rows: terminal.rows,
        targetId: target.id,
        targetType: target.type,
        type: 'connect',
      }),
    );
  };

  socket.onmessage = (event) => {
    const msg = decodeTerminalMessage(String(event.data));
    if (msg.type === 'connected') {
      session.serverSessionId = msg.sessionId;
      session.title = msg.targetName;
      terminal.focus();
      return;
    }
    if (msg.type === 'output') {
      terminal.write(msg.data);
      return;
    }
    if (msg.type === 'error') {
      terminal.write(`\r\n\x1b[31m${msg.message}\x1b[0m\r\n`);
      return;
    }
    if (msg.type === 'closed') {
      terminal.write(`\r\n\x1b[33mSession closed: ${msg.reason}\x1b[0m\r\n`);
    }
  };

  socket.onclose = () => {
    terminal.write('\r\n\x1b[33mConnection closed.\x1b[0m\r\n');
  };

  socket.onerror = () => {
    terminal.write('\r\n\x1b[31mWebSocket connection error.\x1b[0m\r\n');
  };

  terminal.onData((data) => {
    if (
      socket.readyState === WebSocket.OPEN &&
      session.serverSessionId !== undefined
    ) {
      socket.send(
        encodeTerminalMessage({
          data,
          sessionId: session.serverSessionId,
          type: 'input',
        }),
      );
    }
  });
}

function sendQuickCommand() {
  const session = currentSession();
  if (
    !session?.serverSessionId ||
    session.socket.readyState !== WebSocket.OPEN ||
    !quickCommand.value
  ) {
    return;
  }
  session.socket.send(
    encodeTerminalMessage({
      data: `${quickCommand.value}\r`,
      sessionId: session.serverSessionId,
      type: 'input',
    }),
  );
  quickCommand.value = '';
}

function closeSession(clientId: string) {
  const index = sessions.value.findIndex((item) => item.clientId === clientId);
  if (index < 0) {
    return;
  }
  const [session] = sessions.value.splice(index, 1);
  if (
    session?.serverSessionId &&
    session.socket.readyState === WebSocket.OPEN
  ) {
    session.socket.send(
      encodeTerminalMessage({
        reason: 'client_closed',
        sessionId: session.serverSessionId,
        type: 'close',
      }),
    );
  }
  session?.socket.close();
  session?.terminal.dispose();
  terminalRefs.delete(clientId);
  activeClientId.value = sessions.value[0]?.clientId;
}

function handleTabEdit(targetKey: string | MouseEvent, action: 'add' | 'remove') {
  if (action === 'add') {
    void openSession();
  }
  if (action === 'remove' && typeof targetKey === 'string') {
    closeSession(targetKey);
  }
}

function resizeActive() {
  const session = currentSession();
  if (
    !session?.serverSessionId ||
    session.socket.readyState !== WebSocket.OPEN
  ) {
    return;
  }
  session.fitAddon.fit();
  session.socket.send(
    encodeTerminalMessage({
      cols: session.terminal.cols,
      rows: session.terminal.rows,
      sessionId: session.serverSessionId,
      type: 'resize',
    }),
  );
}

onMounted(() => {
  void loadTargets();
  window.addEventListener('resize', resizeActive);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeActive);
  for (const session of [...sessions.value]) {
    closeSession(session.clientId);
  }
});
</script>
