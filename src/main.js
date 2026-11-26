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
    { path: '/', component: Home, meta: { title: '首页' } },
    { path: '/categories', component: Categories, meta: { title: '全部分类' } },
    { path: '/tags', component: HotTags, meta: { title: '热门标签' } },
    { path: '/category/:id', component: Category, meta: { title: '视频分类' } },
    { path: '/latest', component: Category, props: { latest: true }, meta: { title: '最新更新' } },
    { path: '/popular', component: Category, props: { popular: true }, meta: { title: '热门推荐' } },
    { path: '/search', component: Search, meta: { title: '搜索结果' } },
    { path: '/play/:id', component: Play, meta: { title: '视频播放' } },
    { path: '/detail/:id', redirect: to => `/play/${to.params.id}` },
    { path: '/history', component: History, meta: { title: '观看记录' } },
    { path: '/:pathMatch(.*)*', component: NotFound, meta: { title: '页面不存在' } }
  ],
  scrollBehavior: () => ({ top: 0 })
})

// Set a meaningful title on every route, including direct page refreshes.
router.beforeEach(to => {
  const pageTitle = to.meta.title || '首页'
  const page = Math.max(1, Number.parseInt(to.query.pg, 10) || 1)
  const keyword = String(to.query.wd || '').trim().slice(0, 60)
  const title = to.path === '/search' && keyword
    ? `搜索：${keyword}${page > 1 ? ` - 第${page}页` : ''}`
    : `${pageTitle}${page > 1 && ['/latest', '/popular', '/category'].some(path => to.path.startsWith(path)) ? ` - 第${page}页` : ''}`
  document.title = `${title} - XXVOD`
})

// Force a full document navigation after every real SPA route change.
// This keeps the browser address bar in sync on mobile browsers that may
// visually retain the previous URL during client-side navigation.
router.afterEach((to, from, failure) => {
  if (failure || !from.matched.length || to.fullPath === from.fullPath) return
  window.location.replace(to.fullPath)
})

createApp(App).use(router).mount('#app')
