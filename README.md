# MDShare

一个基于 Next.js 的临时 Markdown 分享服务。本项目已完全适配 Serverless 架构，可**零成本**一键部署至 Cloudflare Pages。

## 功能特性

- 无需登录即可创建分享，生成短链接
- 支持上传 `.md` / `.txt` 或直接粘贴文本
- PC 双栏同步滚动编辑 + 实时预览
- 移动端类原生 App 底部导航，沉浸式编辑/预览双 Tab
- 访问控制：到期时间、密码访问、**阅后即焚**
- 权限隔离：区分「公开访问链接」、「编辑链接」与「管理链接」
- 匿名保护：支持无感修改与随时主动删除

## 开发与部署 (Cloudflare Pages + D1)

本项目移除了原本的 Node.js 扩展 (例如 `better-sqlite3`)，全面采用了 **Cloudflare D1 无服务器数据库**、**Web Crypto API** 以及 **Edge Runtime**。

### 1. 本地开发环境准备

请确保你使用 `pnpm` 作为包管理器：

```bash
pnpm install
```

然后登录 Wrangler 绑定你的 Cloudflare 账号：

```bash
pnpm exec wrangler login
```

初始化本地 D1 数据库并创建表结构：

```bash
pnpm run db:migrate:local
```

启动支持 D1 Bindings 的本地开发服务器（模拟 Edge 环境）：

```bash
pnpm run dev
```
打开 [http://localhost:3000](http://localhost:3000) 即可开始开发。

### 2. 部署到 Cloudflare Pages

1. 在 Cloudflare 面板 -> **Workers 和 Pages** -> **D1 SQL 数据库**，创建一个新的数据库。
2. 将项目根目录的 `wrangler.example.toml` 复制一份并重命名为 `wrangler.toml`。将获取到的**数据库 ID** (`database_id`) 更新到其中。
3. 执行以下命令，将表结构推送到线上数据库：
   ```bash
   pnpm run db:migrate
   ```
4. 将代码推送到你的 GitHub 仓库。
5. 在 Cloudflare Pages 中连接此 GitHub 仓库创建应用：
   - 构建命令设置：**`npx @cloudflare/next-on-pages`**
   - 构建输出目录：`.vercel/output/static`
   - **必需设置**：在 **"环境变量和绑定" -> "D1 数据库绑定"** 选项卡下，将变量名设为 **`DB`**，并选中你刚创建的数据库。
6. 点击保存并部署即可。以后每次推送到 `main` 分支都会自动构建。

## 维护与清理

过期与焚毁的页面数据将通过 Next.js `/api/clean` API 路由进行清扫。

你可以通过给 API 传递验证密钥防止被恶意调用。
你也可以在 Cloudflare 的 **Cron Triggers** 定时触发器中设置定时请求该接口。
