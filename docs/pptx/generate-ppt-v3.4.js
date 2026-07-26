const PptxGenJS = require("pptxgenjs");

// 瑞士国际主义风格 + 阿里橙色主题
const COLORS = {
  paper: "FAFAF8",
  ink: "1A1A1A",
  grey1: "F0F0EE",
  grey2: "D4D4D2",
  grey3: "737373",
  accent: "FF6A00",
  white: "FFFFFF",
};

const FONTS = {
  title: "Arial",
  body: "Arial",
  mono: "Courier New",
};

const W = 13.33;
const H = 7.5;
const M = 0.4;
const CW = W - M * 2; // 12.53，内容区宽度

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Dify";
pptx.title = "Dify 使用讲解";
pptx.subject = "Dify 平台使用讲解 v3.4";

let outlineNum = 0;

function pageLabel() {
  return `${String(outlineNum).padStart(2, "0")} / 63`;
}

function hairline(slide, y, color = COLORS.grey2) {
  slide.addShape(pptx.ShapeType.rect, {
    x: M,
    y,
    w: CW,
    h: 0.01,
    fill: { color },
  });
}

function renderContent(slide, items, x, y, w, hLimit) {
  let yPos = y;
  items.forEach((item) => {
    if (item.type === "subtitle") {
      slide.addText(item.text, {
        x,
        y: yPos,
        w,
        h: 0.45,
        fontSize: 20,
        fontFace: FONTS.title,
        bold: true,
        color: COLORS.accent,
        align: "left",
      });
      yPos += 0.55;
    } else if (item.type === "bullet") {
      const lines = Math.max(1, Math.ceil(item.text.length / 48));
      const itemH = lines * 0.35 + 0.2;
      slide.addText(`• ${item.text}`, {
        x,
        y: yPos,
        w,
        h: itemH,
        fontSize: 16,
        fontFace: FONTS.body,
        color: COLORS.ink,
        align: "left",
        valign: "top",
      });
      yPos += itemH + 0.12;
    } else if (item.type === "note") {
      const lines = Math.max(1, Math.ceil(item.text.length / 60));
      const itemH = lines * 0.3 + 0.15;
      slide.addText(item.text, {
        x,
        y: yPos,
        w,
        h: itemH,
        fontSize: 14,
        fontFace: FONTS.body,
        color: COLORS.grey3,
        align: "left",
        valign: "top",
      });
      yPos += itemH + 0.12;
    } else if (item.type === "code") {
      slide.addText(item.text, {
        x,
        y: yPos,
        w,
        h: 0.4,
        fontSize: 13,
        fontFace: FONTS.mono,
        color: COLORS.ink,
        align: "left",
        valign: "top",
      });
      yPos += 0.42;
    }
  });
}

function addCoverSlide(title, subtitle) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.accent };

  slide.addText("DIFY · V3.4", {
    x: M,
    y: M,
    w: CW,
    h: 0.4,
    fontSize: 14,
    fontFace: FONTS.mono,
    color: COLORS.white,
    align: "left",
    letterSpacing: 0.2,
  });

  slide.addText(title, {
    x: M,
    y: 2.5,
    w: CW,
    h: 1.6,
    fontSize: 68,
    fontFace: FONTS.title,
    color: COLORS.white,
    align: "left",
  });

  slide.addText(subtitle, {
    x: M,
    y: 4.3,
    w: CW,
    h: 0.7,
    fontSize: 24,
    fontFace: FONTS.body,
    color: COLORS.white,
    align: "left",
  });

  hairline(slide, H - M - 0.05, COLORS.white);

  slide.addText("2026-07-06 · SWISS STYLE", {
    x: M,
    y: H - M,
    w: CW,
    h: 0.35,
    fontSize: 12,
    fontFace: FONTS.mono,
    color: COLORS.white,
    align: "left",
    letterSpacing: 0.15,
  });
}

function addSectionSlide(partNum, title) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };

  slide.addText(`PART ${partNum}`, {
    x: M,
    y: M,
    w: CW,
    h: 0.4,
    fontSize: 14,
    fontFace: FONTS.mono,
    color: COLORS.grey3,
    align: "right",
    letterSpacing: 0.15,
  });

  slide.addText(`第${partNum}部分 · ${title}`, {
    x: M,
    y: 2.5,
    w: CW,
    h: 1.4,
    fontSize: 50,
    fontFace: FONTS.title,
    color: COLORS.ink,
    align: "left",
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: M,
    y: 4.1,
    w: 2.4,
    h: 0.08,
    fill: { color: COLORS.accent },
  });

  hairline(slide, H - M - 0.05);
}

function addContentSlide(num, title, items) {
  outlineNum = num;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };

  slide.addText(pageLabel(), {
    x: M,
    y: M,
    w: CW,
    h: 0.4,
    fontSize: 13,
    fontFace: FONTS.mono,
    color: COLORS.grey3,
    align: "right",
    letterSpacing: 0.1,
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 1.0,
    w: W,
    h: 0.04,
    fill: { color: COLORS.accent },
  });

  slide.addText(`${num}. ${title}`, {
    x: M,
    y: 1.25,
    w: CW,
    h: 0.75,
    fontSize: 34,
    fontFace: FONTS.title,
    color: COLORS.ink,
    align: "left",
  });

  renderContent(slide, items, M, 2.2, CW, 4.4);
  hairline(slide, H - M - 0.05);
}

