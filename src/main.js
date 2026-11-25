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
import { preloadSiteData } from './api/site'
import './styles/theme.css'
import './styles/site.css'

// Start global API requests immediately. The site modules deduplicate these
// requests so mounted components reuse the same in-flight promises/results.
void preloadSiteData()

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

createApp(App).use(router).mount('#app')
