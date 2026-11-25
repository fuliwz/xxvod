import { apiGet } from './http'

const MAX_PAGE = 100000
const MAX_LIMIT = 48
const cache = new Map()
const pending = new Map()
const TTL = 60000
const DETAIL_TTL = 300000

function int(value, fallback, min = 1, max = MAX_PAGE) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback
}
function safeText(value, limit = 100) { return String(value ?? '').trim().slice(0, limit) }
function key(params) {
  return Object.keys(params).sort().map(k => `${k}=${String(params[k] ?? '')}`).join('&')
}
async function cachedGet(params, ttl = TTL) {
  const cacheKey = key(params)
  const old = cache.get(cacheKey)
  if (old && Date.now() - old.time < ttl) return old.data
  if (pending.has(cacheKey)) return pending.get(cacheKey)
  const task = apiGet({ action: 'vod', ...params }).then(data => {
    cache.set(cacheKey, { time: Date.now(), data })
    while (cache.size > 120) cache.delete(cache.keys().next().value)
    return data
  }).catch(error => {
    if (old) return old.data
    throw error
  }).finally(() => pending.delete(cacheKey))
  pending.set(cacheKey, task)
  return task
}

export function normalizeVod(v = {}) {
  return {
    id: v.vod_id ?? v.id ?? '',
    title: v.vod_name || v.title || '未命名内容',
    poster: v.vod_pic || v.vod_pic_thumb || v.vod_pic_slide || v.poster || '',
    year: v.vod_year || '', area: v.vod_area || '',
    typeId: v.type_id || v.typeId || '', typeName: v.type_name || v.vod_class || v.typeName || '',
    score: v.vod_score || v.score || '', remarks: v.vod_remarks || v.vod_blurb || '',
    duration: v.vod_duration || '', views: v.vod_hits || v.vod_hits_day || v.views || 0,
    updateTime: v.vod_time || v.vod_time_add || '', actor: v.vod_actor || '', director: v.vod_director || '',
    content: v.vod_content || v.vod_blurb || '', playFrom: v.vod_play_from || '', playUrl: v.vod_play_url || '', raw: v
  }
}

export function parsePlaySources(item) {
  if (!item) return []
  const names = String(item.playFrom || '').split('$$$')
  const rawSources = String(item.playUrl || '').split('$$$')
  return rawSources.map((raw, index) => {
    const episodes = raw.split('#').slice(0, 300).map((entry, i) => {
      const parts = entry.trim().split('$')
      const url = (parts.length > 1 ? parts.slice(1).join('$') : parts[0]).trim()
      return { label: safeText(parts.length > 1 ? parts[0] : `第${String(i + 1).padStart(2, '0')}集`, 80), url }
    }).filter(ep => /^https?:\/\//i.test(ep.url) && ep.url.length <= 4096)
    return { name: safeText(names[index] || `线路 ${index + 1}`, 80), episodes }
  }).filter(source => source.episodes.length)
}

export async function getVideos({ page = 1, limit = 20, typeId = '', keyword = '', sort = '' } = {}) {
  const params = {
    ac: 'detail', pg: int(page, 1), pagesize: int(limit, 20, 1, MAX_LIMIT),
    t: safeText(typeId, 32), wd: safeText(keyword, 100), order: ['time', 'hits', 'score'].includes(sort) ? sort : ''
  }
  const data = await cachedGet(params)
  const list = Array.isArray(data?.list) ? data.list.slice(0, params.pagesize).map(normalizeVod) : []
  return {
    list,
    page: int(data?.page, params.pg),
    pageCount: int(data?.pagecount ?? data?.page_count, list.length ? params.pg : 1, 1),
    total: int(data?.total, 0, 0, Number.MAX_SAFE_INTEGER)
  }
}

export const getLatestVideos = (page = 1, limit = 20) => getVideos({ page, limit, sort: 'time' })
export const getHotVideos = (page = 1, limit = 20) => getVideos({ page, limit, sort: 'hits' })
export const getScoreVideos = (page = 1, limit = 20) => getVideos({ page, limit, sort: 'score' })
export const getCategoryVideos = (typeId, page = 1, limit = 20) => getVideos({ typeId, page, limit })
export const searchVideos = (keyword, page = 1, limit = 20) => getVideos({ keyword, page, limit })

export async function getDetail(id) {
  const safeId = safeText(id, 64)
  if (!/^[A-Za-z0-9_-]+$/.test(safeId)) return null
  const data = await cachedGet({ ac: 'detail', ids: safeId }, DETAIL_TTL)
  const item = Array.isArray(data?.list) ? data.list[0] : null
  return item ? normalizeVod(item) : null
}

export async function getRelatedVideos(item, limit = 12) {
  if (!item) return []
  const take = int(limit, 12, 1, 20)
  let related = item.typeId ? await getCategoryVideos(item.typeId, 1, take + 2).then(r => r.list).catch(() => []) : []
  related = related.filter(v => String(v.id) !== String(item.id))
  if (related.length < take) {
    const hot = await getHotVideos(1, take + 5).then(r => r.list).catch(() => [])
    const ids = new Set(related.map(v => String(v.id)))
    for (const v of hot) if (String(v.id) !== String(item.id) && !ids.has(String(v.id))) { related.push(v); ids.add(String(v.id)) }
  }
  return related.slice(0, take)
}
