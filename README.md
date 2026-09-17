# 个人记账(Personal Ledger)

一款运行在 **Windows 和 Mac** 上的个人记账桌面应用 —— 随手记一笔,月底看清钱都花在哪。

数据全部保存在你自己的电脑上,离线可用,无需注册登录。

## ✨ 功能特性

- **记一笔**:输入金额(精确到分)、日期、两级分类,可填备注,一键入账
- **账目列表**:按月切换、按分类筛选、按备注关键字搜索;每笔账目可编辑、可删除(删除需二次确认)
- **两级分类体系**:内置 10 个一级大类 + 55 个二级小类,可自行增、删、改;删除分类前自动检查,避免产生"悬空"账目
- **统计图表**:
  - 本月总支出、笔数、日均支出统计卡
  - 按一级分类的支出占比饼图(附明细表)
  - 近 6 个月支出趋势柱状图(附明细表)
- 界面语言:简体中文

## 📦 数据存储

账目数据存放在本机 SQLite 单文件数据库中,拷贝该文件即完成备份:

- Windows:`文档\个人记账\ledger.db`

## 🛠 技术栈

| 类别 | 技术 |
| --- | --- |
| 应用框架 | Electron |
| 界面 | React + TypeScript + Ant Design |
| 图表 | ECharts |
| 数据存储 | SQLite(better-sqlite3) |
| 构建工具 | electron-vite + electron-builder |

## 🚀 开发与构建

环境要求:Node.js 20 及以上、npm

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建安装包(在对应操作系统上执行)
npm run pack:win   # Windows:生成安装器 + 绿色免安装版
npm run pack:mac   # macOS:生成 dmg 安装包
```

构建产物位于 `dist/` 目录。

## 📂 项目结构

```
src/
├── main/      # 主进程(窗口管理、数据库操作)
├── preload/   # 安全通道(界面与主进程之间的桥梁)
├── renderer/  # 界面(React + Ant Design + ECharts)
└── shared/    # 主进程与界面共享的类型定义
scripts/       # 启动代理脚本
```

## 📝 开发文档

项目设计文档、技术决策记录与开发计划见 [CLAUDE.md](./CLAUDE.md)。
