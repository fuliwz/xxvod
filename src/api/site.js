import { apiGet } from './http'

let configPromise
let configCache
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

export const getCategories = () => apiGet({ action: 'categories' })
export const getFriendlyLinks = () => linksPromise || (linksPromise = apiGet({ action: 'links' }).catch(error => { linksPromise = null; throw error }))
export const getAds = () => adsPromise || (adsPromise = apiGet({ action: 'ads' }).catch(error => { adsPromise = null; throw error }))
export const getStats = () => apiGet({ action: 'stats' })
export const getHotTags = () => tagsPromise || (tagsPromise = apiGet({ action: 'tags' }).catch(error => { tagsPromise = null; throw error }))
