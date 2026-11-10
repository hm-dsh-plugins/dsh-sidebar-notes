# dsh-sidebar-notes

在 DeepSeek Harness 右侧边栏里记便签：纯文本，一条一个文件，按创建时间倒序排在页面上。

## 它做了什么

| 一半 | 内容 |
|---|---|
| **Host** | 在共享 `/api` 通道上注册一条已认证的路由 `POST /api/plugins/dsh-notes`（动作放在请求体里：`list` / `create` / `save` / `delete` / `counts`）。便签目录固定为会话工作区下的 `.dsh-notes/`，路径由服务器从 session 推导；`counts` 是唯一按 **workspaceId** 寻址的动作，路径同样只从 Host 自己的 workspace registry 取。浏览器无法指定路径。 |
| **Client** | 向 `sidebarRightTabs` 注册一个 `notes` **页面类型**（不声明地址，永远不会抢走文件预览），并向 guide 页贡献一张「便签」入口卡片。页头显示便签所属的工作区，列表顶部是常驻的添加行，下面是便签块。工作区行的条数徽标写在该行标题元素的 `data-` 属性上，由插件自己的 CSS 规则绘制。 |

- 便签块是 `textarea`：停止输入 500ms 自动保存，失焦立即保存。
- 添加行常驻列表顶部；新便签创建后立刻聚焦，块出现在列表最上面。
- 每条便签可一键复制，或点「插入」把内容追加到输入框末尾（草稿非空时另起一行）；删除要点两次——第一次按钮变成「确认删除」，再点才真删，鼠标移开该行即撤销。
- 侧边栏的工作区行在名称后显示该工作区的笔记条数；没有笔记时不显示。
- 读取、保存失败都有可见的提示，读取失败可重试。

### 存储格式

```
<session workspace>/.dsh-notes/
├─ 1762750000000-3f2a9c1b.txt
└─ 1762750123456-aa77bb02.txt
```

- 文件名是 **创建时间（epoch 毫秒）+ 8 位随机十六进制**；内容就是这个文件本身，纯 UTF-8 文本。
- 倒序按文件名里的时间排，不按 mtime——编辑一条旧便签不会把它顶到最上面。
- 保存走同目录临时文件 + rename，失败不会留下半个便签。
- 单条上限 64 KiB；`.dsh-notes/` 里不匹配命名的文件会被忽略。

## 安装（本机）

profile 用的是 pnpm 的 `link:` 协议——**改完 `lib/` 刷新页面就生效**，不用重装：

```json
"dsh-sidebar-notes": "link:S:/local/share/repos/dsh-plugins/dsh-sidebar-notes"
```

首次接线：

```powershell
cd S:\local\app\deepseek-harness\content
node --import tsx/esm apps/cli/src/bin.ts plugin --profile web add S:\local\share\repos\dsh-plugins\dsh-sidebar-notes
```

`dsh plugin` 是 pnpm 的透传，装完会把包加进 profile 的 `dsh.profile.bundles`（这一步是 DSH 的 bundle reconcile 做的，
不是手改）。**重启 DSH** 后生效，浏览器再刷新一次。

卸载：

```powershell
node --import tsx/esm apps/cli/src/bin.ts plugin --profile web remove dsh-sidebar-notes
```

## 安装（别人）

包可以直接从仓库装，不需要先发 npm：

```powershell
dsh plugin --profile web add github:hm-dsh-plugins/dsh-sidebar-notes
```

`lib/` 是提交进仓库的，所以安装时不构建。装完重启 DSH；卸载时用包名 `dsh-sidebar-notes`。

也可以在插件市场的「管理索引源」里加一条自建源，让它在「发现」页出现并可一键安装——条目在 [hm-dsh-plugins/index](https://github.com/hm-dsh-plugins/index) 的 `index.json` 里，用它的 raw 地址即可。

## 开发

```powershell
cd S:\local\share\repos\dsh-plugins\dsh-sidebar-notes
npm install        # 只为 esbuild
npm run build      # src/ → lib/，两半都重建
npm run build:client
```

`lib/` 是构建产物，每个文件第一行都写着来源。浏览器那一半必须是
`window.__ModuleLoader__.load({ id, factory })` 形式（见 `scripts/build.mjs`），React 走平台模块表，
其余全部打包进来。

## 结构

```
dsh-sidebar-notes/
├─ package.json            # dsh.bundle.patch + dsh.client（platform: web）
├─ cordis.patch.yml        # 把这一层插进 profile
├─ lib/                    # 构建产物（生成，勿手改）
├─ src/index.js            # Host 入口：注册路由
├─ src/host/
│  ├─ protocol.js          # 路由路径、尺寸上限、错误码 → HTTP 状态
│  ├─ route.js             # 动作分发
│  ├─ workspace.js         # session → 工作区目录（唯一信任边界）；按 workspaceId 计数
│  └─ notes.js             # 便签文件：列表 / 新建 / 保存 / 删除 / 计数
├─ src/client/
│  ├─ index.js             # 注册类型、body、字典、工作区徽标
│  ├─ definition.js        # 类型定义（含 guide 入口）
│  ├─ NotesBody.jsx        # 页面：头部 + 便签块
│  ├─ use-notes.js         # 列表、草稿与保存时机
│  ├─ notes-api.js         # 浏览器端调用 Host 路由
│  ├─ workspace-badges.js  # 侧边栏工作区行的条数徽标
│  ├─ notes-styles.js      # 页面样式（dsh-notes-* 前缀）
│  ├─ NotesIcon.jsx        # 便签、加号、复制、插入、删除图标
│  └─ locales.js           # 中英文案
└─ scripts/build.mjs       # src/ → lib/
```

## 还没做

- 搜索、排序切换、置顶
- 富文本 / Markdown——现在刻意就是纯文本
