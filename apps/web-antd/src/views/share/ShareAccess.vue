<template>
  <div class="share-access-page">
    <div class="share-access-container">
      <!-- 分享信息卡片 -->
      <a-card class="share-info-card" v-if="shareInfo">
        <template #title>
          <div class="card-title">
            <FileOutlined />
            <span>文件分享</span>
          </div>
        </template>
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="分享码">
            {{ shareInfo.share_code }}
          </a-descriptions-item>
          <a-descriptions-item label="文件数量">
            {{ shareInfo.file_count }} 个文件
          </a-descriptions-item>
          <a-descriptions-item label="访问级别">
            <a-tag :color="shareInfo.access_level === 'public' ? 'green' : 'blue'">
              {{ shareInfo.access_level === 'public' ? '公开访问' : '需要登录' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="下载次数">
            {{ shareInfo.download_count }}
            <span v-if="shareInfo.max_downloads > 0"> / {{ shareInfo.max_downloads }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="过期时间">
            {{ shareInfo.expire_at ? formatTime(shareInfo.expire_at) : '永久有效' }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- 提取码输入 -->
        <div class="access-code-section" v-if="!verified">
          <a-divider>请输入提取码</a-divider>
          <a-input-group compact>
            <a-input
              v-model:value="accessCode"
              placeholder="请输入6位提取码"
              style="width: calc(100% - 100px)"
              :maxlength="6"
              @pressEnter="verifyAccess"
            />
            <a-button type="primary" :loading="verifying" @click="verifyAccess">
              验证
            </a-button>
          </a-input-group>
          <div class="error-message" v-if="errorMsg">{{ errorMsg }}</div>
        </div>
      </a-card>

      <!-- 加载中 -->
      <a-card v-if="loading" class="loading-card">
        <a-spin size="large" />
        <p>加载分享信息...</p>
      </a-card>

      <!-- 错误状态 -->
      <a-card v-if="error" class="error-card">
        <a-result
          status="error"
          :title="error"
          sub-title="请检查分享链接是否正确"
        >
          <template #extra>
            <a-button type="primary" @click="retryLoad">重试</a-button>
          </template>
        </a-result>
      </a-card>

      <!-- 文件列表 -->
      <a-card v-if="verified && files.length > 0" class="files-card">
        <template #title>
          <div class="card-title">
            <FolderOutlined />
            <span>文件列表</span>
          </div>
        </template>
        <a-list :data-source="files" :loading="loadingFiles">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #avatar>
                  <component
                    :is="item.file_type === 'directory' ? FolderOutlined : FileOutlined"
                    :class="item.file_type === 'directory' ? 'file-icon-dir' : 'file-icon-file'"
                  />
                </template>
                <template #title>
                  <span>{{ item.file_name }}</span>
                </template>
                <template #description>
                  <span class="file-path">{{ item.file_path }}</span>
                </template>
              </a-list-item-meta>
              <template #actions>
                <a-button
                  type="link"
                  size="small"
                  @click="downloadFile(item)"
                  :disabled="item.file_type === 'directory'"
                >
                  下载
                </a-button>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-card>

      <!-- 空状态 -->
      <a-card v-if="verified && files.length === 0 && !loadingFiles" class="empty-card">
        <a-empty description="暂无文件" />
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { FileOutlined, FolderOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';

import type { FileShareItem, ShareInfoResponse } from '#/api/core/files/file-share';
import {
  getShareInfoApi,
  verifyShareAccessApi,
  getShareFilesApi,
  downloadShareFileUrl,
} from '#/api/core/files/file-share';

const route = useRoute();
const shareCode = route.params.code as string;

const loading = ref(false);
const verifying = ref(false);
const loadingFiles = ref(false);
const error = ref('');
const verified = ref(false);
const errorMsg = ref('');

const shareInfo = ref<ShareInfoResponse | null>(null);
const files = ref<FileShareItem[]>([]);
const accessCode = ref('');
const accessLevel = ref('');

function formatTime(time: string) {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
}

async function loadShareInfo() {
  loading.value = true;
  error.value = '';
  try {
    shareInfo.value = await getShareInfoApi(shareCode);
  } catch (err: any) {
    error.value = err.response?.data?.message || '加载分享信息失败';
  } finally {
    loading.value = false;
  }
}

async function verifyAccess() {
  if (accessCode.value.length !== 6) {
    errorMsg.value = '请输入6位提取码';
    return;
  }

  verifying.value = true;
  errorMsg.value = '';
  try {
    const resp = await verifyShareAccessApi(shareCode, {
      access_code: accessCode.value,
    });

    if (resp.valid) {
      verified.value = true;
      accessLevel.value = resp.access_level || '';
      await loadFiles();
    } else {
      errorMsg.value = resp.error_msg || '验证失败';
    }
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || '验证失败';
  } finally {
    verifying.value = false;
  }
}

async function loadFiles() {
  loadingFiles.value = true;
  try {
    files.value = await getShareFilesApi(shareCode);
  } catch (err: any) {
    message.error('加载文件列表失败');
  } finally {
    loadingFiles.value = false;
  }
}

function downloadFile(item: FileShareItem) {
  const url = downloadShareFileUrl(shareCode, accessCode.value, item.file_path);
  window.open(url, '_blank');
}

function retryLoad() {
  loadShareInfo();
}

onMounted(() => {
  loadShareInfo();
});
</script>

<style scoped>
.share-access-page {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 20px;
}

.share-access-container {
  width: 100%;
  max-width: 800px;
}

.share-info-card,
.files-card,
.loading-card,
.error-card,
.empty-card {
  margin-bottom: 24px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.access-code-section {
  margin-top: 24px;
}

.error-message {
  color: #ff4d4f;
  margin-top: 8px;
  font-size: 14px;
}

.file-icon-dir {
  color: #1890ff;
  font-size: 18px;
}

.file-icon-file {
  color: #666;
  font-size: 18px;
}

.file-path {
  color: #999;
  font-size: 12px;
}

.loading-card {
  text-align: center;
  padding: 40px;
}

.loading-card p {
  margin-top: 16px;
  color: #666;
}
</style>
