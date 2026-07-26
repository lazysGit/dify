const pptxgen = require("pptxgenjs");

// 阿里橙色主题
const COLORS = {
  primary: "FF6A00",      // 阿里橙
  primaryDark: "E05D00",  // 深橙
  primaryLight: "FF8533", // 浅橙
  accent: "FFB380",       // 更浅橙
  dark: "1A1A2E",         // 深色背景
  darkGray: "2D2D44",     // 深灰
  gray: "666666",         // 灰色
  lightGray: "F5F5F5",    // 浅灰
  white: "FFFFFF",
  text: "333333",
  textLight: "666666",
};

// 字体
const FONTS = {
  title: "Arial Black",
  body: "Arial",
};

// 创建阴影
function makeShadow() {
  return { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15 };
}

// 创建带有橙色装饰条的卡片
function addCard(slide, x, y, w, h, accentColor = COLORS.primary) {
  slide.addShape(slide._slideLayout ? "rect" : "rect", {
    x, y, w, h,
    fill: { color: COLORS.white },
    shadow: makeShadow(),
  });
  slide.addShape("rect", {
    x, y, w: 0.08, h,
    fill: { color: accentColor },
  });
}

// 创建标题页
function addTitleSlide(pres, title, subtitle) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.dark };
  
  // 装饰条
  slide.addShape("rect", {
    x: 0, y: 2.2, w: 1.5, h: 0.08,
    fill: { color: COLORS.primary },
  });
  
  slide.addText(title, {
    x: 0.5, y: 1.5, w: 9, h: 1.5,
    fontSize: 44, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  
  slide.addText(subtitle, {
    x: 0.5, y: 3.2, w: 9, h: 1,
    fontSize: 18, fontFace: FONTS.body, color: COLORS.accent,
    align: "left", valign: "top",
  });
  
  return slide;
}

// 创建章节分隔页
function addSectionSlide(pres, sectionNumber, sectionTitle) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.primary };
  
  slide.addText(`第${sectionNumber}部分`, {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 20, fontFace: FONTS.body, color: COLORS.white,
    align: "left", valign: "middle",
  });
  
  slide.addText(sectionTitle, {
    x: 0.5, y: 2.3, w: 9, h: 1.5,
    fontSize: 36, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  
  return slide;
}

// 创建内容页（带序号）
function addContentSlide(pres, slideNumber, title, content, imagePlaceholder = null) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };
  
  // 顶部橙色条
  slide.addShape("rect", {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: COLORS.primary },
  });
  
  // 序号和标题
  slide.addText(`${slideNumber}. ${title}`, {
    x: 0.5, y: 0.3, w: 9, h: 0.8,
    fontSize: 28, fontFace: FONTS.title, color: COLORS.dark,
    bold: true, align: "left", valign: "middle",
  });
  
  // 分隔线
  slide.addShape("rect", {
    x: 0.5, y: 1.1, w: 2, h: 0.04,
    fill: { color: COLORS.primary },
  });
  
  // 内容区域
  if (typeof content === "string") {
    slide.addText(content, {
      x: 0.5, y: 1.4, w: imagePlaceholder ? 5.5 : 9, h: 4,
      fontSize: 16, fontFace: FONTS.body, color: COLORS.text,
      align: "left", valign: "top",
      lineSpacingMultiple: 1.5,
    });
  } else if (Array.isArray(content)) {
    slide.addText(content, {
      x: 0.5, y: 1.4, w: imagePlaceholder ? 5.5 : 9, h: 4,
      fontSize: 16, fontFace: FONTS.body, color: COLORS.text,
      align: "left", valign: "top",
      lineSpacingMultiple: 1.5,
    });
  }
  
  // 图片占位
  if (imagePlaceholder) {
    slide.addShape("rect", {
      x: 6.3, y: 1.4, w: 3.2, h: 3.5,
      fill: { color: COLORS.lightGray },
      line: { color: COLORS.gray, width: 1, dashType: "dash" },
    });
    slide.addText(`[图片占位]\n${imagePlaceholder}`, {
      x: 6.3, y: 1.4, w: 3.2, h: 3.5,
      fontSize: 12, fontFace: FONTS.body, color: COLORS.gray,
      align: "center", valign: "middle",
    });
  }
  
  return slide;
}

// 创建带卡片的内容页
function addCardSlide(pres, slideNumber, title, cards) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.lightGray };
  
  // 顶部橙色条
  slide.addShape("rect", {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: COLORS.primary },
  });
  
  // 序号和标题
  slide.addText(`${slideNumber}. ${title}`, {
    x: 0.5, y: 0.3, w: 9, h: 0.8,
    fontSize: 28, fontFace: FONTS.title, color: COLORS.dark,
    bold: true, align: "left", valign: "middle",
  });
  
  // 分隔线
  slide.addShape("rect", {
    x: 0.5, y: 1.1, w: 2, h: 0.04,
    fill: { color: COLORS.primary },
  });
  
  // 卡片
  const cardWidth = (9 - (cards.length - 1) * 0.3) / cards.length;
  cards.forEach((card, index) => {
    const x = 0.5 + index * (cardWidth + 0.3);
    addCard(slide, x, 1.4, cardWidth, 3.8, card.color || COLORS.primary);
    
    slide.addText(card.title, {
      x: x + 0.15, y: 1.6, w: cardWidth - 0.3, h: 0.6,
      fontSize: 16, fontFace: FONTS.title, color: COLORS.dark,
      bold: true, align: "left", valign: "middle",
    });
    
    slide.addText(card.content, {
      x: x + 0.15, y: 2.3, w: cardWidth - 0.3, h: 2.8,
      fontSize: 13, fontFace: FONTS.body, color: COLORS.text,
      align: "left", valign: "top",
      lineSpacingMultiple: 1.4,
    });
  });
  
  return slide;
}

