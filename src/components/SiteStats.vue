<script setup>
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getStats } from '../api/site'

const route = useRoute()
let snippets = null
let initialized = false
let histatsReady = false
let lastTrackedUrl = ''
let readyHandler = null
let routeTimer = null

function currentPath() {
  return window.location.pathname + window.location.search + window.location.hash
}

function appendCode(target, source) {
  if (!source || !target) return
  const holder = document.createElement('div')
  holder.innerHTML = source

  holder.querySelectorAll('script').forEach(oldScript => {
    const script = document.createElement('script')
    Array.from(oldScript.attributes).forEach(attribute => {
      script.setAttribute(attribute.name, attribute.value)
    })
    script.textContent = oldScript.textContent || ''
    oldScript.replaceWith(script)
  })

  target.append(...Array.from(holder.childNodes))
}

function trackPage() {
  if (!snippets?.enabled || !histatsReady) return

  const path = currentPath()
  if (!path || path === lastTrackedUrl) return
  lastTrackedUrl = path

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title
    })
  }

  window._Hasync = window._Hasync || []
  window._Hasync.push(['Histats.track_hits', ''])

  window.dispatchEvent(new CustomEvent('xxvod:pageview', {
    detail: { path }
  }))
}

async function load() {
  if (initialized) return
  initialized = true

  try {
    snippets = await getStats()
    if (snippets?.enabled) {
      appendCode(document.head, snippets.head || '')
      appendCode(document.body, snippets.body || '')
    }
    // Histats may signal readiness asynchronously after its script loads.
    await nextTick()
    trackPage()
  } catch (error) {
    initialized = false
    console.error('[XXVOD Stats] 统计配置加载失败:', error)
  }
}

onMounted(() => {
  readyHandler = () => {
    histatsReady = true
    nextTick(trackPage)
  }
  window.addEventListener('histats-ready', readyHandler)
  // Custom integrations can signal readiness. If no external-ready event is
  // expected, gtag is still allowed to track once it is present.
  load()
})

watch(() => route.fullPath, async (newPath, oldPath) => {
  if (newPath === oldPath) return
  await nextTick()
  if (routeTimer) clearTimeout(routeTimer)
  routeTimer = window.setTimeout(() => {
    // The browser address is authoritative for analytics page locations.
    if (typeof window.gtag === 'function' && snippets?.enabled) {
      const path = currentPath()
      if (path && path !== lastTrackedUrl) {
        lastTrackedUrl = path
        window.gtag('event', 'page_view', {
          page_path: path,
          page_location: window.location.href,
          page_title: document.title
        })
        window.dispatchEvent(new CustomEvent('xxvod:pageview', { detail: { path } }))
      }
    }
    if (histatsReady) trackPage()
    routeTimer = null
  }, 50)
})

onBeforeUnmount(() => {
  if (readyHandler) window.removeEventListener('histats-ready', readyHandler)
  if (routeTimer) window.clearTimeout(routeTimer)
})
</script>

<template><span hidden></span></template>
