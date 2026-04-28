import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:folder-cog',
      order: 5,
      title: '文件管理',
    },
    name: 'FileOperations',
    path: '/files',
    children: [
      {
        name: 'FileManager',
        path: '/files/manager',
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
