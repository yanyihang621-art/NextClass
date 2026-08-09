# NextClass 项目 AI 开发交接文档 (Handover Documentation)

> [!WARNING]
> 本文件是历史快照，不是当前架构入口。新任务必须先读 `AGENTS.md`、`CONTEXT.md` 和 `README.md`；当本文件与当前源码、配置或 README 冲突时，以当前源码/配置为准。尤其不要继续采用这里已经过时的 AI Studio、`SettingsContext`、重连同步和已完成发布陈述。

本文档旨在为后续接手的 AI Agent 或开发人员提供项目全貌、技术架构、常用构建命令、核心业务逻辑以及最新修改记录的详细说明。

---

## 1. 项目概述 (Project Overview)

**NextClass** 是一款面向大学生的课表与日程管理应用。项目整体包含两个子项目仓库：

1. **主 App (`NextClass`)**
   * **本地路径**: `d:\NextClass-workspace\NextClass`
   * **说明**: 基于 React + Vite + TypeScript + Capacitor 的移动端跨平台 App。
2. **官网 / 落地页 (`NextClass-Landing`)**
   * **本地路径**: `d:\NextClass-workspace\NextClass-Landing`
   * **说明**: 用于宣传展示、产品介绍以及提供 App 安装包 (`NextClass.apk`) 下载的网站。

---

## 2. 技术栈与架构设计 (Tech Stack & Architecture)

### 核心技术栈
* **前端框架**: React 19 + Vite + TypeScript
* **样式与UI**: Tailwind CSS (v4) + Framer Motion (动画) + Lucide React (图标)
* **路由管理**: React Router v7
* **后端服务与数据库**: Supabase (@supabase/supabase-js)
  * Auth 认证（邮箱/密码登录、OTP 验证码、重置密码）
  * 云端数据持久化（如 `timetables` 课表配置表等）
* **移动端打包**: Capacitor 8 (`@capacitor/android`, `@capacitor/core`)

### 离线优先架构 (Offline-First Architecture)
* 用户 session 及课表配置、课程数据优先存取自 `localStorage`。
* 断网状态下（`isOffline = true`）可正常读取本地缓存并完成 UI 渲染，避免产生 "Failed to fetch" 阻塞应用使用。
* 网络恢复后，`AuthContext` 与 `SettingsContext` 会自动发起后台静默同步。

---

## 3. 环境要求与打包指南 (Build & Packaging Workflow)

### 开发环境配置
* **JDK 路径**: `D:\JDK-21`
* **Android SDK 路径**: `D:\AndroidStudioSDK`

### 打包完整的 APK 并更新 Landing 页面流程

在 PowerShell 环境下按顺序执行以下命令：

1. **构建 Web 生产资源**:
   ```powershell
   # 在 NextClass 根目录下
   npm run build
   ```

2. **同步资源至 Capacitor 原生 Android 项目**:
   ```powershell
   # 在 NextClass 根目录下
   npx cap sync
   ```

3. **编译 Android APK**:
   ```powershell
   # 进入 android 目录
   cd d:\NextClass-workspace\NextClass\android

   # 指定 JDK 21 并编译 Debug 包
   $env:JAVA_HOME='D:\JDK-21'; .\gradlew.bat assembleDebug
   ```

4. **产物替换（更新官网下载包）**:
   编译成功后的 APK 路径为：
   `d:\NextClass-workspace\NextClass\android\app\build\outputs\apk\debug\app-debug.apk`

   将其复制并覆盖至 Landing 项目的 public 目录：
   ```powershell
   Copy-Item -Path "d:\NextClass-workspace\NextClass\android\app\build\outputs\apk\debug\app-debug.apk" -Destination "d:\NextClass-workspace\NextClass-Landing\public\NextClass.apk" -Force
   ```

---

## 4. 关键模块与源码位置 (Key Modules)

* **认证与用户管理 (`src/contexts/AuthContext.tsx` & `src/pages/Login.tsx`)**:
  * 包含登录、注册、OTP 验证、重置密码流。
  * **已注册邮箱提示拦截**:
    * 兼容了 Supabase 的 **User Enumeration Protection** (用户枚举保护)。
    * 当用户输入已注册邮箱注册时，Supabase 可能不抛出 error 而是返回 `identities.length === 0` 的 user 对象。`AuthContext.ts` 中对此作了统一拦截并返回 `"该邮箱已被注册"` 错误。
* **课表与系统设置 (`src/contexts/SettingsContext.tsx` & `src/pages/Timetable.tsx`)**:
  * 课表配置（支持多课表管理、周数设置、节次时间设置、主题色切换）。
  * 提供了脏数据标记（`dirtyRef`）机制，防止本地未同步改动被云端覆盖。
* **网络与离线提示 (`src/components/ProtectedRoute.tsx` 等)**:
  * 顶部离线横幅提示，网络异常友好捕获。

---

## 5. 最近完成的修改与优化记录 (Recent Changes Log)

1. **登录/注册邮箱重名校验**:
   * 在 `AuthContext.tsx` 中的 `signUp` 函数补充了对 Supabase 隐式返回（`identities` 数组为空）的逻辑分支判断，确保注册已存在邮箱时明确提示“该邮箱已被注册”。
2. **课表顶部“第 XX 周”排版优化**:
   * 修复了周数文本在两位数时换行的排版样式。
3. **取消切周弹性过度动画**:
   * 移除了切周滑动时的 果冻/Jelly 动画效果，保持平滑切换。
4. **App 最新版打包与官网 APK 替换**:
   * 使用 JDK 21 重新编译构建了最新的 APK 安装包，并同步替换了 `NextClass-Landing/public/NextClass.apk`。

---

## 6. 接手建议与后续待办 (Next Steps & Recommendations)

1. **代码规范与 TypeScript 类型清理**:
   * `src/components/SchoolSelector.tsx` 中存在部分 TypeScript 编译警告/错误（如 React 命名空间与类型定义），建议后续重构或补充缺失类型。
2. **Release 签名发布**:
   * 当前打包输出的是 `assembleDebug` 版本的 APK，若需要发布到应用商店或生成正式 Release 版本，建议在 `android/app/build.gradle` 中配置 `signingConfigs` 和密匙库文件。
3. **继续保持离线优先原则**:
   * 在新增任何 Supabase API 交互逻辑时，建议统一在 `catch` 或 Context 层处理网络异常，避免在无网状态下引起页面白屏。

---

*文档生成时间: 2026年*
