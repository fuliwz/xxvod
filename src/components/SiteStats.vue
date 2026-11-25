<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getStats } from '../api/site'
const route = useRoute()
let initialized = false
let lastPath = ''
let snippets = null
function appendCode(target, source) {
  if (!source || !target) return
  const holder = document.createElement('div')
  holder.innerHTML = source
  holder.querySelectorAll('script').forEach(old => {
    const el = document.createElement('script')
    for (const a of old.attributes) el.setAttribute(a.name, a.value)
    el.textContent = old.textContent
    old.replaceWith(el)
  })
  target.append(...Array.from(holder.childNodes))
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
    track()
  } catch (_) {}
}
function track() {
  if (!snippets?.enabled || lastPath === route.fullPath) return
  lastPath = route.fullPath
  if (typeof window.gtag === 'function') window.gtag('event', 'page_view', { page_path: route.fullPath })
  if (Array.isArray(window._Hasync)) window._Hasync.push(['Histats.track_hits', ''])
  window.dispatchEvent(new CustomEvent('xxvod:pageview', { detail: { path: route.fullPath } }))
}
onMounted(load)
watch(() => route.fullPath, track)
</script>
<template><span hidden></span></template>
