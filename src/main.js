import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Categories from './views/Categories.vue'
import Category from './views/Category.vue'
import Search from './views/Search.vue'
import Play from './views/Play.vue'
import History from './views/History.vue'
import HotTags from './views/HotTags.vue'
import NotFound from './views/NotFound.vue'
import './styles/theme.css'
import './styles/site.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/categories', component: Categories },
    { path: '/tags', component: HotTags },
    { path: '/category/:id', component: Category },
    { path: '/latest', component: Category, props: { latest: true } },
    { path: '/popular', component: Category, props: { popular: true } },
    { path: '/search', component: Search },
    { path: '/play/:id', component: Play },
    { path: '/detail/:id', redirect: to => `/play/${to.params.id}` },
    { path: '/history', component: History },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ],
  scrollBehavior: () => ({ top: 0 })
})

// Force a full document navigation after every real SPA route change.
// This keeps the browser address bar in sync on mobile browsers that may
// visually retain the previous URL during client-side navigation.
router.afterEach((to, from, failure) => {
  if (failure || !from.matched.length || to.fullPath === from.fullPath) return
  window.location.replace(to.fullPath)
})

createApp(App).use(router).mount('#app')
