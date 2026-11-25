<template>
  <div class="cf-video-grid">
    <VideoCard v-for="item in items" :key="item.id" :item="item" />
    <div v-if="!items.length && !loading" class="cf-empty"><i class="fa-regular fa-folder-open"></i><span>暂无内容</span></div>
  </div>
</template>
<script setup>
import VideoCard from './VideoCard.vue'
defineProps({ items: { type: Array, default: () => [] }, loading: Boolean })
</script>
