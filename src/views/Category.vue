<template>
  <section class="cf-page cf-list-page">
    <header class="cf-page-title"><div><h1 class="cf-h2">{{ title }}</h1><p>发现更多精彩内容</p></div></header>
    <div v-if="!latest && !popular && childCategories.length" class="cf-chip-row cf-category-tabs">
      <router-link v-for="cat in childCategories" :key="cat.type_id" :to="`/category/${cat.type_id}`" class="cf-chip" :class="{ active: String(cat.type_id) === String(route.params.id) }"><span class="cf-chip-dot"></span>{{ cat.type_name }}</router-link>
    </div>
    <VideoGrid :items="videos" :loading="loading" />
    <Pagination :current="page" :pages="pageCount" @change="go" />
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCategories } from '../api/site'
import { getCategoryVideos, getHotVideos, getLatestVideos, VIDEO_PAGE_SIZE } from '../api/vod'
import VideoGrid from '../components/VideoGrid.vue'
import Pagination from '../components/Pagination.vue'
const props = defineProps({ latest: Boolean, popular: Boolean })
const route = useRoute()
const router = useRouter()
const videos = ref([])
const categories = ref([])
const page = ref(1)
const pageCount = ref(1)
const loading = ref(true)
let token = 0
const currentCategory = computed(() => categories.value.find(c => String(c.type_id) === String(route.params.id)) || null)
const currentRoot = computed(() => {
  if (!currentCategory.value) return null
  if (Number(currentCategory.value.type_pid || 0) === 0) return currentCategory.value
  return categories.value.find(c => String(c.type_id) === String(currentCategory.value.type_pid)) || null
})
const childCategories = computed(() => currentRoot.value
  ? categories.value.filter(c => String(c.type_pid || 0) === String(currentRoot.value.type_id))
  : [])
const title = computed(() => props.latest ? '最新更新' : props.popular ? '热门推荐' : currentCategory.value?.type_name || '视频分类')
async function load() {
  const current = ++token
  const n = Number(route.query.pg)
  page.value = Number.isFinite(n) && n > 0 ? Math.min(100000, Math.trunc(n)) : 1
  loading.value = true
  try {
    const [cats] = await Promise.all([getCategories()])
    categories.value = Array.isArray(cats) ? cats.filter(c => c && c.type_id != null) : []
    const result = props.latest ? await getLatestVideos(page.value, VIDEO_PAGE_SIZE) : props.popular ? await getHotVideos(page.value, VIDEO_PAGE_SIZE) : await getCategoryVideos(route.params.id, page.value, VIDEO_PAGE_SIZE)
    if (current !== token) return
    videos.value = result.list
    pageCount.value = Math.max(1, result.pageCount || 1)
  } catch (_) { if (current === token) videos.value = [] }
  finally { if (current === token) loading.value = false }
}
function go(next) { router.push({ query: { ...route.query, pg: next } }) }
watch(title, value => {
  const n = Number(route.query.pg)
  const pageLabel = Number.isFinite(n) && n > 1 ? ` - 第${Math.trunc(n)}页` : ''
  document.title = `${value}${pageLabel} - XXVOD`
}, { immediate: true })
watch(() => [route.params.id, route.query.pg, props.latest, props.popular], load, { immediate: true })
</script>
