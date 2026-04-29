<template>
  <div class="file-manager-page">
    <div class="file-manager-header">
      <div>
        <h1>文件工作台</h1>
        <p>管理 VanPanelBackend 本机文件，后续可扩展远程节点。</p>
      </div>
      <a-space>
        <a-select v-model:value="targetType" style="width: 140px">
          <a-select-option value="local">本机</a-select-option>
        </a-select>
        <a-button :loading="loading" @click="loadCurrentPath">刷新</a-button>
      </a-space>
    </div>

    <div class="file-manager-layout">
      <aside class="file-manager-sidebar">
        <h3>安全根目录</h3>
        <a-list :data-source="roots" size="small">
          <template #renderItem="{ item }">
            <a-list-item class="file-root-item" @click="openPath(item.path)">
              <a-list-item-meta :description="item.path" :title="item.name" />
            </a-list-item>
          </template>
        </a-list>
      </aside>

      <main class="file-manager-main">
        <div class="file-manager-toolbar">
          <a-input-search
            v-model:value="search"
            allow-clear
            placeholder="搜索文件名"
            style="max-width: 320px"
            @search="loadCurrentPath"
          />
          <a-switch
            v-model:checked="showHidden"
            checked-children="显示隐藏"
            un-checked-children="隐藏隐藏"
            @change="loadCurrentPath"
          />
          <a-button type="primary" @click="openCreate(false)">
            新建文件
          </a-button>
          <a-button @click="openCreate(true)">新建目录</a-button>
          <a-button danger :disabled="!selectedRowKeys.length" @click="confirmDelete">
            删除
          </a-button>
        </div>

        <a-breadcrumb class="file-manager-breadcrumb">
          <a-breadcrumb-item>{{ currentPath }}</a-breadcrumb-item>
        </a-breadcrumb>

        <a-table
          :columns="columns"
          :data-source="files"
          :loading="loading"
          :pagination="pagination"
          :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
          row-key="path"
          @change="onTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <a-button
                type="link"
                @click="record.is_dir ? openPath(record.path) : previewFile(record)"
              >
                <component
                  :is="record.is_dir ? FolderOutlined : FileOutlined"
                  :class="record.is_dir ? 'file-icon-dir' : 'file-icon-file'"
                  style="margin-right: 6px;"
                />
                {{ record.name }}
              </a-button>
            </template>
            <template v-else-if="column.key === 'size'">
              {{ record.is_dir ? '-' : formatFileSize(record.size) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button
                  :disabled="record.is_dir"
                  size="small"
                  @click="previewFile(record)"
                >
                  预览
                </a-button>
                <a-button
                  :disabled="record.is_dir"
                  size="small"
                  @click="downloadFile(record)"
                >
                  下载
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </main>
    </div>

    <a-drawer v-model:open="drawerOpen" title="文件预览" width="720">
      <a-textarea
        v-model:value="editorContent"
        :disabled="!canEditFile(activeFile)"
        :rows="20"
      />
      <template #extra>
        <a-button
          :disabled="!canEditFile(activeFile)"
          type="primary"
          @click="saveActiveFile"
        >
          保存
        </a-button>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { FileOutlined, FolderOutlined } from '@ant-design/icons-vue';

import type { TablePaginationConfig } from 'ant-design-vue';
import { message, Modal } from 'ant-design-vue';

import type { FileInfo, FileRoot } from '#/api/core/files/files';
import {
  createFileApi,
  deleteFileApi,
  downloadFileUrl,
  getFileContentApi,
  getFileRootsApi,
  listFilesApi,
  saveFileContentApi,
} from '#/api/core/files/files';

import { canEditFile, formatFileSize, joinPath } from './file-manager-utils';
import './file-manager.css';

const targetType = ref<'local'>('local');
const roots = ref<FileRoot[]>([]);
const files = ref<FileInfo[]>([]);
const currentPath = ref('');
const search = ref('');
const showHidden = ref(false);
const loading = ref(false);
const selectedRowKeys = ref<string[]>([]);
const page = ref(1);
const size = ref(50);
const total = ref(0);
const drawerOpen = ref(false);
const activeFile = ref<FileInfo | null>(null);
const editorContent = ref('');

const columns = [
  { dataIndex: 'name', key: 'name', sorter: true, title: '名称' },
  { dataIndex: 'size', key: 'size', sorter: true, title: '大小' },
  { dataIndex: 'mode', key: 'mode', title: '权限' },
  { dataIndex: 'user', key: 'user', title: '属主' },
  { dataIndex: 'group', key: 'group', title: '用户组' },
  { dataIndex: 'mod_time', key: 'mod_time', sorter: true, title: '修改时间' },
  { key: 'action', title: '操作' },
];

const pagination = computed<TablePaginationConfig>(() => ({
  current: page.value,
  pageSize: size.value,
  showSizeChanger: true,
  total: total.value,
}));

async function loadRoots() {
  const res = await getFileRootsApi();
  roots.value = res.roots;
  if (!currentPath.value && roots.value.length > 0) {
    currentPath.value = roots.value[0]?.path ?? '';
  }
}

async function loadCurrentPath() {
  if (!currentPath.value) return;
  loading.value = true;
  try {
    const res = await listFilesApi({
      page: page.value,
      path: currentPath.value,
      search: search.value,
      show_hidden: showHidden.value,
      size: size.value,
      sort_by: 'name',
      sort_order: 'asc',
      target_type: targetType.value,
    });
    files.value = res.items;
    total.value = res.total;
    currentPath.value = res.path;
  } finally {
    loading.value = false;
  }
}

function openPath(path: string) {
  currentPath.value = path;
  page.value = 1;
  void loadCurrentPath();
}

function onSelectChange(keys: (number | string)[]) {
  selectedRowKeys.value = keys.map(String);
}

function onTableChange(nextPagination: TablePaginationConfig) {
  page.value = nextPagination.current || 1;
  size.value = nextPagination.pageSize || 50;
  void loadCurrentPath();
}

async function previewFile(file: FileInfo) {
  activeFile.value = await getFileContentApi({
    path: file.path,
    target_type: targetType.value,
  });
  editorContent.value = activeFile.value.content || '';
  drawerOpen.value = true;
}

async function saveActiveFile() {
  if (!activeFile.value) return;
  await saveFileContentApi({
    content: editorContent.value,
    path: activeFile.value.path,
    target_type: targetType.value,
  });
  message.success('保存成功');
  await loadCurrentPath();
}

function downloadFile(file: FileInfo) {
  window.open(downloadFileUrl(file.path), '_blank');
}

function openCreate(isDir: boolean) {
  const name = window.prompt(isDir ? '请输入目录名' : '请输入文件名');
  if (!name) return;
  void createFileApi({
    is_dir: isDir,
    path: joinPath(currentPath.value, name),
    target_type: targetType.value,
  }).then(loadCurrentPath);
}

function confirmDelete() {
  Modal.confirm({
    async onOk() {
      for (const path of selectedRowKeys.value) {
        await deleteFileApi({ path, target_type: targetType.value });
      }
      selectedRowKeys.value = [];
      await loadCurrentPath();
    },
    content: '第一版会直接删除，不进入回收站。',
    title: '确认删除选中文件？',
  });
}

onMounted(async () => {
  await loadRoots();
  await loadCurrentPath();
});
</script>
