import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/dashboard',
      component: () => import('@/views/dashboard/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'workspace',
          component: () => import('@/views/dashboard/WorkspaceView.vue'),
          meta: { breadcrumb: 'nav.workspace' },
        },
        {
          path: 'sandbox',
          name: 'sandbox',
          component: () => import('@/views/dashboard/SandboxView.vue'),
          meta: { breadcrumb: 'nav.sandbox' },
        },
        {
          path: 'sandbox/:projectId',
          name: 'sandbox-project',
          component: () => import('@/views/dashboard/SandboxProjectView.vue'),
          meta: { breadcrumb: 'nav.sandbox' },
        },
        {
          path: 'playground',
          name: 'playground',
          component: () => import('@/views/dashboard/PlaygroundView.vue'),
          meta: { breadcrumb: 'nav.playground' },
        },
        {
          path: 'playground/:projectId',
          name: 'playground-project',
          component: () => import('@/views/dashboard/PlaygroundProjectView.vue'),
          meta: { breadcrumb: 'nav.playground' },
        },
        {
          path: 'classroom',
          name: 'classroom',
          component: () => import('@/views/dashboard/ClassroomView.vue'),
          meta: { breadcrumb: 'nav.classroom' },
        },
        {
          path: 'competition',
          name: 'competition',
          component: () => import('@/views/dashboard/CompetitionView.vue'),
          meta: { breadcrumb: 'nav.competition' },
        },
        {
          path: 'guides',
          name: 'guides',
          component: () => import('@/views/dashboard/GuidesView.vue'),
          meta: { breadcrumb: 'nav.guides' },
        },
        {
          path: 'guides/:slug',
          name: 'guide-detail',
          component: () => import('@/views/dashboard/GuideArticleView.vue'),
          meta: { breadcrumb: 'nav.guides' },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/dashboard/ProfileView.vue'),
          meta: { breadcrumb: 'nav.profile' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/dashboard/SettingsView.vue'),
          meta: { breadcrumb: 'nav.settings' },
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/views/dashboard/AdminView.vue'),
          meta: { requiresAdmin: true, breadcrumb: 'nav.administration' },
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.meta.requiresAdmin && auth.user?.role !== 'admin') {
    return { name: 'workspace' };
  }

  return true;
});
