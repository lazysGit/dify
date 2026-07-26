const pptxgen = require("pptxgenjs");

// 阿里橙色风格配色
const COLORS = {
  primary: "FF6A00",      // 阿里橙
  primaryDark: "E55D00",  // 深橙
  primaryLight: "FF8533", // 浅橙
  dark: "1A1A1A",         // 深黑
  gray: "666666",         // 灰色
  lightGray: "F5F5F5",    // 浅灰
  white: "FFFFFF",        // 白色
  accent: "FFB366",       // 强调色
};

// 字体
const FONTS = {
  title: "Arial Black",
  body: "Calibri",
};

// 创建 PPT
let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Dify Team";
pres.title = "Dify 使用讲解";

// 创建橙色标题幻灯片母版
pres.defineSlideMaster({
  title: "TITLE_SLIDE",
  background: { color: COLORS.primary },
  objects: [
    { rect: { x: 0, y: 0, w: 10, h: 5.625, fill: { color: COLORS.primary } } },
  ],
});

// 创建内容幻灯片母版
pres.defineSlideMaster({
  title: "CONTENT_SLIDE",
  background: { color: COLORS.white },
  objects: [
    { rect: { x: 0, y: 0, w: 10, h: 0.08, fill: { color: COLORS.primary } } },
  ],
});

// 添加标题页
function addTitleSlide(title, subtitle) {
  let slide = pres.addSlide({ masterName: "TITLE_SLIDE" });
  slide.addText(title, {
    x: 0.5, y: 1.5, w: 9, h: 1.5,
    fontSize: 44, fontFace: FONTS.title,
    color: COLORS.white, bold: true, align: "center",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 3.2, w: 9, h: 0.8,
      fontSize: 20, fontFace: FONTS.body,
      color: COLORS.white, align: "center",
    });
  }
}

// 添加内容页
function addContentSlide(seq, title, content) {
  let slide = pres.addSlide({ masterName: "CONTENT_SLIDE" });
  slide.addText(`${seq}. ${title}`, {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28, fontFace: FONTS.title,
    color: COLORS.dark, bold: true,
  });
  if (Array.isArray(content)) {
    slide.addText(content.map((item, i) => ({
      text: item,
      options: { breakLine: true, bullet: true },
    })), {
      x: 0.5, y: 1.2, w: 9, h: 4,
      fontSize: 16, fontFace: FONTS.body,
      color: COLORS.gray,
    });
  } else {
    slide.addText(content, {
      x: 0.5, y: 1.2, w: 9, h: 4,
      fontSize: 16, fontFace: FONTS.body,
      color: COLORS.gray,
    });
  }
}

// 添加案例页
function addCaseSlide(seq, title, scene, steps) {
  let slide = pres.addSlide({ masterName: "CONTENT_SLIDE" });
  slide.addText(`${seq}. ${title}`, {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28, fontFace: FONTS.title,
    color: COLORS.dark, bold: true,
  });
  slide.addText(`场景：${scene}`, {
    x: 0.5, y: 1.2, w: 9, h: 0.5,
    fontSize: 18, fontFace: FONTS.body,
    color: COLORS.primary, bold: true,
  });
  slide.addText(steps.map((step, i) => ({
    text: `${i + 1}. ${step}`,
    options: { breakLine: true },
  })), {
    x: 0.5, y: 1.9, w: 9, h: 3.5,
    fontSize: 16, fontFace: FONTS.body,
    color: COLORS.gray,
  });
}

// ===== 第一部分：平台概览 =====
addTitleSlide("Dify 使用讲解", "平台概览");
addContentSlide(1, "Dify 是什么", [
  "开源的 LLM 应用开发平台",
  "可视化界面，快速构建 AI 应用",
  "支持工作流、Agent、RAG 等能力",
]);
addContentSlide(2, "核心功能", [
  "工作流 - 可视化编排 AI 流程",
  "Agent - 智能体能力",
  "RAG - 知识库检索增强生成",
  "模型管理 - 多模型统一接入",
  "LLMOps - 监控与优化",
  "API - 后端即服务",
]);
addContentSlide(3, "应用场景", [
  "客服机器人 - 7×24 小时自动问答",
  "内容生成 - 文案、翻译、摘要",
  "数据分析 - 自然语言查询数据",
  "知识问答 - 企业内部知识库",
]);
addContentSlide(4, "界面导览", [
  "控制台 - 应用管理入口",
  "应用列表 - 所有已创建应用",
  "知识库 - 文档管理",
  "工具 - 内置与自定义工具",
  "插件 - 扩展能力",
]);

