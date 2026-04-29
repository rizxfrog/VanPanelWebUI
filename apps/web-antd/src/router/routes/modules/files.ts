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
    ],
  },
];

export default routes;
