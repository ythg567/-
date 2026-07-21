# 飞书多维表格附件批量下载插件

一个运行在飞书多维表格侧边栏的扩展脚本（Bitable Extension），用于批量下载附件字段中的文件，并支持自定义命名、ZIP 打包与文件夹分类。

> 本插件基于 `@lark-base-open/js-sdk` 与浏览器能力实现，界面参考你提供的截图布局。

## 功能特性

- 选择数据表、视图与附件字段（可多选）
- 下载当前视图全部可见记录，或仅下载当前选中的记录
- 文件命名：保留原文件名，或按一个/多个字段值组合命名
- ZIP 打包下载，支持按字段值分一级/二级文件夹
- 实时显示下载进度、成功/失败统计
- 轻量浏览器端实现，无需本地客户端

## 技术栈

- React 18 + TypeScript
- Vite 5
- `@lark-base-open/js-sdk`
- `jszip` + `file-saver`

## 安装与运行

```bash
# 进入项目目录
cd feishu-bitable-attachment-downloader

# 安装依赖
npm install

# 本地开发预览
npm run dev
```

## 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。你可以将 `dist/` 部署到任意静态服务器（如 Vercel、GitHub Pages、Nginx 等）。

## 永久部署（免费 · GitHub Pages，推荐）

仓库已内置 GitHub Actions 工作流（`.github/workflows/deploy.yml`），每次 `git push` 到 `main` 分支都会自动构建并发布到 GitHub Pages，得到一个**永久免费**的 HTTPS 地址。

### 第一步：在 GitHub 新建一个空仓库

在 https://github.com/new 创建一个仓库（例如 `feishu-bitable-downloader`），**不要**勾选初始化 README / .gitignore。

### 第二步：推送代码

```bash
cd feishu-bitable-attachment-downloader
git remote add origin https://github.com/你的用户名/feishu-bitable-downloader.git
git branch -M main
git push -u origin main
```

### 第三步：开启 Pages

1. 进入仓库 **Settings → Pages**。
2. Source 选择 **GitHub Actions**。
3. 等待 Actions 跑完（约 1 分钟），页面会显示发布地址，形如：
   ```
   https://你的用户名.github.io/feishu-bitable-downloader/
   ```

把这个地址填到飞书自定义插件的运行地址即可。之后改代码只要 `git push`，URL 永久不变。

> 提示：临时演示用的 CloudStudio 沙箱地址随时可能被回收，不建议长期使用。GitHub Pages 地址长期稳定。

## 永久部署（国内快 · 码云 Gitee Pages）

如果你觉得 GitHub 太慢，推荐用 **Gitee（码云）**：国内访问快，Gitee Pages 提供永久免费的静态托管地址。Gitee Pages 直接托管仓库里的静态文件，不需要构建。

### 第一步：在 Gitee 新建空仓库

打开 https://gitee.com/projects/new 创建仓库（例如 `feishu-bitable-downloader`），**不要**初始化 README/.gitignore。

### 第二步：推送代码与构建产物

Gitee Pages 不会自动构建，需要把 `dist/` 里的静态文件提交到仓库的一个独立分支（如 `gitee-pages`，放在根目录）：

```bash
cd feishu-bitable-attachment-downloader
git remote add gitee https://gitee.com/你的用户名/feishu-bitable-downloader.git
git branch -M main
git push -u gitee main

# 把 dist 目录推送到 gitee-pages 分支的根目录
git subtree push --prefix dist gitee gitee-pages
```

### 第三步：开启 Gitee Pages

1. 进入仓库 **服务 → Gitee Pages**。
2. 部署分支选 **gitee-pages**，部署目录选 **/**。
3. 点击 **启动**，稍等片刻得到地址，形如：
   ```
   https://你的用户名.gitee.io/feishu-bitable-downloader/
   ```

> 注意：Gitee Pages 免费版需手动点击“更新”来重新部署；改代码后重新执行上面的 `git subtree push` 并到页面点“更新”即可。
> 该地址长期稳定，适合填到飞书自定义插件。

## 在其他平台部署

- **Vercel / Netlify**：导入仓库，`Build Command` 填 `npm run build`，`Output Directory` 填 `dist`，零配置。
- **自有服务器 / Nginx / 腾讯云 COS / 阿里云 OSS**：直接上传 `dist/` 目录即可（`vite.config.ts` 已设 `base: './'`，放在任意子路径都能正常加载）。

## 在飞书多维表格中使用

1. 打开任意飞书多维表格。
2. 点击右上角的 **扩展脚本**（或 **插件**）面板。
3. 选择 **自定义插件** → **新增插件**。
4. 在运行地址中填入构建产物托管后的 URL，例如：
   ```
   https://your-domain.com/dist/index.html
   ```
   本地开发时可以使用：
   ```
   http://localhost:5173
   ```
5. 在侧边栏中配置数据表、视图、附件字段等选项。
6. 点击 **下载全部记录** 或 **下载所选记录**。

## 使用说明

- **数据表 / 视图**：插件只会下载当前视图中可见的记录，视图筛选条件会生效。
- **附件字段**：可多选，支持附件类型字段以及引用附件字段的 Lookup 字段。
- **文件命名方式**：
  - 原文件名称：直接保留附件上传时的文件名。
  - 按字段命名：选择文本/单选/数字等字段，文件名会按字段值组合生成。
- **文件夹分类**：仅在 **ZIP 打包下载** 时生效，可按字段值自动建立子目录。
- **下载方式**：
  - `zip 打包下载`：把所有附件打包成一个 ZIP 文件下载。
  - `单独下载`：逐个触发浏览器下载（建议关闭浏览器“下载前询问保存位置”）。

## 权限说明

插件运行时需要以下权限之一：

- 查看、评论、编辑和管理多维表格
- 查看、评论和导出多维表格

下载前会校验当前用户是否拥有下载/打印权限。

## 注意事项

1. **跨域与浏览器拦截**：浏览器直接下载依赖飞书附件临时链接的 CORS 策略。如果出现“网络请求失败，可能被跨域策略拦截”，可尝试：
   - 使用 ZIP 打包方式（部分场景可规避）。
   - 关闭浏览器“下载前询问每个文件的保存位置”。
   - 后续可扩展本地客户端/WebSocket 下载模式以彻底绕过浏览器限制。
2. **大文件**：浏览器端 ZIP 打包会占用内存，建议超过 1GB 时改用本地客户端方案。
3. **文件名去重**：同名文件会自动追加 `_1`、`_2` 等序号。

## 目录结构

```
feishu-bitable-attachment-downloader/
├── src/
│   ├── App.tsx              # 主界面
│   ├── App.css              # 样式
│   ├── main.tsx             # 入口
│   ├── hooks/
│   │   └── useBitable.ts    # 飞书 SDK 封装
│   └── utils/
│       ├── download.ts      # 下载与 ZIP 逻辑
│       └── fileName.ts      # 文件名处理
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 后续可扩展

- 本地客户端/WebSocket 下载模式：通过 Python/Node 桌面端绕过浏览器限制。
- 配置预设：保存常用下载配置。
- URL 字段下载：支持从文本/URL 字段解析链接并下载。
- 多语言支持。