// ===== 第二部分：模型配置 =====
addTitleSlide("模型配置", "接入 AI 模型");
addContentSlide(5, "支持的模型", [
  "OpenAI - GPT-4、GPT-3.5",
  "Claude - Anthropic 模型",
  "国产模型 - 通义、文心、智谱等",
  "本地部署 - Ollama、vLLM 等",
]);
addContentSlide(6, "API Key 配置", [
  "进入 设置 → 模型提供商",
  "选择模型提供商",
  "填入 API Key",
  "测试连接是否成功",
]);
addContentSlide(7, "模型选择建议", [
  "简单任务 - GPT-3.5（成本低）",
  "复杂推理 - GPT-4（能力强）",
  "中文场景 - 国产模型（优化好）",
  "敏感数据 - 本地部署（安全性高）",
]);
addContentSlide(8, "参数调优", [
  "Temperature - 控制随机性（0-1）",
  "Top-P - 控制采样范围",
  "Max Tokens - 控制输出长度",
  "建议：先用默认值，再逐步调优",
]);

// ===== 第三部分：普通智能体 =====
addTitleSlide("普通智能体", "基础 AI 对话能力");
addContentSlide(9, "什么是普通智能体", [
  "基于提示词的对话助手",
  "可关联知识库、添加工具",
  "适用于简单问答场景",
]);
addContentSlide(10, "创建流程", [
  '1. 点击"创建应用"',
  '2. 选择"聊天助手"',
  "3. 配置提示词和参数",
  "4. 测试并发布",
]);
addContentSlide(11, "系统提示词设计", [
  "角色设定 - 定义助手身份",
  "规则约束 - 设定行为边界",
  "输出格式 - 规范回答格式",
  "示例：你是法律助手，只回答基础法律问题",
]);
addContentSlide(12, "工具添加", [
  "内置工具 - 天气、搜索、计算等",
  "自定义工具 - 调用外部 API",
  "工具配置 - 参数映射",
]);
addCaseSlide(13, "案例：法律知识问答助手", "创建能回答基础法律问题的助手", [
  "创建普通智能体应用",
  "设置提示词：只回答基础法律问题，不回答具体案件",
  "测试：劳动合同到期不续签需要赔偿吗？",
  "测试边界：帮我打官司（应拒绝）",
]);
addContentSlide(14, "案例要点总结", [
  "提示词要明确角色和边界",
  "用规则约束避免越界",
  "测试边界情况很重要",
]);

// ===== 第四部分：工作流智能体 =====
addTitleSlide("工作流智能体", "可视化编排 AI 流程");
addContentSlide(15, "什么是工作流智能体", [
  "可视化编排多个 AI 步骤",
  "支持条件分支、循环、变量",
  "适用于复杂业务流程",
]);
addContentSlide(16, "工作流设计器", [
  "画布操作 - 拖拽节点、连线",
  "节点类型 - 开始、LLM、条件、变量、结束",
  "调试模式 - 单步执行、查看变量",
]);
addContentSlide(17, "节点类型", [
  "开始节点 - 定义输入变量",
  "LLM 节点 - 调用大模型",
  "条件节点 - if/else 分支",
  "变量节点 - 赋值、聚合",
  "结束节点 - 定义输出",
]);
addContentSlide(18, "变量传递", [
  "输入变量 - 从开始节点获取",
  "输出变量 - 传递给下一个节点",
  "变量引用 - 用 {{变量名}} 引用",
]);
addCaseSlide(19, "案例：信息提取助手", "从文本中提取关键信息", [
  "创建工作流智能体应用",
  "添加开始节点（输入：待提取的文本）",
  "添加 LLM 节点（提取姓名、日期、金额等）",
  "添加结束节点（输出 JSON 结果）",
]);
addContentSlide(20, "案例要点总结", [
  "LLM 节点提示词要明确输出格式",
  "用 JSON 格式便于后续处理",
  "变量传递是核心机制",
]);

