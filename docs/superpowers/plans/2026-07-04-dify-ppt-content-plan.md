# Dify PPT 案例内容生成计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 73 页 PPT 生成简洁的案例说明内容，包括场景、方案、效果

**架构：** 基于大纲 v2，为每个案例页面生成简洁说明，保存为 JSON 结构化数据，供 PPT 生成脚本使用

**技术栈：** JSON、PptxGenJS

---

## 文件结构

```
training-examples/
├── ppt-content/
│   └── slides.json              # 所有幻灯片内容（主文件）
└── generate-ppt-v3.js           # PPT 生成脚本
```

---

## 任务 1：创建 slides.json 主文件

**文件：**
- 创建：`training-examples/ppt-content/slides.json`

- [ ] **步骤 1：生成完整的 slides.json**

包含所有 73 页内容，案例使用简洁说明（场景、方案、效果）

- [ ] **步骤 2：保存文件**

保存到：`training-examples/ppt-content/slides.json`

- [ ] **步骤 3：Commit**

```bash
git add training-examples/ppt-content/slides.json
git commit -m "feat: add slides.json for PPT generation"
```

---

## 任务 2：创建 PPT 生成脚本 v3

**文件：**
- 创建：`generate-ppt-v3.js`

- [ ] **步骤 1：实现 PPT 生成脚本**

读取 slides.json，生成 PPT 文件

- [ ] **步骤 2：Commit**

```bash
git add generate-ppt-v3.js
git commit -m "feat: add PPT generation script v3"
```

---

## 任务 3：运行测试并验证

- [ ] **步骤 1：运行 PPT 生成脚本**

```bash
node generate-ppt-v3.js
```

预期：成功生成 `Dify-使用讲解-v3.pptx`

- [ ] **步骤 2：验证 PPT 内容**

检查：
- 所有 73 页是否生成
- 案例内容是否简洁明了
- 截图占位是否正确

- [ ] **步骤 3：Commit 最终版本**

```bash
git add -A
git commit -m "feat: complete PPT v3 with simplified case studies"
```

---

## 执行交接

计划已完成。

**两种执行方式：**

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

选哪种方式？
