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

// Keep the site's mobile header below a third-party fixed banner at the top
// of the viewport. The banner remains visible and clickable; only the app layout
// is shifted by the banner's measured height.
function installMobileAdTopOffset() {
  if (typeof window === 'undefined' || !document.body || window.__cfAdTopOffsetGuard) return

  const isMobile = () => window.matchMedia('(max-width: 639px)').matches

  function updateOffset() {
    const app = document.querySelector('.cf-app')
    if (!app) return

    if (!isMobile()) {
      app.style.setProperty('--cf-mobile-ad-top-offset', '0px')
      return
    }

    const viewportWidth = document.documentElement.clientWidth || window.innerWidth
    const viewportHeight = window.innerHeight
    let topOffset = 0

    document.querySelectorAll('body *').forEach(element => {
      if (!(element instanceof HTMLElement)) return
      if (element.closest('.cf-ad-overlay-measured')) return

      const insideApp = Boolean(element.closest('.cf-app'))
      const insideAdSlot = Boolean(element.closest('.cf-ad-slot'))
      // Ignore the site's own interface, but allow ads rendered inside AdSlot.
      if (insideApp && !insideAdSlot) return

      const style = window.getComputedStyle(element)
      if (style.position !== 'fixed' && style.position !== 'sticky') return

      const rect = element.getBoundingClientRect()
      const isTopBanner = rect.top <= 24 &&
        rect.bottom > 0 &&
        rect.height >= 24 &&
        rect.height <= viewportHeight * 0.35 &&
        rect.width >= viewportWidth * 0.5

      if (isTopBanner) topOffset = Math.max(topOffset, Math.min(rect.bottom, 240))
    })

    const next = Math.ceil(topOffset)
    const current = Number.parseFloat(app.style.getPropertyValue('--cf-mobile-ad-top-offset')) || 0
    if (Math.abs(current - next) >= 2) {
      app.style.setProperty('--cf-mobile-ad-top-offset', next + 'px')
    }
  }

  let updateQueued = false
  const scheduleUpdate = () => {
    if (updateQueued) return
    updateQueued = true
    window.requestAnimationFrame(() => {
      updateQueued = false
      updateOffset()
    })
  }

  updateOffset()
  const observer = new MutationObserver(scheduleUpdate)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  })
  window.addEventListener('resize', scheduleUpdate, { passive: true })
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true })
  window.__cfAdTopOffsetGuard = observer
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
  installMobileAdTopOffset()
  await loadAds(false)
  startTimers()
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) window.clearInterval(refreshTimer)
  if (rotationTimer !== null) window.clearInterval(rotationTimer)
})
</script>
