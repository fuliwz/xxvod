import axios from 'axios'

// Production API is hosted on the dedicated API domain.
// During local Vite development, use the proxy below to avoid browser CORS.
const API_BASE_URL = import.meta.env.DEV
  ? '/api.php'
  : (import.meta.env.VITE_API_BASE_URL || 'https://api-v2.2028ios.top/api.php')

// Must exactly match the $secret string configured in the VPS api_encrypt.php.
// Vite embeds VITE_* values in the browser bundle, so this is obfuscation, not
// a server-side secret or a way to prevent a determined visitor from decrypting.
const API_ENCRYPTION_SECRET = String(import.meta.env.VITE_API_ENCRYPTION_SECRET || '')
let apiCryptoKeyPromise

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  paramsSerializer: { indexes: null },
  headers: { Accept: 'application/json' }
})

// Persistent browser cache. The in-memory map is a fallback for browsers where
// IndexedDB is unavailable (for example, some private-browsing configurations).
const DB_NAME = 'xxvod-api-cache'
const DB_VERSION = 1
const STORE_NAME = 'responses'
const memoryCache = new Map()
let dbPromise

function openCacheDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise(resolve => {
      let request
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION)
      } catch {
        resolve(null)
        return
      }
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        }
      }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => db.close()
        resolve(db)
      }
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    }).catch(() => null)
  }
  return dbPromise
}

function makeCacheKey(params) {
  const normalized = Object.keys(params || {}).sort().reduce((result, key) => {
    result[key] = params[key] == null ? '' : params[key]
    return result
  }, {})
  return JSON.stringify(normalized)
}

function cacheTtl(params = {}) {
  const action = String(params.action || '')
  if (action === 'config') return 10 * 60 * 1000
  if (action === 'categories') return 30 * 60 * 1000
  if (action === 'links' || action === 'tags') return 10 * 60 * 1000
  if (action === 'ads') return 30 * 1000
  if (action === 'stats') return 30 * 1000
  if (action === 'vod') {
    return params.ids ? 5 * 60 * 1000 : 60 * 1000
  }
  return 60 * 1000
}

async function readBrowserCache(key) {
  const db = await openCacheDb()
  if (!db) return memoryCache.get(key) || null
  return new Promise(resolve => {
    try {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
      request.onsuccess = () => {
        const record = request.result || memoryCache.get(key) || null
        if (record) memoryCache.set(key, record)
        resolve(record)
      }
      request.onerror = () => resolve(memoryCache.get(key) || null)
    } catch {
      resolve(memoryCache.get(key) || null)
    }
  })
}

async function writeBrowserCache(key, data, ttl) {
  const record = { key, data, savedAt: Date.now(), expiresAt: Date.now() + ttl }
  memoryCache.set(key, record)
  const db = await openCacheDb()
  if (!db) return
  await new Promise(resolve => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(record)
      transaction.oncomplete = resolve
      transaction.onerror = resolve
      transaction.onabort = resolve
    } catch {
      resolve()
    }
  })
}

function base64ToBytes(value, fieldName) {
  if (typeof value !== 'string' || value === '') {
    throw new Error(`API 加密响应缺少 ${fieldName}`)
  }

  let binary
  try {
    binary = atob(value)
  } catch {
    throw new Error(`API 加密响应的 ${fieldName} 不是有效的 Base64`)
  }

  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function getApiCryptoKey() {
  if (!API_ENCRYPTION_SECRET) {
    throw new Error('API 返回了加密数据，但前端未配置 VITE_API_ENCRYPTION_SECRET')
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('当前浏览器环境不支持 Web Crypto API，请使用 HTTPS 访问')
  }

  if (!apiCryptoKeyPromise) {
    apiCryptoKeyPromise = (async () => {
      const digest = await globalThis.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(API_ENCRYPTION_SECRET)
      )

      return globalThis.crypto.subtle.importKey(
        'raw',
        digest,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      )
    })().catch(error => {
      apiCryptoKeyPromise = undefined
      throw error
    })
  }

  return apiCryptoKeyPromise
}

async function decryptApiResponse(payload) {
  if (!payload || typeof payload !== 'object' || Number(payload.encrypted) !== 1) {
    return payload
  }

  if (Number(payload.version) !== 1) {
    throw new Error('不支持的 API 加密协议版本')
  }

  const [key, iv, ciphertext, tag] = await Promise.all([
    getApiCryptoKey(),
    Promise.resolve(base64ToBytes(payload.iv, 'iv')),
    Promise.resolve(base64ToBytes(payload.data, 'data')),
    Promise.resolve(base64ToBytes(payload.tag, 'tag'))
  ])

  if (iv.length !== 12) {
    throw new Error('API 加密响应的 IV 长度不正确')
  }
  if (tag.length !== 16) {
    throw new Error('API 加密响应的认证标签长度不正确')
  }

  const encryptedBytes = new Uint8Array(ciphertext.length + tag.length)
  encryptedBytes.set(ciphertext)
  encryptedBytes.set(tag, ciphertext.length)

  try {
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      encryptedBytes
    )

    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext))
  } catch {
    throw new Error('API 数据解密失败，请检查前后端加密密钥是否一致')
  }
}

http.interceptors.response.use(
  async response => {
    response.data = await decryptApiResponse(response?.data)

    const body = response?.data
    if (body && typeof body === 'object' && Number(body.code) === 0 && body.msg) {
      throw new Error(String(body.msg))
    }

    return response
  },
  async error => {
    if (error?.response) {
      try {
        error.response.data = await decryptApiResponse(error.response.data)
        const body = error.response.data
        if (body && typeof body === 'object' && body.msg) {
          error.message = String(body.msg)
        }
      } catch (decryptError) {
        error.message = decryptError instanceof Error
          ? decryptError.message
          : 'API 错误响应解密失败'
      }
    }

    return Promise.reject(error)
  }
)

// Read a valid browser copy first. On a cache miss/expiry, request the API;
// if the network fails, fall back to the last saved copy when one exists.
// Pass { cache: false } to force a fresh API request.
export async function apiGet(params = {}, options = {}) {
  const useCache = options.cache !== false
  const cacheKey = makeCacheKey(params)
  const ttl = cacheTtl(params)
  let staleRecord = null

  if (useCache) {
    const cached = await readBrowserCache(cacheKey)
    if (cached) {
      if (cached.expiresAt > Date.now()) return cached.data
      staleRecord = cached
    }
  }

  try {
    const response = await http.get('', { params })
    const body = response?.data

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('后端返回的数据格式不正确')
    }
    if (body.code !== undefined && ![1, 200, '1', '200'].includes(body.code)) {
      throw new Error(body.msg || '接口请求失败')
    }

    const data = body.data !== undefined ? body.data : body
    if (useCache) await writeBrowserCache(cacheKey, data, ttl)
    return data
  } catch (error) {
    if (staleRecord) return staleRecord.data
    throw error
  }
}

export default http