function addContentWithScreenshot(num, title, items, placeholder) {
  outlineNum = num;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };

  slide.addText(pageLabel(), {
    x: M,
    y: M,
    w: CW,
    h: 0.4,
    fontSize: 13,
    fontFace: FONTS.mono,
    color: COLORS.grey3,
    align: "right",
    letterSpacing: 0.1,
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 1.0,
    w: W,
    h: 0.04,
    fill: { color: COLORS.accent },
  });

  slide.addText(`${num}. ${title}`, {
    x: M,
    y: 1.25,
    w: CW,
    h: 0.75,
    fontSize: 34,
    fontFace: FONTS.title,
    color: COLORS.ink,
    align: "left",
  });

  const leftW = 7.0;
  const gap = 0.35;
  const rightW = CW - leftW - gap;
  const rightX = M + leftW + gap;

  renderContent(slide, items, M, 2.2, leftW, 4.4);

  slide.addShape(pptx.ShapeType.rect, {
    x: rightX,
    y: 2.2,
    w: rightW,
    h: 4.6,
    fill: { color: COLORS.grey1 },
    line: { color: COLORS.grey3, dashType: "dash", width: 1.5 },
  });

  slide.addText(`[截图占位]\n${placeholder}`, {
    x: rightX,
    y: 4.1,
    w: rightW,
    h: 0.8,
    fontSize: 15,
    fontFace: FONTS.body,
    color: COLORS.grey3,
    align: "center",
    valign: "middle",
  });

  hairline(slide, H - M - 0.05);
}

function addCaseSlide(num, title, scenario, solution, result, placeholder) {
  const items = [
    { type: "subtitle", text: "场景" },
    { type: "bullet", text: scenario },
    { type: "subtitle", text: "方案" },
    { type: "bullet", text: solution },
    { type: "subtitle", text: "效果" },
    { type: "bullet", text: result },
  ];
  addContentWithScreenshot(num, title, items, placeholder);
}

function addEndSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.accent };

  slide.addText("感谢聆听", {
    x: M,
    y: 2.4,
    w: CW,
    h: 1.4,
    fontSize: 68,
    fontFace: FONTS.title,
    color: COLORS.white,
    align: "center",
  });

  slide.addText("Q&A 答疑环节", {
    x: M,
    y: 4.1,
    w: CW,
    h: 0.8,
    fontSize: 30,
    fontFace: FONTS.body,
    color: COLORS.white,
    align: "center",
  });

  hairline(slide, H - M - 0.05, COLORS.white);
}

// ==================== 内容定义 ====================

addCoverSlide("Dify 使用讲解", "v3.4 | 2026-07-06");

addSectionSlide("一", "平台概览");

addContentSlide(1, "Dify 是什么", [
  { type: "subtitle", text: "一句话定义" },
  { type: "bullet", text: "Dify 是一个开源的大语言模型（LLM）应用开发平台，面向开发者和业务人员。" },
  { type: "bullet", text: "它通过可视化界面、工作流编排和知识库能力，让 AI 应用的构建、调试与发布变得简单高效。" },
  { type: "subtitle", text: "核心价值" },
  { type: "bullet", text: "可视化编排：通过拖拽节点构建复杂工作流，无需编写大量代码即可落地业务逻辑。" },
  { type: "bullet", text: "模型无关：支持 OpenAI、Claude、通义千问等数百种模型，按需切换，避免供应商锁定。" },
  { type: "bullet", text: "快速部署：提供 Docker 一键部署能力，私有化、SaaS 均可灵活落地。" },
  { type: "bullet", text: "企业级能力：支持团队协作、权限管理、API 集成与审计日志，满足生产环境需求。" },
]);

addContentSlide(2, "核心功能", [
  { type: "subtitle", text: "Workflow（工作流）" },
  { type: "bullet", text: "将多个节点按流程连接，支持条件分支、循环与变量传递，实现复杂业务自动化。" },
  { type: "subtitle", text: "Agent（智能体）" },
  { type: "bullet", text: "具备推理与工具调用能力，可自主分解任务并调用外部工具完成目标。" },
  { type: "subtitle", text: "RAG（检索增强生成）" },
  { type: "bullet", text: "基于知识库检索相关文档，再让模型生成回答，显著降低幻觉并提高可解释性。" },
  { type: "subtitle", text: "模型管理" },
  { type: "bullet", text: "统一配置多供应商 API Key，快速切换和对比不同模型效果。" },
  { type: "subtitle", text: "API 集成" },
  { type: "bullet", text: "提供标准 REST API，方便将 Dify 应用嵌入企业现有系统或第三方平台。" },
]);

addContentSlide(3, "应用场景", [
  { type: "subtitle", text: "企业常见落地场景" },
  { type: "bullet", text: "智能客服：7×24 小时自动回复常见问题，提升响应速度与用户满意度。" },
  { type: "bullet", text: "内容生成：辅助撰写文章、营销文案、产品描述，提高创作效率。" },
  { type: "bullet", text: "数据分析：从非结构化数据中提取关键信息，自动生成报告与摘要。" },
  { type: "bullet", text: "知识问答：基于企业内部文档构建问答系统，让员工快速获取准确知识。" },
  { type: "bullet", text: "代码助手：代码生成、代码审查、技术文档生成，提升研发效率。" },
  { type: "bullet", text: "教育培训：打造个性化学习助手、智能答疑机器人、课程内容生成器。" },
]);

addContentWithScreenshot(4, "界面导览", [
  { type: "subtitle", text: "主要模块" },
  { type: "bullet", text: "控制台：进入平台后的首页，可查看应用列表、使用统计与快速入口。" },
  { type: "bullet", text: "应用列表：集中管理所有创建的应用，支持搜索、筛选与分类。" },
  { type: "bullet", text: "知识库：上传文档、配置检索策略，构建企业知识底座。" },
  { type: "bullet", text: "工具与插件：管理内置工具、自定义工具及扩展 Dify 能力的插件。" },
], "Dify 控制台主界面");

addContentSlide(5, "账户与设置", [
  { type: "subtitle", text: "API 扩展是什么？" },
  { type: "bullet", text: "API 扩展是 Dify 提供的一种集成方式：把已发布应用以标准 REST API 的形式，接入到企业微信、钉钉、飞书、自有网站等第三方系统。" },
  { type: "bullet", text: "通过 API 扩展，外部系统可以调用 Dify 应用的对话、生成、知识库检索等能力，实现 AI 能力的外挂式复用。" },
  { type: "subtitle", text: "账户设置要点" },
  { type: "bullet", text: "模型供应商配置：添加 OpenAI、Claude、通义千问、文心一言等 API Key。" },
  { type: "bullet", text: "成员管理：邀请团队成员，按需分配管理员、编辑、只读等角色。" },
  { type: "bullet", text: "数据源：配置数据库、API 等外部数据源，供应用或工具调用。" },
  { type: "bullet", text: "语言切换：支持中文、英文等多种界面语言，方便全球化团队使用。" },
]);

