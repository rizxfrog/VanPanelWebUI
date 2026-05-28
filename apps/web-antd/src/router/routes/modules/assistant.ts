import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:album',
      order: 20,
      title: '智能助手',
    },
    name: 'Assistant',
    path: '/assistant',
    redirect: '/assistant/query',
    children: [
      {
        name: 'AssistantQuery',
        path: '/assistant/query',
        component: () => import('#/views/assistant/AssistantQuery.vue'),
        meta: {
          icon: 'lucide:message-square',
          title: '智能问答',
        },
      },
      {
        name: 'AssistantAgent',
        path: '/assistant/agent',
        component: () => import('#/views/system/AgentAssistant.vue'),
        meta: {
          icon: 'lucide:bot',
          title: '智能助手',
        },
      },
      {
        name: 'AssistantSession',
        path: '/assistant/session',
        component: () => import('#/views/assistant/AssistantSession.vue'),
        meta: {
          icon: 'lucide:users',
          title: '会话管理',
        },
      },
      {
        name: 'AssistantKnowledge',
        path: '/assistant/knowledge',
        component: () => import('#/views/assistant/AssistantKnowledge.vue'),
        meta: {
          icon: 'lucide:book',
          title: '知识库管理',
        },
      },
      {
        name: 'AssistantInfo',
        path: '/assistant/info',
        component: () => import('#/views/assistant/AssistantInfo.vue'),
        meta: {
          icon: 'lucide:info',
          title: '服务信息',
        },
      },
      {
        name: 'AssistantTools',
        path: '/assistant/tools',
        component: () => import('#/views/assistant/AssistantTools.vue'),
        meta: {
          icon: 'lucide:wrench',
          title: '工具管理',
        },
      },
      {
        name: 'AssistantHub',
        path: '/assistant/hub',
        component: () => import('#/views/assistant/AssistantHub.vue'),
        meta: {
          icon: 'lucide:store',
          title: 'MCP Hub',
        },
      },
    ],
  },
];

export default routes;
