# MDShare

一个基于 Next.js 的临时 Markdown 分享服务。本项目已适配 Cloudflare Workers + D1，可直接部署到 Cloudflare。

## 功能特性

- 无需登录即可创建分享，生成短链接
- 支持上传 `.md` / `.txt` 或直接粘贴文本
- PC / 移动端统一的轻量阅读与编辑体验
- 访问控制：到期时间、密码访问、**阅后即焚**
- 权限隔离：区分「公开访问链接」、「编辑链接」与「管理链接」
- 匿名保护：支持无感修改与随时主动删除

## 开发与部署 (Cloudflare Workers + D1)

本项目采用了 **Cloudflare Workers**、**Cloudflare D1** 和 **OpenNext for Cloudflare**。

### 1. 本地开发环境准备

请确保你使用 `pnpm` 作为包管理器：

```bash
pnpm install
```

然后登录 Wrangler：

```bash
pnpm exec wrangler login
```

初始化本地 D1 数据库并创建表结构：

```bash
pnpm run db:migrate:local
```

启动本地开发服务器：

```bash
pnpm run dev
```
打开 [http://localhost:3000](http://localhost:3000) 即可开始开发。

### 2. 预览 Cloudflare 生产构建

Cloudflare 的生产产物由 OpenNext 生成：

```bash
pnpm run cf:build
pnpm wrangler dev
```

如果你在 Windows 上执行 `cf:build`，建议放到 WSL 里运行。OpenNext 官方当前对 Linux / macOS 支持更稳定，Windows 上常见问题是符号链接创建失败。

### 3. 部署到 Cloudflare

1. 在 Cloudflare 面板里创建 D1 数据库。
2. 复制 `wrangler.example.toml` 为本地 `wrangler.toml`，填入真实的 `database_id`。
3. 推送线上表结构：

```bash
pnpm run db:migrate
```

4. 构建 Cloudflare Worker 产物：

```bash
pnpm run cf:build
```

5. 发布：

```bash
pnpm wrangler deploy
```

部署成功后，Wrangler 会输出 `workers.dev` 访问地址。

## 维护与清理

过期与焚毁的页面数据将通过 Next.js `/api/clean` API 路由进行清扫。

你可以通过给 API 传递验证密钥防止被恶意调用。
你也可以在 Cloudflare 的 **Cron Triggers** 中定时触发该接口。
