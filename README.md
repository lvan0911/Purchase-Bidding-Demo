# 采购竞价系统 Demo

一个基于 **Vue 3 + Vite + Ant Design Vue + TypeScript** 的采购竞价演示项目。涵盖采购需求发布、供应商报价、报价排名及中标确认的完整业务流程，当前阶段使用本地存储（localStorage）模拟后端数据，无需任何后端服务即可运行体验。

## 功能模块

| 模块 | 路由 | 说明 |
| ---- | ---- | ---- |
| 登录 | `/login` | 演示环境，任意用户名密码即可登录 |
| 采购需求发布 | `/purchase` | 历史需求列表（搜索 + 列表），支持新增/编辑/详情 |
| 需求发布编辑 | `/purchase/edit` | 基础信息 + 商品清单，需求单号自动生成（`XQ + 日期 + 序号`） |
| 供应商报价 | `/quotation` | 本人历史报价单列表（搜索 + 列表），仅展示当前登录用户的报价 |
| 报价编辑 | `/quotation/edit` | 上游需求信息只读，供应商逐行填写单价，截止前可多次编辑（报价单号 `BJ + 日期 + 序号` 自动生成） |
| 排名及采购确认 | `/confirm` | 报价截止后自动按金额从低到高排名，支持勾选或详情确认中标 |
| 用户管理 | `/user` | 用户增删改查，角色分管理员/采购员/供应商 |

### 核心业务规则

- **需求单号规则**：`XQ + 日期(YYYYMMDD) + 4位序号`，创建时自动生成，不可编辑
- **报价单号规则**：`BJ + 日期(YYYYMMDD) + 4位序号`，报价时自动生成，不可编辑
- **报价规则**：报价截止日期内可多次编辑报价；截止后禁止提交
- **排名规则**：报价截止前不排名、采购方不可见报价结果；截止后按报价金额从低到高自动排名，第一名标注"推荐中标"

## 技术栈

- [Vue 3.5](https://cn.vuejs.org/)（Composition API + `<script setup>`）
- [Vite 5](https://cn.vitejs.dev/)
- [Ant Design Vue 4](https://www.antdv.com/)
- [TypeScript 5.6](https://www.typescriptlang.org/)
- [Vue Router 4](https://router.vuejs.org/zh/)
- [Day.js](https://day.js.org/)

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5100）
npm run dev

# 生产构建
npm run build

# 本地预览构建产物
npm run preview
```

### 局域网访问

`vite.config.ts` 已配置 `host: true`，同一局域网内的同事可通过本机 IP 访问，例如：

```
http://192.168.x.x:5100
```

> 若无法访问，请在 Windows 防火墙中放行 Node.js 的"专用网络"入站连接。

## 项目结构

```
Purchase-Bidding-Demo/
├── index.html / vite.config.ts / tsconfig*.json / package.json
├── src/
│   ├── main.ts / App.vue          # 应用入口与根组件
│   ├── router/index.ts            # 路由配置 + 登录守卫
│   ├── types/index.ts             # 数据模型定义
│   ├── utils/storage.ts           # localStorage 数据层（需求/报价/中标/用户）
│   └── styles/global.css          # 全局样式
├── components/
│   └── AppLayout.vue              # 整体布局（顶栏导航 + 退出登录）
├── pages/
│   ├── login/index.vue            # 登录页
│   ├── purchase/index.vue         # 采购需求列表
│   ├── purchase/edit.vue          # 需求发布/编辑
│   ├── quotation/index.vue        # 供应商报价列表
│   ├── quotation/edit.vue         # 报价编辑
│   ├── confirm/index.vue          # 排名及采购确认
│   └── user/index.vue             # 用户管理
└── static/favicon.svg
```

## 演示流程

1. **发布需求**：采购员登录 → 采购需求发布 → 新增发布需求 → 填写基础信息与商品清单 → 发布
2. **供应商报价**：供应商登录 → 供应商报价 → 待报价需求 → 进入报价 → 填写确定交货日期与各商品单价 → 提交（截止前可多次修改）
3. **排名确认**：报价截止后，采购员进入排名及采购确认 → 查看自动排名 → 确认中标

> 提示：演示不同角色可分别用不同浏览器窗口登录；本地数据存于各浏览器 localStorage，互不影响。

## 说明

- 当前为第一阶段 Demo，数据全部存储在浏览器本地（localStorage），刷新不清空，清除浏览器缓存或换设备后数据丢失
- 未接入后端、数据库、ERP 接口，后续可平滑升级为真实 API