// ===== 第五部分：Chatflow 智能体 =====
addTitleSlide("Chatflow 智能体", "多轮对话能力");
addContentSlide(21, "什么是 Chatflow", [
  "支持多轮对话的工作流",
  "自动管理上下文",
  "适用于需要追问的场景",
]);
addContentSlide(22, "对话流设计", [
  "多轮对话 - 自动保持上下文",
  "上下文传递 - 变量在对话间共享",
  "会话记忆 - 记住历史对话",
]);
addContentSlide(23, "上下文管理", [
  "会话 ID - 标识一次对话",
  "变量作用域 - 单轮 vs 多轮",
  "上下文窗口 - 控制历史长度",
]);
addContentSlide(24, "对话开场白", [
  "设置方法：在应用配置中设置",
  "引导设计：提示用户如何提问",
  "示例：你好，我是 XX 助手，请问有什么可以帮助你的？",
]);
addCaseSlide(25, "案例：多轮问答助手", "创建能记住上下文的对话助手", [
  "创建 Chatflow 智能体应用",
  "添加 LLM 节点（带上下文记忆）",
  "设置对话开场白",
  "测试：我叫张三 → 你还记得我叫什么吗？",
]);
addContentSlide(26, "案例要点总结", [
  "Chatflow 自动管理上下文",
  "适合需要追问的场景",
  "开场白可以引导用户",
]);

// ===== 第六部分：普通知识库 =====
addTitleSlide("普通知识库", "文档检索增强生成");
addContentSlide(27, "什么是知识库", [
  "上传文档，AI 可以检索回答",
  "RAG 原理：检索 + 生成",
  "适用于企业知识库、FAQ 等",
]);
addContentSlide(28, "创建知识库", [
  '1. 点击"创建知识库"',
  "2. 输入名称和描述",
  "3. 上传文档",
  "4. 配置分段策略",
]);
addContentSlide(29, "文档上传", [
  "支持格式：PDF、Word、TXT、Markdown",
  "大小限制：单文件 15MB",
  "批量上传：支持多文件同时上传",
]);
addContentSlide(30, "分段策略", [
  "自动分段 - 系统自动分割",
  "自定义分段 - 按分隔符分割",
  "分段长度 - 建议 500-800 字符",
]);
addContentSlide(31, "检索模式", [
  "语义检索 - 理解语义相似度",
  "关键词检索 - 精确匹配关键词",
  "混合检索 - 两者结合，效果最好",
]);
addCaseSlide(32, "案例：产品手册问答", "基于产品手册创建知识库", [
  "创建普通知识库",
  "上传产品手册 PDF",
  "设置分段策略（500 字符/段）",
  "测试召回：这个产品有哪些功能？",
]);
addContentSlide(33, "案例要点总结", [
  "分段长度影响召回效果",
  "混合检索通常效果最好",
  "测试召回是关键步骤",
]);

// ===== 第七部分：工作流知识库 =====
addTitleSlide("工作流知识库", "智能检索与重排序");
addContentSlide(34, "知识库检索节点", [
  "在工作流中添加知识库检索",
  "配置检索参数",
  "支持多知识库联合检索",
]);
addContentSlide(35, "检索策略", [
  "TopK - 返回最相关的 K 个结果",
  "Score 阈值 - 过滤低相关性结果",
  "重排序 - 用模型重新排序",
]);
addCaseSlide(36, "案例：智能问答工作流", "在工作流中使用知识库回答问题", [
  "创建工作流应用",
  "添加知识库检索节点",
  "关联之前创建的知识库",
  "添加 LLM 节点（基于检索结果回答）",
]);
addContentSlide(37, "案例要点总结", [
  "知识库检索可以独立使用",
  "重排序可以提升效果",
  "TopK 和阈值需要调优",
]);

