<template>
  <nav v-if="pages > 1" class="cf-pagination" aria-label="分页">
    <button :disabled="current <= 1" @click="$emit('change', current - 1)"><i class="fa-solid fa-chevron-left"></i></button>
    <button v-for="p in visible" :key="p" :class="{ active: p === current }" @click="$emit('change', p)">{{ p }}</button>
    <button :disabled="current >= pages" @click="$emit('change', current + 1)"><i class="fa-solid fa-chevron-right"></i></button>
    <label class="cf-page-jump"><span>跳转</span><select :value="current" @change="$emit('change', Number($event.target.value))"><option v-for="p in pageOptions" :key="p" :value="p">第 {{ p }} 页</option></select></label>
  </nav>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ current: { type: Number, default: 1 }, pages: { type: Number, default: 1 } })
defineEmits(['change'])
const pageOptions = computed(() => Array.from({ length: Math.max(1, props.pages) }, (_, i) => i + 1))
const visible = computed(() => {
  const start = Math.max(1, Math.min(props.current - 2, props.pages - 4))
  return Array.from({ length: Math.max(0, Math.min(5, props.pages - start + 1)) }, (_, i) => start + i)
})
</script>
