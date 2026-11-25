<template>
  <section class="cf-page cf-list-page">
    <header class="cf-page-title">
      <div><span class="cf-eyebrow"></span><h1 class="cf-h2">全部分类</h1><p>按分类浏览视频内容</p></div>
    </header>
    <div v-if="loading" class="cf-empty"><span class="cf-spinner"></span><span>正在加载分类…</span></div>
    <div v-else-if="rootCategories.length" class="cf-all-categories">
      <section v-for="root in rootCategories" :key="root.type_id" class="cf-all-category-group">
        <router-link :to="`/category/${root.type_id}`" class="cf-category-card cf-root-category-card">
          <span class="cf-cat-icon"><i class="fa-solid fa-clapperboard"></i></span>
          <strong>{{ root.type_name }}</strong>
          <i class="fa-solid fa-arrow-up-right-from-square cf-cat-arrow"></i>
        </router-link>
        <div v-if="childrenFor(root).length" class="cf-all-category-children">
          <router-link v-for="child in childrenFor(root)" :key="child.type_id" :to="`/category/${child.type_id}`" class="cf-all-category-child">{{ child.type_name }}</router-link>
        </div>
      </section>
    </div>
    <div v-else class="cf-empty"><i class="fa-regular fa-folder-open"></i><span>暂时没有可显示的分类</span></div>
  </section>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { getCategories } from '../api/site'
const categories = ref([])
const loading = ref(true)
const rootCategories = computed(() => categories.value.filter(item => Number(item.type_pid || 0) === 0))
function childrenFor(root) { return categories.value.filter(item => String(item.type_pid || 0) === String(root.type_id)) }
onMounted(async () => {
  try {
    const result = await getCategories()
    categories.value = Array.isArray(result) ? result.filter(item => item && item.type_id != null) : []
  } catch (_) {
    categories.value = []
  } finally {
    loading.value = false
  }
})
</script>
