<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  listBuiltinTools,
  toggleBuiltinTool,
  listRemoteMCPs,
  createRemoteMCP,
  updateRemoteMCP,
  deleteRemoteMCP,
  toggleRemoteMCP,
  testRemoteMCP,
} from '#/api/core/system/agent';

const activeTab = ref('builtin');
const loading = ref(false);

// ===== 内置工具 =====
const builtinTools = ref<any[]>([]);

const builtinColumns = [
  { title: '工具名称', dataIndex: 'name', key: 'name' },
  { title: '显示名称', dataIndex: 'display_name', key: 'display_name' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '分类', dataIndex: 'category', key: 'category' },
  { title: '启用', key: 'enabled', width: 80 },
];

async function loadBuiltinTools() {
  loading.value = true;
  try {
    const res = await listBuiltinTools();
    builtinTools.value = Array.isArray(res) ? res : (res?.items || res?.data || []);
  } catch {
    builtinTools.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleToggleBuiltin(name: string) {
  try {
    await toggleBuiltinTool(name);
    message.success('操作成功');
    loadBuiltinTools();
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  }
}

// ===== 远程 MCP =====
const remoteConfigs = ref<any[]>([]);
const remoteModalVisible = ref(false);
const editingRemote = ref<any>(null);
const remoteForm = reactive({
  name: '',
  description: '',
  transport: 'sse',
  url: '',
  auth_type: 'none',
});

const remoteColumns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
  { title: '传输', dataIndex: 'transport', key: 'transport' },
  { title: '认证', dataIndex: 'auth_type', key: 'auth_type' },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'actions', width: 250 },
];

async function loadRemoteConfigs() {
  loading.value = true;
  try {
    const res = await listRemoteMCPs();
    remoteConfigs.value = res.data?.items || res.data || [];
  } catch {
    remoteConfigs.value = [];
  } finally {
    loading.value = false;
  }
}

function showRemoteModal(record?: any) {
  editingRemote.value = record || null;
  if (record) {
    Object.assign(remoteForm, {
      name: record.name,
      description: record.description,
      transport: record.transport,
      url: record.url,
      auth_type: record.auth_type,
    });
  } else {
    Object.assign(remoteForm, {
      name: '',
      description: '',
      transport: 'sse',
      url: '',
      auth_type: 'none',
    });
  }
  remoteModalVisible.value = true;
}

async function handleRemoteSubmit() {
  try {
    if (editingRemote.value) {
      await updateRemoteMCP(editingRemote.value.id, remoteForm);
    } else {
      await createRemoteMCP(remoteForm);
    }
    message.success('操作成功');
    remoteModalVisible.value = false;
    loadRemoteConfigs();
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  }
}

async function handleDeleteRemote(id: number) {
  try {
    await deleteRemoteMCP(id);
    message.success('删除成功');
    loadRemoteConfigs();
  } catch (e: any) {
    message.error(e?.message || '删除失败');
  }
}

async function handleToggleRemote(id: number) {
  try {
    await toggleRemoteMCP(id);
    message.success('操作成功');
    loadRemoteConfigs();
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  }
}

async function handleTestRemote(id: number) {
  try {
    const res = await testRemoteMCP(id);
    if (res.data?.reachable) {
      message.success(`连接成功，发现 ${res.data.tools?.length || 0} 个工具`);
    } else {
      message.error(`连接失败: ${res.data?.error || '未知错误'}`);
    }
  } catch (e: any) {
    message.error(e?.message || '测试失败');
  }
}

onMounted(() => {
  loadBuiltinTools();
  loadRemoteConfigs();
});
</script>

<template>
  <div class="p-4">
    <a-card title="工具管理">
      <a-tabs v-model:activeKey="activeTab">
        <!-- 内置工具 Tab -->
        <a-tab-pane key="builtin" tab="内置工具">
          <a-table
            :columns="builtinColumns"
            :data-source="builtinTools"
            :loading="loading"
            row-key="name"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'enabled'">
                <a-switch
                  :checked="record.enabled"
                  size="small"
                  @change="handleToggleBuiltin(record.name)"
                />
              </template>
              <template v-if="column.key === 'category'">
                <a-tag>{{ record.category }}</a-tag>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 插件 MCP Tab -->
        <a-tab-pane key="plugin" tab="插件 MCP">
          <a-empty description="暂无已安装的插件，请前往 MCP Hub 安装" />
        </a-tab-pane>

        <!-- 远程 MCP Tab -->
        <a-tab-pane key="remote" tab="远程 MCP">
          <div style="margin-bottom: 16px">
            <a-button type="primary" @click="showRemoteModal()">
              新增远程 MCP
            </a-button>
          </div>
          <a-table
            :columns="remoteColumns"
            :data-source="remoteConfigs"
            :loading="loading"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="record.enabled ? 'green' : 'red'">
                  {{ record.enabled ? '启用' : '禁用' }}
                </a-tag>
              </template>
              <template v-if="column.key === 'actions'">
                <a-space>
                  <a-button size="small" @click="handleTestRemote(record.id)">
                    测试
                  </a-button>
                  <a-button size="small" @click="showRemoteModal(record)">
                    编辑
                  </a-button>
                  <a-button
                    size="small"
                    @click="handleToggleRemote(record.id)"
                  >
                    {{ record.enabled ? '禁用' : '启用' }}
                  </a-button>
                  <a-popconfirm
                    title="确认删除？"
                    @confirm="handleDeleteRemote(record.id)"
                  >
                    <a-button danger size="small">删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 远程 MCP 新增/编辑弹窗 -->
    <a-modal
      v-model:open="remoteModalVisible"
      :title="editingRemote ? '编辑远程 MCP' : '新增远程 MCP'"
      @ok="handleRemoteSubmit"
    >
      <a-form layout="vertical">
        <a-form-item label="名称" required>
          <a-input v-model:value="remoteForm.name" placeholder="输入名称" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea
            v-model:value="remoteForm.description"
            :rows="2"
            placeholder="输入描述"
          />
        </a-form-item>
        <a-form-item label="传输方式" required>
          <a-select v-model:value="remoteForm.transport">
            <a-select-option value="sse">SSE</a-select-option>
            <a-select-option value="streamable-http">
              Streamable HTTP
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="URL" required>
          <a-input
            v-model:value="remoteForm.url"
            placeholder="https://mcp.example.com/sse"
          />
        </a-form-item>
        <a-form-item label="认证类型">
          <a-select v-model:value="remoteForm.auth_type">
            <a-select-option value="none">无认证</a-select-option>
            <a-select-option value="bearer">Bearer Token</a-select-option>
            <a-select-option value="basic">Basic Auth</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
