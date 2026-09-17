import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/app/layouts/AppLayout.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: '/predictions' },
        {
          path: 'predictions',
          name: 'predictions',
          component: () => import('@/pages/predictions/PredictionsPage.vue'),
        },
        {
          path: '403',
          name: 'forbidden',
          component: () => import('@/pages/predictions/PredictionsPage.vue'), // заглушка
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/predictions/PredictionsPage.vue'), // заглушка
    },
  ],
})
