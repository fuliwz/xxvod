import axios from 'axios'

// The frontend is hosted on Cloudflare Pages while the PHP API runs on the VPS.
// Keep the API host configurable; the response decryption works with either host.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mac.91aix.cfd/api.php'

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
      // Match PHP: hash('sha256', $secret, true), then use the 32-byte result
      // as the raw AES-256-GCM key.
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
  // Keep compatibility during rollout: plaintext responses pass through.
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

  // PHP OpenSSL returns ciphertext and tag separately. Web Crypto expects
  // the 16-byte GCM tag appended to the ciphertext.
  const encryptedBytes = new Uint8Array(ciphertext.length + tag.length)
  encryptedBytes.set(ciphertext)
  encryptedBytes.set(tag, ciphertext.length)

  try {
    const plaintext = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128
      },
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
    // The PHP gateway also encrypts JSON error responses (for example 404/502).
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

export async function apiGet(params = {}) {
  const response = await http.get('', { params })
  const body = response?.data

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('后端返回的数据格式不正确')
  }
  if (body.code !== undefined && ![1, 200, '1', '200'].includes(body.code)) {
    throw new Error(body.msg || '接口请求失败')
  }

  return body.data !== undefined ? body.data : body
}

export default http
