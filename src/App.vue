<template>
  <div class="cf-app" :class="{ 'cf-sidebar-collapsed': collapsed, 'cf-sidebar-expanded': mobileOpen }">
    <header class="cf-topbar">
      <button class="cf-menu-btn" aria-label="切换侧栏" @click="toggleSidebar"><i class="fa-solid fa-bars"></i></button>
      <router-link class="cf-logo" to="/">
        <img v-if="config.logo" class="cf-site-logo" :src="config.logo" :alt="config.name || ''" />
        <span v-else class="cf-mark"><i class="fa-solid fa-play"></i></span>
        <span v-if="config.name" class="cf-word-block"><span class="cf-word">{{ config.name }}</span></span>
      </router-link>
      <form class="cf-topbar-search" @submit.prevent="search"><i class="fa-solid fa-magnifying-glass"></i><input v-model="keyword" placeholder="搜索视频、分类或标签..." autocomplete="off" maxlength="100" /></form>
      <nav class="cf-topbar-nav"><router-link to="/" exact-active-class="active">首页</router-link><router-link to="/latest" active-class="active">最新</router-link><router-link to="/popular" active-class="active">热门</router-link></nav>
      <div class="cf-topbar-actions"><router-link to="/history" class="cf-history-link"><i class="fa-regular fa-clock"></i><span>观看记录</span></router-link><button class="cf-mobile-search-btn" @click="mobileSearch = true" aria-label="搜索"><i class="fa-solid fa-magnifying-glass"></i></button></div>
    </header>

    <div v-if="mobileOpen" class="cf-mobile-scrim" @click="mobileOpen = false"></div>
    <aside class="cf-sidebar" :class="{ open: mobileOpen }">
      <div class="cf-sb-inner">
        <div class="cf-sb-section-label">发现</div>
        <router-link class="cf-sb-item" to="/" exact-active-class="active" @click="mobileOpen = false"><span class="cf-sb-icon"><i class="fa-solid fa-house"></i></span><span class="cf-sb-label">首页</span></router-link>
        <router-link class="cf-sb-item" to="/latest" active-class="active" @click="mobileOpen = false"><span class="cf-sb-icon"><i class="fa-solid fa-clock"></i></span><span class="cf-sb-label">最新更新</span></router-link>
        <router-link class="cf-sb-item" to="/popular" active-class="active" @click="mobileOpen = false"><span class="cf-sb-icon"><i class="fa-solid fa-fire"></i></span><span class="cf-sb-label">热门推荐</span></router-link>
        <router-link class="cf-sb-item" to="/categories" active-class="active" @click="mobileOpen = false"><span class="cf-sb-icon"><i class="fa-solid fa-layer-group"></i></span><span class="cf-sb-label">全部分类</span></router-link>
        <router-link class="cf-sb-item" to="/tags" active-class="active" @click="mobileOpen = false"><span class="cf-sb-icon"><i class="fa-solid fa-hashtag"></i></span><span class="cf-sb-label">热门标签</span></router-link>
        <div class="cf-sb-divider"></div>
        <div class="cf-sb-section-label">视频分类</div>
        <div v-for="(cat, index) in rootCategories.slice(0,24)" :key="cat.type_id" class="cf-sb-category-group">
          <div class="cf-sb-category-parent">
            <button
              v-if="childrenFor(cat).length"
              type="button"
              class="cf-sb-item cf-sb-category cf-sb-category-trigger"
              :class="{ active: isCategoryGroupActive(cat) }"
              :aria-label="`展开或收起${cat.type_name}二级分类`"
              :aria-expanded="isExpanded(cat.type_id)"
              @click="toggleCategory(cat.type_id)"
            >
              <span class="cf-sb-icon"><i class="fa-solid" :class="categoryIcon(index)"></i></span>
              <span class="cf-sb-label">{{ cat.type_name }}</span>
              <i class="fa-solid cf-sb-chevron" :class="isExpanded(cat.type_id) ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
            </button>
            <router-link
              v-else
              class="cf-sb-item cf-sb-category"
              :to="`/category/${cat.type_id}`"
              active-class="active"
              @click="mobileOpen = false"
            >
              <span class="cf-sb-icon"><i class="fa-solid" :class="categoryIcon(index)"></i></span>
              <span class="cf-sb-label">{{ cat.type_name }}</span>
            </router-link>
          </div>
          <div v-if="isExpanded(cat.type_id)" class="cf-sb-subcategories">
            <router-link v-for="child in childrenFor(cat)" :key="child.type_id" class="cf-sb-subcategory" :to="`/category/${child.type_id}`" active-class="active" @click="mobileOpen = false">{{ child.type_name }}</router-link>
          </div>
        </div>
        <div class="cf-sb-divider"></div>
        <router-link class="cf-sb-item" to="/history" active-class="active" @click="mobileOpen = false"><span class="cf-sb-icon"><i class="fa-regular fa-clock"></i></span><span class="cf-sb-label">观看记录</span></router-link>
      </div>
    </aside>

    <button class="cf-sb-toggle" aria-label="折叠侧边栏" @click="collapsed = !collapsed"><i class="fa-solid fa-chevron-left"></i></button>
    <main class="cf-main"><div class="cf-page-container"><AdSlot slot="top" /><FriendlyLinks /><router-view /><AdSlot slot="bottom" />
      <footer class="cf-footer"><div v-if="config.name || config.logo" class="cf-footer-brand"><img v-if="config.logo" class="cf-footer-logo" :src="config.logo" :alt="config.name || ''" /><strong v-if="config.name">{{ config.name }}</strong></div><p v-if="config.copyright">{{ config.copyright }}</p><p class="cf-footer-note">页面内容由站点后端提供。</p></footer>
    </div></main>

    <nav class="cf-tabbar">
      <router-link to="/" class="cf-tab" exact-active-class="active"><i class="fa-solid fa-house"></i><span>首页</span></router-link>
      <router-link to="/latest" class="cf-tab" active-class="active"><i class="fa-solid fa-clock"></i><span>最新</span></router-link>
      <router-link to="/popular" class="cf-tab cf-tab-fab" active-class="active"><i class="fa-solid fa-fire"></i></router-link>
      <router-link to="/categories" class="cf-tab" active-class="active"><i class="fa-solid fa-layer-group"></i><span>分类</span></router-link>
      <router-link to="/history" class="cf-tab" active-class="active"><i class="fa-regular fa-clock"></i><span>记录</span></router-link>
    </nav>

    <div v-if="mobileSearch" class="cf-mobile-search-overlay" @click.self="mobileSearch = false"><form class="cf-mobile-search-panel" @submit.prevent="search"><i class="fa-solid fa-magnifying-glass"></i><input v-model="keyword" autofocus placeholder="搜索视频..." maxlength="100"/><button type="button" @click="mobileSearch = false">取消</button></form></div>
    <SiteStats />
  </div>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSite } from './composables/useSite'
