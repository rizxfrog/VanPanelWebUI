<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  listHubPlugins,
  uploadPlugin,
  installPlugin,
} from '#/api/core/system/agent';

const loading = ref(false);
const plugins = ref<any[]>([]);
const searchQuery = ref('');
const categoryFilter = ref('');
const uploadVisible = ref(false);
const uploadManifest = ref('');
const uploadFile = ref<File | null>(null);

const categories = [
  { value: '', label: '全部' },
  { value: 'monitoring', label: '监控' },
  { value: 'k8s', label: 'Kubernetes' },
  { value: 'database', label: '数据库' },
  { value: 'devops', label: 'DevOps' },
  { value: 'network', label: '网络' },
];

async function loadPlugins() {
  loading.value = true;
  try {
    const res = await listHubPlugins({
      search: searchQuery.value || undefined,
      category: categoryFilter.value || undefined,
    });
    plugins.value = res.data?.items || res.data || [];
  } finally {
    loading.value = false;
  }
}

function handleSearch(value: string) {
  searchQuery.value = value;
  loadPlugins();
}

function handleCategoryChange() {
  loadPlugins();
}

async function handleInstall(id: number) {
  await installPlugin(id);
  message.success('安装成功');
}

function beforeUpload(file: File) {
  uploadFile.value = file;
  return false; // prevent auto upload
}

async function handleUpload() {
  if (!uploadManifest.value) {
    message.error('请填写 Manifest');
    return;
  }
  const formData = new FormData();
  formData.append('manifest', uploadManifest.value);
  if (uploadFile.value) {
    formData.append('binary', uploadFile.value);
  }
  await uploadPlugin(formData);
  message.success('上传成功');
  uploadVisible.value = false;
  uploadManifest.value = '';
  uploadFile.value = null;
  loadPlugins();
}

onMounted(loadPlugins);
</script>

<template>
  <div class="p-4">
    <a-card title="MCP Hub">
      <template #extra>
        <a-button type="primary" @click="uploadVisible = true">
          上传插件
        </a-button>
      </template>

      <div style="margin-bottom: 16px; display: flex; gap: 16px">
        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索插件..."
          style="width: 300px"
          @search="handleSearch"
        />
        <a-radio-group
          v-model:value="categoryFilter"
          @change="handleCategoryChange"
        >
          <a-radio-button
            v-for="cat in categories"
            :key="cat.value"
            :value="cat.value"
          >
            {{ cat.label }}
          </a-radio-button>
        </a-radio-group>
      </div>

      <a-spin :spinning="loading">
        <a-row :gutter="[16, 16]">
          <a-col
            v-for="plugin in plugins"
            :key="plugin.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <a-card hoverable size="small">
              <a-card-meta
                :title="plugin.display_name"
                :description="plugin.description?.substring(0, 80)"
              />
              <div
                style="
                  margin-top: 12px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <div>
                  <a-tag color="blue">{{ plugin.version }}</a-tag>
                  <a-tag v-if="plugin.category">{{ plugin.category }}</a-tag>
                </div>
                <span style="color: #999; font-size: 12px">
                  下载: {{ plugin.downloads || 0 }}
                </span>
              </div>
              <template #actions>
                <a-button
                  type="link"
                  size="small"
                  @click="handleInstall(plugin.id)"
                >
                  安装
                </a-button>
              </template>
            </a-card>
          </a-col>
        </a-row>
        <a-empty v-if="!loading && plugins.length === 0" description="暂无可用插件" />
      </a-spin>
    </a-card>

    <!-- 上传弹窗 -->
    <a-modal
      v-model:open="uploadVisible"
      title="上传插件"
      :width="600"
      @ok="handleUpload"
    >
      <a-form layout="vertical">
        <a-form-item label="Manifest (JSON)" required>
          <a-textarea
            v-model:value="uploadManifest"
            :rows="8"
            placeholder='{"name":"my-plugin","display_name":"My Plugin","version":"1.0.0",...}'
          />
        </a-form-item>
        <a-form-item label="二进制文件">
          <a-upload
            :before-upload="beforeUpload"
            :max-count="1"
            :custom-request="() => {}"
          >
            <a-button>选择文件</a-button>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
