<template>
  <router-link :to="`/play/${item.id}`" class="cf-video-card">
    <div class="cf-video-thumb">
      <img :src="cover" :alt="item.title" loading="lazy" decoding="async" @error="failed = true" />
      <span v-if="item.remarks || item.updateTime" class="cf-video-badge">{{ item.remarks || item.updateTime }}</span>
      <span class="cf-video-duration">{{ item.duration || 'HD' }}</span>
      <span class="cf-video-play"><i class="fa-solid fa-play"></i></span>
      <span class="cf-video-bottom"><span><i class="fa-regular fa-eye"></i> {{ formatViews(item.views) }}</span><span>{{ item.year }}</span></span>
    </div>
    <h3>{{ item.title }}</h3>
    <div class="cf-video-meta"><span>{{ item.typeName || '视频' }}</span><span v-if="item.score" class="score"><i class="fa-solid fa-star"></i> {{ item.score }}</span></div>
  </router-link>
</template>
<script setup>
import { computed, ref } from 'vue'
const props = defineProps({ item: { type: Object, required: true } })
const failed = ref(false)
const cover = computed(() => failed.value ? '/fallback.svg' : (props.item?.poster || '/fallback.svg'))
function formatViews(value) {
  const n = Number(value) || 0
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}
</script>
