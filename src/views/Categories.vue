<template>
  <section class="cf-page cf-list-page">
    <header class="cf-page-title">
      <div><span class="cf-eyebrow">EXPLORE LIBRARY</span><h1 class="cf-h2">全部分类</h1><p>按分类浏览视频内容</p></div>
    </header>
    <div v-if="loading" class="cf-empty"><span class="cf-spinner"></span><span>正在加载分类…</span></div>
    <div v-else-if="categories.length" class="cf-category-grid cf-all-categories">
      <router-link v-for="cat in categories" :key="cat.type_id" :to="`/category/${cat.type_id}`" class="cf-category-card">
        <span class="cf-cat-icon"><i class="fa-solid fa-clapperboard"></i></span>
        <strong>{{ cat.type_name }}</strong>
        <i class="fa-solid fa-arrow-up-right-from-square cf-cat-arrow"></i>
      </router-link>
    </div>
    <div v-else class="cf-empty"><i class="fa-regular fa-folder-open"></i><span>暂时没有可显示的分类</span></div>
  </section>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { getCategories } from '../api/site'
const categories = ref([])
const loading = ref(true)
onMounted(async () => {
  try {
    const result = await getCategories()
    categories.value = Array.isArray(result) ? result.filter(item => Number(item.type_pid || 0) === 0) : []
  } catch (_) {
    categories.value = []
  } finally {
    loading.value = false
  }
})
</script>
