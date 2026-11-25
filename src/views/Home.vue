<template>
  <section class="cf-page">
    <section class="cf-hero">
      <div class="cf-hero-content">
        <span class="cf-eyebrow"><i class="fa-solid fa-bolt"></i> YOUR VIDEO UNIVERSE</span>
        <h1 class="cf-h1">DISCOVER <span class="cf-grad-text-hot">WHAT'S NEXT</span></h1>
        <p>探索最新内容、热门视频与精选分类。</p>
        <div class="cf-hero-actions"><router-link to="/latest" class="cf-btn primary"><i class="fa-solid fa-play"></i> 立即探索</router-link><router-link to="/categories" class="cf-btn ghost">全部分类</router-link></div>
      </div>
      <div class="cf-hero-orb"><span class="orb-ring one"></span><span class="orb-ring two"></span><i class="fa-solid fa-play"></i></div>
    </section>
    <section class="cf-section">
      <header class="cf-sec-head"><div><span class="cf-eyebrow pink">TRENDING NOW</span><h2 class="cf-h2">热门精选 <span class="cf-grad-text">TRENDING</span></h2></div><router-link class="cf-see-all" to="/popular">查看全部 <i class="fa-solid fa-arrow-right"></i></router-link></header>
      <VideoGrid :items="popular" :loading="loading" />
    </section>
    <section class="cf-section">
      <header class="cf-sec-head"><div><span class="cf-eyebrow">FRESH UPDATES</span><h2 class="cf-h2">最新更新 <span class="cf-grad-text">LATEST</span></h2></div><router-link class="cf-see-all" to="/latest">更多内容 <i class="fa-solid fa-arrow-right"></i></router-link></header>
      <div class="cf-chip-row">
        <button v-for="tab in tabs" :key="tab.key" class="cf-chip" :class="{ active: active === tab.key }" @click="change(tab.key)"><span class="cf-chip-dot"></span>{{ tab.label }}</button>
      </div>
      <VideoGrid :items="latest" :loading="loading" />
    </section>
    <section class="cf-section">
      <header class="cf-sec-head"><div><span class="cf-eyebrow pink">BROWSE BY GENRE</span><h2 class="cf-h2">视频分类 <span class="cf-grad-text-hot">CATEGORIES</span></h2></div><router-link to="/categories" class="cf-see-all">全部分类 <i class="fa-solid fa-arrow-right"></i></router-link></header>
      <div class="cf-category-grid">
        <router-link v-for="cat in categories.slice(0, 16)" :key="cat.type_id" :to="`/category/${cat.type_id}`" class="cf-category-card"><span class="cf-cat-icon"><i class="fa-solid fa-clapperboard"></i></span><strong>{{ cat.type_name }}</strong><i class="fa-solid fa-arrow-up-right-from-square cf-cat-arrow"></i></router-link>
      </div>
    </section>
    <section v-if="tags.length" class="cf-section">
      <header class="cf-sec-head"><div><span class="cf-eyebrow">POPULAR SEARCH</span><h2 class="cf-h2">热门标签</h2></div></header>
      <div class="cf-tags"><router-link v-for="tag in tags" :key="tag.name || tag" :to="`/search?wd=${encodeURIComponent(tag.keyword || tag.name || tag)}`" class="cf-tag"># {{ tag.name || tag }}</router-link></div>
    </section>
  </section>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { getHotVideos, getLatestVideos, getScoreVideos } from '../api/vod'
import { getCategories, getHotTags } from '../api/site'
import VideoGrid from '../components/VideoGrid.vue'
const popular = ref([])
const latest = ref([])
const categories = ref([])
const tags = ref([])
const loading = ref(true)
const tabs = [{key:'time',label:'最新发布'},{key:'hits',label:'最多播放'},{key:'score',label:'高分内容'}]
const active = ref('time')
async function load() {
  loading.value = true
  try {
    const [hot, fresh, cats, hotTags] = await Promise.all([
      getHotVideos(1, 10), getLatestVideos(1, 20), getCategories(), getHotTags()
    ])
    popular.value = hot.list
    latest.value = fresh.list
    categories.value = Array.isArray(cats) ? cats.filter(x => Number(x.type_pid || 0) === 0) : []
    tags.value = Array.isArray(hotTags) ? hotTags : []
  } catch (_) {
    popular.value = []; latest.value = []
  } finally { loading.value = false }
}
async function change(key) {
  active.value = key
  loading.value = true
  try {
    const loaders = { time: getLatestVideos, hits: getHotVideos, score: getScoreVideos }
    latest.value = (await loaders[key](1, 20)).list
  } catch (_) { latest.value = [] }
  finally { loading.value = false }
}
onMounted(load)
</script>
