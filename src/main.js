import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Category from './views/Category.vue'
import Search from './views/Search.vue'
import Play from './views/Play.vue'
import History from './views/History.vue'
import NotFound from './views/NotFound.vue'
import './styles/theme.css'
import './styles/site.css'
import 'plyr/dist/plyr.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/categories', component: Category },
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
