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
    name: 'FileOperations',
    path: '/system',
    children: [
      {
        name: 'FileManager',
        path: '/system/files',
        component: () => import('#/views/files/FileManager.vue'),
        meta: {
          icon: 'lucide:folder-tree',
          title: '文件工作台',
        },
      },
    ],
  },
];

export default routes;
