<template>
  <section class="cf-page cf-play-page">
    <div v-if="loading" class="cf-player-loading"><span class="cf-spinner"></span> 正在加载视频信息…</div>
    <template v-else-if="item">
      <div class="cf-play-layout">
        <div class="cf-play-main">
          <div class="cf-player-shell">
            <div class="cf-player-bar"><span><i class="fa-solid fa-circle-play"></i> NOW PLAYING</span><span>HD PLAYER</span></div>
            <div class="cf-player-box"><video ref="videoEl" playsinline controls preload="metadata"></video></div>
          </div>
          <section class="cf-detail-panel">
            <div class="cf-detail-head"><div><span class="cf-eyebrow pink">VIDEO DETAIL</span><h1>{{ item.title }}</h1></div><button class="cf-share" @click="share"><i class="fa-solid fa-share-nodes"></i> 分享</button></div>
            <div class="cf-detail-meta"><span><i class="fa-regular fa-eye"></i> {{ formatViews(item.views) }} 次播放</span><span v-if="item.typeName"><i class="fa-solid fa-layer-group"></i> {{ item.typeName }}</span><span v-if="item.updateTime"><i class="fa-regular fa-calendar"></i> {{ item.updateTime }}</span><span v-if="item.score"><i class="fa-solid fa-star"></i> {{ item.score }}</span></div>
            <p v-if="item.content" class="cf-description">{{ item.content }}</p>
          </section>
          <div v-if="playerError" class="cf-player-error">{{ playerError }}</div>
          <section v-if="sources.length" class="cf-source-panel">
            <header class="cf-panel-title"><h2>播放线路</h2><span>{{ sources.length }} 条线路</span></header>
            <div class="cf-source-list"><button v-for="(source,i) in sources" :key="source.name" :class="{active:sourceIndex===i}" @click="selectSource(i)">{{ source.name }}</button></div>
            <header class="cf-panel-title episode-title"><h2>选集</h2><span>{{ activeSource?.episodes.length || 0 }} 集</span></header>
            <div class="cf-episodes"><button v-for="(ep,i) in activeSource?.episodes || []" :key="ep.label+i" :class="{active:episodeIndex===i}" @click="selectEpisode(i)">{{ ep.label }}</button></div>
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
const sourceIndex = ref(0)
const episodeIndex = ref(0)
let player = null
let hls = null
let token = 0
let PlyrClass = null
let HlsClass = null
let librariesPromise = null
const sources = computed(() => parsePlaySources(item.value))
const activeSource = computed(() => sources.value[sourceIndex.value] || null)
const activeEpisode = computed(() => activeSource.value?.episodes[episodeIndex.value] || null)
function formatViews(value) { const n=Number(value)||0; return n>=1e6 ? (n/1e6).toFixed(1)+'M' : n>=1000 ? (n/1e3).toFixed(1)+'K' : String(n) }
function cleanup() { if(hls){hls.destroy();hls=null} if(player){player.destroy();player=null} }
async function loadLibraries() {
  if (!librariesPromise) librariesPromise = Promise.all([import('plyr'), import('hls.js')]).then(([p,h]) => {
    PlyrClass = p.default || p
    HlsClass = h.default || h
    return true
  }).catch(error => { librariesPromise = null; throw error })
  return librariesPromise
}
async function playEpisode() {
  await nextTick()
  if(!videoEl.value || !activeEpisode.value || !PlyrClass || !HlsClass) return
  cleanup()
  const video = videoEl.value
  const url = activeEpisode.value.url
  playerError.value = ''
  try {
    player = new PlyrClass(video,{controls:['play-large','play','progress','current-time','mute','volume','settings','pip','fullscreen'],settings:['speed'],ratio:'16:9'})
    if(/\.m3u8(?:$|\?)/i.test(url) && HlsClass.isSupported()) {
      hls = new HlsClass({enableWorker:true,backBufferLength:60})
      hls.on(HlsClass.Events.MANIFEST_PARSED,()=>player?.play().catch(()=>{}))
      hls.on(HlsClass.Events.ERROR,(_event,data)=>{ if(data?.fatal) playerError.value='HLS 媒体加载失败，请切换线路或选集' })
      hls.loadSource(url)
      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !/\.m3u8(?:$|\?)/i.test(url)) {
      video.src = url
      video.load()
      player.play().catch(()=>{})
    } else {
      playerError.value='当前浏览器不支持 HLS 播放'
    }
    saveHistory(item.value,activeEpisode.value)
  } catch (_) { playerError.value='播放器加载失败，请刷新后重试' }
}
function selectSource(i){sourceIndex.value=i;episodeIndex.value=0;playEpisode()}
function selectEpisode(i){episodeIndex.value=i;playEpisode()}
async function load() {
  const current=++token
  cleanup(); item.value=null; related.value=[]; sourceIndex.value=0; episodeIndex.value=0; loading.value=true
  try {
    const detail=await getDetail(route.params.id)
    if(current!==token) return
    item.value=detail
    if(detail) {
      related.value=await getRelatedVideos(detail,16).catch(()=>[])
      document.title=`${detail.title} - XXVOD`
      await loadLibraries()
      if(current!==token) return
      await nextTick()
      if(activeEpisode.value) await playEpisode()
    }
  } catch (_) { item.value=null }
  finally { if(current===token) loading.value=false }
}
async function share(){
  try {
    if(navigator.share) await navigator.share({title:item.value?.title||document.title,url:location.href})
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(location.href);alert('链接已复制')}
  } catch (_) {}
}
watch(()=>route.params.id,load,{immediate:true})
onBeforeUnmount(()=>{token++;cleanup()})
</script>
