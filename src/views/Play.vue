<template>
  <section class="cf-page cf-play-page">
    <div v-if="loading && !item" class="cf-player-loading"><span class="cf-spinner"></span> 正在加载视频信息…</div>
    <template v-else-if="item">
      <section class="cf-route-diagnostic" style="margin:12px 0;padding:10px;border:1px dashed #d97706;border-radius:8px;background:#fff7ed;color:#7c2d12;font-size:12px;line-height:1.5;word-break:break-all;">
        <strong>临时路由诊断（测试后删除）</strong>
        <div>浏览器地址：{{ routeDiagnostics.href }}</div>
        <div>pathname：{{ routeDiagnostics.pathname }}</div>
        <div>Vue Router：{{ routeDiagnostics.fullPath }}</div>
        <div>history.state：{{ routeDiagnostics.historyState }}</div>
      </section>

      <div class="cf-play-layout">
        <div class="cf-play-main">
          <div class="cf-player-shell">
            <div class="cf-player-bar"><span><i class="fa-solid fa-circle-play"></i> 正在播放</span><span>视频播放器</span></div>
            <div class="cf-player-box">
              <video id="xxvod-player" ref="videoEl" class="xxvod-player" :poster="item.poster || undefined" playsinline webkit-playsinline controls preload="metadata"></video>
            </div>
          </div>
          <section class="cf-detail-panel">
            <div class="cf-detail-head"><div><h1>{{ item.title }}</h1></div><button class="cf-share" @click="share"><i class="fa-solid fa-share-nodes"></i> 分享</button></div>
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
          <header class="cf-sec-head"><div><h2 class="cf-h3">相关推荐</h2></div></header>
          <router-link v-for="video in related.slice(0,8)" :key="video.id" :to="`/play/${video.id}`" class="cf-side-video">
            <img :src="video.poster || '/fallback.svg'" :alt="video.title" loading="lazy"/>
            <span><strong>{{ video.title }}</strong><small>{{ formatViews(video.views) }} 次播放</small></span>
          </router-link>
        </aside>
      </div>
      <section v-if="related.length" class="cf-section cf-related-section"><header class="cf-sec-head"><div><h2 class="cf-h2">猜你喜欢</h2></div></header><VideoGrid :items="related" /></section>
    </template>
    <div v-else class="cf-empty"><i class="fa-regular fa-circle-xmark"></i><span>暂时无法获取视频内容</span></div>
  </section>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Hls from 'hls.js'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import { getDetail, getRelatedVideos, parsePlaySources } from '../api/vod'
import { saveHistory } from '../utils/history'
import VideoGrid from '../components/VideoGrid.vue'

const route = useRoute()
const router = useRouter()
const item = ref(null)
const related = ref([])
const loading = ref(true)
const playerError = ref('')
const videoEl = ref(null)
const episodeIndex = ref(0)

let hls = null
let player = null
let token = 0

// Keep only the first CMS play source (线路一).
const sources = computed(() => parsePlaySources(item.value).slice(0, 1))
const activeSource = computed(() => sources.value[0] || null)
const activeEpisode = computed(() => activeSource.value?.episodes[episodeIndex.value] || null)

function formatViews(value) {
  const n = Number(value) || 0
  return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? (n / 1e3).toFixed(1) + 'K' : String(n)
}

