const KEY = 'xxvod:history'
const LIMIT = 40
function read() {
  if (typeof window === 'undefined') return []
  try { const data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data : [] }
  catch (_) { return [] }
}
function write(list) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT))) } catch (_) {}
}
export const getHistory = () => read()
export function saveHistory(item, episode = null) {
  if (!item?.id) return
  const list = read().filter(row => String(row.id) !== String(item.id))
  list.unshift({
    id: item.id, title: String(item.title || '').slice(0, 300),
    poster: String(item.poster || '').slice(0, 2048), typeName: String(item.typeName || '').slice(0, 100),
    episode: String(episode?.label || '').slice(0, 100), updatedAt: Date.now()
  })
  write(list)
}
export function removeHistory(id) { write(read().filter(row => String(row.id) !== String(id))) }
export function clearHistory() { try { localStorage.removeItem(KEY) } catch (_) {} }
