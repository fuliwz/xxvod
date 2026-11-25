import axios from 'axios'

// The frontend is hosted on Cloudflare Pages while the PHP API runs on the VPS.
// Keep the API host absolute so requests never fall back to xxvod.pages.dev/api.php.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mac.91aix.cfd/api.php'

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  paramsSerializer: { indexes: null },
  headers: { Accept: 'application/json' }
})

http.interceptors.response.use(response => {
  const body = response?.data
  if (body && typeof body === 'object' && Number(body.code) === 0 && body.msg) {
    throw new Error(String(body.msg))
  }
  return response
})

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
