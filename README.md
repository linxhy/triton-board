# triton-ascend PR 看板

[triton-lang/triton-ascend](https://github.com/triton-lang/triton-ascend) 社区仓库的 PR E2E 时长及 CI/CD 各项指标数据可视化看板，帮助维护者和贡献者直观了解 PR 从创建到合并的全流程效率，识别 CI 瓶颈，优化社区协作体验。

## 功能特性

### 概览看板

- **KPI 卡片**：平均 E2E 时长、平均排队时长、PR 总数、Checks 通过率
- **E2E 时长趋势图**：折线图展示近期 PR 的端到端总耗时变化
- **排队时长趋势图**：折线图展示 PR 等待首个 Check Run 启动的时长变化
- **Checks 任务时长分布**：堆叠柱状图展示各 Check 任务在每条 PR 中的耗时占比
- **Checks 任务平均耗时排行**：横向条形图展示各 Check 任务的平均耗时排名

### PR 列表详情

- **可排序 PR 列表**：按 E2E 时长、排队时长、Checks 通过率等字段排序
- **耗时分解时间线**：点击 PR 展开甘特图，分解排队等待、各 Checks 任务运行时段、合并节点

### 数据指标定义

| 指标 | 计算方式 |
|------|----------|
| E2E 时长 | PR 合并/关闭时间 − PR 创建时间 |
| 排队时长 | 首个 Check Run 的 started_at − PR 创建时间 |
| Checks 任务时长 | Check Run 的 completed_at − started_at |
| Checks 通过率 | conclusion=success 的 Check 数 / 总 Check 数 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| 样式方案 | Tailwind CSS 3 |
| 图表库 | Recharts |
| 状态管理 | Zustand |
| 路由 | React Router DOM |
| 图标 | Lucide React |
| 数据源 | GitHub REST API（纯前端，无需后端） |

## 环境要求

- **Node.js** ≥ 18（推荐 LTS 版本）
- **npm** ≥ 9（随 Node.js 一同安装）

> 项目也兼容 pnpm / yarn，可按个人偏好使用。

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/<your-username>/triton-lang.git
cd triton-lang
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

浏览器访问 [http://localhost:5173](http://localhost:5173) 即可查看看板。

### 4.（可选）配置 GitHub Token

看板通过 GitHub REST API 获取 `triton-lang/triton-ascend` 仓库的 PR 和 Check Runs 数据。未认证请求的速率限制为 **60 次/小时**，可能不足以加载完整数据。

在看板页面的 **GitHub Token** 输入框中填入 Personal Access Token，可将配额提升至 **5000 次/小时**。

**获取 Token：**

1. 访问 [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. 点击 **Generate new token (classic)**
3. 无需勾选任何权限（仅访问公开仓库数据）
4. 生成后复制 Token 到看板输入框即可

> Token 仅存储在浏览器 sessionStorage 中，关闭标签页后自动清除，不会发送到任何第三方服务。

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（支持热更新） |
| `npm run build` | 构建生产版本到 `dist/` 目录 |
| `npm run preview` | 本地预览生产构建 |
| `npm run check` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码质量检查 |

## 生产部署

项目为纯前端应用，构建后只需将 `dist/` 目录部署到任意静态文件服务器：

```bash
npm run build
```

部署方式示例：

- **Vercel**：连接 GitHub 仓库，自动构建部署
- **Netlify**：同上，设置构建命令为 `npm run build`，输出目录为 `dist`
- **Nginx**：将 `dist/` 目录内容复制到网站根目录

> 部署后需确保用户浏览器能正常访问 `api.github.com`。

## 项目结构

```
src/
├── types/
│   └── index.ts                  # TypeScript 类型定义
├── utils/
│   ├── github-api.ts             # GitHub API 调用与指标计算
│   └── format.ts                 # 时长/日期/百分比格式化工具
├── store/
│   └── useAppStore.ts            # Zustand 全局状态管理
├── components/
│   ├── Layout.tsx                # 页面布局与导航栏
│   ├── KPICard.tsx               # KPI 指标卡片
│   ├── TokenConfig.tsx           # GitHub Token 配置面板
│   ├── E2ETrendChart.tsx         # E2E 时长趋势折线图
│   ├── QueueTrendChart.tsx       # 排队时长趋势折线图
│   ├── ChecksDistributionChart.tsx  # Checks 任务时长分布图
│   ├── ChecksRankingChart.tsx       # Checks 任务平均耗时排行图
│   ├── PRTable.tsx               # PR 列表表格
│   └── PRTimeline.tsx            # PR 耗时分解时间线
├── pages/
│   ├── Dashboard.tsx             # 概览看板页
│   └── PRList.tsx                # PR 列表详情页
├── App.tsx                       # 路由配置入口
├── main.tsx                      # 应用入口
└── index.css                     # 全局样式
```

## 依赖说明

### 运行时依赖

| 依赖 | 用途 |
|------|------|
| react / react-dom | UI 框架 |
| react-router-dom | 客户端路由 |
| recharts | 图表渲染 |
| zustand | 轻量级状态管理 |
| lucide-react | 图标库 |
| clsx / tailwind-merge | 样式类名合并工具 |

### 开发依赖

| 依赖 | 用途 |
|------|------|
| typescript | 类型系统 |
| vite | 构建工具 |
| tailwindcss / postcss / autoprefixer | CSS 工具链 |
| eslint / typescript-eslint | 代码质量检查 |
| vite-tsconfig-paths | 路径别名支持 |

## License

MIT
