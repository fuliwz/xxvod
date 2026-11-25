<template>
  <section class="cf-page cf-play-page">
    <div v-if="loading && !item" class="cf-player-loading"><span class="cf-spinner"></span> 正在加载视频信息…</div>
    <template v-else-if="item">
      <div class="cf-play-layout">
        <div class="cf-play-main">
          <div class="cf-player-shell">
            <div class="cf-player-bar"><span><i class="fa-solid fa-circle-play"></i> NOW PLAYING</span><span>HOLA SPARK PLAYER</span></div>
            <div class="cf-player-box">
              <video id="xxvod-hola-player" ref="videoEl" class="video-js vjs-default-skin" :poster="item.poster || undefined" playsinline webkit-playsinline controls preload="metadata">
                <source v-if="activeEpisode" :key="episodeIndex" :src="activeEpisode.url" :type="mediaType(activeEpisode.url)" />
              </video>
            </div>
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
          <div v-else class="cf-player-error">当前视频没有解析出线路一的有效播放地址，请检查后端返回的 vod_play_from / vod_play_url。</div>
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
let sparkInitialized = false

// Keep only the first CMS play source (线路一).
const sources = computed(() => parsePlaySources(item.value).slice(0, 1))
const activeSource = computed(() => sources.value[0] || null)
const activeEpisode = computed(() => activeSource.value?.episodes[episodeIndex.value] || null)

function formatViews(value) {
  const n = Number(value) || 0
  return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? (n / 1e3).toFixed(1) + 'K' : String(n)
}

function mediaType(url = '') {
  if (/\.m3u8(?:$|[?#])/i.test(url)) return 'application/x-mpegURL'
  if (/\.mpd(?:$|[?#])/i.test(url)) return 'application/dash+xml'
  if (/\.webm(?:$|[?#])/i.test(url)) return 'video/webm'
  if (/\.ogv(?:$|[?#])/i.test(url)) return 'video/ogg'
  return 'video/mp4'
}

function getSparkInstance() {
  const videojs = window.videojs
  if (!videojs) return null
  return videojs.getPlayer?.('xxvod-hola-player') || videojs.players?.['xxvod-hola-player'] || null
}

function loadSparkPlayer() {
  if (typeof window.hola_player === 'function') return Promise.resolve()
  if (sparkPromise) return sparkPromise

  sparkPromise = new Promise((resolve, reject) => {
    let script = document.getElementById('hola-spark-player-script')
    if (script?.dataset.loaded === 'true' && typeof window.hola_player === 'function') {
      resolve()
      return
    }
    if (script?.dataset.failed === 'true') {
      script.remove()
      script = null
    }

    const isNew = !script
    if (!script) {
      script = document.createElement('script')
      script.id = 'hola-spark-player-script'
      const customerId = String(import.meta.env.VITE_HOLASPARK_CUSTOMER_ID || '').trim()
      script.src = 'https://player2.h-cdn.com/hola_player.js' + (customerId ? '?customer=' + encodeURIComponent(customerId) : '')
      script.async = true
      script.crossOrigin = 'anonymous'
    }

    const onLoad = () => {
      if (typeof window.hola_player === 'function') {
        script.dataset.loaded = 'true'
        resolve()
      } else {
        script.dataset.failed = 'true'
        reject(new Error('Hola Spark 脚本已下载，但没有导出 hola_player()'))
      }
    }
    const onError = () => {
      script.dataset.failed = 'true'
      reject(new Error('无法下载 https://player2.h-cdn.com/hola_player.js'))
    }

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })
    if (isNew) document.head.appendChild(script)
    else if (script.dataset.loaded === 'true') onLoad()
  }).catch(error => {
    sparkPromise = null
    throw error
  })

  return sparkPromise
}

function onVideoError() {
  const video = videoEl.value
  const code = video?.error?.code
  const reasons = {
    1: '视频加载被中断',
    2: '网络错误：播放地址不可访问或上游服务器中断',
    3: '解码失败：视频编码或封装格式不受浏览器支持',
    4: '视频格式或 MIME 类型不受支持'
  }
  playerError.value = reasons[code] || '视频加载失败，请检查播放地址、跨域响应和视频格式'
}

async function initializePlayer() {
  await nextTick()
  const video = videoEl.value
  const episode = activeEpisode.value
  if (!video || !episode?.url) return

  playerError.value = ''
  video.removeEventListener('error', onVideoError)
  video.addEventListener('error', onVideoError)

  // The source element must exist before hola_player() scans the video tag.
  try {
    const existingPlayer = getSparkInstance()
    if (existingPlayer) {
      existingPlayer.src({ src: episode.url, type: mediaType(episode.url) })
      existingPlayer.load()
      existingPlayer.on?.('error', () => {
        const error = existingPlayer.error?.()
        playerError.value = error?.message || 'Hola Spark 播放器无法读取该视频地址'
      })
      return
    }

    video.load()
    await loadSparkPlayer()
    if (!sparkInitialized) {
      window.hola_player()
      sparkInitialized = true
    }

    const player = getSparkInstance()
    if (player) {
      player.ready(() => {
        player.src({ src: episode.url, type: mediaType(episode.url) })
        player.load()
        player.on?.('error', () => {
          const error = player.error?.()
          playerError.value = error?.message || 'Hola Spark 播放器无法读取该视频地址'
        })
      })
    }
  } catch (error) {
    // Do not make Spark's script a single point of failure: the native HTML5
    // video element still has its source and controls, so it can play directly.
    playerError.value = `Hola Spark 初始化失败（${error.message}），已保留浏览器原生播放器作为备用。`
  }
}

async function selectEpisode(index) {
  if (!activeSource.value?.episodes[index]) return
  episodeIndex.value = index
  await nextTick()
  const video = videoEl.value
  const episode = activeEpisode.value
  if (!video || !episode) return

  playerError.value = ''
  const player = getSparkInstance()
  try {
    if (player) {
      player.src({ src: episode.url, type: mediaType(episode.url) })
      player.load()
      const result = player.play()
      if (result?.catch) result.catch(() => {
        playerError.value = '已切换选集，请点击播放器中的播放按钮开始播放'
      })
    } else {
      video.load()
      const result = video.play()
      if (result?.catch) result.catch(() => {
        playerError.value = '已切换选集，请点击播放器中的播放按钮开始播放'
      })
    }
    saveHistory(item.value, episode)
  } catch (error) {
    playerError.value = `切换选集失败：${error.message}`
  }
}

function resetPlayback() {
  const player = getSparkInstance()
  if (player && !player.isDisposed?.()) {
    try { player.pause() } catch (_) {}
  }
  if (videoEl.value) {
    videoEl.value.removeEventListener('error', onVideoError)
  }
}

function cleanup() {
  const player = getSparkInstance()
  if (player && !player.isDisposed?.()) {
    try { player.pause() } catch (_) {}
    try { player.dispose() } catch (_) {}
  }
  sparkInitialized = false
  if (videoEl.value) videoEl.value.removeEventListener('error', onVideoError)
}

async function load() {
  const current = ++token
  resetPlayback()
  related.value = []
  episodeIndex.value = 0
  playerError.value = ''
  loading.value = true
  try {
    const detail = await getDetail(route.params.id)
    if (current !== token) return
    item.value = detail
    if (detail) {
      related.value = await getRelatedVideos(detail, 16).catch(() => [])
      document.title = `${detail.title} - XXVOD`
      await initializePlayer()
      if (activeEpisode.value) saveHistory(detail, activeEpisode.value)
    }
  } catch (error) {
    item.value = null
    playerError.value = `视频详情加载失败：${error.message}`
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
