<template>
  <section class="cf-page cf-list-page">
    <header class="cf-page-title"><div><h1 class="cf-h2">观看记录</h1><p>记录保存在当前浏览器</p></div><button v-if="items.length" class="cf-btn ghost" @click="clear">清空记录</button></header>
    <div class="cf-video-grid">
      <router-link v-for="item in items" :key="item.id" :to="`/play/${item.id}`" class="cf-video-card">
        <div class="cf-video-thumb"><img :src="item.poster || '/fallback.svg'" :alt="item.title" loading="lazy"/><span class="cf-video-badge">{{ item.episode || '继续观看' }}</span></div>
        <h3>{{ item.title }}</h3><div class="cf-video-meta"><span>{{ item.typeName || '视频' }}</span><button @click.prevent="remove(item.id)">移除</button></div>
      </router-link>
    </div>
    <div v-if="!items.length" class="cf-empty"><i class="fa-regular fa-clock"></i><span>暂无观看记录</span></div>
  </section>
</template>
<script setup>
import { ref } from 'vue'
import { clearHistory, getHistory, removeHistory } from '../utils/history'
const items = ref(getHistory())
function remove(id) { removeHistory(id); items.value = getHistory() }
function clear() { clearHistory(); items.value = [] }
</script>
