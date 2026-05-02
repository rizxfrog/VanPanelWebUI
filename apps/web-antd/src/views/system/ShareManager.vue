<template>
  <div class="share-manager-page">
    <div class="share-manager-header">
      <div>
        <h1>分享管理</h1>
        <p>管理所有文件分享链接，支持合并、取消、编辑等操作。</p>
      </div>
      <a-space>
        <a-input-search
          v-model:value="search"
          allow-clear
          placeholder="搜索分享码"
          style="max-width: 320px"
          @search="loadShares"
        />
        <a-select v-model:value="statusFilter" style="width: 120px" @change="loadShares">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option value="active">活跃</a-select-option>
          <a-select-option value="cancelled">已取消</a-select-option>
          <a-select-option value="expired">已过期</a-select-option>
          <a-select-option value="merged">已合并</a-select-option>
        </a-select>
        <a-button :loading="loading" @click="loadShares">刷新</a-button>
        <a-button
          type="primary"
          :disabled="selectedRowKeys.length < 2"
          @click="showMergeDialog"
        >
          合并分享
        </a-button>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="shares"
      :loading="loading"
      :pagination="pagination"
      :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
      row-key="id"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'share_code'">
          <a-button type="link" size="small" @click="copyShareLink(record.share_code)">
            {{ record.share_code }}
          </a-button>
        </template>
        <template v-else-if="column.key === 'access_level'">
          <a-tag :color="record.access_level === 'public' ? 'green' : 'blue'">
            {{ record.access_level === 'public' ? '公开' : '需登录' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="getStatusColor(record.status)">
            {{ getStatusText(record.status) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'expire_at'">
          {{ record.expire_at ? formatTime(record.expire_at) : '永久' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button size="small" @click="copyShareLink(record.share_code)">
              复制链接
            </a-button>
            <a-button size="small" @click="showEditDialog(record)">
              编辑
            </a-button>
            <a-popconfirm
              v-if="record.status === 'active'"
              title="确定要取消此分享吗？"
              @confirm="cancelShare(record.id)"
            >
              <a-button size="small" danger>取消</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 编辑对话框 -->
    <a-modal
      v-model:open="editDialogVisible"
      title="编辑分享设置"
      @ok="updateShare"
    >
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="访问级别">
          <a-select v-model:value="editForm.access_level">
            <a-select-option value="public">公开</a-select-option>
            <a-select-option value="login_required">需登录</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="最大下载次数">
          <a-input-number v-model:value="editForm.max_downloads" :min="0" style="width: 100%" />
          <div class="form-tip">0 表示无限制</div>
        </a-form-item>
        <a-form-item label="过期时间">
          <a-date-picker
            v-model:value="editForm.expire_at"
            show-time
            style="width: 100%"
            :disabled-date="disabledDate"
          />
          <div class="form-tip">不设置表示永久有效</div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 合并确认对话框 -->
    <a-modal
      v-model:open="mergeDialogVisible"
      title="合并分享链接"
      @ok="mergeShares"
    >
      <p>确定要将选中的 {{ selectedRowKeys.length }} 个分享链接合并为一个吗？</p>
      <p>合并后，原分享链接将失效，新链接将包含所有文件。</p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';

import type { FileShare } from '#/api/core/files/file-share';
import {
  listSharesApi,
  updateShareApi,
  deleteShareApi,
  mergeSharesApi,
} from '#/api/core/files/file-share';

const shares = ref<FileShare[]>([]);
const loading = ref(false);
const search = ref('');
const statusFilter = ref('');
const selectedRowKeys = ref<number[]>([]);
const page = ref(1);
const size = ref(20);
const total = ref(0);

const editDialogVisible = ref(false);
const mergeDialogVisible = ref(false);
const editingShareId = ref<number>(0);

const editForm = ref({
  access_level: 'public' as 'public' | 'login_required',
  max_downloads: 0,
  expire_at: null as Dayjs | null,
});

const columns = [
  { dataIndex: 'share_code', key: 'share_code', title: '分享码' },
  { dataIndex: 'access_level', key: 'access_level', title: '访问级别' },
  { dataIndex: 'download_count', key: 'download_count', title: '下载次数' },
  { dataIndex: 'max_downloads', key: 'max_downloads', title: '最大下载' },
  { dataIndex: 'expire_at', key: 'expire_at', title: '过期时间' },
  { dataIndex: 'status', key: 'status', title: '状态' },
  { dataIndex: 'created_at', key: 'created_at', title: '创建时间' },
  { key: 'action', title: '操作', width: 250 },
];

const pagination = computed<TablePaginationConfig>(() => ({
  current: page.value,
  pageSize: size.value,
  showSizeChanger: true,
  total: total.value,
}));

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: 'green',
    cancelled: 'red',
    expired: 'orange',
    merged: 'blue',
  };
  return colors[status] || 'default';
}

function getStatusText(status: string) {
  const texts: Record<string, string> = {
    active: '活跃',
    cancelled: '已取消',
    expired: '已过期',
    merged: '已合并',
  };
  return texts[status] || status;
}

function formatTime(time: string) {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
}

function disabledDate(current: Dayjs) {
  return current && current < dayjs().startOf('day');
}

function onSelectChange(keys: number[]) {
  selectedRowKeys.value = keys;
}

function onTableChange(nextPagination: TablePaginationConfig) {
  page.value = nextPagination.current || 1;
  size.value = nextPagination.pageSize || 20;
  loadShares();
}

async function loadShares() {
  loading.value = true;
  try {
    const res = await listSharesApi({
      page: page.value,
      size: size.value,
      search: search.value,
      status: statusFilter.value,
    });
    shares.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function copyShareLink(shareCode: string) {
  const link = `${window.location.origin}/share/${shareCode}`;
  navigator.clipboard.writeText(link);
  message.success('分享链接已复制到剪贴板');
}

function showEditDialog(record: FileShare) {
  editingShareId.value = record.id;
  editForm.value = {
    access_level: record.access_level,
    max_downloads: record.max_downloads,
    expire_at: record.expire_at ? dayjs(record.expire_at) : null,
  };
  editDialogVisible.value = true;
}

async function updateShare() {
  try {
    await updateShareApi(editingShareId.value, {
      access_level: editForm.value.access_level,
      max_downloads: editForm.value.max_downloads,
      expire_at: editForm.value.expire_at?.toISOString() || null,
    });
    message.success('更新成功');
    editDialogVisible.value = false;
    await loadShares();
  } catch (error) {
    message.error('更新失败');
  }
}

async function cancelShare(id: number) {
  try {
    await deleteShareApi(id);
    message.success('已取消分享');
    await loadShares();
  } catch (error) {
    message.error('取消失败');
  }
}

function showMergeDialog() {
  if (selectedRowKeys.value.length < 2) {
    message.warning('请至少选择2个分享链接');
    return;
  }
  mergeDialogVisible.value = true;
}

async function mergeShares() {
  try {
    await mergeSharesApi({ share_ids: selectedRowKeys.value });
    message.success('合并成功');
    mergeDialogVisible.value = false;
    selectedRowKeys.value = [];
    await loadShares();
  } catch (error) {
    message.error('合并失败');
  }
}

onMounted(() => {
  loadShares();
});
</script>

<style scoped>
.share-manager-page {
  padding: 24px;
}

.share-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.share-manager-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.share-manager-header p {
  margin: 0;
  color: #666;
}

.form-tip {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}
</style>
