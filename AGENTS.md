# NextClass App Agent Guidance

本仓库是 React/TypeScript/Vite 前端、PWA 与 Capacitor Android 共用的一套移动优先 App 源码；Supabase 提供认证和云端持久化，本地缓存承担离线首屏。

## 开始任务前

1. 如果父工作区存在，读取 `../AGENTS.md`、`../CONTEXT-MAP.md`、`../UBIQUITOUS_LANGUAGE.md` 和兄弟项目 `../NextClass-Landing/CONTEXT.md`。
2. 读取本仓库 `CONTEXT.md` 与 `README.md`。当前源码/config 高于文档；`HANDOVER.md` 仅作历史参考。
3. 使用 `$nextclass-project-context`；认证、Supabase、缓存、repository、代理或同步任务同时使用 `$nextclass-supabase`。
4. 先运行 `git status --short`，保留 `.vscode/` 等用户改动。不要读取或输出 `.env` 值。

## 不得破坏的边界

- 缓存课程/课表必须先于网络结果可用；网络失败不能清空用户可见缓存或让受保护页白屏。
- 云端刷新不得覆盖尚未完成的本地写入；所有 pending-operation 路径必须最终递减。
- snake_case/camelCase 映射留在 repository；页面和 Context 不直接复制数据库行映射。
- 生产 Supabase 流量默认走 `https://nextclass.top/sb`；不要把 service-role key 放入浏览器或 Vite 环境。
- Android 清晰流量、用户 CA 信任和 WebView 导入是校园教务站兼容边界，未经真实学校回归不要随意收紧或扩大。
- Capacitor 生成文件通过 `npx cap sync` 更新，不手改带有 generated 警告的文件。

## 验证

普通 TypeScript/前端改动至少运行：

```powershell
npm run lint
npm run verify:startup-cache
npm run build
```

只运行与任务相关的真机/Gradle 校验；没有用户授权时，不运行 `scripts/sync-changelog.js`、生产认证、migration、RLS 或线上数据写入。

