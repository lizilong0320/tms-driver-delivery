# 中通冷链司机TMS - 末端城配派送系统

## 项目介绍

轻量级末端城配司机派送管理系统，解决"承运商无系统、无面单"场景下的司机分单、配送、签收全流程管理。

### 核心功能

**后台管理端 (PC)**
- 数据看板：今日配送概览、近7日趋势图、司机排行榜、温层统计
- 运单管理：列表筛选、新增/编辑/删除、Excel批量导入、地址坐标解析
- 配送批次：手动创建批次（选运单选司机）、批次详情、路线展示
- 司机管理：司机CRUD、配送统计
- 系统设置：货主管理、仓库管理
- 纸质派送单：一键打印A4派送单

**司机端 (移动H5)**
- 任务列表：今日任务概览、配送顺序列表
- 配送详情：运单信息、导航、状态流转
- 三种签收方式：电子签名、拍照签收、代收签收
- 异常上报：拍照+说明
- 开始配送/完成配送

### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14 App Router |
| 语言 | TypeScript |
| UI (后台) | Tailwind CSS + shadcn/ui |
| UI (司机) | Tailwind CSS (移动端优化) |
| 数据库 | SQLite (Prisma ORM) |
| 图表 | Recharts |
| 认证 | JWT (jose) |
| Excel | xlsx |

## 本地运行步骤

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库（建表+种子数据）
npx prisma db push
npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed.ts

# 3. 启动开发服务器
npm run dev

# 4. 访问 http://localhost:3000
```

## 生产部署

```bash
# 构建
npm run build

# 启动
npm start
```

## 默认账号

| 角色 | 手机号 | 密码 |
|------|--------|------|
| 管理员 | 13800000000 | 123456 |
| 司机1 | 13900010001 | 123456 |
| 司机2 | 13900010002 | 123456 |

## 功能清单

### P0 (已完成)
- [x] 管理员登录
- [x] 运单列表 + 新增运单
- [x] 司机列表 + 新增司机
- [x] 手动创建配送批次
- [x] 司机端登录 + 任务列表
- [x] 司机端运单详情 + 导航
- [x] 拍照签收 + 电子签名
- [x] 异常上报
- [x] 后台查看配送进度和签收凭证
- [x] 纸质派送单打印

### P1 (已完成)
- [x] Excel批量导入运单
- [x] 数据看板
- [x] 货主管理、仓库管理

### P2 (待开发)
- [ ] 短信通知司机
- [ ] 货主自助查询页
- [ ] 司机绩效统计
- [ ] 温层拍照验证
- [ ] 代收货款管理
- [ ] 智能分单算法(K-Means)
- [ ] 高德地图路线规划

## Vercel部署步骤

1. GitHub仓库连接Vercel
2. 配置环境变量（见 .env.example）
3. Build Command: `prisma generate && prisma db push && next build`
4. 首次部署后访问 `/init` 初始化管理员账号

## 项目结构

```
driver-tms/
├── app/
│   ├── (admin)/          # 后台管理
│   │   ├── dashboard/    # 数据看板
│   │   ├── waybills/     # 运单管理
│   │   ├── batches/      # 配送批次
│   │   ├── drivers/      # 司机管理
│   │   └── settings/     # 系统设置
│   ├── (driver)/         # 司机端
│   │   ├── tasks/        # 任务列表
│   │   ├── task/[id]/    # 配送详情
│   │   └── sign/         # 签收页
│   ├── api/              # API接口
│   ├── login/            # 登录页
│   └── page.tsx          # 首页(自动跳转)
├── components/
│   ├── ui/               # shadcn/ui组件
│   ├── admin/            # 后台组件
│   └── driver/           # 司机端组件
├── lib/
│   ├── prisma.ts         # 数据库客户端
│   ├── auth.ts           # JWT认证
│   └── utils.ts          # 工具函数
├── prisma/
│   ├── schema.prisma     # 数据模型
│   └── seed.ts           # 种子数据
└── middleware.ts          # 认证中间件
```
