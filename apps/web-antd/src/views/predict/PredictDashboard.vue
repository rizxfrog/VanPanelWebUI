<template>
  <div class="predict-dashboard">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-icon">
            <BarChartOutlined />
          </div>
          <div class="header-text">
            <h1 class="page-title">AI预测看板</h1>
            <p class="page-subtitle">智能预测系统资源使用趋势</p>
          </div>
        </div>
      </div>
    </div>

    <a-card class="placeholder-card">
      <a-result
        status="info"
        title="功能暂不可用"
        sub-title="Python AIOps 服务已下线（包含 ML 预测模型），该功能将在 Go 后端重新实现。敬请期待。"
      />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { BarChartOutlined } from '@ant-design/icons-vue';
</script>

<style scoped>
.predict-dashboard {
  padding: 24px;
}
.page-header {
  margin-bottom: 24px;
}
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-icon {
  font-size: 48px;
  color: #1890ff;
}
.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
.page-subtitle {
  margin: 4px 0 0;
  color: #8c8c8c;
}
.placeholder-card {
  max-width: 800px;
  margin: 40px auto;
}
</style>
