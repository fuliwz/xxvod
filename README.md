# xxvod 前端

Vue 3 + Vite 单页前端。GitHub 仅负责源码版本管理；网站数据、CMS API、站点设置、广告、友情链接和统计均由独立 PHP VPS 后端提供。

生产 API 默认地址为 `https://api-v2.2028ios.top/api.php`。本地 Vite 开发时，`/api.php` 会由开发服务器代理到 `https://api-v2.2028ios.top`。如需切换 API 地址，可在构建环境设置 `VITE_API_BASE_URL`。

## API 域名部署要求

- API 接口地址：`https://api-v2.2028ios.top/api.php`。
- API 域名根路径 `/` 应由 VPS/Nginx 返回 403 或 404，不提供网站首页。
- 不要封锁 `/api.php`；前端必须能够正常请求该接口。
- API 服务端应通过 CORS 只允许实际前端来源，例如 `https://xxvod.pages.dev` 以及你正式使用的前端域名。不要把 CORS 设置为任意来源。
- 若启用了带凭据的跨域请求，必须使用明确的 Origin 白名单，不能使用通配符 `*`。
- 仅隐藏 API 域名首页并不能阻止他人直接调用已公开的 API 路径。需要保护数据时，应在 PHP API 中实施鉴权、限流和参数校验。

Nginx 示例（需与现有 PHP-FPM 配置合并，不要覆盖 PHP 解析规则）：

```nginx
# API 域名只开放 API 入口，根路径及其他普通路径拒绝访问
location = / {
    return 404;
}

location = /api.php {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root/api.php;
    fastcgi_pass unix:/tmp/php-cgi-80.sock;
}

location ~ \.php$ {
    return 404;
}

location / {
    return 404;
}
```

上面的 `fastcgi_pass` socket 路径只是示例，必须替换成宝塔当前 PHP 版本实际使用的 PHP-FPM socket 或地址。若 API 还有必要的静态资源或其他接口路径，也要明确加入白名单。

## 开发

```bash
npm install
npm run dev
```

本地 Vite 开发服务器会将 `/api.php` 代理到 `https://api-v2.2028ios.top/api.php`。

## 构建

需要 Node.js 20.19 或更高版本：

```bash
npm install
npm run build
```

将 `dist/` 中的文件部署到前端托管环境。

## Nginx SPA 回退

Vue 使用 HTML5 History 路由。前端站点的 Nginx 需要把不存在的前端路径回退到 `index.html`。在现有站点配置中保留宝塔自动生成的 PHP-FPM 解析规则，只需将普通页面请求配置为：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

不要删除或覆盖现有的 `location ~ \.php$` PHP-FPM 规则，否则 PHP 接口将无法执行。配置完成后执行 `nginx -t` 并重载 Nginx。

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
- `VITE_API_BASE_URL`：可选，API 地址；不设置时默认使用 `https://api-v2.2028ios.top/api.php`。

本地开发可在项目根目录创建不提交到 Git 的 `.env.local`：

```dotenv
VITE_API_ENCRYPTION_SECRET=替换为与VPS完全一致的密钥字符串
VITE_API_BASE_URL=https://api-v2.2028ios.top/api.php
```

Cloudflare Pages 请在项目的 Settings → Environment variables 中添加 `VITE_API_ENCRYPTION_SECRET`。如需覆盖默认 API 地址，再添加 `VITE_API_BASE_URL`。修改后重新部署。

**安全说明：** Vite 的 `VITE_*` 变量会被编译进浏览器 JavaScript，访问者仍可能提取密钥并解密数据。本功能主要让 Network 面板中的响应不再直接显示明文 JSON，属于基础混淆，不是防逆向或真正的客户端密钥保护。不要把实际密钥提交到 GitHub。

## 资源

Font Awesome 与 Orbitron、Bebas Neue、Inter 字体使用固定版本的 Cloudflare cdnjs 地址；不调用 Google Fonts 或 gstatic。中文字体回退至系统字体。

## 说明

广告代码与统计代码由 PHP 配置控制，只应由受信任管理员填写。PHP 后端和 VPS 部署说明不放在本前端仓库。

## 分类导航

首页分类标签只列出二级分类；侧边栏按一级分类分组，可展开查看对应的二级分类。

## 播放器

播放页使用 Plyr + HLS.js，HLS 在支持 MSE 的浏览器中由 HLS.js 播放，Safari/iOS 等浏览器使用原生 HLS；普通 MP4/WebM/OGV 使用 HTML5 video。播放器按需加载 HLS 引擎，并支持播放速度与音画同步设置。
