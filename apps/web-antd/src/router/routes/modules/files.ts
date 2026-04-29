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
        name: 'SystemTerminal',
        path: '/system/terminal',
        component: () => import('#/views/system/TerminalManager.vue'),
        meta: {
          icon: 'lucide:terminal',
          title: '终端',
        },
      },
    ],
  },
];

export default routes;
