<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getStats } from '../api/site'

const route = useRoute()
let initialized = false
let lastPath = null
let snippets = null

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

async function load() {
  if (initialized) return
  initialized = true

  try {
    snippets = await getStats()

    if (snippets && snippets.enabled) {
      appendCode(document.head, snippets.head || '')
      appendCode(document.body, snippets.body || '')
    }

    // Track the current route after the tracking snippets have been inserted.
    track()
  } catch (error) {
    console.error('[XXVOD Stats] 统计配置加载失败:', error)
  }
}

function track() {
  if (!snippets || !snippets.enabled) return

  const path = route.fullPath
  if (lastPath === path) return
  lastPath = path

  // Google Analytics / gtag SPA page view.
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.origin + path,
      page_title: document.title
    })
  }

  // Histats uses a queue. Do not drop page views just because its external
  // script has not finished initializing yet.
  window._Hasync = window._Hasync || []
  if (Array.isArray(window._Hasync)) {
    window._Hasync.push(['Histats.track_hits', ''])
  }

  // Expose a single app-level event for other analytics integrations.
  window.dispatchEvent(new CustomEvent('xxvod:pageview', {
    detail: { path }
  }))
}

onMounted(load)

// Vue Router is an SPA: every successful URL change must be tracked separately.
watch(() => route.fullPath, () => {
  track()
}, { flush: 'post' })
</script>

<template><span hidden></span></template>
