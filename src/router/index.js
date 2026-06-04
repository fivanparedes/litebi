import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/data'
  },
  {
    path: '/data',
    name: 'data',
    component: () => import('@/views/DataView.vue'),
    meta: { icon: 'Database', titleKey: 'nav.data' }
  },
  {
    path: '/cleaning',
    name: 'cleaning',
    component: () => import('@/views/CleaningView.vue'),
    meta: { title: 'nav.cleaning' }
  },
  {
    path: '/modeling',
    name: 'modeling',
    component: () => import('@/views/ModelingView.vue'),
    meta: { icon: 'Network', titleKey: 'nav.modeling' }
  },
  {
    path: '/formulas',
    name: 'formulas',
    component: () => import('@/views/FormulasView.vue'),
    meta: { title: 'nav.formulas' }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: 'nav.dashboard' }
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('@/views/ReportView.vue'),
    meta: { title: 'nav.reports' }
  },
  {
    path: '/help',
    name: 'help',
    component: () => import('@/views/HelpView.vue'),
    meta: { title: 'Manual de Usuario' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