// 创建案例页
function addCaseSlide(pres, slideNumber, title, scenario, solution, result, imagePlaceholder = null) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };
  
  // 顶部橙色条
  slide.addShape("rect", {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: COLORS.primary },
  });
  
  // 序号和标题
  slide.addText(`${slideNumber}. ${title}`, {
    x: 0.5, y: 0.3, w: 9, h: 0.8,
    fontSize: 28, fontFace: FONTS.title, color: COLORS.dark,
    bold: true, align: "left", valign: "middle",
  });
  
  // 分隔线
  slide.addShape("rect", {
    x: 0.5, y: 1.1, w: 2, h: 0.04,
    fill: { color: COLORS.primary },
  });
  
  // 场景卡片
  addCard(slide, 0.5, 1.4, 2.8, 3.8, COLORS.primary);
  slide.addText("场景", {
    x: 0.65, y: 1.6, w: 2.5, h: 0.5,
    fontSize: 14, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText(scenario, {
    x: 0.65, y: 2.1, w: 2.5, h: 3,
    fontSize: 12, fontFace: FONTS.body, color: COLORS.white,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.4,
  });
  
  // 解决方案卡片
  addCard(slide, 3.6, 1.4, 2.8, 3.8, COLORS.primaryDark);
  slide.addText("解决方案", {
    x: 3.75, y: 1.6, w: 2.5, h: 0.5,
    fontSize: 14, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText(solution, {
    x: 3.75, y: 2.1, w: 2.5, h: 3,
    fontSize: 12, fontFace: FONTS.body, color: COLORS.white,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.4,
  });
  
  // 结果卡片
  addCard(slide, 6.7, 1.4, 2.8, 3.8, COLORS.primaryLight);
  slide.addText("效果", {
    x: 6.85, y: 1.6, w: 2.5, h: 0.5,
    fontSize: 14, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText(result, {
    x: 6.85, y: 2.1, w: 2.5, h: 3,
    fontSize: 12, fontFace: FONTS.body, color: COLORS.white,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.4,
  });
  
  return slide;
}

// 创建总结页
function addSummarySlide(pres, title, items) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.dark };
  
  slide.addText(title, {
    x: 0.5, y: 0.5, w: 9, h: 1,
    fontSize: 32, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  
  // 分隔线
  slide.addShape("rect", {
    x: 0.5, y: 1.5, w: 2, h: 0.04,
    fill: { color: COLORS.primary },
  });
  
  slide.addText(items, {
    x: 0.5, y: 1.8, w: 9, h: 3.5,
    fontSize: 16, fontFace: FONTS.body, color: COLORS.accent,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.5,
  });
  
  return slide;
}

// 主函数
async function generatePPT() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dify";
  pres.title = "Dify 使用讲解";
  
  // ==================== 第一部分：平台概览 ====================
  
  // 封面
  addTitleSlide(pres, "Dify 使用讲解", "从入门到精通的完整指南");
  
  // 第一部分分隔页
  addSectionSlide(pres, "一", "平台概览");
  
  // 1. Dify 是什么
  addContentSlide(pres, 1, "Dify 是什么", [
    { text: "Dify 是一个开源的 LLM 应用开发平台，", options: { breakLine: true } },
    { text: "帮助开发者快速构建和部署 AI 应用。", options: { breakLine: true, bullet: true } },
    { text: "", options: { breakLine: true } },
    { text: "核心价值：", options: { bold: true, breakLine: true } },
    { text: "降低 AI 应用开发门槛", options: { bullet: true, breakLine: true } },
    { text: "提供可视化的工作流编排", options: { bullet: true, breakLine: true } },
    { text: "集成主流 LLM 模型", options: { bullet: true, breakLine: true } },
    { text: "内置 RAG 知识库能力", options: { bullet: true, breakLine: true } },
    { text: "完整的 API 和 SDK 支持", options: { bullet: true } },
  ], "Dify 官网首页截图");
  
  // 2. 核心功能
  addCardSlide(pres, 2, "核心功能", [
    { title: "工作流", content: "可视化流程编排\n节点拖拽连线\n条件分支控制\n变量传递管理", color: COLORS.primary },
    { title: "Agent", content: "智能体创建\n工具调用能力\n自主决策推理\n多步骤任务", color: COLORS.primaryDark },
    { title: "RAG", content: "知识库管理\n文档分段检索\n语义搜索\n混合检索模式", color: COLORS.primaryLight },
    { title: "LLMOps", content: "日志监控\n性能分析\n标注优化\n持续改进", color: COLORS.accent },
  ]);
  
  // 3. 应用场景
  addCardSlide(pres, 3, "应用场景", [
    { title: "智能客服", content: "自动问答\n意图识别\n多轮对话\n知识库支持", color: COLORS.primary },
    { title: "内容生成", content: "文案撰写\n翻译摘要\n报告生成\n创意写作", color: COLORS.primaryDark },
    { title: "数据分析", content: "数据提取\n信息整理\n报表生成\n趋势分析", color: COLORS.primaryLight },
    { title: "知识问答", content: "文档查询\n产品手册\n技术支持\n培训助手", color: COLORS.accent },
  ]);
  
  // 4. 界面导览
  addContentSlide(pres, 4, "界面导览", [
    { text: "控制台主界面包含以下核心模块：", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "• 应用列表：查看和管理所有创建的应用", options: { breakLine: true } },
    { text: "• 知识库：上传文档、管理知识库", options: { breakLine: true } },
    { text: "• 工具：配置内置工具和自定义工具", options: { breakLine: true } },
    { text: "• 插件：安装和管理扩展插件", options: { breakLine: true } },
    { text: "• 探索：浏览社区分享的应用模板", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "建议：首次使用时，先浏览各个模块熟悉界面布局", options: { italic: true } },
  ], "Dify 控制台主界面截图");
  
  // 5. 账户与设置
  addContentSlide(pres, 5, "账户与设置", [
    { text: "设置页面提供以下配置功能：", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "• 模型供应商：配置 OpenAI、Claude 等模型 API", options: { breakLine: true } },
    { text: "• 成员管理：邀请团队成员、设置权限", options: { breakLine: true } },
    { text: "• 计费管理：查看用量、管理订阅", options: { breakLine: true } },
    { text: "• 数据源：配置外部数据连接", options: { breakLine: true } },
    { text: "• API 扩展：管理第三方 API 集成", options: { breakLine: true } },
    { text: "• 自定义：设置 Logo、品牌定制", options: { breakLine: true } },
    { text: "• 语言：切换界面语言（支持 23 种语言）", options: { breakLine: true } },
  ], "账户设置页面截图");
  
  // ==================== 第二部分：模型配置 ====================
  
  addSectionSlide(pres, "二", "模型配置");
  
  // 6. 支持的模型
  addCardSlide(pres, 6, "支持的模型", [
    { title: "OpenAI", content: "GPT-4\nGPT-4o\nGPT-3.5-Turbo\nDALL-E", color: COLORS.primary },
    { title: "Claude", content: "Claude 3.5 Sonnet\nClaude 3 Opus\nClaude 3 Haiku", color: COLORS.primaryDark },
    { title: "国产模型", content: "通义千问\n文心一言\n智谱清言\n讯飞星火", color: COLORS.primaryLight },
    { title: "本地部署", content: "Llama 3\nMistral\nQwen\nOpenAI 兼容", color: COLORS.accent },
  ]);
  
  // 7. API Key 配置
  addContentSlide(pres, 7, "API Key 配置", [
    { text: "配置模型 API Key 的步骤：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 进入 设置 → 模型供应商", options: { breakLine: true } },
    { text: "2. 选择对应的模型供应商", options: { breakLine: true } },
    { text: "3. 点击「添加」按钮", options: { breakLine: true } },
    { text: "4. 输入 API Key", options: { breakLine: true } },
    { text: "5. 点击「保存」完成配置", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "常见问题：", options: { bold: true, breakLine: true } },
    { text: "• API Key 无效：检查是否复制完整", options: { breakLine: true } },
    { text: "• 余额不足：检查账户余额", options: { breakLine: true } },
    { text: "• 网络问题：确认网络连接正常", options: { breakLine: true } },
  ], "API Key 配置页面截图");
  
  // 8. 模型选择建议
  addContentSlide(pres, 8, "模型选择建议", [
    { text: "根据场景选择合适的模型：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "对话场景（客服、问答）：", options: { bold: true, breakLine: true } },
    { text: "• 推荐：GPT-4o、Claude 3.5 Sonnet", options: { bullet: true, breakLine: true } },
    { text: "• 理由：响应速度快、成本适中", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "内容生成（写作、翻译）：", options: { bold: true, breakLine: true } },
    { text: "• 推荐：GPT-4、Claude 3 Opus", options: { bullet: true, breakLine: true } },
    { text: "• 理由：生成质量高、逻辑性强", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "成本敏感场景：", options: { bold: true, breakLine: true } },
    { text: "• 推荐：GPT-3.5-Turbo、Claude 3 Haiku", options: { bullet: true, breakLine: true } },
    { text: "• 理由：性价比高、适合批量处理", options: { bullet: true } },
  ]);
  
  // 9. 参数调优
  addContentSlide(pres, 9, "参数调优", [
    { text: "关键参数说明：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "Temperature（温度）", options: { bold: true, breakLine: true } },
    { text: "• 范围：0-2", options: { bullet: true, breakLine: true } },
    { text: "• 低值（0-0.3）：输出更确定、适合事实问答", options: { bullet: true, breakLine: true } },
    { text: "• 高值（0.7-1.2）：输出更随机、适合创意写作", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "Top-P（核采样）", options: { bold: true, breakLine: true } },
    { text: "• 范围：0-1", options: { bullet: true, breakLine: true } },
    { text: "• 控制词汇选择的多样性", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "Max Tokens（最大令牌数）", options: { bold: true, breakLine: true } },
    { text: "• 控制生成文本的最大长度", options: { bullet: true, breakLine: true } },
    { text: "• 根据实际需求设置，避免浪费", options: { bullet: true } },
  ]);
  
  // ==================== 第三部分：应用类型概览 ====================
  
  addSectionSlide(pres, "三", "应用类型概览");
  
  // 10. 五种应用类型
  addCardSlide(pres, 10, "五种应用类型", [
    { title: "Chatbot", content: "聊天助手\n多轮对话\n上下文记忆", color: COLORS.primary },
    { title: "Completion", content: "文本生成\n单次输入输出\n适合批处理", color: COLORS.primaryDark },
    { title: "Agent", content: "智能体\n工具调用\n自主决策", color: COLORS.primaryLight },
    { title: "Workflow", content: "工作流\n流程编排\n条件分支", color: COLORS.accent },
  ]);
  
  // 11. Chatbot
  addContentSlide(pres, 11, "Chatbot（聊天助手）", [
    { text: "定义：", options: { bold: true, breakLine: true } },
    { text: "多轮对话应用，支持上下文记忆", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "特点：", options: { bold: true, breakLine: true } },
    { text: "• 支持多轮对话", options: { bullet: true, breakLine: true } },
    { text: "• 自动维护上下文", options: { bullet: true, breakLine: true } },
    { text: "• 可配置开场白", options: { bullet: true, breakLine: true } },
    { text: "• 支持推荐问题", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "适用场景：", options: { bold: true, breakLine: true } },
    { text: "• 智能客服", options: { bullet: true, breakLine: true } },
    { text: "• 知识问答", options: { bullet: true, breakLine: true } },
    { text: "• 产品咨询", options: { bullet: true } },
  ], "Chatbot 界面截图");
  
  // 12. Completion
  addContentSlide(pres, 12, "Completion（文本生成）", [
    { text: "定义：", options: { bold: true, breakLine: true } },
    { text: "单次文本生成应用，输入-输出模式", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "特点：", options: { bold: true, breakLine: true } },
    { text: "• 单次输入，单次输出", options: { bullet: true, breakLine: true } },
    { text: "• 支持变量输入", options: { bullet: true, breakLine: true } },
    { text: "• 适合批量处理", options: { bullet: true, breakLine: true } },
    { text: "• 响应速度快", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "适用场景：", options: { bold: true, breakLine: true } },
    { text: "• 文本翻译", options: { bullet: true, breakLine: true } },
    { text: "• 内容摘要", options: { bullet: true, breakLine: true } },
    { text: "• 文案生成", options: { bullet: true, breakLine: true } },
    { text: "• 数据提取", options: { bullet: true } },
  ], "Completion 界面截图");
  
  // 13. Agent
  addContentSlide(pres, 13, "Agent（智能体）", [
    { text: "定义：", options: { bold: true, breakLine: true } },
    { text: "具备推理和工具调用能力的智能体", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "特点：", options: { bold: true, breakLine: true } },
    { text: "• 自主决策能力", options: { bullet: true, breakLine: true } },
    { text: "• 工具调用（搜索、计算、API）", options: { bullet: true, breakLine: true } },
    { text: "• 多步骤任务处理", options: { bullet: true, breakLine: true } },
    { text: "• 推理链展示", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "适用场景：", options: { bold: true, breakLine: true } },
    { text: "• 复杂问答", options: { bullet: true, breakLine: true } },
    { text: "• 数据分析", options: { bullet: true, breakLine: true } },
    { text: "• 自动化任务", options: { bullet: true } },
  ], "Agent 界面截图");
  
  // 14. Workflow
  addContentSlide(pres, 14, "Workflow（工作流）", [
    { text: "定义：", options: { bold: true, breakLine: true } },
    { text: "可视化流程编排应用", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "特点：", options: { bold: true, breakLine: true } },
    { text: "• 拖拽式节点编排", options: { bullet: true, breakLine: true } },
    { text: "• 条件分支控制", options: { bullet: true, breakLine: true } },
    { text: "• 变量传递管理", options: { bullet: true, breakLine: true } },
    { text: "• 支持循环和并行", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "适用场景：", options: { bold: true, breakLine: true } },
    { text: "• 数据处理流程", options: { bullet: true, breakLine: true } },
    { text: "• 自动化工作流", options: { bullet: true, breakLine: true } },
    { text: "• 多步骤任务", options: { bullet: true } },
  ], "Workflow 界面截图");
  
  // 15. Chatflow
  addContentSlide(pres, 15, "Chatflow（对话流）", [
    { text: "定义：", options: { bold: true, breakLine: true } },
    { text: "基于工作流的对话应用", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "特点：", options: { bold: true, breakLine: true } },
    { text: "• 多轮对话能力", options: { bullet: true, breakLine: true } },
    { text: "• 流程控制", options: { bullet: true, breakLine: true } },
    { text: "• 上下文管理", options: { bullet: true, breakLine: true } },
    { text: "• 复杂对话场景支持", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "适用场景：", options: { bold: true, breakLine: true } },
    { text: "• 复杂客服场景", options: { bullet: true, breakLine: true } },
    { text: "• 多步骤引导", options: { bullet: true, breakLine: true } },
    { text: "• 条件对话流程", options: { bullet: true } },
  ], "Chatflow 界面截图");
  
  // ==================== 第四部分：普通智能体 ====================
  
  addSectionSlide(pres, "四", "普通智能体");
  
  // 16. 什么是普通智能体
  addContentSlide(pres, 16, "什么是普通智能体", [
    { text: "普通智能体是 Dify 中最基础的智能体类型，", options: { breakLine: true } },
    { text: "通过系统提示词定义角色和行为。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "核心特点：", options: { bold: true, breakLine: true } },
    { text: "• 基于提示词的角色设定", options: { bullet: true, breakLine: true } },
    { text: "• 支持添加工具", options: { bullet: true, breakLine: true } },
    { text: "• 可关联知识库", options: { bullet: true, breakLine: true } },
    { text: "• 简单易用", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "适用场景：", options: { bold: true, breakLine: true } },
    { text: "• 简单问答", options: { bullet: true, breakLine: true } },
    { text: "• 角色扮演", options: { bullet: true, breakLine: true } },
    { text: "• 知识问答", options: { bullet: true } },
  ]);
  
  // 17. 创建流程
  addContentSlide(pres, 17, "创建流程", [
    { text: "创建普通智能体的步骤：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 1：选择应用类型", options: { bold: true, breakLine: true } },
    { text: "• 点击「创建应用」→ 选择「Agent」", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 2：配置基本信息", options: { bold: true, breakLine: true } },
    { text: "• 输入应用名称", options: { bullet: true, breakLine: true } },
    { text: "• 添加应用描述", options: { bullet: true, breakLine: true } },
    { text: "• 选择应用图标", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 3：配置智能体", options: { bold: true, breakLine: true } },
    { text: "• 编写系统提示词", options: { bullet: true, breakLine: true } },
    { text: "• 选择模型", options: { bullet: true, breakLine: true } },
    { text: "• 添加工具（可选）", options: { bullet: true, breakLine: true } },
    { text: "• 关联知识库（可选）", options: { bullet: true } },
  ], "创建流程截图");
  
  // 18. 系统提示词设计
  addContentSlide(pres, 18, "系统提示词设计", [
    { text: "系统提示词是智能体的「灵魂」，决定其行为。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "设计要点：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 角色设定", options: { bold: true, breakLine: true } },
    { text: "• 明确定义智能体的角色", options: { bullet: true, breakLine: true } },
    { text: "• 例如：「你是一个专业的法律知识问答助手」", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 规则约束", options: { bold: true, breakLine: true } },
    { text: "• 设定行为边界", options: { bullet: true, breakLine: true } },
    { text: "• 例如：「只回答基础法律知识问题」", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 输出格式", options: { bold: true, breakLine: true } },
    { text: "• 指定回答格式", options: { bullet: true, breakLine: true } },
    { text: "• 例如：「回答后提醒用户咨询专业律师」", options: { bullet: true } },
  ]);
  
  // 19. 工具添加
  addContentSlide(pres, 19, "工具添加", [
    { text: "工具扩展智能体的能力边界。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "内置工具：", options: { bold: true, breakLine: true } },
    { text: "• 搜索引擎（Google、Bing）", options: { bullet: true, breakLine: true } },
    { text: "• 图片生成（DALL-E、Stable Diffusion）", options: { bullet: true, breakLine: true } },
    { text: "• 数学计算（Wolfram Alpha）", options: { bullet: true, breakLine: true } },
    { text: "• 网页抓取", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "自定义工具：", options: { bold: true, breakLine: true } },
    { text: "• 通过 API 定义工具", options: { bullet: true, breakLine: true } },
    { text: "• 配置请求参数", options: { bullet: true, breakLine: true } },
    { text: "• 解析返回结果", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "建议：根据实际需求选择工具，避免过度配置", options: { italic: true } },
  ]);
  
  // 20. 案例演示
  addCaseSlide(pres, 20, "案例演示：法律知识问答助手", 
    "用户需要一个能够回答基础法律知识的助手，帮助普通大众了解法律常识。",
    "创建一个普通智能体，设置系统提示词定义角色为法律知识问答助手，添加规则约束只回答基础问题。",
    "用户可以快速获取法律知识，同时系统会提醒咨询专业律师，避免误导。"
  );
  
  // 21. 案例要点总结
  addContentSlide(pres, 21, "案例要点总结", [
    { text: "提示词设计技巧：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 明确角色定位", options: { bold: true, breakLine: true } },
    { text: "• 「你是一个法律知识问答助手」", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 设定行为边界", options: { bold: true, breakLine: true } },
    { text: "• 「只回答基础法律知识问题」", options: { bullet: true, breakLine: true } },
    { text: "• 「不回答涉及具体案件的问题」", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 指定输出格式", options: { bold: true, breakLine: true } },
    { text: "• 「回答后提醒用户咨询专业律师」", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 边界处理", options: { bold: true, breakLine: true } },
    { text: "• 测试边界问题，确保智能体能正确拒绝", options: { bullet: true, breakLine: true } },
    { text: "• 提供友好的拒绝提示", options: { bullet: true } },
  ]);
  
  // ==================== 第五部分：工作流智能体 ====================
  
  addSectionSlide(pres, "五", "工作流智能体");
  
  // 22. 什么是工作流智能体
  addContentSlide(pres, 22, "什么是工作流智能体", [
    { text: "工作流智能体通过可视化流程编排实现复杂逻辑。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "与普通智能体的区别：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "普通智能体：", options: { bold: true, breakLine: true } },
    { text: "• 基于提示词", options: { bullet: true, breakLine: true } },
    { text: "• 单次调用", options: { bullet: true, breakLine: true } },
    { text: "• 逻辑简单", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "工作流智能体：", options: { bold: true, breakLine: true } },
    { text: "• 可视化编排", options: { bullet: true, breakLine: true } },
    { text: "• 多节点协作", options: { bullet: true, breakLine: true } },
    { text: "• 复杂逻辑", options: { bullet: true, breakLine: true } },
    { text: "• 条件分支", options: { bullet: true } },
  ]);
  
  // 23. 工作流设计器
  addContentSlide(pres, 23, "工作流设计器", [
    { text: "工作流设计器提供可视化编排能力。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "核心操作：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "画布操作：", options: { bold: true, breakLine: true } },
    { text: "• 拖拽节点到画布", options: { bullet: true, breakLine: true } },
    { text: "• 连接节点形成流程", options: { bullet: true, breakLine: true } },
    { text: "• 缩放和移动画布", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "节点配置：", options: { bold: true, breakLine: true } },
    { text: "• 双击节点打开配置", options: { bullet: true, breakLine: true } },
    { text: "• 设置输入输出变量", options: { bullet: true, breakLine: true } },
    { text: "• 配置节点参数", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "调试功能：", options: { bold: true, breakLine: true } },
    { text: "• 单节点调试", options: { bullet: true, breakLine: true } },
    { text: "• 整体运行", options: { bullet: true, breakLine: true } },
    { text: "• 查看执行日志", options: { bullet: true } },
  ], "工作流设计器截图");
  
  // 24. 节点类型
  addCardSlide(pres, 24, "节点类型", [
    { title: "开始节点", content: "流程起点\n定义输入变量\n接收用户输入", color: COLORS.primary },
    { title: "LLM 节点", content: "调用大模型\n配置提示词\n处理文本", color: COLORS.primaryDark },
    { title: "条件节点", content: "分支判断\n条件路由\n流程控制", color: COLORS.primaryLight },
    { title: "结束节点", content: "流程终点\n定义输出\n返回结果", color: COLORS.accent },
  ]);
  
  // 25. 变量传递
  addContentSlide(pres, 25, "变量传递", [
    { text: "变量是工作流中数据传递的核心。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "变量类型：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "输入变量：", options: { bold: true, breakLine: true } },
    { text: "• 从用户输入获取", options: { bullet: true, breakLine: true } },
    { text: "• 定义在开始节点", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "输出变量：", options: { bold: true, breakLine: true } },
    { text: "• 从节点输出", options: { bullet: true, breakLine: true } },
    { text: "• 传递给下游节点", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "变量引用：", options: { bold: true, breakLine: true } },
    { text: "• 使用 {{变量名}} 引用", options: { bullet: true, breakLine: true } },
    { text: "• 支持嵌套和转换", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "示例：{{start.input}} → {{llm.output}} → {{end.result}}", options: { italic: true } },
  ]);
  
  // 26. 案例演示
  addCaseSlide(pres, 26, "案例演示：信息提取助手",
    "用户需要从非结构化文本中提取关键信息，如人名、日期、金额等。",
    "创建工作流智能体，使用 LLM 节点提取信息，通过条件节点判断提取结果，最后格式化输出。",
    "自动从文本中提取结构化信息，提高数据处理效率。"
  );
  
  // 27. 案例要点总结
  addContentSlide(pres, 27, "案例要点总结", [
    { text: "节点编排技巧：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 明确输入输出", options: { bold: true, breakLine: true } },
    { text: "• 每个节点的输入和输出要清晰定义", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 合理使用条件节点", options: { bold: true, breakLine: true } },
    { text: "• 处理异常情况", options: { bullet: true, breakLine: true } },
    { text: "• 实现分支逻辑", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 输出格式化", options: { bold: true, breakLine: true } },
    { text: "• 使用 LLM 节点格式化输出", options: { bullet: true, breakLine: true } },
    { text: "• 确保返回结构化数据", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 错误处理", options: { bold: true, breakLine: true } },
    { text: "• 添加异常处理节点", options: { bullet: true, breakLine: true } },
    { text: "• 提供友好的错误提示", options: { bullet: true } },
  ]);
  
  // ==================== 第六部分：Chatflow 智能体 ====================
  
  addSectionSlide(pres, "六", "Chatflow 智能体");
  
  // 28. 什么是 Chatflow
  addContentSlide(pres, 28, "什么是 Chatflow", [
    { text: "Chatflow 是基于工作流的对话应用。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "与工作流的区别：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "工作流：", options: { bold: true, breakLine: true } },
    { text: "• 单次输入输出", options: { bullet: true, breakLine: true } },
    { text: "• 无上下文", options: { bullet: true, breakLine: true } },
    { text: "• 适合批处理", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "Chatflow：", options: { bold: true, breakLine: true } },
    { text: "• 多轮对话", options: { bullet: true, breakLine: true } },
    { text: "• 上下文记忆", options: { bullet: true, breakLine: true } },
    { text: "• 流程控制", options: { bullet: true, breakLine: true } },
    { text: "• 适合交互场景", options: { bullet: true } },
  ]);
  
  // 29. 对话流设计
  addContentSlide(pres, 29, "对话流设计", [
    { text: "对话流设计需要考虑多轮交互。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "设计要点：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 上下文传递", options: { bold: true, breakLine: true } },
    { text: "• 使用会话变量", options: { bullet: true, breakLine: true } },
    { text: "• 记录对话历史", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 流程控制", options: { bold: true, breakLine: true } },
    { text: "• 条件分支", options: { bullet: true, breakLine: true } },
    { text: "• 循环处理", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 用户引导", options: { bold: true, breakLine: true } },
    { text: "• 开场白设置", options: { bullet: true, breakLine: true } },
    { text: "• 推荐问题", options: { bullet: true, breakLine: true } },
    { text: "• 快捷回复", options: { bullet: true } },
  ]);
  
  // 30. 上下文管理
  addContentSlide(pres, 30, "上下文管理", [
    { text: "上下文管理是 Chatflow 的核心。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "会话记忆：", options: { bold: true, breakLine: true } },
    { text: "• 自动记录对话历史", options: { bullet: true, breakLine: true } },
    { text: "• 支持配置记忆窗口", options: { bullet: true, breakLine: true } },
    { text: "• 可设置最大令牌数", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "变量作用域：", options: { bold: true, breakLine: true } },
    { text: "• 会话变量：整个对话周期", options: { bullet: true, breakLine: true } },
    { text: "• 轮次变量：单次对话", options: { bullet: true, breakLine: true } },
    { text: "• 系统变量：平台提供", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "最佳实践：", options: { bold: true, breakLine: true } },
    { text: "• 合理设置记忆窗口", options: { bullet: true, breakLine: true } },
    { text: "• 避免上下文过长", options: { bullet: true, breakLine: true } },
    { text: "• 使用变量存储关键信息", options: { bullet: true } },
  ]);
  
  // 31. 对话开场白
  addContentSlide(pres, 31, "对话开场白", [
    { text: "开场白是用户看到的第一条消息。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "设置方法：", options: { bold: true, breakLine: true } },
    { text: "• 在 Chatflow 配置中找到「开场白」", options: { bullet: true, breakLine: true } },
    { text: "• 输入欢迎语和引导文字", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "设计技巧：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 简洁明了", options: { bold: true, breakLine: true } },
    { text: "• 一句话说明助手能力", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 引导用户", options: { bold: true, breakLine: true } },
    { text: "• 提供示例问题", options: { bullet: true, breakLine: true } },
    { text: "• 指导用户如何提问", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 设置推荐问题", options: { bold: true, breakLine: true } },
    { text: "• 预设常见问题", options: { bullet: true, breakLine: true } },
    { text: "• 降低用户使用门槛", options: { bullet: true } },
  ]);
  
  // 32. 案例演示
  addCaseSlide(pres, 32, "案例演示：多轮问答助手",
    "用户需要一个能够记住上下文的问答助手，支持多轮对话。",
    "创建 Chatflow 应用，配置会话变量存储上下文，使用 LLM 节点处理对话，设置开场白引导用户。",
    "用户可以进行自然的多轮对话，助手能够记住之前的信息。"
  );
  
  // 33. 案例要点总结
  addContentSlide(pres, 33, "案例要点总结", [
    { text: "上下文管理技巧：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 合理使用会话变量", options: { bold: true, breakLine: true } },
    { text: "• 存储关键信息", options: { bullet: true, breakLine: true } },
    { text: "• 避免存储过多数据", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 设置记忆窗口", options: { bold: true, breakLine: true } },
    { text: "• 根据场景设置合适的窗口大小", options: { bullet: true, breakLine: true } },
    { text: "• 平衡上下文长度和成本", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 引导用户对话", options: { bold: true, breakLine: true } },
    { text: "• 使用开场白", options: { bullet: true, breakLine: true } },
    { text: "• 提供推荐问题", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 处理异常情况", options: { bold: true, breakLine: true } },
    { text: "• 用户输入不明确时的引导", options: { bullet: true, breakLine: true } },
    { text: "• 上下文丢失时的恢复", options: { bullet: true } },
  ]);
  
  // ==================== 第七部分：普通知识库 ====================
  
  addSectionSlide(pres, "七", "普通知识库");
  
  // 34. 什么是知识库
  addContentSlide(pres, 34, "什么是知识库", [
    { text: "知识库是 RAG（检索增强生成）的核心组件。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "RAG 原理简介：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 文档处理", options: { bold: true, breakLine: true } },
    { text: "• 上传文档", options: { bullet: true, breakLine: true } },
    { text: "• 分段处理", options: { bullet: true, breakLine: true } },
    { text: "• 向量化", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 检索阶段", options: { bold: true, breakLine: true } },
    { text: "• 用户提问", options: { bullet: true, breakLine: true } },
    { text: "• 语义搜索", options: { bullet: true, breakLine: true } },
    { text: "• 返回相关片段", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 生成阶段", options: { bold: true, breakLine: true } },
    { text: "• 结合检索结果", options: { bullet: true, breakLine: true } },
    { text: "• 生成回答", options: { bullet: true } },
  ]);
  
  // 35. 创建知识库
  addContentSlide(pres, 35, "创建知识库", [
    { text: "创建知识库的步骤：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 1：进入知识库页面", options: { bold: true, breakLine: true } },
    { text: "• 点击左侧菜单「知识库」", options: { bullet: true, breakLine: true } },
    { text: "• 点击「创建知识库」", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 2：配置基本信息", options: { bold: true, breakLine: true } },
    { text: "• 输入知识库名称", options: { bullet: true, breakLine: true } },
    { text: "• 添加描述", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 3：上传文档", options: { bold: true, breakLine: true } },
    { text: "• 支持 PDF、TXT、DOCX 等格式", options: { bullet: true, breakLine: true } },
    { text: "• 可批量上传", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 4：配置分段策略", options: { bold: true, breakLine: true } },
    { text: "• 选择分段方式", options: { bullet: true, breakLine: true } },
    { text: "• 设置分段长度", options: { bullet: true, breakLine: true } },
  ], "创建知识库截图");
  
  // 36. 文档上传
  addContentSlide(pres, 36, "文档上传", [
    { text: "支持的文档格式：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "文本文件：", options: { bold: true, breakLine: true } },
    { text: "• PDF、DOCX、TXT、MD", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "表格文件：", options: { bold: true, breakLine: true } },
    { text: "• XLSX、CSV", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "其他格式：", options: { bold: true, breakLine: true } },
    { text: "• HTML、JSON", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "大小限制：", options: { bold: true, breakLine: true } },
    { text: "• 单文件最大 15MB", options: { bullet: true, breakLine: true } },
    { text: "• 建议分批上传大文件", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "注意事项：", options: { bold: true, breakLine: true } },
    { text: "• 确保文档格式正确", options: { bullet: true, breakLine: true } },
    { text: "• 避免扫描版 PDF（无法提取文字）", options: { bullet: true, breakLine: true } },
    { text: "• 表格文件建议转换为文本", options: { bullet: true } },
  ]);
  
  // 37. 分段策略
  addContentSlide(pres, 37, "分段策略", [
    { text: "分段策略影响检索效果。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "自动分段：", options: { bold: true, breakLine: true } },
    { text: "• 系统自动识别段落", options: { bullet: true, breakLine: true } },
    { text: "• 适合大多数场景", options: { bullet: true, breakLine: true } },
    { text: "• 推荐新手使用", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "自定义分段：", options: { bold: true, breakLine: true } },
    { text: "• 手动设置分段规则", options: { bullet: true, breakLine: true } },
    { text: "• 适合特殊格式文档", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "分段长度：", options: { bold: true, breakLine: true } },
    { text: "• 推荐：500-1000 字符", options: { bullet: true, breakLine: true } },
    { text: "• 太短：上下文不完整", options: { bullet: true, breakLine: true } },
    { text: "• 太长：检索不精确", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "重叠长度：", options: { bold: true, breakLine: true } },
    { text: "• 推荐：50-100 字符", options: { bullet: true, breakLine: true } },
    { text: "• 保证段落间的连贯性", options: { bullet: true } },
  ]);
  
  // 38. 检索模式
  addCardSlide(pres, 38, "检索模式", [
    { title: "语义检索", content: "基于向量相似度\n理解语义\n适合自然语言", color: COLORS.primary },
    { title: "关键词检索", content: "基于关键词匹配\n精确匹配\n适合专业术语", color: COLORS.primaryDark },
    { title: "混合检索", content: "结合两者\n综合排序\n效果最佳", color: COLORS.primaryLight },
  ]);
  
  // 39. 案例演示
  addCaseSlide(pres, 39, "案例演示：产品手册问答",
    "用户需要一个能够回答产品使用问题的助手，基于产品手册文档。",
    "创建知识库，上传产品手册，配置分段策略，创建智能体关联知识库。",
    "用户可以快速查询产品信息，获得准确的回答。"
  );
  
  // 40. 案例要点总结
  addContentSlide(pres, 40, "案例要点总结", [
    { text: "分段策略选择：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 根据文档类型选择", options: { bold: true, breakLine: true } },
    { text: "• 结构化文档：按章节分段", options: { bullet: true, breakLine: true } },
    { text: "• 非结构化文档：自动分段", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 召回优化", options: { bold: true, breakLine: true } },
    { text: "• 测试不同分段长度", options: { bullet: true, breakLine: true } },
    { text: "• 调整 TopK 参数", options: { bullet: true, breakLine: true } },
    { text: "• 使用混合检索", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 持续优化", options: { bold: true, breakLine: true } },
    { text: "• 收集用户反馈", options: { bullet: true, breakLine: true } },
    { text: "• 分析未召回问题", options: { bullet: true, breakLine: true } },
    { text: "• 补充缺失文档", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 召回测试", options: { bold: true, breakLine: true } },
    { text: "• 使用「召回测试」功能", options: { bullet: true, breakLine: true } },
    { text: "• 验证检索效果", options: { bullet: true } },
  ]);
  
  // ==================== 第八部分：工作流知识库 ====================
  
  addSectionSlide(pres, "八", "工作流知识库");
  
  // 41. 知识库检索节点
  addContentSlide(pres, 41, "知识库检索节点", [
    { text: "知识库检索节点用于在工作流中检索知识库。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "节点配置：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 选择知识库", options: { bold: true, breakLine: true } },
    { text: "• 支持选择多个知识库", options: { bullet: true, breakLine: true } },
    { text: "• 可配置检索范围", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 配置检索参数", options: { bold: true, breakLine: true } },
    { text: "• TopK：返回结果数量", options: { bullet: true, breakLine: true } },
    { text: "• Score 阈值：相似度阈值", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 输入输出", options: { bold: true, breakLine: true } },
    { text: "• 输入：查询文本", options: { bullet: true, breakLine: true } },
    { text: "• 输出：检索结果列表", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "使用场景：", options: { bold: true, breakLine: true } },
    { text: "• 智能问答", options: { bullet: true, breakLine: true } },
    { text: "• 文档查询", options: { bullet: true, breakLine: true } },
    { text: "• 知识检索", options: { bullet: true } },
  ]);
  
  // 42. 检索策略
  addContentSlide(pres, 42, "检索策略", [
    { text: "检索策略影响检索效果。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "TopK 参数：", options: { bold: true, breakLine: true } },
    { text: "• 返回最相关的 K 个结果", options: { bullet: true, breakLine: true } },
    { text: "• 推荐：3-5", options: { bullet: true, breakLine: true } },
    { text: "• 太少：可能遗漏信息", options: { bullet: true, breakLine: true } },
    { text: "• 太多：增加成本", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "Score 阈值：", options: { bold: true, breakLine: true } },
    { text: "• 过滤低相似度结果", options: { bullet: true, breakLine: true } },
    { text: "• 推荐：0.5-0.7", options: { bullet: true, breakLine: true } },
    { text: "• 太低：返回不相关结果", options: { bullet: true, breakLine: true } },
    { text: "• 太高：可能遗漏结果", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "重排序：", options: { bold: true, breakLine: true } },
    { text: "• 使用 Rerank 模型", options: { bullet: true, breakLine: true } },
    { text: "• 提高排序准确性", options: { bullet: true, breakLine: true } },
    { text: "• 推荐开启", options: { bullet: true } },
  ]);
  
  // 43. 案例演示
  addCaseSlide(pres, 43, "案例演示：智能问答工作流",
    "用户需要一个基于知识库的智能问答系统，支持复杂查询。",
    "创建工作流，使用知识库检索节点获取相关信息，通过 LLM 节点生成回答。",
    "提供准确、相关的回答，支持复杂查询场景。"
  );
  
  // 44. 案例要点总结
  addContentSlide(pres, 44, "案例要点总结", [
    { text: "检索策略优化：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 参数调优", options: { bold: true, breakLine: true } },
    { text: "• 测试不同 TopK 值", options: { bullet: true, breakLine: true } },
    { text: "• 调整 Score 阈值", options: { bullet: true, breakLine: true } },
    { text: "• 启用重排序", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 知识库优化", options: { bold: true, breakLine: true } },
    { text: "• 优化分段策略", options: { bullet: true, breakLine: true } },
    { text: "• 补充缺失文档", options: { bullet: true, breakLine: true } },
    { text: "• 清理无效文档", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 提示词优化", options: { bold: true, breakLine: true } },
    { text: "• 引导 LLM 使用检索结果", options: { bullet: true, breakLine: true } },
    { text: "• 指定回答格式", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 监控和优化", options: { bold: true, breakLine: true } },
    { text: "• 分析日志", options: { bullet: true, breakLine: true } },
    { text: "• 收集用户反馈", options: { bullet: true, breakLine: true } },
    { text: "• 持续迭代", options: { bullet: true } },
  ]);
  
  // ==================== 第九部分：外部知识库 ====================
  
  addSectionSlide(pres, "九", "外部知识库");
  
  // 45. 什么是外部知识库
  addContentSlide(pres, 45, "什么是外部知识库", [
    { text: "外部知识库连接外部数据源。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "定义：", options: { bold: true, breakLine: true } },
    { text: "• 通过 API 连接外部知识系统", options: { bullet: true, breakLine: true } },
    { text: "• 实时检索外部数据", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "与内部知识库的区别：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "内部知识库：", options: { bold: true, breakLine: true } },
    { text: "• 文档上传到 Dify", options: { bullet: true, breakLine: true } },
    { text: "• 离线索引", options: { bullet: true, breakLine: true } },
    { text: "• 适合静态文档", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "外部知识库：", options: { bold: true, breakLine: true } },
    { text: "• 数据在外部系统", options: { bullet: true, breakLine: true } },
    { text: "• 实时检索", options: { bullet: true, breakLine: true } },
    { text: "• 适合动态数据", options: { bullet: true, breakLine: true } },
    { text: "• 支持企业现有系统", options: { bullet: true } },
  ]);
  
  // 46. 外部知识库 API
  addContentSlide(pres, 46, "外部知识库 API", [
    { text: "外部知识库 API 规范：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "API 端点：", options: { bold: true, breakLine: true } },
    { text: "• POST /retrieval", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "请求格式：", options: { bold: true, breakLine: true } },
    { text: "• query: 查询文本", options: { bullet: true, breakLine: true } },
    { text: "• top_k: 返回数量", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "认证方式：", options: { bold: true, breakLine: true } },
    { text: "• Bearer Token", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "返回格式：", options: { bold: true, breakLine: true } },
    { text: "• records: 结果列表", options: { bullet: true, breakLine: true } },
    { text: "• content: 文档内容", options: { bullet: true, breakLine: true } },
    { text: "• score: 相似度分数", options: { bullet: true, breakLine: true } },
    { text: "• title: 文档标题", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "建议：参考 Dify 官方文档实现 API", options: { italic: true } },
  ]);
  
  // 47. 创建外部知识库
  addContentSlide(pres, 47, "创建外部知识库", [
    { text: "创建外部知识库的步骤：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 1：配置 API", options: { bold: true, breakLine: true } },
    { text: "• 进入 设置 → 数据源", options: { bullet: true, breakLine: true } },
    { text: "• 添加外部知识库 API", options: { bullet: true, breakLine: true } },
    { text: "• 输入 API 端点和密钥", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 2：创建知识库", options: { bold: true, breakLine: true } },
    { text: "• 进入知识库页面", options: { bullet: true, breakLine: true } },
    { text: "• 选择「外部知识库」", options: { bullet: true, breakLine: true } },
    { text: "• 选择已配置的 API", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 3：绑定数据源", options: { bold: true, breakLine: true } },
    { text: "• 配置检索参数", options: { bullet: true, breakLine: true } },
    { text: "• 测试连接", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 4：使用", options: { bold: true, breakLine: true } },
    { text: "• 在应用中关联外部知识库", options: { bullet: true, breakLine: true } },
    { text: "• 正常使用检索功能", options: { bullet: true } },
  ], "创建外部知识库截图");
  
  // 48. 检索配置
  addContentSlide(pres, 48, "检索配置", [
    { text: "外部知识库检索配置：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "检索参数：", options: { bold: true, breakLine: true } },
    { text: "• TopK：返回结果数量", options: { bullet: true, breakLine: true } },
    { text: "• Score 阈值：相似度阈值", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "重排序：", options: { bold: true, breakLine: true } },
    { text: "• 使用 Rerank 模型", options: { bullet: true, breakLine: true } },
    { text: "• 提高排序准确性", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "过滤条件：", options: { bold: true, breakLine: true } },
    { text: "• 元数据过滤", options: { bullet: true, breakLine: true } },
    { text: "• 时间范围", options: { bullet: true, breakLine: true } },
    { text: "• 文档类型", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "最佳实践：", options: { bold: true, breakLine: true } },
    { text: "• 根据数据特点配置参数", options: { bullet: true, breakLine: true } },
    { text: "• 测试不同配置效果", options: { bullet: true, breakLine: true } },
    { text: "• 监控检索性能", options: { bullet: true } },
  ]);
  
  // 49. 案例演示
  addCaseSlide(pres, 49, "案例演示：连接企业知识系统",
    "企业已有知识管理系统，需要在 Dify 中使用这些知识。",
    "配置外部知识库 API，连接企业知识系统，创建外部知识库。",
    "用户可以在 Dify 应用中检索企业知识，实现知识共享。"
  );
  
  // 50. 案例要点总结
  addContentSlide(pres, 50, "案例要点总结", [
    { text: "API 设计要点：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 接口规范", options: { bold: true, breakLine: true } },
    { text: "• 遵循 Dify API 规范", options: { bullet: true, breakLine: true } },
    { text: "• 正确处理认证", options: { bullet: true, breakLine: true } },
    { text: "• 返回标准格式", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 性能优化", options: { bold: true, breakLine: true } },
    { text: "• 响应时间控制在 3 秒内", options: { bullet: true, breakLine: true } },
    { text: "• 实现缓存机制", options: { bullet: true, breakLine: true } },
    { text: "• 优化检索算法", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 数据质量", options: { bold: true, breakLine: true } },
    { text: "• 确保数据准确性", options: { bullet: true, breakLine: true } },
    { text: "• 定期更新数据", options: { bullet: true, breakLine: true } },
    { text: "• 清理无效数据", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 监控告警", options: { bold: true, breakLine: true } },
    { text: "• 监控 API 调用", options: { bullet: true, breakLine: true } },
    { text: "• 设置告警阈值", options: { bullet: true } },
  ]);
  
  // ==================== 第十部分：MCP 与自定义工具 ====================
  
  addSectionSlide(pres, "十", "MCP 与自定义工具");
  
  // 51. 什么是 MCP
  addContentSlide(pres, 51, "什么是 MCP", [
    { text: "MCP（Model Context Protocol）是标准化模型与工具通信的协议。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "定义：", options: { bold: true, breakLine: true } },
    { text: "• 模型上下文协议", options: { bullet: true, breakLine: true } },
    { text: "• 标准化工具调用接口", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "作用：", options: { bold: true, breakLine: true } },
    { text: "• 统一工具接入标准", options: { bullet: true, breakLine: true } },
    { text: "• 简化工具配置", options: { bullet: true, breakLine: true } },
    { text: "• 提高兼容性", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "优势：", options: { bold: true, breakLine: true } },
    { text: "• 标准化：统一的接口规范", options: { bullet: true, breakLine: true } },
    { text: "• 易用性：简化配置流程", options: { bullet: true, breakLine: true } },
    { text: "• 扩展性：支持多种工具", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "Dify 中的 MCP：", options: { bold: true, breakLine: true } },
    { text: "• 支持 MCP 服务器配置", options: { bullet: true, breakLine: true } },
    { text: "• 可视化工具管理", options: { bullet: true, breakLine: true } },
    { text: "• 一键导入工具", options: { bullet: true } },
  ]);
  
  // 52. MCP 服务器配置
  addContentSlide(pres, 52, "MCP 服务器配置", [
    { text: "配置 MCP 服务器的步骤：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 1：添加 MCP 服务器", options: { bold: true, breakLine: true } },
    { text: "• 进入 工具 → MCP", options: { bullet: true, breakLine: true } },
    { text: "• 点击「添加 MCP 服务器」", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 2：配置连接信息", options: { bold: true, breakLine: true } },
    { text: "• 输入服务器地址", options: { bullet: true, breakLine: true } },
    { text: "• 配置认证信息", options: { bullet: true, breakLine: true } },
    { text: "• 设置参数", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 3：测试连接", options: { bold: true, breakLine: true } },
    { text: "• 点击「测试」按钮", options: { bullet: true, breakLine: true } },
    { text: "• 验证连接成功", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 4：使用工具", options: { bold: true, breakLine: true } },
    { text: "• 在应用中添加 MCP 工具", options: { bullet: true, breakLine: true } },
    { text: "• 配置工具参数", options: { bullet: true } },
  ], "MCP 配置截图");
  
  // 53. 自定义工具
  addContentSlide(pres, 53, "自定义工具", [
    { text: "自定义工具扩展智能体能力。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "创建步骤：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 定义 API", options: { bold: true, breakLine: true } },
    { text: "• 准备 API 端点", options: { bullet: true, breakLine: true } },
    { text: "• 定义请求格式", options: { bullet: true, breakLine: true } },
    { text: "• 定义返回格式", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 配置工具", options: { bold: true, breakLine: true } },
    { text: "• 进入 工具 → 自定义工具", options: { bullet: true, breakLine: true } },
    { text: "• 点击「创建自定义工具」", options: { bullet: true, breakLine: true } },
    { text: "• 输入 API 信息", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 参数配置", options: { bold: true, breakLine: true } },
    { text: "• 定义输入参数", options: { bullet: true, breakLine: true } },
    { text: "• 设置参数类型", options: { bullet: true, breakLine: true } },
    { text: "• 配置必填项", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 测试和使用", options: { bold: true, breakLine: true } },
    { text: "• 测试工具调用", options: { bullet: true, breakLine: true } },
    { text: "• 在应用中使用", options: { bullet: true } },
  ]);
  
  // 54. 工具授权
  addContentSlide(pres, 54, "工具授权", [
    { text: "工具授权管理访问权限。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "API Key 配置：", options: { bold: true, breakLine: true } },
    { text: "• 在工具设置中添加 API Key", options: { bullet: true, breakLine: true } },
    { text: "• 支持多个 Key 轮换", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "OAuth 认证：", options: { bold: true, breakLine: true } },
    { text: "• 支持 OAuth 2.0", options: { bullet: true, breakLine: true } },
    { text: "• 配置 Client ID 和 Secret", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "权限管理：", options: { bold: true, breakLine: true } },
    { text: "• 控制工具使用范围", options: { bullet: true, breakLine: true } },
    { text: "• 设置使用配额", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "安全建议：", options: { bold: true, breakLine: true } },
    { text: "• 使用最小权限原则", options: { bullet: true, breakLine: true } },
    { text: "• 定期轮换密钥", options: { bullet: true, breakLine: true } },
    { text: "• 监控工具调用", options: { bullet: true } },
  ]);
  
  // 55. 案例演示
  addCaseSlide(pres, 55, "案例演示：集成外部 API 工具",
    "用户需要调用外部 API 获取实时数据，如天气、汇率等。",
    "创建自定义工具，配置 API 端点和参数，在智能体中使用。",
    "智能体可以实时获取外部数据，提供更准确的回答。"
  );
  
  // 56. 案例要点总结
  addContentSlide(pres, 56, "案例要点总结", [
    { text: "工具设计最佳实践：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 接口设计", options: { bold: true, breakLine: true } },
    { text: "• 简洁明了的接口", options: { bullet: true, breakLine: true } },
    { text: "• 明确的参数说明", options: { bullet: true, breakLine: true } },
    { text: "• 标准的返回格式", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 错误处理", options: { bold: true, breakLine: true } },
    { text: "• 友好的错误提示", options: { bullet: true, breakLine: true } },
    { text: "• 错误码定义", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 性能优化", options: { bold: true, breakLine: true } },
    { text: "• 响应时间控制", options: { bullet: true, breakLine: true } },
    { text: "• 缓存机制", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 安全考虑", options: { bold: true, breakLine: true } },
    { text: "• 认证和授权", options: { bullet: true, breakLine: true } },
    { text: "• 输入验证", options: { bullet: true, breakLine: true } },
    { text: "• 日志记录", options: { bullet: true } },
  ]);
  
  // ==================== 第十一部分：API 集成 ====================
  
  addSectionSlide(pres, "十一", "API 集成");
  
  // 57. 后端即服务
  addContentSlide(pres, 57, "后端即服务", [
    { text: "Dify 提供完整的 API 支持。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "API 概览：", options: { bold: true, breakLine: true } },
    { text: "• 对话 API：多轮对话", options: { bullet: true, breakLine: true } },
    { text: "• 文本生成 API：单次生成", options: { bullet: true, breakLine: true } },
    { text: "• 工作流 API：流程调用", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "认证方式：", options: { bold: true, breakLine: true } },
    { text: "• Bearer Token", options: { bullet: true, breakLine: true } },
    { text: "• 在应用设置中获取 API Key", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "特点：", options: { bold: true, breakLine: true } },
    { text: "• RESTful API", options: { bullet: true, breakLine: true } },
    { text: "• 流式响应", options: { bullet: true, breakLine: true } },
    { text: "• 完整文档", options: { bullet: true, breakLine: true } },
    { text: "• SDK 支持", options: { bullet: true } },
  ]);
  
  // 58. 获取 API 密钥
  addContentSlide(pres, 58, "获取 API 密钥", [
    { text: "获取 API 密钥的步骤：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 1：进入应用设置", options: { bold: true, breakLine: true } },
    { text: "• 选择目标应用", options: { bullet: true, breakLine: true } },
    { text: "• 点击「API 访问」", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "步骤 2：创建 API Key", options: { bold: true, breakLine: true } },
    { text: "• 点击「创建」按钮", options: { bullet: true, breakLine: true } },
    { text: "• 复制 API Key", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "注意事项：", options: { bold: true, breakLine: true } },
    { text: "• API Key 只显示一次", options: { bullet: true, breakLine: true } },
    { text: "• 妥善保管", options: { bullet: true, breakLine: true } },
    { text: "• 不要泄露给他人", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "API 文档：", options: { bold: true, breakLine: true } },
    { text: "• 在应用设置中查看", options: { bullet: true, breakLine: true } },
    { text: "• 包含完整示例", options: { bullet: true, breakLine: true } },
  ], "API 密钥截图");
  
  // 59. API 调用示例
  addContentSlide(pres, 59, "API 调用示例", [
    { text: "cURL 示例：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "curl -X POST 'https://api.dify.ai/v1/chat-messages' \\", options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: "--header 'Authorization: Bearer {api_key}' \\", options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: "--header 'Content-Type: application/json' \\", options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: "--data-raw '{", options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: '  "inputs": {},', options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: '  "query": "你好",', options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: '  "response_mode": "blocking",', options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: '  "conversation_id": "",', options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: '  "user": "user-123"', options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: "}'", options: { breakLine: true, fontFace: "Consolas", fontSize: 12 } },
    { text: "", options: { breakLine: true } },
    { text: "返回结果：", options: { bold: true, breakLine: true } },
    { text: "{ message_id, conversation_id, answer }", options: { fontFace: "Consolas", fontSize: 12 } },
  ]);
  
  // 60. 会话管理
  addContentSlide(pres, 60, "会话管理", [
    { text: "会话管理支持多轮对话。", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "会话 ID：", options: { bold: true, breakLine: true } },
    { text: "• 首次对话不传 conversation_id", options: { bullet: true, breakLine: true } },
    { text: "• 返回 conversation_id", options: { bullet: true, breakLine: true } },
    { text: "• 后续对话传入 conversation_id", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "上下文保持：", options: { bold: true, breakLine: true } },
    { text: "• 使用 conversation_id 维持上下文", options: { bullet: true, breakLine: true } },
    { text: "• 支持多轮对话", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "流式响应：", options: { bold: true, breakLine: true } },
    { text: "• 设置 response_mode: streaming", options: { bullet: true, breakLine: true } },
    { text: "• 使用 SSE 接收数据", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "最佳实践：", options: { bold: true, breakLine: true } },
    { text: "• 使用流式响应提升体验", options: { bullet: true, breakLine: true } },
    { text: "• 合理管理会话生命周期", options: { bullet: true, breakLine: true } },
    { text: "• 处理异常情况", options: { bullet: true } },
  ]);
  
  // 61. 案例演示
  addCaseSlide(pres, 61, "案例演示：调用 Dify API",
    "用户需要将 Dify 应用集成到自己的系统中。",
    "获取 API 密钥，使用 cURL 或 SDK 调用 API，处理返回结果。",
    "实现系统集成，提供 AI 能力。"
  );
  
  // 62. 案例要点总结
  addContentSlide(pres, 62, "案例要点总结", [
    { text: "错误处理：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "常见错误：", options: { bold: true, breakLine: true } },
    { text: "• 401：API Key 无效", options: { bullet: true, breakLine: true } },
    { text: "• 400：请求参数错误", options: { bullet: true, breakLine: true } },
    { text: "• 429：请求频率超限", options: { bullet: true, breakLine: true } },
    { text: "• 500：服务器内部错误", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "最佳实践：", options: { bold: true, breakLine: true } },
    { text: "• 实现重试机制", options: { bullet: true, breakLine: true } },
    { text: "• 记录错误日志", options: { bullet: true, breakLine: true } },
    { text: "• 提供友好提示", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "性能优化：", options: { bold: true, breakLine: true } },
    { text: "• 使用流式响应", options: { bullet: true, breakLine: true } },
    { text: "• 实现连接池", options: { bullet: true, breakLine: true } },
    { text: "• 缓存结果", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "安全建议：", options: { bold: true, breakLine: true } },
    { text: "• 保护 API Key", options: { bullet: true, breakLine: true } },
    { text: "• 使用 HTTPS", options: { bullet: true, breakLine: true } },
    { text: "• 验证输入", options: { bullet: true } },
  ]);
  
  // ==================== 第十二部分：最佳实践 ====================
  
  addSectionSlide(pres, "十二", "最佳实践 — 会议纪要助手");
  
  // 63. 案例场景
  addContentSlide(pres, 63, "案例场景", [
    { text: "场景描述：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "用户需要一个会议纪要助手，能够：", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "• 输入会议内容", options: { bullet: true, breakLine: true } },
    { text: "• 自动提取关键信息", options: { bullet: true, breakLine: true } },
    { text: "• 生成结构化会议纪要", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "涉及技术：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "• 知识库：存储会议纪要模板", options: { bullet: true, breakLine: true } },
    { text: "• 工作流：编排处理流程", options: { bullet: true, breakLine: true } },
    { text: "• API：集成到现有系统", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "这是一个综合性案例，串联多个知识点。", options: { italic: true } },
  ]);
  
  // 64. 知识库准备
  addContentSlide(pres, 64, "知识库准备", [
    { text: "准备会议纪要模板知识库：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 创建知识库", options: { bold: true, breakLine: true } },
    { text: "• 名称：会议纪要模板", options: { bullet: true, breakLine: true } },
    { text: "• 描述：存储会议纪要格式模板", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 上传模板文档", options: { bold: true, breakLine: true } },
    { text: "• 会议纪要模板", options: { bullet: true, breakLine: true } },
    { text: "• 包含标准格式", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 测试召回", options: { bold: true, breakLine: true } },
    { text: "• 使用「召回测试」功能", options: { bullet: true, breakLine: true } },
    { text: "• 验证模板检索效果", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 优化分段", options: { bold: true, breakLine: true } },
    { text: "• 根据测试结果调整", options: { bullet: true, breakLine: true } },
    { text: "• 确保模板完整召回", options: { bullet: true } },
  ]);
  
  // 65. 工作流设计
  addContentSlide(pres, 65, "工作流设计", [
    { text: "设计会议纪要工作流：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "节点 1：开始节点", options: { bold: true, breakLine: true } },
    { text: "• 输入变量：meeting_content（会议内容）", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "节点 2：知识库检索", options: { bold: true, breakLine: true } },
    { text: "• 检索会议纪要模板", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "节点 3：LLM 节点 1（信息提取）", options: { bold: true, breakLine: true } },
    { text: "• 提取关键信息", options: { bullet: true, breakLine: true } },
    { text: "• 输出 JSON 格式", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "节点 4：LLM 节点 2（纪要生成）", options: { bold: true, breakLine: true } },
    { text: "• 结合模板生成纪要", options: { bullet: true, breakLine: true } },
    { text: "• 格式化输出", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "节点 5：结束节点", options: { bold: true, breakLine: true } },
    { text: "• 输出：meeting_summary", options: { bullet: true } },
  ], "工作流设计截图");
  
  // 66. 智能体配置
  addContentSlide(pres, 66, "智能体配置", [
    { text: "配置智能体关联知识库：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 创建智能体", options: { bold: true, breakLine: true } },
    { text: "• 选择工作流智能体", options: { bullet: true, breakLine: true } },
    { text: "• 关联工作流", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 关联知识库", options: { bold: true, breakLine: true } },
    { text: "• 添加知识库", options: { bullet: true, breakLine: true } },
    { text: "• 配置检索参数", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 提示词设计", options: { bold: true, breakLine: true } },
    { text: "• 引导 LLM 使用模板", options: { bullet: true, breakLine: true } },
    { text: "• 指定输出格式", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "4. 测试", options: { bold: true, breakLine: true } },
    { text: "• 输入测试会议内容", options: { bullet: true, breakLine: true } },
    { text: "• 验证生成效果", options: { bullet: true } },
  ]);
  
  // 67. API 集成
  addContentSlide(pres, 67, "API 集成", [
    { text: "集成到现有系统：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 获取 API 密钥", options: { bold: true, breakLine: true } },
    { text: "• 在应用设置中创建", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "2. 调用 API", options: { bold: true, breakLine: true } },
    { text: "• 使用工作流 API", options: { bullet: true, breakLine: true } },
    { text: "• 传入会议内容", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "3. 处理结果", options: { bold: true, breakLine: true } },
    { text: "• 获取会议纪要", options: { bullet: true, breakLine: true } },
    { text: "• 存储到系统", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "示例代码：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "POST /v1/workflows/run", options: { fontFace: "Consolas", fontSize: 12, breakLine: true } },
    { text: "{ inputs: { meeting_content: \"...\" } }", options: { fontFace: "Consolas", fontSize: 12 } },
  ]);
  
  // 68. 最佳实践总结
  addContentSlide(pres, 68, "最佳实践总结", [
    { text: "提示词技巧：", options: { bold: true, breakLine: true } },
    { text: "• 明确角色和任务", options: { bullet: true, breakLine: true } },
    { text: "• 指定输出格式", options: { bullet: true, breakLine: true } },
    { text: "• 提供示例", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "性能优化：", options: { bold: true, breakLine: true } },
    { text: "• 合理设置 TopK", options: { bullet: true, breakLine: true } },
    { text: "• 使用流式响应", options: { bullet: true, breakLine: true } },
    { text: "• 缓存常用结果", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "成本控制：", options: { bold: true, breakLine: true } },
    { text: "• 选择合适模型", options: { bullet: true, breakLine: true } },
    { text: "• 控制上下文长度", options: { bullet: true, breakLine: true } },
    { text: "• 优化提示词", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "安全考虑：", options: { bold: true, breakLine: true } },
    { text: "• 保护 API Key", options: { bullet: true, breakLine: true } },
    { text: "• 验证输入", options: { bullet: true, breakLine: true } },
    { text: "• 监控使用情况", options: { bullet: true } },
  ]);
  
  // ==================== 第十三部分：总结 ====================
  
  addSectionSlide(pres, "十三", "总结");
  
  // 69. 内容回顾
  addSummarySlide(pres, "内容回顾", [
    { text: "通过 7 个案例，我们学习了：", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "1. 普通智能体（法律知识问答）", options: { bullet: true, breakLine: true } },
    { text: "2. 工作流智能体（信息提取）", options: { bullet: true, breakLine: true } },
    { text: "3. Chatflow 智能体（多轮问答）", options: { bullet: true, breakLine: true } },
    { text: "4. 普通知识库（产品手册问答）", options: { bullet: true, breakLine: true } },
    { text: "5. 工作流知识库（智能问答工作流）", options: { bullet: true, breakLine: true } },
    { text: "6. API 集成（调用 Dify API）", options: { bullet: true, breakLine: true } },
    { text: "7. 最佳实践（会议纪要助手）", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "核心知识点：", options: { bold: true, breakLine: true } },
    { text: "• 应用类型选择", options: { bullet: true, breakLine: true } },
    { text: "• 模型配置", options: { bullet: true, breakLine: true } },
    { text: "• 知识库管理", options: { bullet: true, breakLine: true } },
    { text: "• 工作流设计", options: { bullet: true, breakLine: true } },
    { text: "• API 集成", options: { bullet: true } },
  ]);
  
  // 70. 能力检查
  addContentSlide(pres, 70, "能力检查", [
    { text: "完成培训后，你应该能够：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "基础操作：", options: { bold: true, breakLine: true } },
    { text: "• 创建各类应用", options: { bullet: true, breakLine: true } },
    { text: "• 配置模型参数", options: { bullet: true, breakLine: true } },
    { text: "• 管理知识库", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "进阶能力：", options: { bold: true, breakLine: true } },
    { text: "• 设计工作流", options: { bullet: true, breakLine: true } },
    { text: "• 优化提示词", options: { bullet: true, breakLine: true } },
    { text: "• 集成外部工具", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "高级应用：", options: { bold: true, breakLine: true } },
    { text: "• API 集成", options: { bullet: true, breakLine: true } },
    { text: "• 性能优化", options: { bullet: true, breakLine: true } },
    { text: "• 成本控制", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "自评：你觉得自己掌握了哪些？还需要加强哪些？", options: { italic: true } },
  ]);
  
  // 71. 后续学习资源
  addContentSlide(pres, 71, "后续学习资源", [
    { text: "继续学习的资源：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "官方文档：", options: { bold: true, breakLine: true } },
    { text: "• https://docs.dify.ai", options: { bullet: true, breakLine: true } },
    { text: "• 包含完整 API 文档", options: { bullet: true, breakLine: true } },
    { text: "• 提供详细教程", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "社区资源：", options: { bold: true, breakLine: true } },
    { text: "• GitHub：https://github.com/langgenius/dify", options: { bullet: true, breakLine: true } },
    { text: "• Discord：加入社区讨论", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "示例库：", options: { bold: true, breakLine: true } },
    { text: "• 探索页面的应用模板", options: { bullet: true, breakLine: true } },
    { text: "• 学习优秀案例", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "实践建议：", options: { bold: true, breakLine: true } },
    { text: "• 多动手实践", options: { bullet: true, breakLine: true } },
    { text: "• 参与社区讨论", options: { bullet: true, breakLine: true } },
    { text: "• 分享自己的经验", options: { bullet: true } },
  ]);
  
  // 72. 答疑环节
  addContentSlide(pres, 72, "答疑环节", [
    { text: "Q&A", options: { fontSize: 48, bold: true, align: "center", breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "现在是提问时间", options: { fontSize: 24, align: "center", breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "请随时提出你的问题", options: { fontSize: 18, align: "center", breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "常见问题：", options: { bold: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "• 如何选择合适的应用类型？", options: { bullet: true, breakLine: true } },
    { text: "• 如何优化知识库检索效果？", options: { bullet: true, breakLine: true } },
    { text: "• 如何降低 API 调用成本？", options: { bullet: true, breakLine: true } },
    { text: "• 如何处理复杂业务场景？", options: { bullet: true } },
  ]);
  
  // 73. 结束页
  const endSlide = addTitleSlide(pres, "感谢参与", "Dify 使用讲解");
  endSlide.addText("如有问题，欢迎联系", {
    x: 0.5, y: 4, w: 9, h: 0.5,
    fontSize: 16, fontFace: FONTS.body, color: COLORS.accent,
    align: "center", valign: "middle",
  });
  
  // 保存文件
  await pres.writeFile({ fileName: "docs/pptx/Dify-使用讲解-v2.pptx" });
  console.log("PPT 已生成：Dify-使用讲解.pptx");
}

generatePPT().catch(console.error);
