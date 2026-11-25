# xxvod 前端

Vue 3 + Vite 单页前端。GitHub 仅负责源码版本管理；网站数据、CMS API、站点设置、广告、友情链接和统计均由独立 PHP 8.0 VPS 后端提供。

后端 API 默认使用当前站点同源的 `/api.php`。正式前端与 PHP 后端部署在 `https://mac.91aix.cfd/` 时，无需额外配置。若前端使用其他域名，请在构建前设置 `VITE_API_BASE_URL=https://mac.91aix.cfd/api.php`，并在 PHP 后端允许该前端域名的 CORS 请求。

## 开发

```bash
npm install
npm run dev
```

本地 Vite 开发服务器会将 `/api.php` 代理到 `https://mac.91aix.cfd/api.php`。

## 构建

需要 Node.js 20.19 或更高版本：

```bash
npm install
npm run build
```

将 `dist/` 中的文件上传到 VPS 网站根目录，与 PHP 后端入口 `api.php` 同域部署。不要部署到 Cloudflare Pages。

## Nginx SPA 回退

Vue 使用 HTML5 History 路由。Nginx 需要把不存在的前端路径回退到 `index.html`。在现有站点配置中保留宝塔自动生成的 PHP-FPM 解析规则，只需将普通页面请求配置为：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

不要删除或覆盖现有的 `location ~ \\.php$` PHP-FPM 规则，否则 `/api.php` 将无法执行。配置完成后执行 `nginx -t` 并重载 Nginx。

## 动态接口约定

- `GET /api.php?action=config`
- `GET /api.php?action=categories`
- `GET /api.php?action=ads`
- `GET /api.php?action=links`
- `GET /api.php?action=stats`
- `GET /api.php?action=tags`
- `GET /api.php?action=vod&ac=detail&pg=1&pagesize=20`
- `GET /api.php?action=vod&ac=detail&ids=123`
- `GET /api.php?action=vod&ac=detail&wd=关键词`

前端按 JSON 对象读取响应；若响应包含 `code`，当前客户端将 `1` 或 `200` 视为成功，并优先返回 `data` 字段。需确保 PHP API 与此约定一致。

## API 响应加密（可选）

PHP 后端启用 `api_encrypt.php` 的 AES-256-GCM 响应加密后，前端会在 Axios 响应拦截器中自动解密，原有页面和 API 调用无需修改。客户端兼容未加密响应，因此可以先部署前端，再启用后端加密。

构建环境需要设置：

- `VITE_API_ENCRYPTION_SECRET`：必须与 VPS `api_encrypt.php` 中的 `$secret` 字符串完全一致。
- `VITE_API_BASE_URL`：可选，API 地址；不设置时使用代码中的默认地址。

本地开发可在项目根目录创建不提交到 Git 的 `.env.local`：

```dotenv
VITE_API_ENCRYPTION_SECRET=替换为与VPS完全一致的密钥字符串
```

Cloudflare Pages 请在项目的 Settings → Environment variables 中添加 `VITE_API_ENCRYPTION_SECRET`，然后重新部署。生产环境和 Preview 环境如需分别构建，都要配置对应变量。

**安全说明：** Vite 的 `VITE_*` 变量会被编译进浏览器 JavaScript，访问者仍可能提取密钥并解密数据。本功能主要让 Network 面板中的响应不再直接显示明文 JSON，属于基础混淆，不是防逆向或真正的客户端密钥保护。不要把实际密钥提交到 GitHub。

## 资源

Font Awesome 与 Orbitron、Bebas Neue、Inter 字体使用固定版本的 Cloudflare cdnjs 地址；不调用 Google Fonts 或 gstatic。中文字体回退至系统字体。

## 说明

广告代码与统计代码由 PHP 配置控制，只应由受信任管理员填写。PHP 后端和 VPS 部署说明不放在本前端仓库。

## 分类导航

首页分类标签只列出二级分类；侧边栏按一级分类分组，可展开查看对应的二级分类。

## 播放器

播放页使用 Hola Spark Player（独立 HTML5 播放器），按 CMS 播放地址中的第一组线路固定播放，即“线路一”；该线路内的选集仍可切换。Hola Spark 播放器脚本在播放页按需加载。未配置 Hola Customer ID，因此本次不启用 Spark 账号统计或额外 CDN 功能。

Hola Spark Customer ID（可选）：如需启用 Hola 账号关联功能，在 Cloudflare Pages 构建环境中设置 `VITE_HOLASPARK_CUSTOMER_ID`，重新构建部署即可；未设置时以独立播放器模式加载。