addSectionSlide("二", "模型配置");

addContentSlide(6, "支持的模型", [
  { type: "subtitle", text: "国内供应商" },
  { type: "bullet", text: "通义千问（阿里云）、文心一言（百度）、智谱 AI、讯飞星火、月之暗面（Kimi）等。" },
  { type: "subtitle", text: "OpenAI 兼容模型" },
  { type: "bullet", text: "任何兼容 OpenAI API 格式的模型均可接入，如 DeepSeek、零一万物等。" },
  { type: "subtitle", text: "私有模型" },
  { type: "bullet", text: "本地部署的开源模型，如 Llama、ChatGLM、Qwen 等。" },
  { type: "bullet", text: "可通过 Ollama、vLLM、Xinference 等工具部署并与 Dify 对接。" },
]);

addContentWithScreenshot(7, "API Key 配置", [
  { type: "subtitle", text: "配置步骤" },
  { type: "bullet", text: "步骤 1：点击右上角头像 → 设置 → 模型供应商。" },
  { type: "bullet", text: "步骤 2：选择目标供应商，例如 OpenAI、通义千问、智谱 AI 等。" },
  { type: "bullet", text: "步骤 3：填入 API Key，并根据需要设置模型名称、代理地址等参数。" },
  { type: "bullet", text: "步骤 4：点击保存后，使用测试按钮验证连接是否成功。" },
  { type: "subtitle", text: "常见问题排查" },
  { type: "bullet", text: "API Key 无效：检查是否复制完整、是否包含空格、是否已过期。" },
  { type: "bullet", text: "余额不足：登录供应商控制台确认账户额度。" },
  { type: "bullet", text: "网络问题：检查代理或防火墙设置，必要时切换网络环境。" },
], "模型供应商配置界面");

addContentSlide(8, "模型类型说明", [
  { type: "subtitle", text: "推理模型（对话/生成）" },
  { type: "bullet", text: "用于多轮对话、文本生成、问答等场景，如 GPT-4、Claude、通义千问。" },
  { type: "subtitle", text: "Embedding 模型（向量化）" },
  { type: "bullet", text: "将文本转换为高维向量，用于知识库语义检索与相似度匹配。" },
  { type: "subtitle", text: "Rerank 模型（重排序）" },
  { type: "bullet", text: "对初步检索结果重新打分排序，提升最终返回文档的相关性。" },
  { type: "subtitle", text: "语音转文本模型（ASR）" },
  { type: "bullet", text: "将语音输入转换为文字，支持语音对话、会议转写等场景。" },
  { type: "subtitle", text: "文本转语音模型（TTS）" },
  { type: "bullet", text: "将模型生成的文字转换为语音输出，支持语音播报、有声内容生成。" },
]);

addSectionSlide("三", "应用类型概览");

addContentSlide(9, "五种应用类型", [
  { type: "subtitle", text: "Chatbot（聊天助手）" },
  { type: "bullet", text: "多轮对话应用，支持上下文记忆，适用于客服、问答、陪练等场景。" },
  { type: "subtitle", text: "Completion（文本生成）" },
  { type: "bullet", text: "单次文本生成，输入-输出模式，适用于翻译、摘要、写作、文案生成。" },
  { type: "subtitle", text: "Agent（智能体）" },
  { type: "bullet", text: "具备推理与工具调用能力，可自主决策，适用于复杂任务和多步骤场景。" },
  { type: "subtitle", text: "Workflow（工作流）" },
  { type: "bullet", text: "可视化流程编排，节点拖拽、条件分支，适用于数据处理、自动化流程。" },
  { type: "subtitle", text: "Chatflow（对话流）" },
  { type: "bullet", text: "基于工作流的对话应用，融合多轮对话与流程控制，适合复杂对话场景。" },
]);

addSectionSlide("四", "普通智能体");

addContentSlide(10, "什么是普通智能体", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "普通智能体是 Dify 中最基础的应用形态，通过配置模型、提示词和工具，让模型完成特定任务。" },
  { type: "subtitle", text: "特点" },
  { type: "bullet", text: "配置简单：只需设置系统提示词并选择模型，即可快速发布。" },
  { type: "bullet", text: "快速上手：无需编排复杂工作流，适合业务人员快速验证想法。" },
  { type: "bullet", text: "灵活扩展：可添加内置或自定义工具，增强模型能力。" },
  { type: "subtitle", text: "适用场景" },
  { type: "bullet", text: "简单问答、文本生成、翻译、摘要、角色扮演等轻量级任务。" },
  { type: "subtitle", text: "包含的应用类型" },
  { type: "bullet", text: "聊天助手（Chatbot）、文本生成（Completion）、Agent（智能体）。" },
]);

addContentWithScreenshot(11, "创建流程", [
  { type: "subtitle", text: "六步完成创建" },
  { type: "bullet", text: "步骤 1：在控制台点击【创建应用】，选择聊天助手、文本生成或 Agent。" },
  { type: "bullet", text: "步骤 2：填写应用名称和描述，便于团队识别和后续维护。" },
  { type: "bullet", text: "步骤 3：选择底层模型，如 GPT-4、通义千问等，作为智能体的推理引擎。" },
  { type: "bullet", text: "步骤 4：编写系统提示词，定义模型角色、行为边界与输出格式。" },
  { type: "bullet", text: "步骤 5：（可选）添加工具，让模型能够查询实时数据或调用企业 API。" },
  { type: "bullet", text: "步骤 6：点击【发布】，应用即可通过 Web 界面或 API 对外提供服务。" },
], "创建应用界面");

