import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/DashboardLayout.vue'),
      children: [
        {
          path: '',
          redirect: '/dashboard/overview'
        },
        {
          path: 'overview',
          name: 'Overview',
          component: () => import('../views/OverviewView.vue'),
          meta: { title: '总览' }
        },
        {
          path: 'apikeys',
          name: 'ApiKeys',
          component: () => import('../views/ApiKeysView.vue'),
          meta: { title: 'API Key管理' }
        },
        {
          path: 'accounts', 
          name: 'Accounts',
          component: () => import('../views/AccountsView.vue'),
          meta: { title: '账号管理' }
        },
        {
          path: 'groups',
          name: 'Groups',
          component: () => import('../views/GroupsView.vue'),
          meta: { title: '分组管理' }
        },
        {
          path: 'analytics',
          name: 'Analytics',
          component: () => import('../views/AnalyticsView.vue'),
          meta: { title: '数据分析' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFound.vue')
    }
  ]
});

// 路由前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 账号看板`;
  } else {
    document.title = '账号看板 - Account Dashboard';
  }
  
  next();
});

export default router;