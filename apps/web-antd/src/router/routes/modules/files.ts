import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:server',
      order: 5,
      title: '系统',
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'SystemFiles',
        path: '/system/files',
        component: () => import('#/views/system/FileManager.vue'),
        meta: {
          icon: 'lucide:folder-tree',
          title: '文件管理',
        },
      },
      {
        name: 'SystemShares',
        path: '/system/shares',
        component: () => import('#/views/system/ShareManager.vue'),
        meta: {
          icon: 'lucide:share-2',
          title: '分享管理',
        },
      },
      {
        name: 'SystemTerminal',
        path: '/system/terminal',
        component: () => import('#/views/system/TerminalManager.vue'),
        meta: {
          icon: 'lucide:terminal',
          title: '终端',
        },
      },
      {
        name: 'SystemContainers',
        path: '/system/containers',
        component: () => import('#/views/system/ContainerManager.vue'),
        meta: {
          icon: 'lucide:container',
          title: '容器管理',
        },
      },
    ],
  },
];

export default routes;