// ===== 第八部分：API 集成 =====
addTitleSlide("API 集成", "对接业务系统");
addContentSlide(38, "后端即服务", [
  "Dify 提供完整的 REST API",
  "支持所有应用类型",
  "认证方式：API Key",
]);
addContentSlide(39, "获取 API 密钥", [
  "1. 进入应用设置",
  '2. 点击"API 访问"',
  "3. 创建 API Key",
  "4. 保存好密钥，只显示一次",
]);
addContentSlide(40, "API 调用示例", [
  "POST /v1/chat-messages",
  "Header: Authorization: Bearer {api_key}",
  "Body: { query: '你好', user: 'user-123' }",
  "返回：AI 回复内容",
]);
addContentSlide(41, "会话管理", [
  "会话 ID - conversation_id",
  "上下文保持 - 传入会话 ID 继续对话",
  "新会话 - 不传会话 ID 开始新对话",
]);
addCaseSlide(42, "案例：调用 Dify API", "通过 API 调用 Dify 应用", [
  "获取 API 密钥",
  "使用 curl 或 Postman 调用",
  "发送请求：你好",
  "查看返回结果",
]);
addContentSlide(43, "案例要点总结", [
  "API Key 要妥善保管",
  "会话 ID 用于保持上下文",
  "错误处理很重要",
]);

// ===== 第九部分：最佳实践 — 会议纪要助手 =====
addTitleSlide("最佳实践", "会议纪要助手");
addCaseSlide(44, "案例场景", "输入会议内容，输出结构化纪要", [
  "输入：今天开会讨论了 Q3 目标，张三负责销售，李四负责产品，下周三前提交方案",
  "输出：参会人、议题、结论、待办（结构化）",
]);
addContentSlide(45, "知识库准备", [
  "上传会议纪要模板",
  "模板包含：参会人、议题、结论、待办",
  "测试召回效果",
]);
addContentSlide(46, "工作流设计", [
  "开始节点：输入会议内容",
  "LLM 节点 1：提取关键信息",
  "LLM 节点 2：根据模板生成纪要",
  "结束节点：输出结构化纪要",
]);
addContentSlide(47, "智能体配置", [
  "关联知识库（会议纪要模板）",
  "设置提示词：按模板格式输出",
  "测试：输入会议内容，查看输出",
]);
addContentSlide(48, "API 集成", [
  "获取 API 密钥",
  "调用示例：生成纪要并保存",
  "集成到内部系统",
]);
addContentSlide(49, "最佳实践总结", [
  "提示词技巧：Few-shot、CoT",
  "性能优化：缓存热点问题",
  "成本控制：小模型处理简单问题",
  "安全考虑：敏感信息脱敏",
]);

// ===== 第十部分：总结 =====
addTitleSlide("总结", "回顾与展望");
addContentSlide(50, "内容回顾", [
  "7 个案例覆盖所有核心功能",
  "普通智能体、工作流、Chatflow",
  "普通知识库、工作流知识库",
  "API 集成、最佳实践",
]);
addContentSlide(51, "能力检查", [
  "能独立创建三种智能体",
  "能创建和管理知识库",
  "能通过 API 调用 Dify 应用",
  "了解最佳实践",
]);
addContentSlide(52, "后续学习资源", [
  "官方文档：docs.dify.ai",
  "社区：Discord、GitHub",
  "示例库：官方示例和社区案例",
]);
addContentSlide(53, "答疑环节", [
  "有任何问题欢迎提问",
]);
addTitleSlide("感谢参与", "Dify 使用讲解");

// 保存文件
pres.writeFile({ fileName: "docs/pptx/Dify-使用讲解.pptx" })
  .then(() => console.log("PPT 已生成：docs/pptx/Dify-使用讲解.pptx"))
  .catch(err => console.error("生成失败：", err));
