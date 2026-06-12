import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { icon: 'Database', titleKey: 'Data Sources' }
  },
  {
    path: '/data',
    name: 'data',
    component: () => import('@/views/DataView.vue'),
    meta: { icon: 'Database', titleKey: 'nav.data' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { icon: 'ScanSearch', titleKey: 'Data Profile' }
  },
  {
    path: '/cleaning',
    name: 'cleaning',
    component: () => import('@/views/CleaningView.vue'),
    meta: { icon: 'Wand2', titleKey: 'nav.cleaning' }
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
    meta: { icon: 'FunctionSquare', titleKey: 'nav.formulas' }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { icon: 'LayoutDashboard', titleKey: 'nav.dashboard' }
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('@/views/ReportView.vue'),
    meta: { icon: 'FileText', titleKey: 'nav.reports' }
  },
  {
    path: '/python',
    name: 'python',
    component: () => import('@/views/PythonView.vue'),
    meta: { icon: 'Terminal', titleKey: 'nav.python' }
  },
  {
    path: '/help',
    name: 'help',
    component: () => import('@/views/HelpView.vue'),
    meta: { icon: 'HelpCircle', titleKey: 'nav.help' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { icon: 'Settings', titleKey: 'nav.settings' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { titleKey: 'nav.notFound' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
