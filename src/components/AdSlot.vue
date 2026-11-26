<template>
  <section
    v-if="enabled && (items.length || html)"
    class="cf-ad-slot"
    :class="`slot-${slot}`"
    aria-label="广告"
  >
    <a
      v-for="ad in rotatedItems"
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
  onBeforeUnmount,
  nextTick,
  ref,
  watch
} from 'vue'
import { useRoute } from 'vue-router'
import { getAds } from '../api/site'

const props = defineProps({
  slot: {
    type: String,
    default: 'top'
  }
})

const route = useRoute()
const enabled = ref(false)
const ads = ref({})
const htmlRoot = ref(null)
const rotationIndex = ref(0)

let refreshTimer = null
let rotationTimer = null
let lastHtml = ''
let htmlRendered = false

// Some third-party banner scripts append fixed-position elements directly to
// document.body instead of rendering inside the ad slot. On phones, normalize
// only newly-added external high-layer overlays; never touch elements inside
// the application root (including the top bar and bottom tab bar).
function installMobileAdOverlayGuard() {
  if (typeof window === 'undefined' || !document.body || window.__cfAdOverlayGuard) return

  const isMobile = () => window.matchMedia('(max-width: 639px)').matches

  function normalize(node) {
    if (!isMobile() || !(node instanceof HTMLElement)) return
    if (node.closest('#app')) return

    const candidates = [node, ...node.querySelectorAll('*')]
    candidates.forEach(element => {
      if (!(element instanceof HTMLElement) || element.closest('#app')) return
      const style = window.getComputedStyle(element)
      const zIndex = Number.parseInt(style.zIndex, 10)
      const floating = style.position === 'fixed' || style.position === 'sticky'
      const highLayer = Number.isFinite(zIndex) && zIndex >= 1000
      if (!floating || (!highLayer && element.tagName !== 'IFRAME')) return

      element.classList.add('cf-ad-overlay-normalized')
      element.style.setProperty('position', 'static', 'important')
      element.style.setProperty('inset', 'auto', 'important')
      element.style.setProperty('top', 'auto', 'important')
      element.style.setProperty('right', 'auto', 'important')
      element.style.setProperty('bottom', 'auto', 'important')
      element.style.setProperty('left', 'auto', 'important')
      element.style.setProperty('transform', 'none', 'important')
      element.style.setProperty('z-index', 'auto', 'important')
      element.style.setProperty('max-width', '100%', 'important')
    })
  }

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => normalize(node))
    })
  })
  observer.observe(document.body, { childList: true, subtree: true })
  window.__cfAdOverlayGuard = observer
}

const items = computed(() => {
  const list = ads.value?.slots?.[props.slot]
  return Array.isArray(list)
    ? list.filter(ad => ad && ad.enabled !== false)
    : []
})

// Rotate the display order so the first visible placement changes periodically
// without removing the other configured ads from the slot.
const rotatedItems = computed(() => {
  const list = items.value
  if (list.length < 2) return list

  const offset = rotationIndex.value % list.length
  return list.slice(offset).concat(list.slice(0, offset))
})

const html = computed(() => String(ads.value?.html?.[props.slot] || ''))

function renderHtml(force = false) {
  const root = htmlRoot.value
  const source = html.value

  if (!root || !source || !enabled.value) return
  if (!force && source === lastHtml && htmlRendered && root.childNodes.length) return

  // Recreate embedded scripts on SPA navigation. Re-inserting the same script
  // node does not execute it again, so build fresh script elements each time.
  lastHtml = source
  htmlRendered = false
  root.replaceChildren()

  const holder = document.createElement('div')
  holder.innerHTML = source

  Array.from(holder.childNodes).forEach(node => {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.tagName.toLowerCase() === 'script'
    ) {
      const script = document.createElement('script')

      Array.from(node.attributes).forEach(attribute => {
        script.setAttribute(attribute.name, attribute.value)
      })

      script.textContent = node.textContent || ''
      root.appendChild(script)
    } else {
      root.appendChild(node)
    }
  })
  htmlRendered = true
}

async function loadAds(force = false, rerenderHtml = false, rotate = false) {
  try {
    const previousHtml = html.value
    const result = await getAds(force)
    ads.value = result || {}
    enabled.value = ads.value.enabled === true
    if (rotate && items.value.length > 1) {
      rotationIndex.value = (rotationIndex.value + 1) % items.value.length
    } else if (!rotate) {
      rotationIndex.value = 0
    }
    await nextTick()
    // If the payload changed, the html watcher already rendered the new code.
    // Force a rerun only when the same payload is reused on a new SPA route.
    renderHtml(rerenderHtml && previousHtml === html.value)
  } catch (error) {
    console.error('[XXVOD Ads] 广告加载失败:', error)
  }
}

function startTimers() {
  // Rotate ad order every 30 seconds when a slot contains multiple ads.
  rotationTimer = window.setInterval(() => {
    if (items.value.length > 1) {
      rotationIndex.value = (rotationIndex.value + 1) % items.value.length
    }
  }, 30000)

  // Refresh the server-side ad configuration every 60 seconds.
  refreshTimer = window.setInterval(() => {
    loadAds(true)
  }, 60000)
}

watch(
  html,
  async () => {
    await nextTick()
    renderHtml()
  },
  { flush: 'post' }
)

// Refresh on SPA navigation as well. Both ad slots share the same in-flight
// request through getAds(), avoiding duplicate API requests on one navigation.
watch(
  () => route.fullPath,
  () => loadAds(true, true, true),
  { flush: 'post' }
)

onMounted(async () => {
  await loadAds(false)
  startTimers()
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) window.clearInterval(refreshTimer)
  if (rotationTimer !== null) window.clearInterval(rotationTimer)
})
</script>