function isHlsUrl(url = '') {
  return /\.m3u8(?:$|[?#])/i.test(url)
}

function mediaType(url = '') {
  if (isHlsUrl(url)) return 'application/vnd.apple.mpegurl'
  if (/\.mpd(?:$|[?#])/i.test(url)) return 'application/dash+xml'
  if (/\.webm(?:$|[?#])/i.test(url)) return 'video/webm'
  if (/\.ogv(?:$|[?#])/i.test(url)) return 'video/ogg'
  return 'video/mp4'
}

function setNormalAudio(video) {
  // Prevent a stale playback-rate or pitch setting from carrying across episodes.
  video.defaultPlaybackRate = 1
  video.playbackRate = 1
  if ('preservesPitch' in video) video.preservesPitch = true
  if ('webkitPreservesPitch' in video) video.webkitPreservesPitch = true
  if ('mozPreservesPitch' in video) video.mozPreservesPitch = true
}

function ensurePlayer(video) {
  if (player) return player

  player = new Plyr(video, {
    controls: [
      'play-large', 'play', 'progress', 'current-time', 'duration',
      'mute', 'volume', 'settings', 'pip', 'fullscreen'
    ],
    settings: ['speed'],
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
    tooltips: { controls: true, seek: true },
    keyboard: { focused: true, global: false },
    invertTime: false,
    clickToPlay: true,
    hideControls: true,
    resetOnEnd: false
  })

  video.addEventListener('ratechange', () => {
    // A user may intentionally choose a different rate in the Plyr speed menu.
    // Keep pitch correction enabled; only reset non-finite/invalid rates.
    if (!Number.isFinite(video.playbackRate) || video.playbackRate <= 0) {
      setNormalAudio(video)
    }
  })

  return player
}

function destroyHls() {
  if (hls) {
    try { hls.destroy() } catch (_) {}
    hls = null
  }
}

function clearMedia(video) {
  destroyHls()
  if (!video) return
  try { video.pause() } catch (_) {}
  video.removeAttribute('src')
  while (video.firstChild) video.removeChild(video.firstChild)
  video.load()
}

function onVideoError() {
  const code = videoEl.value?.error?.code
  const reasons = {
    1: '视频加载被中断',
    2: '网络错误：播放地址不可访问、跨域限制或上游服务器中断',
    3: '解码失败：请检查视频或音频编码是否受支持',
    4: '视频格式或 MIME 类型不受支持'
  }
  playerError.value = reasons[code] || '视频加载失败，请检查播放地址、CORS 和媒体编码'
}

function configureHls(video, url) {
  if (Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      capLevelToPlayerSize: true,
      backBufferLength: 30,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      startLevel: -1
    })

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data?.fatal) return

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        playerError.value = 'HLS 网络错误，正在尝试恢复播放…'
        hls?.startLoad()
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        playerError.value = 'HLS 媒体解码异常，正在尝试恢复…'
        hls?.recoverMediaError()
      } else {
        playerError.value = data.details
          ? `HLS 播放失败：${data.details}`
          : 'HLS 播放失败，请检查视频源'
        destroyHls()
      }
    })

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      playerError.value = ''
      setNormalAudio(video)
    })

    hls.loadSource(url)
    hls.attachMedia(video)
    return
  }

  // Safari/iOS and other browsers can use their built-in HLS implementation.
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url
    video.load()
    setNormalAudio(video)
    return
  }

  throw new Error('当前浏览器不支持 HLS（缺少 MediaSource 或原生 HLS 支持）')
}

async function initializePlayer({ autoplay = false } = {}) {
  await nextTick()
  const video = videoEl.value
  const episode = activeEpisode.value
  if (!video || !episode?.url) return

  playerError.value = ''
  video.removeEventListener('error', onVideoError)
  video.addEventListener('error', onVideoError)
  ensurePlayer(video)
  clearMedia(video)
  setNormalAudio(video)

  try {
    if (isHlsUrl(episode.url)) {
      configureHls(video, episode.url)
    } else {
      video.src = episode.url
      video.load()
    }

    if (autoplay) {
      const startPlayback = () => {
        setNormalAudio(video)
        const result = video.play()
        if (result?.catch) result.catch(() => {
          playerError.value = '视频已加载，请点击播放器中的播放按钮开始播放'
        })
      }
      if (video.readyState >= 2) startPlayback()
      else video.addEventListener('canplay', startPlayback, { once: true })
    }
  } catch (error) {
    playerError.value = `播放器初始化失败：${error.message}`
  }
}

function selectEpisode(index) {
  if (!activeSource.value?.episodes[index]) return
  const query = { ...route.query, ep: String(index + 1) }
  router.push({ path: route.path, query })
}

async function syncEpisodeFromUrl() {
  if (!activeSource.value?.episodes?.length) return
  const requested = Number(route.query.ep)
  const index = Number.isFinite(requested) && requested > 0
    ? Math.min(activeSource.value.episodes.length - 1, Math.trunc(requested) - 1)
    : 0

  if (episodeIndex.value === index) return
  episodeIndex.value = index
  await initializePlayer({ autoplay: true })
  if (activeEpisode.value) saveHistory(item.value, activeEpisode.value)
}

function resetPlayback() {
  const video = videoEl.value
  if (video) clearMedia(video)
}

function cleanup() {
  const video = videoEl.value
  destroyHls()
  if (video) {
    video.removeEventListener('error', onVideoError)
    try { video.pause() } catch (_) {}
  }
  if (player) {
    try { player.destroy() } catch (_) {}
    player = null
  }
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

      const requestedEpisode = Number(route.query.ep)
      episodeIndex.value = Number.isFinite(requestedEpisode) && requestedEpisode > 0
        ? Math.min(activeSource.value?.episodes.length - 1 || 0, Math.trunc(requestedEpisode) - 1)
        : 0

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

// Temporary mobile route diagnostics. Remove after the Quark test is complete.
const routeDiagnostics = ref({
  href: typeof window !== 'undefined' ? window.location.href : '',
  pathname: typeof window !== 'undefined' ? window.location.pathname : '',
  fullPath: route.fullPath,
  historyState: ''
})

let diagnosticTimer = null
function refreshRouteDiagnostics() {
  routeDiagnostics.value = {
    href: window.location.href,
    pathname: window.location.pathname,
    fullPath: route.fullPath,
    historyState: JSON.stringify(window.history.state)
  }
}

watch(() => route.fullPath, () => {
  refreshRouteDiagnostics()
  // Quark may update the browser URL asynchronously relative to Vue Router.
  setTimeout(refreshRouteDiagnostics, 100)
  setTimeout(refreshRouteDiagnostics, 600)
  setTimeout(refreshRouteDiagnostics, 1500)
}, { immediate: true, flush: 'sync' })

if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', refreshRouteDiagnostics)
  window.addEventListener('popstate', refreshRouteDiagnostics)
  diagnosticTimer = window.setInterval(refreshRouteDiagnostics, 1000)
}

onBeforeUnmount(() => {
  if (diagnosticTimer) window.clearInterval(diagnosticTimer)
  window.removeEventListener('pageshow', refreshRouteDiagnostics)
  window.removeEventListener('popstate', refreshRouteDiagnostics)
})

function share() {
  try {
    if (navigator.share) await navigator.share({ title: item.value?.title || document.title, url: location.href })
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(location.href); alert('链接已复制') }
  } catch (_) {}
}

watch(() => route.params.id, load, { immediate: true })
watch(() => route.query.ep, syncEpisodeFromUrl)
onBeforeUnmount(() => { token++; cleanup() })
</script>
