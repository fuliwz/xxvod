<template>
  <section class="cf-page cf-list-page">
    <header class="cf-page-title"><div><h1 class="cf-h2">搜索结果</h1><p v-if="keyword">关键词：{{ keyword }}</p></div></header>
    <VideoGrid :items="videos" :loading="loading" />
    <Pagination :current="page" :pages="pageCount" @change="go" />
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchVideos } from '../api/vod'
import VideoGrid from '../components/VideoGrid.vue'
import Pagination from '../components/Pagination.vue'
const route = useRoute()
const router = useRouter()
const videos = ref([])
const loading = ref(false)
const page = ref(1)
const pageCount = ref(1)
const keyword = computed(() => String(route.query.wd || '').trim().slice(0, 100))
let token = 0
async function load() {
  const current = ++token
  const n = Number(route.query.pg)
  page.value = Number.isFinite(n) && n > 0 ? Math.min(100000, Math.trunc(n)) : 1
  if (!keyword.value) { videos.value = []; pageCount.value = 1; loading.value = false; return }
  loading.value = true
  try {
    const result = await searchVideos(keyword.value, page.value, 24)
    if (current !== token) return
    videos.value = result.list
    pageCount.value = Math.max(1, result.pageCount || 1)
  } catch (_) { if (current === token) videos.value = [] }
  finally { if (current === token) loading.value = false }
}
function go(next) { router.push({ query: { ...route.query, pg: next } }) }
watch(() => [route.query.wd, route.query.pg], load, { immediate: true })
</script>
