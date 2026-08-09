# NextClass App

面向中国大陆高校学生的移动优先课表应用。当前仓库保存同一套 React Web/PWA 源码及其 Capacitor Android 工程；Android 是仓库中唯一存在的原生平台目录。

本文件是当前架构和开发要领入口。源码与配置始终优先；`HANDOVER.md` 是历史材料，其中的 AI Studio、`SettingsContext` 和“重连后课程自动同步”等描述已不再代表现状。

## 技术栈

- React 19、TypeScript 5.8、Vite 6、Tailwind CSS 4。
- React Router 7 使用 `BrowserRouter`；动画包是 `motion`/`motion/react`，另有 `react-swipeable`。
- Supabase JS 负责邮箱认证以及 `courses`、`timetables` 的浏览器端访问。
- Capacitor 8 + Java Android 工程；原生插件为 StatusBar 与 `@capgo/inappbrowser`。
- `vite-plugin-pwa` 在入口立即注册 auto-update Service Worker。

以 `package.json`、`vite.config.ts`、`tsconfig.json`、`capacitor.config.ts` 和 `android/` 配置为具体版本与构建事实源。TypeScript 当前未启用 `strict`；`@/*` alias 指向项目根而非 `src/`。

## 运行时结构

入口链：`index.html` → `src/main.tsx` → `src/App.tsx`。

Provider 顺序不得在不了解依赖时随意调整：

```text
ErrorBoundary
└─ AuthProvider
   └─ PreferencesProvider
      └─ TimetableProvider
         └─ CourseProvider
            └─ BrowserRouter + Routes
```

Timetable/Course 在首次 render 时依赖 Auth 同步恢复出的 `user.id` 读取用户缓存。

### 路由

- 公开：`/login`、`/reset-password`。
- 底栏受保护页：`/agenda`、`/timetable`、`/import`、`/settings`；`/` 重定向到 `/timetable`。
- 二级受保护页：`/editor`、`/nextclass`。
- 当前没有 `*` 兜底路由。

`src/pages/` 保存路由页面；login/import/settings 已按子目录拆分。`src/components/` 是跨页面 UI；`src/shared/` 保存类型、repository、常量和小型基础设施；`src/lib/` 保存 Supabase、时间和课表解析；`src/contexts/` 是应用状态与持久化协调层。

## 数据所有权与离线流

```text
Page / component
  → React Context（UI 状态与 mutation orchestration）
    → user-scoped localStorage（立即可见）
    → repository（数据库字段映射）
      → Supabase（后台持久化）
```

- Auth 启动缓存键：`nextclass_cached_auth_user`，并可从 Supabase 持久 session 迁移用户。
- 课程缓存：`courses_<user.id>`；课表缓存：`timetables_<user.id>`。
- `themeColor`、`transparency`、`cornerRadius`、`cellHeight` 是设备级 localStorage 偏好，不云同步。
- Course/Timetable 先同步读缓存，再后台拉云端；网络失败保留缓存。
- `dirtyRef` 和 pending counter 防止后台 fetch 覆盖尚未完成的本地 mutation。
- repository 是 `Course`/`TimetableConfig` 与 Supabase snake_case row 的唯一映射边界。
- 登出清用户课程/课表与 auth 启动缓存，保留无关偏好。

开发这些区域时必须同时读取 `$nextclass-supabase`；其离线不变量是兼容性要求，不是对当前代码“已完全正确”的保证。

## 认证、云端与代理

- 浏览器端仅使用 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`；不要读取、打印或提交真实值。
- 开发态直连配置的 Supabase URL；生产态客户端固定使用 `https://nextclass.top/sb`。`vercel.json` 定义 `/sb/*` 反代和 SPA fallback。
- 账户注销还依赖远端 RPC `delete_user`。
- 仓库没有 Supabase SQL、migration、RLS policy 或 RPC 定义；repository 的租户隔离依赖无法在本仓库验证的服务端 RLS。不要捏造 schema/policy，也不要未经授权修改线上项目。
- `.github/workflows/sync-changelog.yml` 在 main/master push 时可用 service-role secret 运行 `scripts/sync-changelog.js` 写 `changelogs`。该脚本会访问网络并写数据库，不是普通测试命令。

## 课表导入

Android 流程：

