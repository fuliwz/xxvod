<template>
  <div class="cf-video-grid" :aria-busy="loading ? 'true' : 'false'">
    <template v-if="loading">
      <article v-for="index in skeletonCount" :key="`skeleton-${index}`" class="cf-video-card cf-skeleton-card" aria-hidden="true">
        <div class="cf-video-thumb cf-skeleton-block"></div>
        <div class="cf-skeleton-line title"></div>
        <div class="cf-skeleton-line meta"></div>
      </article>
    </template>
    <template v-else>
      <VideoCard v-for="item in items" :key="item.id" :item="item" />
      <div v-if="!items.length" class="cf-empty"><i class="fa-regular fa-folder-open"></i><span>暂无内容</span></div>
    </template>
  </div>
</template>
<script setup>
import VideoCard from './VideoCard.vue'
const props = defineProps({ items: { type: Array, default: () => [] }, loading: Boolean, skeletonCount: { type: Number, default: 10 } })
const skeletonCount = Math.max(1, Math.min(24, props.skeletonCount))
</script>