addContentSlide(12, "系统提示词设计", [
  { type: "subtitle", text: "角色设定" },
  { type: "bullet", text: "明确告诉模型它是谁，例如：【你是一位专业的法律顾问】。" },
  { type: "subtitle", text: "规则约束" },
  { type: "bullet", text: "定义行为边界，例如：【只回答民事法律问题，拒绝回答投资、医疗等问题】。" },
  { type: "subtitle", text: "输出格式" },
  { type: "bullet", text: "指定输出结构，例如：【回答必须包含法律依据、分析过程、建议措施】。" },
  { type: "subtitle", text: "完整示例" },
  { type: "bullet", text: "你是一位专业的民事法律顾问。请根据用户描述提供法律依据、分析过程和建议措施；超出范围时请明确告知，并建议咨询专业律师。" },
]);

addContentSlide(13, "工具添加", [
  { type: "subtitle", text: "内置工具" },
  { type: "bullet", text: "Dify 提供 50+ 内置工具，如 Google 搜索、DALL·E 绘图、WolframAlpha 计算、天气查询等。" },
  { type: "bullet", text: "在应用配置中勾选即可使用，无需额外开发。" },
  { type: "subtitle", text: "自定义工具" },
  { type: "bullet", text: "通过 OpenAPI Schema 定义自己的工具，支持 REST API、GraphQL 等接口。" },
  { type: "bullet", text: "可配置 API Key、OAuth 等认证方式，适配企业内部系统。" },
  { type: "subtitle", text: "典型使用场景" },
  { type: "bullet", text: "查询实时数据（天气、股票、新闻）、调用企业 API（订单、库存、用户信息）、执行操作（发送邮件、创建任务）。" },
]);

addCaseSlide(
  14,
  "案例演示：法律知识问答助手",
  "用户需要一个能解答民事法律问题的智能助手，提供法律依据与可操作建议。",
  "创建 Chatbot 应用，配置法律专家角色提示词，设定输出格式包含法律依据、分析过程、建议措施。",
  "助手能准确识别法律问题，引用相关法条，用通俗易懂的语言给出专业建议。",
  "法律知识问答助手对话效果"
);

addContentSlide(15, "案例要点总结", [
  { type: "subtitle", text: "提示词设计技巧" },
  { type: "bullet", text: "角色设定要具体：明确专业领域、身份与服务对象。" },
  { type: "bullet", text: "规则约束要清晰：定义能回答什么、不能回答什么。" },
  { type: "bullet", text: "输出格式要规范：结构化输出便于用户理解与后续处理。" },
  { type: "subtitle", text: "边界处理" },
  { type: "bullet", text: "明确告知模型能力范围，超出范围时主动说明并给出引导。" },
  { type: "bullet", text: "添加免责声明，提醒用户咨询专业律师，避免法律风险。" },
]);

addSectionSlide("五", "工作流智能体");

addContentSlide(16, "什么是工作流智能体", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "工作流智能体通过可视化流程编排，将多个节点连接起来，按既定逻辑完成复杂任务。" },
  { type: "subtitle", text: "与普通智能体的区别" },
  { type: "bullet", text: "普通智能体：单步执行，模型直接根据提示词生成结果。" },
  { type: "bullet", text: "工作流智能体：多步执行，可包含条件判断、循环、变量传递和工具调用。" },
  { type: "subtitle", text: "适用场景" },
  { type: "bullet", text: "需要多步骤处理的复杂任务、需要条件分支的逻辑处理、需要调用多个工具或 API 的场景。" },
]);

addContentWithScreenshot(17, "工作流设计器", [
  { type: "subtitle", text: "核心操作" },
  { type: "bullet", text: "画布操作：支持拖拽节点、缩放画布、平移视图，方便编排复杂流程。" },
  { type: "bullet", text: "节点拖拽：从左侧面板拖拽所需节点到画布，快速搭建流程。" },
  { type: "bullet", text: "连线：点击节点输出端口并拖拽到另一节点输入端口，建立数据流。" },
  { type: "bullet", text: "调试运行：点击【调试】按钮，输入测试数据查看每一步输出。" },
  { type: "bullet", text: "版本管理：保存多个版本，可随时回滚到历史版本，降低改动风险。" },
], "工作流设计器界面");

addContentSlide(18, "节点类型", [
  { type: "subtitle", text: "开始节点" },
  { type: "bullet", text: "工作流的入口，定义整个流程需要接收的输入变量。" },
  { type: "subtitle", text: "LLM 节点" },
  { type: "bullet", text: "调用大语言模型，根据提示词生成文本或做出判断。" },
  { type: "subtitle", text: "条件节点" },
  { type: "bullet", text: "根据设定条件分支，执行不同路径，实现 if/else 逻辑。" },
  { type: "subtitle", text: "变量节点" },
  { type: "bullet", text: "定义、转换和传递变量，让数据在节点间流动。" },
  { type: "subtitle", text: "结束节点" },
  { type: "bullet", text: "工作流的出口，定义最终返回给调用方的输出变量。" },
]);

addContentSlide(19, "变量传递", [
  { type: "subtitle", text: "输入变量" },
  { type: "bullet", text: "由开始节点传入，或从上游节点的输出中获取。" },
  { type: "subtitle", text: "输出变量" },
  { type: "bullet", text: "每个节点执行后产生的结果，可传递给下游节点继续使用。" },
  { type: "subtitle", text: "变量引用" },
  { type: "bullet", text: "在节点中使用 {{variable_name}} 语法引用变量。" },
  { type: "bullet", text: "支持字符串、数字、对象、数组等多种数据类型。" },
  { type: "subtitle", text: "示例" },
  { type: "bullet", text: "开始节点输入：{{user_input}}；LLM 节点输出：{{llm_result}}；结束节点输出：{{final_output}}。" },
]);

addCaseSlide(
  20,
  "案例演示：信息提取助手",
  "从非结构化文本（如会议纪要、邮件、合同）中提取人名、时间、地点、事件等关键信息。",
  "设计工作流：开始节点接收文本 → LLM 节点提取信息 → 代码节点格式化为 JSON → 结束节点输出。",
  "自动从任意文本中提取结构化信息，输出格式统一，准确率高，便于后续系统对接。",
  "信息提取工作流设计器截图"
);