```text
用户选择学校并在 InAppBrowser 登录
→ 注入“抓取课表”按钮
→ WebView postMessage 回传页面 HTML
→ smartParseSchedule
→ 正方 td-id fast path 或通用 DOM 矩阵 parser
→ 用户选择覆盖活动课表或创建新课表
→ CourseContext 本地更新并异步持久化
```

Web 环境只提供手动粘贴 HTML 的解析路径。当前 `SCHOOLS` 静态列表有 28 项；“1000+ 所高校”是 UI 文案，不是源码能力证明。Excel、PDF、ICS 三个按钮目前没有事件处理，不能描述为已实现功能。

教务登录凭据由目标教务页面处理；NextClass 导入管线接收的是页面 HTML。不要把“自动导入”描述为自动代填或托管学生密码。

## Android 与 PWA 边界

- Capacitor：`appId=top.nextclass.app`、`webDir=dist`。
- Android min/compile/target SDK：24/36/36；Gradle wrapper 9.3.1，Android Gradle Plugin 9.1.1，Java source/target 21。
- `MainActivity.java` 把系统返回手势交给 WebView history；无法后退时交回系统。
- 状态栏覆盖 WebView，CSS 使用 safe-area；Web/桌面外壳最大宽度为 480px。
- Manifest 仅显式申请 INTERNET，但允许明文流量，network security config 同时信任 system/user CA，以兼容部分 HTTP 校园教务站。这是安全与兼容性的明确取舍，修改前需要真实学校回归。
- PWA 预缓存静态资源并注册 SPA fallback；当前 Supabase runtime cache 正则只匹配直连域名，不匹配生产 `/sb` 代理。
- 带 generated 警告的 Capacitor Gradle/配置文件通过 `npx cap sync` 更新，不直接维护。

## 开发不变量

1. 缓存必须在网络之前渲染，离线/超时不得清空已有用户数据。
2. 后台 fetch 不得覆盖 dirty 本地变更。
3. 每次 async mutation 的 pending counter 必须在成功、返回错误和 Promise reject 时都归零；优先 `try/finally`。
4. 网络副作用不要放进 React state updater；入口启用 StrictMode，开发态 updater 可能重放。
5. 数据库字段映射留在 repository；页面使用领域类型。
6. 登出只清当前用户数据和 auth 缓存；不要误删个性化偏好。
7. 修改认证/网络/同步时验证在线启动、离线启动、重连、fetch 期间快速编辑和登出。
8. 修改 UI 时保持移动优先、safe-area、480px 外壳和 Android 返回行为，并在项目目录使用 `$impeccable`。

## 已确认的架构风险

这些是审计事实，不是本次文档任务授权的修复范围：

- Course mutation 目前用 `.then(markSynced)`，缺少 reject 路径的 `catch/finally`；Timetable 已使用 `try/finally`。
- 重连只刷新 Auth session；Course/Timetable 没有重连 fetch 或离线 mutation replay。
- Course/Timetable 在 state updater 内发起网络写入，可能受 StrictMode updater 重放影响。
- repository 的部分 update/delete 不附加 `user_id` 条件，安全性依赖仓库外的 RLS。
- UI 可编辑节次数量，但缓存恢复会把长度不等于 20 的 periods 重置为默认 20 项。
- InAppBrowser listener 在每次导入时新增，cancel 不移除 listener。
- `package.json` 版本、Android `versionName/versionCode` 与 Landing 下载标签没有统一版本源。
- Android instrumentation 模板仍断言旧 package；正式 release signing 也未配置。

不要把上述风险悄悄“顺手修掉”；相关任务应先复现、界定兼容性和添加验证。

## 开发与验证命令

所有命令从本目录运行：

```powershell
npm install
npm run dev                 # Vite，端口 3000
npm run lint                # 实际为 tsc --noEmit
npm run verify:startup-cache
npm run build
npm run preview
```

没有通用 `npm test`、Vitest/Jest 或 UI/E2E 套件。`verify:startup-cache` 只覆盖 auth 启动缓存。

Android debug 产物的显式流程是：

```powershell
npm run build
npx cap sync android
Set-Location android
./gradlew.bat assembleDebug
```

`npm run android` 硬编码本机 `D:\JDK-21` 与 `D:\AndroidStudioSDK`，且不自动先构建 Web；不要把它当作可移植 CI 命令。APK promotion 到 Landing 必须由用户明确要求，并在两个仓库分别验证。
