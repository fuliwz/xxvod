<template>
  <section v-if="links.length" class="cf-friendly-links">
    <div class="cf-friend-title"><i class="fa-solid fa-link"></i> 友情链接</div>
    <div class="cf-friend-list">
      <a v-for="link in links" :key="link.name + link.url" :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.name }}</a>
    </div>
  </section>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { getFriendlyLinks } from '../api/site'
const links = ref([])
onMounted(async () => {
  try {
    const result = await getFriendlyLinks()
    links.value = Array.isArray(result) ? result.filter(x => x && /^https?:\/\//i.test(String(x.url || ''))) : []
  } catch (_) { links.value = [] }
})
</script>