addContentSlide(21, "案例要点总结", [
  { type: "subtitle", text: "节点编排" },
  { type: "bullet", text: "合理拆分任务，每个节点只完成一个明确的子任务，降低单节点复杂度。" },
  { type: "bullet", text: "使用条件节点处理不同情况，提高流程的健壮性。" },
  { type: "subtitle", text: "输出格式化" },
  { type: "bullet", text: "使用代码节点或模板节点格式化输出，确保结构统一。" },
  { type: "bullet", text: "根据下游系统需求，支持 JSON、XML、CSV 等多种输出格式。" },
]);

addSectionSlide("六", "Chatflow 智能体");

addContentSlide(22, "什么是 Chatflow", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "Chatflow 是基于工作流的对话应用，结合了工作流的流程控制能力与对话的多轮交互能力。" },
  { type: "subtitle", text: "与工作流的区别" },
  { type: "bullet", text: "工作流：单次执行，输入→处理→输出，适合批处理或一次性任务。" },
  { type: "bullet", text: "Chatflow：多轮对话，支持上下文记忆和动态流程控制，适合交互式场景。" },
  { type: "subtitle", text: "适用场景" },
  { type: "bullet", text: "需要多轮对话收集信息的场景、需要根据对话内容动态调整流程的场景、复杂客服、咨询、导购场景。" },
]);

addContentSlide(23, "对话流设计", [
  { type: "subtitle", text: "多轮对话" },
  { type: "bullet", text: "模型自动保存对话历史，能在多轮交互中保持上下文连贯。" },
  { type: "subtitle", text: "上下文传递" },
  { type: "bullet", text: "通过变量在不同节点间传递用户输入、历史记录和中间结果。" },
  { type: "subtitle", text: "流程控制" },
  { type: "bullet", text: "根据用户回答动态调整对话流程，使用条件节点判断意图并进入不同分支。" },
]);

addContentSlide(24, "上下文管理", [
  { type: "subtitle", text: "会话记忆" },
  { type: "bullet", text: "自动保存对话历史，支持多轮交互；可配置记忆轮数，控制上下文长度。" },
  { type: "subtitle", text: "变量作用域" },
  { type: "bullet", text: "全局变量：整个会话期间有效，适合保存用户身份等长期信息。" },
  { type: "bullet", text: "局部变量：单个节点内有效，用于临时计算。" },
  { type: "bullet", text: "会话变量：单次对话内有效，用于保存当前对话的上下文状态。" },
]);

addContentSlide(25, "对话开场白", [
  { type: "subtitle", text: "设置方法" },
  { type: "bullet", text: "在应用配置中设置开场白内容，支持文本、图片、按钮、快捷问题等多种元素。" },
  { type: "subtitle", text: "引导设计" },
  { type: "bullet", text: "明确告诉用户能做什么、不能做什么，降低用户试探成本。" },
  { type: "bullet", text: "提供示例问题，帮助用户快速进入有效对话。" },
  { type: "bullet", text: "设置快捷按钮，让用户一键选择常见意图。" },
]);

addCaseSlide(
  26,
  "案例演示：多轮问答助手",
  "构建一个能通过多轮对话收集用户信息（如预算、偏好、使用场景）并给出个性化建议的助手。",
  "使用 Chatflow 设计对话流程：开场引导 → 问题分类 → 追问收集 → 综合建议。",
  "助手能自然地引导对话，收集完整信息后给出针对性强、个性化的建议。",
  "多轮问答助手对话效果"
);

addContentSlide(27, "案例要点总结", [
  { type: "subtitle", text: "上下文管理技巧" },
  { type: "bullet", text: "合理设置记忆轮数，避免上下文过长导致模型性能下降和成本增加。" },
  { type: "bullet", text: "使用变量保存关键信息，减少重复提问。" },
  { type: "bullet", text: "设计清晰的对话流程，避免用户迷失或进入死胡同。" },
]);

addSectionSlide("七", "普通知识库");

addContentSlide(28, "什么是知识库", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "知识库是 Dify 中用于存储、管理和检索文档的系统，是 RAG 应用的数据底座。" },
  { type: "subtitle", text: "RAG 原理简介" },
  { type: "bullet", text: "RAG（Retrieval-Augmented Generation）= 检索 + 生成。" },
  { type: "bullet", text: "先从知识库中检索与用户问题相关的文档片段，再让模型基于检索结果生成回答。" },
  { type: "bullet", text: "通过引入外部知识，显著减少模型幻觉，提高回答的事实性与可解释性。" },
]);

addContentWithScreenshot(29, "创建知识库", [
  { type: "subtitle", text: "创建步骤" },
  { type: "bullet", text: "步骤 1：进入【知识库】页面，点击【创建知识库】。" },
  { type: "bullet", text: "步骤 2：填写知识库名称和描述，便于识别与管理。" },
  { type: "bullet", text: "步骤 3：选择索引模式：高质量模式效果更好，经济模式成本更低。" },
  { type: "bullet", text: "步骤 4：上传文档，系统自动完成解析、分段和向量化处理。" },
], "创建知识库界面截图");

addContentSlide(30, "文档上传", [
  { type: "subtitle", text: "支持格式" },
  { type: "bullet", text: "文本文件：TXT、Markdown、HTML。" },
  { type: "bullet", text: "办公文档：PDF、DOCX、PPTX、XLSX。" },
  { type: "bullet", text: "电子书：EPUB。" },
  { type: "subtitle", text: "大小与数量限制" },
  { type: "bullet", text: "单文件最大 15MB，单个知识库最多支持 1000 个文档（视部署版本而定）。" },
]);

addContentSlide(31, "分段策略", [
  { type: "subtitle", text: "自动分段" },
  { type: "bullet", text: "系统按段落、句子自动分段，适合结构清晰的文档。" },
  { type: "subtitle", text: "自定义分段" },
  { type: "bullet", text: "按指定分隔符（如换行、特定标记）分段，适合日志、FAQ 等特定格式。" },
  { type: "subtitle", text: "分段长度" },
  { type: "bullet", text: "建议 300-500 token，太短会丢失上下文，太长会降低检索精度。" },
]);

