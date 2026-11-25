<template>
  <section class="cf-page cf-play-page">
    <div v-if="loading" class="cf-player-loading"><span class="cf-spinner"></span> 正在加载视频信息…</div>
    <template v-else-if="item">
      <div class="cf-play-layout">
        <div class="cf-play-main">
          <div class="cf-player-shell">
            <div class="cf-player-bar"><span><i class="fa-solid fa-circle-play"></i> NOW PLAYING</span><span>HOLA SPARK PLAYER</span></div>
            <div class="cf-player-box"><video id="xxvod-hola-player" ref="videoEl" class="video-js vjs-default-skin" playsinline controls preload="metadata"></video></div>
          </div>
          <section class="cf-detail-panel">
            <div class="cf-detail-head"><div><span class="cf-eyebrow pink">VIDEO DETAIL</span><h1>{{ item.title }}</h1></div><button class="cf-share" @click="share"><i class="fa-solid fa-share-nodes"></i> 分享</button></div>
            <div class="cf-detail-meta"><span><i class="fa-regular fa-eye"></i> {{ formatViews(item.views) }} 次播放</span><span v-if="item.typeName"><i class="fa-solid fa-layer-group"></i> {{ item.typeName }}</span><span v-if="item.updateTime"><i class="fa-regular fa-calendar"></i> {{ item.updateTime }}</span><span v-if="item.score"><i class="fa-solid fa-star"></i> {{ item.score }}</span></div>
            <p v-if="item.content" class="cf-description">{{ item.content }}</p>
          </section>
          <div v-if="playerError" class="cf-player-error">{{ playerError }}</div>
          <section v-if="activeSource" class="cf-source-panel">
            <header class="cf-panel-title"><h2>播放线路</h2><span>线路一 · 固定使用</span></header>
            <header class="cf-panel-title episode-title"><h2>选集</h2><span>{{ activeSource.episodes.length }} 集</span></header>
            <div class="cf-episodes"><button v-for="(ep,i) in activeSource.episodes" :key="ep.label+i" :class="{active:episodeIndex===i}" @click="selectEpisode(i)">{{ ep.label }}</button></div>
          </section>
        </div>
        <aside class="cf-play-side">
          <header class="cf-sec-head"><div><span class="cf-eyebrow">UP NEXT</span><h2 class="cf-h3">相关推荐</h2></div></header>
          <router-link v-for="video in related.slice(0,8)" :key="video.id" :to="`/play/${video.id}`" class="cf-side-video">
            <img :src="video.poster || '/fallback.svg'" :alt="video.title" loading="lazy"/>
            <span><strong>{{ video.title }}</strong><small>{{ formatViews(video.views) }} 次播放</small></span>
          </router-link>
        </aside>
      </div>
      <section v-if="related.length" class="cf-section cf-related-section"><header class="cf-sec-head"><div><span class="cf-eyebrow pink">YOU MAY ALSO LIKE</span><h2 class="cf-h2">猜你喜欢</h2></div></header><VideoGrid :items="related" /></section>
    </template>
    <div v-else class="cf-empty"><i class="fa-regular fa-circle-xmark"></i><span>暂时无法获取视频内容</span></div>
  </section>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getDetail, getRelatedVideos, parsePlaySources } from '../api/vod'
import { saveHistory } from '../utils/history'
import VideoGrid from '../components/VideoGrid.vue'
const route = useRoute()
const item = ref(null)
const related = ref([])
const loading = ref(true)
const playerError = ref('')
const videoEl = ref(null)
const episodeIndex = ref(0)
let sparkPromise = null
let token = 0
// The site deliberately uses only the first upstream play source (线路一).
const sources = computed(() => parsePlaySources(item.value).slice(0, 1))
const activeSource = computed(() => sources.value[0] || null)
const activeEpisode = computed(() => activeSource.value?.episodes[episodeIndex.value] || null)

function formatViews(value) {
  const n = Number(value) || 0
  return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? (n / 1e3).toFixed(1) + 'K' : String(n)
}

function sparkInstance() {
  return window.videojs?.getPlayer?.('xxvod-hola-player') || null
}

function cleanup() {
  const instance = sparkInstance()
  if (instance && !instance.isDisposed?.()) instance.dispose()
}

function loadSparkPlayer() {
  if (typeof window.hola_player === 'function') return Promise.resolve()
  if (sparkPromise) return sparkPromise
  sparkPromise = new Promise((resolve, reject) => {
    let script = document.getElementById('hola-spark-player-script')
    if (script && typeof window.hola_player === 'function') {
      resolve()
      return
    }
    const shouldAppend = !script
    if (!script) {
      script = document.createElement('script')
      script.id = 'hola-spark-player-script'
      script.src = 'https://player2.h-cdn.com/hola_player.js'
      script.async = true
    }
    script.addEventListener('load', () => {
      if (typeof window.hola_player === 'function') resolve()
      else reject(new Error('Hola Spark Player 初始化接口不可用'))
    }, { once: true })
    script.addEventListener('error', () => reject(new Error('Hola Spark Player 脚本加载失败')), { once: true })
    if (shouldAppend) document.head.appendChild(script)
  }).catch(error => {
    sparkPromise = null
    throw error
  })
  return sparkPromise
}

function mediaType(url) {
  if (/\.m3u8(?:$|\?)/i.test(url)) return 'application/x-mpegURL'
  if (/\.mpd(?:$|\?)/i.test(url)) return 'application/dash+xml'
  if (/\.webm(?:$|\?)/i.test(url)) return 'video/webm'
  return 'video/mp4'
}

async function playEpisode() {
  await nextTick()
  if (!videoEl.value || !activeEpisode.value) return
  const video = videoEl.value
  const url = activeEpisode.value.url
  playerError.value = ''
  try {
    await loadSparkPlayer()
    const current = sparkInstance()
    if (current && !current.isDisposed?.()) {
      current.src({ src: url, type: mediaType(url) })
      current.load()
      current.play().catch(() => {})
    } else {
      video.src = url
      video.load()
      window.hola_player()
      const created = sparkInstance()
      if (created) created.ready(() => created.play().catch(() => {}))
    }
    saveHistory(item.value, activeEpisode.value)
  } catch (_) {
    playerError.value = 'Hola Spark Player 加载失败，请检查网络后刷新重试'
  }
}

function selectEpisode(index) {
  episodeIndex.value = index
  playEpisode()
}

async function load() {
  const current = ++token
  cleanup()
  item.value = null
  related.value = []
  episodeIndex.value = 0
  loading.value = true
  try {
    const detail = await getDetail(route.params.id)
    if (current !== token) return
    item.value = detail
    if (detail) {
      related.value = await getRelatedVideos(detail, 16).catch(() => [])
      document.title = `${detail.title} - XXVOD`
      if (activeEpisode.value) await playEpisode()
    }
  } catch (_) {
    item.value = null
  } finally {
    if (current === token) loading.value = false
  }
}

async function share() {
  try {
    if (navigator.share) await navigator.share({ title: item.value?.title || document.title, url: location.href })
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(location.href); alert('链接已复制') }
  } catch (_) {}
}

watch(() => route.params.id, load, { immediate: true })
onBeforeUnmount(() => { token++; cleanup() })
</script>
