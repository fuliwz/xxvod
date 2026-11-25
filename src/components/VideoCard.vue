<template>
  <router-link :to="`/play/${item.id}`" class="cf-video-card">
    <div class="cf-video-thumb" :class="{ 'is-loading': !loaded && !failed, 'is-loaded': loaded }">
      <div v-if="!loaded && !failed" class="cf-video-image-loading" role="status" aria-live="polite">
        <span class="cf-video-image-spinner" aria-hidden="true"></span>
        <span>图片加载中...</span>
      </div>
      <img
        v-if="shouldLoad"
        :src="cover"
        :alt="item.title"
        loading="lazy"
        decoding="async"
        @load="onLoaded"
        @error="onFailed"
      />
      <div v-if="failed" class="cf-video-image-fallback" role="img" aria-label="图片加载失败">
        <i class="fa-regular fa-image" aria-hidden="true"></i>
        <span>图片加载失败</span>
      </div>
      <span class="cf-video-badge">HD</span>
      <span v-if="item.duration" class="cf-video-duration">{{ item.duration }}</span>
      <span class="cf-video-play"><i class="fa-solid fa-play"></i></span>
      <span class="cf-video-bottom"><span><i class="fa-regular fa-eye"></i> {{ formatViews(item.views) }}</span><span>{{ item.year }}</span></span>
    </div>
    <h3>{{ item.title }}</h3>
    <div class="cf-video-meta"><span>{{ item.typeName || '视频' }}</span><span v-if="item.score" class="score"><i class="fa-solid fa-star"></i> {{ item.score }}</span></div>
  </router-link>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({ item: { type: Object, required: true } })
const shouldLoad = ref(false)
const loaded = ref(false)
const failed = ref(false)
const thumb = ref(null)
let observer = null

const cover = computed(() => props.item?.poster || '/fallback.svg')

function startLoading() {
  shouldLoad.value = true
  if (observer && thumb.value) {
    observer.unobserve(thumb.value)
  }
}

function onLoaded() {
  loaded.value = true
  failed.value = false
}

function onFailed() {
  if (!failed.value && cover.value !== '/fallback.svg') {
    failed.value = true
    loaded.value = false
    // Attempt the local fallback once; if it also fails, retain the failure placeholder.
    shouldLoad.value = false
    requestAnimationFrame(() => {
      shouldLoad.value = true
    })
  } else {
    failed.value = true
    loaded.value = false
  }
}

watch(() => props.item?.poster, () => {
  loaded.value = false
  failed.value = false
  if (shouldLoad.value) {
    shouldLoad.value = false
    requestAnimationFrame(() => {
      shouldLoad.value = true
    })
  }
})

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    startLoading()
    return
  }

  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      startLoading()
    }
  }, {
    rootMargin: '240px 0px',
    threshold: 0.01
  })

  if (thumb.value) observer.observe(thumb.value)
  else startLoading()
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

function formatViews(value) {
  const n = Number(value) || 0
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}
</script>
