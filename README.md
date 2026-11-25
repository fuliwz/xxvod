# xxvod 前端

Vue 3 + Vite 单页前端。GitHub 仅负责源码版本管理；网站数据、CMS API、站点设置、广告、友情链接和统计均由独立 PHP 8.0 VPS 后端提供。

## 开发

```bash
npm install
npm run dev
```

本地开发时 Vite 将 `/api.php` 代理到 `http://127.0.0.1:8080`。需启动 PHP 内置服务器并将后端目录映射到该端口。

## 构建

```bash
npm install
npm run build
```

将 `dist/` 中的文件上传到 VPS 网站根目录，与 PHP 后端入口 `api.php` 同域部署。不要部署到 Cloudflare Pages。

## 动态接口

- `GET /api.php?action=config`
- `GET /api.php?action=categories`
- `GET /api.php?action=ads`
- `GET /api.php?action=links`
- `GET /api.php?action=stats`
- `GET /api.php?action=tags`
- `GET /api.php?action=vod&ac=detail&pg=1&pagesize=20`
- `GET /api.php?action=vod&ac=detail&ids=123`
- `GET /api.php?action=vod&ac=detail&wd=关键词`

## 资源

字体和 Font Awesome 图标从 Cloudflare 的 cdnjs 分发地址加载，不使用 Google Fonts、gstatic 或 Google Icons。中文字体回退至系统字体。

## 说明

广告代码与统计代码由 PHP 配置控制，只应由受信任管理员填写。PHP 后端和 VPS 部署说明不放在本前端仓库。
