import { apiGet } from './http'

let configPromise
let configCache
let categoriesPromise
let categoriesCache
let adsPromise
let linksPromise
let tagsPromise

export function getSiteConfig(force = false) {
  if (force) { configPromise = null; configCache = null }
  if (configCache) return Promise.resolve(configCache)
  if (!configPromise) {
    configPromise = apiGet({ action: 'config' }).then(data => {
      configCache = data || {}
      return configCache
    }).catch(error => {
      configPromise = null
      throw error
    })
  }
  return configPromise
}

// CMS versions differ in how they package the category tree. Accept flat arrays,
// common response wrappers and nested child collections, then normalize parent IDs.
function collectCategories(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  for (const key of ['list', 'class', 'categories', 'category', 'data', 'class_list', 'type_list', 'rows', 'result']) {
    if (Array.isArray(payload[key])) return payload[key]
    if (payload[key] && typeof payload[key] === 'object') {
      const nested = collectCategories(payload[key])
      if (nested.length) return nested
    }
  }
  const values = Object.values(payload)
  if (values.length && values.every(value => value && typeof value === 'object')) return values
  return []
}

function normalizeCategories(payload) {
  const source = collectCategories(payload)
  const output = []
  const seen = new Set()
  const visit = (items, inheritedParent = 0) => {
    for (const raw of items || []) {
      if (!raw || typeof raw !== 'object') continue
      const id = raw.type_id ?? raw.typeId ?? raw.id ?? raw.cat_id
      const name = raw.type_name ?? raw.typeName ?? raw.name ?? raw.cat_name
      if (id == null || name == null) continue
      const parent = raw.type_pid ?? raw.parent_id ?? raw.parentId ?? raw.pid ?? raw.parent ?? inheritedParent ?? 0
      const item = { ...raw, type_id: id, type_name: String(name), type_pid: parent }
      const key = String(id)
      if (!seen.has(key)) { seen.add(key); output.push(item) }
      const nested = raw.children ?? raw.subcategories ?? raw.child ?? raw.sub ?? raw.childs ?? raw.type_children
      if (Array.isArray(nested)) visit(nested, id)
    }
  }
  visit(source)
  return output
}

// Share one in-flight request and its result between startup preloading and views.
export function getCategories(force = false) {
  if (force) {
    categoriesPromise = null
    categoriesCache = null
  }
  if (categoriesCache) return Promise.resolve(categoriesCache)
  if (!categoriesPromise) {
    categoriesPromise = apiGet({ action: 'categories' })
      .then(normalizeCategories)
      .then(data => {
        categoriesCache = data
        return categoriesCache
      })
      .catch(error => {
        categoriesPromise = null
        throw error
      })
  }
  return categoriesPromise
}

export const getFriendlyLinks = () => linksPromise || (linksPromise = apiGet({ action: 'links' }).catch(error => { linksPromise = null; throw error }))
export const getAds = () => adsPromise || (adsPromise = apiGet({ action: 'ads' }).catch(error => { adsPromise = null; throw error }))
export const getStats = () => apiGet({ action: 'stats' })
export const getHotTags = () => tagsPromise || (tagsPromise = apiGet({ action: 'tags' }).catch(error => { tagsPromise = null; throw error }))

// Warm up data used by the global layout. Views/components reuse these promises.
export function preloadSiteData() {
  return Promise.allSettled([
    getSiteConfig(),
    getCategories(),
    getFriendlyLinks(),
    getAds()
  ])
}