addContentSlide(32, "检索模式", [
  { type: "subtitle", text: "语义检索" },
  { type: "bullet", text: "基于向量相似度检索，能理解同义词和语义关联，适合模糊查询。" },
  { type: "subtitle", text: "关键词检索" },
  { type: "bullet", text: "基于关键词精确匹配，适合查找专有名词、型号、编号。" },
  { type: "subtitle", text: "混合检索" },
  { type: "bullet", text: "结合语义检索与关键词检索，综合排序，通常效果最佳，推荐默认使用。" },
]);

addCaseSlide(
  33,
  "案例演示：产品手册问答",
  "基于产品手册构建问答系统，让用户能够快速查询产品功能和使用方法。",
  "创建知识库上传产品手册，配置混合检索模式，再创建聊天助手关联该知识库。",
  "用户提问产品相关问题时，系统从手册中检索相关内容并生成准确、可追溯的回答。",
  "产品手册问答效果截图"
);

addContentSlide(34, "案例要点总结", [
  { type: "subtitle", text: "分段策略选择" },
  { type: "bullet", text: "结构化文档（如手册、规范）建议使用自动分段，保留原有章节逻辑。" },
  { type: "bullet", text: "非结构化文档（如笔记、聊天记录）建议使用自定义分段，提升检索粒度。" },
  { type: "subtitle", text: "召回优化" },
  { type: "bullet", text: "调整 TopK 参数，控制返回文档数量，避免引入噪音。" },
  { type: "bullet", text: "使用 Rerank 模型对结果重排序，提高最终生成质量。" },
]);

addSectionSlide("八", "工作流知识库");

addContentSlide(35, "知识库检索节点", [
  { type: "subtitle", text: "节点配置" },
  { type: "bullet", text: "选择知识库：从已有知识库中选择需要检索的数据源。" },
  { type: "bullet", text: "查询变量：指定检索关键词来源，通常是用户输入或上游节点输出。" },
  { type: "subtitle", text: "检索参数" },
  { type: "bullet", text: "TopK：返回最相关的 K 个文档片段。" },
  { type: "bullet", text: "Score 阈值：过滤低相关性结果，只有高于阈值的结果才会被使用。" },
  { type: "bullet", text: "检索模式：语义 / 关键词 / 混合。" },
]);

addContentSlide(36, "检索策略", [
  { type: "subtitle", text: "TopK" },
  { type: "bullet", text: "控制返回文档数量，建议 3-5 个；过多会引入噪音，过少可能遗漏关键信息。" },
  { type: "subtitle", text: "Score 阈值" },
  { type: "bullet", text: "过滤低相关性结果，建议 0.5-0.7；阈值过低会引入无关内容，过高则可能漏答。" },
  { type: "subtitle", text: "重排序" },
  { type: "bullet", text: "使用 Rerank 模型对初步检索结果重新打分排序，把最相关的内容排在前面。" },
]);

addCaseSlide(
  37,
  "案例演示：智能问答工作流",
  "构建一个结合知识库检索和 LLM 生成的智能问答工作流，实现有据可依的精准问答。",
  "工作流设计：开始节点 → 知识库检索节点 → LLM 节点（结合检索结果生成回答）→ 结束节点。",
  "回答基于知识库内容生成，可追溯到原文档，有效减少模型幻觉。",
  "智能问答工作流截图"
);

addContentSlide(38, "案例要点总结", [
  { type: "subtitle", text: "检索策略优化" },
  { type: "bullet", text: "根据实际回答效果调整 TopK 和 Score 阈值，找到平衡点。" },
  { type: "bullet", text: "使用 Rerank 模型提高检索精度，尤其在知识库较大时效果明显。" },
  { type: "bullet", text: "定期更新知识库，删除过期内容，保持回答的时效性。" },
]);

addSectionSlide("九", "外部知识库");

addContentSlide(39, "什么是外部知识库", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "外部知识库是连接外部数据源的知识库，文档保留在企业已有的文档系统或数据库中。" },
  { type: "subtitle", text: "与内部知识库的区别" },
  { type: "bullet", text: "内部知识库：文档上传到 Dify，由 Dify 完成解析、索引和存储。" },
  { type: "bullet", text: "外部知识库：文档保留在外部系统，Dify 通过标准 API 实时检索。" },
  { type: "subtitle", text: "适用场景" },
  { type: "bullet", text: "企业已有成熟文档管理系统、文档量巨大、需要实时检索最新数据的场景。" },
]);

addContentSlide(40, "外部知识库 API", [
  { type: "subtitle", text: "API 规范" },
  { type: "bullet", text: "遵循 Dify 外部知识库 API 规范，提供检索接口。" },
  { type: "bullet", text: "接口接收查询文本和参数，返回相关文档片段及元数据。" },
  { type: "subtitle", text: "认证方式" },
  { type: "bullet", text: "API Key：简单认证，适合内部系统对接。" },
  { type: "bullet", text: "OAuth：标准认证，适合第三方系统或跨企业场景。" },
  { type: "subtitle", text: "请求与返回" },
  { type: "bullet", text: "通常使用 POST 请求，返回 JSON 格式的检索结果。" },
]);

addContentWithScreenshot(41, "创建外部知识库", [
  { type: "subtitle", text: "创建步骤" },
  { type: "bullet", text: "步骤 1：在外部系统实现符合 Dify 规范的检索 API。" },
  { type: "bullet", text: "步骤 2：进入 Dify 知识库页面，选择【创建外部知识库】。" },
  { type: "bullet", text: "步骤 3：配置 API 端点、认证信息和请求参数。" },
  { type: "bullet", text: "步骤 4：测试检索，确认返回结果格式正确后即可使用。" },
], "创建外部知识库界面截图");

