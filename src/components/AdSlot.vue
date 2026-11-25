
<template>
  <section
    v-if="enabled && (items.length || html)"
    class="cf-ad-slot"
    :class="`slot-${slot}`"
    aria-label="广告"
  >
    <a
      v-for="ad in items"
      :key="ad.id || ad.url"
      :href="ad.url || '#'"
      target="_blank"
      rel="noopener noreferrer sponsored"
      class="cf-ad-item"
    >
      <img
        v-if="ad.image"
        :src="ad.image"
        :alt="ad.title || '推广'"
        loading="lazy"
      />

      <span class="cf-ad-copy">
        <strong>{{ ad.title || '推广' }}</strong>
        <small>{{ ad.description || '' }}</small>
      </span>

      <span class="cf-ad-label">广告</span>
    </a>

    <div
      v-if="html"
      ref="htmlRoot"
      class="cf-ad-custom"
    ></div>
  </section>
</template>

<script setup>
import {
  computed,
  onMounted,
  nextTick,
  ref,
  watch
} from 'vue'

import { getAds } from '../api/site'

const props = defineProps({
  slot: {
    type: String,
    default: 'top'
  }
})

const enabled = ref(false)
const ads = ref({})
const htmlRoot = ref(null)

const items = computed(() => {
  const list = ads.value?.slots?.[props.slot]

  return Array.isArray(list)
    ? list.filter(ad => ad && ad.enabled !== false)
    : []
})

const html = computed(() => {
  return String(ads.value?.html?.[props.slot] || '')
})

/**
 * 渲染自定义广告 HTML
 */
function renderHtml() {
  const root = htmlRoot.value

  if (!root || !html.value || !enabled.value) {
    return
  }

  // 防止重复执行
  root.innerHTML = ''

  const holder = document.createElement('div')
  holder.innerHTML = html.value

  const nodes = Array.from(holder.childNodes)

  nodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE &&
        node.tagName.toLowerCase() === 'script') {

      const script = document.createElement('script')

      Array.from(node.attributes).forEach(attr => {
        script.setAttribute(attr.name, attr.value)
      })

      script.textContent = node.textContent || ''

      root.appendChild(script)

    } else {
      root.appendChild(node)
    }
  })
}

/**
 * DOM 更新后再执行广告渲染
 */
watch(
  [html, enabled],
  async () => {
    await nextTick()
    renderHtml()
  },
  {
    flush: 'post',
    immediate: true
  }
)

/**
 * 获取广告配置
 */
onMounted(async () => {
  try {
    const result = await getAds()

    ads.value = result || {}

    enabled.value = ads.value.enabled === true

    await nextTick()

    renderHtml()

  } catch (error) {
    console.error('[XXVOD Ads] 广告加载失败:', error)

    enabled.value = false
  }
})
</script>
