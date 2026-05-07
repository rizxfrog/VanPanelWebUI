<template>
  <div class="container-manager">
    <a-card :bordered="false" class="container-manager__card">
      <div class="container-manager__toolbar">
        <a-input
          v-model:value="name"
          allow-clear
          class="container-manager__search"
          placeholder="搜索容器名称或镜像"
          @press-enter="loadContainers"
        />
        <a-select
          v-model:value="state"
          class="container-manager__state"
          @change="loadContainers"
        >
          <a-select-option value="all">全部状态</a-select-option>
          <a-select-option value="running">运行中</a-select-option>
          <a-select-option value="exited">已停止</a-select-option>
          <a-select-option value="paused">已暂停</a-select-option>
          <a-select-option value="created">已创建</a-select-option>
          <a-select-option value="restarting">重启中</a-select-option>
          <a-select-option value="dead">异常</a-select-option>
        </a-select>
        <a-button type="primary" :loading="loading" @click="loadContainers">
          刷新
        </a-button>
      </div>

      <a-table
        :data-source="containers"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
        row-key="id"
        size="middle"
      >
        <a-table-column title="名称" data-index="name">
          <template #default="{ record }">
            <div class="container-manager__name">{{ record.name }}</div>
            <div class="container-manager__muted">{{ record.shortId }}</div>
          </template>
        </a-table-column>
        <a-table-column title="镜像" data-index="image" />
        <a-table-column title="状态">
          <template #default="{ record }">
            <a-space>
              <a-tag :color="stateTone(record.state)">
                {{ record.state }}
              </a-tag>
              <span class="container-manager__muted">{{ record.status }}</span>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="端口">
          <template #default="{ record }">
            {{ record.ports?.length ? record.ports.join(', ') : '-' }}
          </template>
        </a-table-column>
        <a-table-column title="IP">
          <template #default="{ record }">
            {{ record.ips?.length ? record.ips.join(', ') : '-' }}
          </template>
        </a-table-column>
        <a-table-column title="创建时间">
          <template #default="{ record }">
            {{ formatDate(record.createdAt) }}
          </template>
        </a-table-column>
        <a-table-column fixed="right" title="操作" width="330">
          <template #default="{ record }">
            <a-space wrap>
              <a-button size="small" @click="runOperation(record, 'start')">
                启动
              </a-button>
              <a-button size="small" @click="runOperation(record, 'stop')">
                停止
              </a-button>
              <a-button size="small" @click="runOperation(record, 'restart')">
                重启
              </a-button>
              <a-button size="small" @click="openLogs(record)">日志</a-button>
              <a-button size="small" @click="openStats(record)">资源</a-button>
              <a-button danger size="small" @click="confirmDelete(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-drawer v-model:open="logsOpen" title="容器日志" width="720">
      <a-spin :spinning="logsLoading">
        <pre class="container-manager__logs">{{ logs || '暂无日志' }}</pre>
      </a-spin>
    </a-drawer>

    <a-drawer v-model:open="statsOpen" title="资源占用" width="420">
      <a-descriptions v-if="stats" :column="1" bordered size="small">
        <a-descriptions-item label="CPU">
          {{ formatPercent(stats.cpuPercent) }}
        </a-descriptions-item>
        <a-descriptions-item label="内存">
          {{ formatBytes(stats.memoryUsage) }} /
          {{ formatBytes(stats.memoryLimit) }}
        </a-descriptions-item>
        <a-descriptions-item label="内存占比">
          {{ formatPercent(stats.memoryPercent) }}
        </a-descriptions-item>
        <a-descriptions-item label="网络接收">
          {{ formatBytes(stats.networkRx) }}
        </a-descriptions-item>
        <a-descriptions-item label="网络发送">
          {{ formatBytes(stats.networkTx) }}
        </a-descriptions-item>
        <a-descriptions-item label="磁盘读取">
          {{ formatBytes(stats.blockRead) }}
        </a-descriptions-item>
        <a-descriptions-item label="磁盘写入">
          {{ formatBytes(stats.blockWrite) }}
        </a-descriptions-item>
      </a-descriptions>
      <a-empty v-else description="暂无资源数据" />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';

import {
  deleteContainer,
  getContainerLogs,
  getContainers,
  getContainerStats,
  restartContainer,
  startContainer,
  stopContainer,
  type ContainerItem,
  type ContainerStats,
} from '#/api/core/system/container';

import { formatBytes, formatPercent, stateTone } from './container-manager-utils';
import './container-manager.css';

const loading = ref(false);
const containers = ref<ContainerItem[]>([]);
const name = ref('');
const state = ref('all');
const logsOpen = ref(false);
const logsLoading = ref(false);
const logs = ref('');
const statsOpen = ref(false);
const stats = ref<ContainerStats | null>(null);

async function loadContainers() {
  loading.value = true;
  try {
    const result = await getContainers({ name: name.value, state: state.value });
    containers.value = result.items || [];
  } catch (error: any) {
    message.error(error?.message || '加载容器失败');
  } finally {
    loading.value = false;
  }
}

async function runOperation(
  container: ContainerItem,
  action: 'restart' | 'start' | 'stop',
) {
  try {
    if (action === 'start') await startContainer(container.id);
    if (action === 'stop') await stopContainer(container.id);
    if (action === 'restart') await restartContainer(container.id);
    message.success('操作已提交');
    await loadContainers();
  } catch (error: any) {
    message.error(error?.message || '操作失败');
  }
}

async function openLogs(container: ContainerItem) {
  logsOpen.value = true;
  logsLoading.value = true;
  logs.value = '';
  try {
    logs.value = await getContainerLogs(container.id);
  } catch (error: any) {
    message.error(error?.message || '加载日志失败');
  } finally {
    logsLoading.value = false;
  }
}

async function openStats(container: ContainerItem) {
  statsOpen.value = true;
  stats.value = null;
  try {
    stats.value = await getContainerStats(container.id);
  } catch (error: any) {
    message.error(error?.message || '加载资源占用失败');
  }
}

function confirmDelete(container: ContainerItem) {
  Modal.confirm({
    title: `删除容器 ${container.name}`,
    content: '删除操作不可恢复，确认删除该容器？',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await deleteContainer(container.id);
      message.success('容器已删除');
      await loadContainers();
    },
  });
}

function formatDate(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

onMounted(() => {
  void loadContainers();
});
</script>