import AdSlot from './components/AdSlot.vue'
import FriendlyLinks from './components/FriendlyLinks.vue'
import SiteStats from './components/SiteStats.vue'
const { config, categories, rootCategories, loadSite } = useSite()
const router = useRouter()
const route = useRoute()
const keyword = ref('')
const collapsed = ref(false)
const mobileOpen = ref(false)
const mobileSearch = ref(false)
const expandedCategories = ref([])
const categoryChildren = computed(() => categories.value.filter(item => Number(item.type_pid || 0) !== 0))
function childrenFor(category) {
  return categoryChildren.value.filter(item => String(item.type_pid) === String(category.type_id))
}
const categoryIcons = [
  'fa-clapperboard', 'fa-film', 'fa-video', 'fa-camera', 'fa-tv', 'fa-masks-theater',
  'fa-music', 'fa-heart', 'fa-star', 'fa-bolt', 'fa-gamepad', 'fa-book-open',
  'fa-globe', 'fa-fire', 'fa-crown', 'fa-gem', 'fa-leaf', 'fa-car',
  'fa-plane', 'fa-paw', 'fa-flask', 'fa-football', 'fa-basket-shopping', 'fa-building'
]
function categoryIcon(index) { return categoryIcons[index % categoryIcons.length] }
function isExpanded(id) { return expandedCategories.value.includes(String(id)) }
function isCategoryGroupActive(category) {
  const currentId = String(route.params.id || '')
  return currentId === String(category.type_id) || childrenFor(category).some(child => String(child.type_id) === currentId)
}
function toggleCategory(id) {
  const key = String(id)
  expandedCategories.value = isExpanded(key)
    ? expandedCategories.value.filter(value => value !== key)
    : [...expandedCategories.value, key]
}
function syncExpandedCategory() {
  const current = categories.value.find(item => String(item.type_id) === String(route.params.id || ''))
  if (!current || Number(current.type_pid || 0) === 0) return
  const parentId = String(current.type_pid)
  if (!isExpanded(parentId)) expandedCategories.value = [...expandedCategories.value, parentId]
}
function isMobile() { return window.matchMedia('(max-width: 639px)').matches }
function toggleSidebar() { if (isMobile()) mobileOpen.value = !mobileOpen.value; else collapsed.value = !collapsed.value }
function search() {
  const q = keyword.value.trim().slice(0, 100)
  mobileSearch.value = false
  mobileOpen.value = false
  if (q) router.push({ path: '/search', query: { wd: q } })
}
onMounted(loadSite)
watch(() => [route.params.id, categories.value.length], syncExpandedCategory, { immediate: true })
watch(() => route.fullPath, () => { mobileOpen.value = false; window.scrollTo({ top: 0, behavior: 'instant' }) })
</script>
