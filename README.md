# triton-ascend PR 看板

[triton-lang/triton-ascend](https://github.com/triton-lang/triton-ascend) 社区仓库的 PR E2E 时长及 CI/CD 各项指标数据可视化看板，帮助维护者和贡献者直观了解 PR 从创建到合并的全流程效率，识别 CI 瓶颈，优化社区协作体验。

## 功能特性

### 概览看板

- **KPI 卡片**：E2E 时长（含 P50/P90 百分位）、排队时长（含 P50/P90）、PR 总数、Checks 通过率，附周环比趋势箭头
- **时长趋势图**：可切换 E2E 时长 / 排队时长 / Checks 总时长三种指标叠加对比，支持 P50/P90 参考线
- **CI 健康评分**：综合通过率(30%)、时长(25%)、稳定性(25%)、排队(20%) 四维度评分（0-100），自动检测 Flaky Check
- **Checks 任务总览**：表格+内联进度条，可按平均耗时/排队/通过率/运行次数/状态排序，展开查看 P50/P90、排队时长、迷你趋势图
- **失败分析**：区分 failure / timed_out / cancelled 三种失败类型，展示失败 Top N Check 及最近失败 PR
- **贡献者效能分布**：散点图展示各贡献者的 PR 数量、平均 E2E 时长、通过率

### PR 列表详情

- **可排序 PR 列表**：按 E2E 时长、排队时长、Checks 通过率等字段排序，显示分支信息
- **耗时分解时间线**：点击 PR 展开甘特图，分解排队等待、各 Checks 任务运行时段、合并节点

### 筛选与刷新

- **时间范围筛选**：当天 / 近一周 / 近一个月 / 近三个月
- **分支筛选**：所有分支 / 单个分支
- **自动刷新**：每 5 分钟自动拉取最新数据，页面不可见时暂停
- **GitHub Token 配置**：支持输入 Token 提升 API 配额

### 数据指标定义

| 指标 | 计算方式 | 数据来源 |
|------|----------|----------|
| E2E 时长 | PR 合并/关闭时间 − PR 创建时间 | Pull Requests API |
| 排队时长 | Workflow Run 的 `run_started_at` − `created_at` 的平均值 | Actions Runs API |
| 单 Check 排队时长 | 匹配的 Workflow Run 的 `run_started_at` − `created_at` | Actions Runs API |
| Checks 任务时长 | Check Run 的 `completed_at` − `started_at` | Check Runs API |
| Checks 通过率 | `conclusion=success` 的 Check 数 / 总 Check 数 | Check Runs API |
| CI 健康评分 | 通过率(30%) + 时长(25%) + 稳定性(25%) + 排队(20%) | 综合计算 |
| Flaky Check | 运行 ≥3 次且通过率在 50%-95% 之间的 Check | 综合计算 |

### 时序关系

```
Workflow创建      Runner启动执行         执行完成
(进入排队队列)    (出队列)
    |← 排队时长 →|←  运行时长   →|
    |            |                |
 created_at   run_started_at  completed_at

PR创建                                              PR合并
    |←──────────── E2E 时长 ──────────────────────→|
```

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

### 调用的 GitHub API

| API | 用途 |
|-----|------|
| `GET /repos/{owner}/{repo}/pulls` | 获取 PR 列表 |
| `GET /repos/{owner}/{repo}/commits/{sha}/check-runs` | 获取每个 PR 的 Check Runs |
| `GET /repos/{owner}/{repo}/actions/runs` | 获取 Workflow Runs（用于计算排队时长） |

## 环境要求

- **Node.js** ≥ 18（推荐 LTS 版本）
- **npm** ≥ 9（随 Node.js 一同安装）

> 项目也兼容 pnpm / yarn，可按个人偏好使用。

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/linxhy/triton-board.git
cd triton-board
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

看板通过 GitHub REST API 获取 `triton-lang/triton-ascend` 仓库的 PR、Check Runs 和 Workflow Runs 数据。未认证请求的速率限制为 **60 次/小时**，可能不足以加载完整数据。

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
│   └── index.ts                     # TypeScript 类型定义
├── utils/
│   ├── github-api.ts                # GitHub API 调用与指标计算
│   └── format.ts                    # 时长/日期/百分比/百分位格式化工具
├── store/
│   └── useAppStore.ts               # Zustand 全局状态（时间范围/分支/自动刷新）
├── components/
│   ├── Layout.tsx                   # 页面布局与导航栏
│   ├── KPICard.tsx                  # KPI 指标卡片（含趋势箭头）
│   ├── TokenConfig.tsx              # GitHub Token 配置面板
│   ├── TimeRangeSelector.tsx        # 时间范围选择器
│   ├── BranchSelector.tsx           # 分支选择器
│   ├── DurationTrendChart.tsx       # 时长趋势图（多指标+P50/P90参考线）
│   ├── CIHealthScore.tsx            # CI 健康评分环形图+维度条
│   ├── ChecksOverview.tsx           # Checks 任务总览表格
│   ├── FailureAnalysis.tsx          # 失败分析面板
│   ├── AuthorDistribution.tsx       # 贡献者效能散点图
│   ├── PRTable.tsx                  # PR 列表表格
│   └── PRTimeline.tsx               # PR 耗时分解时间线
├── pages/
│   ├── Dashboard.tsx                # 概览看板页
│   └── PRList.tsx                   # PR 列表详情页
├── App.tsx                          # 路由配置入口
├── main.tsx                         # 应用入口
└── index.css                        # 全局样式
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