addContentSlide(42, "检索配置", [
  { type: "subtitle", text: "检索参数" },
  { type: "bullet", text: "TopK：返回文档数量；Score 阈值：最低相关性分数。" },
  { type: "subtitle", text: "重排序" },
  { type: "bullet", text: "可配置 Rerank 模型对返回结果重新排序，提升最终效果。" },
  { type: "subtitle", text: "过滤条件" },
  { type: "bullet", text: "按文档类型、时间、标签、权限等条件过滤，实现精细化检索。" },
]);

addCaseSlide(
  43,
  "案例演示：连接企业知识系统",
  "企业已有内部知识库系统，希望在 Dify 中统一检索和使用。",
  "开发 API 适配层，将企业内部检索接口封装为 Dify 外部知识库 API，完成对接。",
  "员工可通过 Dify 统一访问企业知识系统，无需切换多个平台，提升工作效率。",
  "企业知识系统集成架构截图"
);

addContentSlide(44, "案例要点总结", [
  { type: "subtitle", text: "API 设计要点" },
  { type: "bullet", text: "接口保持简洁，遵循 RESTful 规范，返回结构化的检索结果。" },
  { type: "bullet", text: "文档元数据（标题、链接、时间）有助于提升回答可信度。" },
  { type: "subtitle", text: "性能优化" },
  { type: "bullet", text: "使用缓存减少外部系统压力，设置合理超时时间，避免阻塞主流程。" },
]);

addSectionSlide("十", "MCP 与自定义工具");

addContentSlide(45, "什么是 MCP", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "MCP（Model Context Protocol）是模型上下文协议，用于标准化模型与外部工具之间的通信。" },
  { type: "subtitle", text: "作用" },
  { type: "bullet", text: "让模型能够发现、调用并理解外部工具返回的结果，扩展模型能力边界。" },
  { type: "subtitle", text: "优势" },
  { type: "bullet", text: "统一接口，降低工具集成成本；生态丰富，可复用社区已有工具。" },
]);

addContentWithScreenshot(46, "MCP 服务器配置", [
  { type: "subtitle", text: "配置步骤" },
  { type: "bullet", text: "添加 MCP 服务器：填写服务器地址、端口和描述。" },
  { type: "bullet", text: "认证配置：根据服务器要求选择 API Key 或 OAuth 认证。" },
  { type: "bullet", text: "参数设置：配置超时时间、重试次数、并发限制等。" },
  { type: "bullet", text: "测试连接：保存前使用测试功能确认服务器可用。" },
], "MCP 服务器配置界面截图");

addContentSlide(47, "自定义工具", [
  { type: "subtitle", text: "创建自定义工具" },
  { type: "bullet", text: "通过 OpenAPI Schema 定义工具接口，支持 REST API、GraphQL 等。" },
  { type: "subtitle", text: "API 定义" },
  { type: "bullet", text: "定义接口路径、请求方法、参数结构、返回值格式和错误码说明。" },
  { type: "subtitle", text: "参数配置" },
  { type: "bullet", text: "配置参数类型、是否必填、默认值、枚举值等，让模型准确理解工具用法。" },
]);

addCaseSlide(
  48,
  "案例演示：集成外部 API 工具",
  "让智能体能够调用企业内部 API，查询订单、库存、客户等业务数据。",
  "将内部 API 封装为自定义工具，配置认证方式，在 Agent 应用中添加并授权该工具。",
  "智能体可根据用户问题自动调用相应 API，实时查询业务数据并给出准确回答。",
  "自定义工具配置与运行效果截图"
);

addContentSlide(49, "案例要点总结", [
  { type: "subtitle", text: "工具设计最佳实践" },
  { type: "bullet", text: "工具职责单一：一个工具只做一件事，便于模型理解和维护。" },
  { type: "bullet", text: "参数清晰：使用简洁、描述明确的参数名和说明。" },
  { type: "bullet", text: "返回结构化数据：便于模型解析和生成最终回答。" },
]);

addSectionSlide("十一", "API 集成");

addContentSlide(50, "后端即服务", [
  { type: "subtitle", text: "API 概览" },
  { type: "bullet", text: "Dify 提供完整的 REST API，可集成到 Web、移动应用、企业系统等多种场景。" },
  { type: "bullet", text: "支持对话、文本生成、知识库检索、文件上传等多种能力。" },
  { type: "subtitle", text: "认证方式" },
  { type: "bullet", text: "在请求头中传递 Authorization: Bearer {api_key} 完成认证。" },
]);

addContentWithScreenshot(51, "获取 API 密钥", [
  { type: "subtitle", text: "获取步骤" },
  { type: "bullet", text: "步骤 1：进入目标应用的详情页。" },
  { type: "bullet", text: "步骤 2：点击【API 访问】标签，查看 API 端点与密钥管理。" },
  { type: "bullet", text: "步骤 3：点击【API 密钥】，创建一个新密钥。" },
  { type: "bullet", text: "步骤 4：复制密钥并妥善保存，避免泄露。" },
], "API 密钥管理界面截图");

addContentSlide(52, "API 调用示例", [
  { type: "subtitle", text: "curl 示例" },
  { type: "code", text: "curl -X POST 'https://api.dify.ai/v1/chat-messages' \\" },
  { type: "code", text: "  -H 'Authorization: Bearer {api_key}' \\" },
  { type: "code", text: "  -H 'Content-Type: application/json' \\" },
  { type: "code", text: "  -d '{\"inputs\": {}, \"query\": \"你好\", \"user\": \"user-123\"}'" },
  { type: "subtitle", text: "返回结果" },
  { type: "bullet", text: "接口返回 JSON，包含回答文本、conversation_id、message_id 等字段。" },
]);

addContentSlide(53, "会话管理", [
  { type: "subtitle", text: "会话 ID" },
  { type: "bullet", text: "每个对话拥有唯一的 conversation_id，用于关联同一用户的多轮交互。" },
  { type: "subtitle", text: "上下文保持" },
  { type: "bullet", text: "在后续请求中传入 conversation_id，模型就能记住之前的对话内容。" },
  { type: "bullet", text: "不传 conversation_id 时，每次请求都是一次新对话。" },
]);

