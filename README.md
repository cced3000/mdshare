# MDShare

一个基于 Next.js 的临时 Markdown 分享服务。

## 功能

- 无需登录即可创建分享
- 生成短链接
- 支持上传 `.md` / `.txt` 或直接粘贴
- PC 双栏编辑 + 实时预览
- 移动端编辑 / 预览双 Tab
- 到期时间
- 密码访问
- 阅后即焚
- 编辑链接与管理链接分离
- 匿名管理与删除

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 启动开发环境

```bash
npm run dev
```

3. 打开 [http://localhost:3000](http://localhost:3000)

## 环境变量

复制 `.env.example` 为 `.env`，默认使用 SQLite：

```bash
DATABASE_URL="file:./dev.db"
```

## 维护

- `npm run cleanup`：执行一次过期 / 焚毁清理巡检
- `npm run build`：构建 Next.js
