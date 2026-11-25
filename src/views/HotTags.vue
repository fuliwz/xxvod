<template>
  <section class="cf-page cf-list-page">
    <header class="cf-page-title">
      <div><h1 class="cf-h2">热门标签</h1><p>选择标签，浏览相关视频</p></div>
    </header>
    <div v-if="tags.length" class="cf-hot-tags-grid">
      <router-link v-for="tag in tags" :key="tag.keyword" :to="{ path: '/search', query: { wd: tag.keyword } }" class="cf-hot-tag-card">
        <span class="cf-hot-tag-icon"><i class="fa-solid fa-hashtag"></i></span>
        <span class="cf-hot-tag-name">{{ tag.name }}</span>
        <i class="fa-solid fa-arrow-up-right-from-square cf-hot-tag-arrow"></i>
      </router-link>
    </div>
    <div v-else class="cf-empty"><i class="fa-solid fa-hashtag"></i><span>暂时没有热门标签</span></div>
  </section>
</template>
<script setup>
import hotTagsConfig from '../config/hot-tags.json'
const tags = hotTagsConfig.filter(tag => tag && String(tag.name || '').trim() && String(tag.keyword || '').trim())
</script>
