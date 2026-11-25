<template>
  <section v-if="enabled && items.length" class="cf-ad-slot" :class="`slot-${slot}`" aria-label="广告">
    <a v-for="ad in items" :key="ad.id || ad.url" :href="ad.url || '#'" target="_blank" rel="noopener noreferrer sponsored" class="cf-ad-item">
      <img v-if="ad.image" :src="ad.image" :alt="ad.title || '推广'" loading="lazy" />
      <span class="cf-ad-copy"><strong>{{ ad.title || '推广' }}</strong><small>{{ ad.description || '' }}</small></span>
      <span class="cf-ad-label">广告</span>
    </a>
    <div v-if="html" ref="htmlRoot" class="cf-ad-custom"></div>
  </section>
  <section v-else-if="html" class="cf-ad-slot cf-ad-custom-only" ref="htmlRoot"></section>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getAds } from '../api/site'
const props = defineProps({ slot: { type: String, default: 'top' } })
const enabled = ref(false)
const ads = ref({})
const htmlRoot = ref(null)
const items = computed(() => Array.isArray(ads.value?.slots?.[props.slot]) ? ads.value.slots[props.slot] : [])
const html = computed(() => String(ads.value?.html?.[props.slot] || ''))
function renderHtml() {
  if (!htmlRoot.value || !html.value) return
  htmlRoot.value.innerHTML = html.value
  htmlRoot.value.querySelectorAll('script').forEach(old => {
    const script = document.createElement('script')
    for (const attr of old.attributes) script.setAttribute(attr.name, attr.value)
    script.textContent = old.textContent
    old.replaceWith(script)
  })
}
onMounted(async () => {
  try {
    const result = await getAds()
    ads.value = result || {}
    enabled.value = ads.value.enabled === true
    renderHtml()
  } catch (_) { enabled.value = false }
})
watch(html, renderHtml)
</script>
