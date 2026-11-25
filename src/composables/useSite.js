import { computed, ref } from 'vue'
import { getSiteConfig, getCategories } from '../api/site'

const config = ref({ name: 'XXVOD', title: 'XXVOD', description: '视频聚合与在线播放', logo: '', copyright: '' })
const categories = ref([])
const ready = ref(false)
const loading = ref(false)

export function useSite() {
  async function loadSite() {
    if (ready.value || loading.value) return
    loading.value = true
    try {
      const [settings, classList] = await Promise.all([
        getSiteConfig().catch(() => null),
        getCategories().catch(() => [])
      ])
      if (settings && typeof settings === 'object') config.value = { ...config.value, ...settings }
      if (Array.isArray(classList)) categories.value = classList.filter(item => Number(item.type_pid || 0) === 0)
      ready.value = true
      document.title = config.value.title || config.value.name || 'XXVOD'
      const description = document.querySelector('meta[name="description"]')
      if (description) description.setAttribute('content', config.value.description || '')
      let keywords = document.querySelector('meta[name="keywords"]')
      if (!keywords) { keywords = document.createElement('meta'); keywords.name = 'keywords'; document.head.appendChild(keywords) }
      keywords.setAttribute('content', config.value.keywords || '')
      const theme = document.querySelector('meta[name="theme-color"]')
      if (theme) theme.setAttribute('content', config.value.theme_color || '#0b0b0f')
    } finally { loading.value = false }
  }
  return { config, categories, ready, loading, loadSite, siteName: computed(() => config.value.name || 'XXVOD') }
}