addCaseSlide(
  54,
  "案例演示：搭建 Web 前端调用 Dify API",
  "用 HTML + JavaScript 搭建一个独立的问答页面，让用户在浏览器中直接与 Dify 应用交互。",
  "创建前端页面，使用 fetch 调用 Dify API，处理流式响应并展示对话结果。",
  "无需依赖第三方平台，即可在企业官网或内部系统中嵌入 AI 对话能力。",
  "Web 前端调用 Dify API 示例截图"
);

addContentSlide(55, "案例要点总结", [
  { type: "subtitle", text: "错误处理" },
  { type: "bullet", text: "处理网络错误、API 错误、超时等异常，给用户友好的错误提示。" },
  { type: "subtitle", text: "最佳实践" },
  { type: "bullet", text: "使用环境变量存储 API Key，不要硬编码在前端代码中。" },
  { type: "bullet", text: "实现重试和兜底机制，提高系统稳定性。" },
  { type: "bullet", text: "记录关键日志，便于问题排查和性能优化。" },
]);

addSectionSlide("十二", "最佳实践 — 会议纪要助手");

addCaseSlide(
  56,
  "案例场景",
  "输入会议内容（语音或文字），输出结构化会议纪要，包含议题、决议、待办事项。",
  "使用 Dify 构建工作流：语音转文字 → 提取关键信息 → 按模板生成结构化纪要。",
  "自动从会议内容中提取关键信息，生成规范纪要，显著节省人工整理时间。",
  "会议纪要助手工作流截图"
);

addContentSlide(57, "知识库与工作流设计", [
  { type: "subtitle", text: "知识库准备" },
  { type: "bullet", text: "上传会议纪要模板，定义输出格式和标准字段。" },
  { type: "bullet", text: "上传历史优秀纪要作为参考，帮助模型学习组织风格。" },
  { type: "subtitle", text: "工作流设计" },
  { type: "bullet", text: "LLM 节点 1：从会议内容中提取关键信息（议题、决议、待办）。" },
  { type: "bullet", text: "LLM 节点 2：基于模板生成结构化纪要。" },
  { type: "bullet", text: "代码节点：格式化输出为 Markdown、JSON 或邮件格式。" },
]);

addContentSlide(58, "智能体配置", [
  { type: "subtitle", text: "关联知识库" },
  { type: "bullet", text: "绑定会议纪要模板知识库，让模型参考模板生成统一格式。" },
  { type: "subtitle", text: "提示词设计" },
  { type: "bullet", text: "角色：专业的会议纪要整理助手。" },
  { type: "bullet", text: "任务：从会议内容中提取关键信息，按模板生成纪要。" },
  { type: "bullet", text: "输出格式：包含议题、决议、待办事项、负责人、截止时间。" },
]);

addContentSlide(59, "发布与总结", [
  { type: "subtitle", text: "通过 API 将案例暴露为服务" },
  { type: "bullet", text: "获取 API 密钥后，集成到企业微信、钉钉、飞书或自有系统。" },
  { type: "bullet", text: "员工可直接在 IM 中发送会议内容，自动获取整理后的纪要。" },
  { type: "subtitle", text: "优化与成本控制" },
  { type: "bullet", text: "提示词技巧：明确输出格式，使用结构化提示。" },
  { type: "bullet", text: "性能优化：选择合适模型，平衡质量与成本；设置 Token 限制，避免超长输入。" },
]);

addSectionSlide("十三", "总结");

addContentSlide(60, "内容回顾", [
  { type: "subtitle", text: "7 个核心案例" },
  { type: "bullet", text: "法律知识问答助手（普通智能体）" },
  { type: "bullet", text: "信息提取助手（工作流智能体）" },
  { type: "bullet", text: "多轮问答助手（Chatflow 智能体）" },
  { type: "bullet", text: "产品手册问答（普通知识库）" },
  { type: "bullet", text: "智能问答工作流（工作流知识库）" },
  { type: "bullet", text: "连接企业知识系统（外部知识库）" },
  { type: "bullet", text: "集成外部 API 工具（MCP 与自定义工具）" },
  { type: "subtitle", text: "核心知识点" },
  { type: "bullet", text: "应用类型、模型配置、知识库、工作流、API 集成、最佳实践。" },
]);

addContentSlide(61, "后续学习资源", [
  { type: "subtitle", text: "官方文档与代码" },
  { type: "bullet", text: "https://docs.dify.ai - 完整的使用指南与 API 文档。" },
  { type: "bullet", text: "https://github.com/langgenius/dify - 开源代码仓库。" },
  { type: "subtitle", text: "社区交流" },
  { type: "bullet", text: "Discord 社区：与全球开发者交流经验。" },
  { type: "bullet", text: "GitHub Discussions：提问、反馈和贡献。" },
  { type: "subtitle", text: "示例库" },
  { type: "bullet", text: "官方示例：https://docs.dify.ai/getting-started/readme/examples" },
  { type: "bullet", text: "社区分享：查看其他用户的应用案例与最佳实践。" },
]);

addContentSlide(62, "答疑环节", [
  { type: "subtitle", text: "Q&A 互动" },
  { type: "bullet", text: "欢迎提问！" },
  { type: "bullet", text: "常见问题参考：" },
  { type: "bullet", text: "  • 如何选择合适的模型？" },
  { type: "bullet", text: "  • 如何优化知识库检索效果？" },
  { type: "bullet", text: "  • 如何降低 API 调用成本？" },
  { type: "bullet", text: "  • 如何处理敏感数据与权限控制？" },
]);

addEndSlide();

const outputPath = "docs/pptx/Dify-使用讲解-v3.4-swiss.pptx";
pptx
  .writeFile({ fileName: outputPath })
  .then(() => {
    console.log(`✓ PPT 生成成功：${outputPath}`);
    console.log(`✓ 内容页数：63 页（含 13 个章节分隔页，总幻灯片约 77 页）`);
  })
  .catch((err) => {
    console.error("✗ PPT 生成失败：", err);
    process.exit(1);
  });
