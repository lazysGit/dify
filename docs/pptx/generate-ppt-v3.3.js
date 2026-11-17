const PptxGenJS = require("pptxgenjs");

// 阿里橙色主题
const COLORS = {
  primary: "FF6A00",
  primaryDark: "E05D00",
  primaryLight: "FF8533",
  accent: "FFB380",
  dark: "1A1A2E",
  darkGray: "2D2D44",
  gray: "666666",
  lightGray: "F5F5F5",
  white: "FFFFFF",
  text: "333333",
};

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Dify";
pptx.title = "Dify 使用讲解";
pptx.subject = "Dify 平台使用讲解 v3.3";

let pageNum = 0;

// 添加标题页
function addTitleSlide(title, subtitle) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.primary };
  slide.addText(title, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.5,
    fontSize: 48,
    bold: true,
    color: COLORS.white,
    fontFace: "Arial Black",
    align: "center",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 4.2,
      w: 9,
      h: 1,
      fontSize: 24,
      color: COLORS.white,
      fontFace: "Calibri",
      align: "center",
    });
  }
}

// 添加章节分隔页
function addSectionSlide(partNum, title) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.primaryDark };
  slide.addText(`第${partNum}部分`, {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1,
    fontSize: 32,
    color: COLORS.accent,
    fontFace: "Calibri",
    align: "center",
  });
  slide.addText(title, {
    x: 0.5,
    y: 3,
    w: 9,
    h: 1.5,
    fontSize: 40,
    bold: true,
    color: COLORS.white,
    fontFace: "Arial Black",
    align: "center",
  });
}

// 添加内容页
function addContentSlide(num, title, content, options = {}) {
  pageNum++;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };

  // 标题栏
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.8,
    fill: { color: COLORS.primary },
  });
  slide.addText(`${num}. ${title}`, {
    x: 0.3,
    y: 0.15,
    w: 9.4,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: COLORS.white,
    fontFace: "Arial Black",
  });

  // 内容
  if (typeof content === "string") {
    slide.addText(content, {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 5,
      fontSize: 18,
      color: COLORS.text,
      fontFace: "Calibri",
      valign: "top",
      lineSpacingMultiple: 1.5,
    });
  } else if (Array.isArray(content)) {
    let yPos = 1.2;
    content.forEach((item) => {
      if (item.type === "bullet") {
        slide.addText(`• ${item.text}`, {
          x: 0.5,
          y: yPos,
          w: 9,
          h: 0.5,
          fontSize: 16,
          color: COLORS.text,
          fontFace: "Calibri",
        });
        yPos += 0.6;
      } else if (item.type === "subtitle") {
        slide.addText(item.text, {
          x: 0.5,
          y: yPos,
          w: 9,
          h: 0.5,
          fontSize: 20,
          bold: true,
          color: COLORS.primary,
          fontFace: "Calibri",
        });
        yPos += 0.6;
      } else if (item.type === "image-placeholder") {
        slide.addShape(pptx.ShapeType.rect, {
          x: 1,
          y: yPos,
          w: 8,
          h: 3,
          fill: { color: COLORS.lightGray },
          line: { color: COLORS.gray, dashType: "dash", width: 2 },
        });
        slide.addText(`[截图占位: ${item.text}]`, {
          x: 1,
          y: yPos + 1.2,
          w: 8,
          h: 0.6,
          fontSize: 16,
          color: COLORS.gray,
          fontFace: "Calibri",
          align: "center",
        });
        yPos += 3.5;
      }
    });
  }

  // 页码
  slide.addText(`${pageNum}`, {
    x: 9.2,
    y: 7,
    w: 0.6,
    h: 0.4,
    fontSize: 12,
    color: COLORS.gray,
    fontFace: "Calibri",
    align: "center",
  });
}

// 添加案例页
function addCaseSlide(num, title, scenario, solution, result) {
  pageNum++;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };

  // 标题栏
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.8,
    fill: { color: COLORS.primary },
  });
  slide.addText(`${num}. ${title}`, {
    x: 0.3,
    y: 0.15,
    w: 9.4,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: COLORS.white,
    fontFace: "Arial Black",
  });

  // 三栏布局
  const colWidth = 2.8;
  const colGap = 0.2;
  const startX = 0.5;
  const startY = 1.2;
  const colHeight = 5.5;

  // 场景
  slide.addShape(pptx.ShapeType.rect, {
    x: startX,
    y: startY,
    w: colWidth,
    h: colHeight,
    fill: { color: COLORS.lightGray },
    line: { color: COLORS.primary, width: 2 },
  });
  slide.addText("场景", {
    x: startX,
    y: startY + 0.2,
    w: colWidth,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: COLORS.primary,
    fontFace: "Calibri",
    align: "center",
  });
  slide.addText(scenario, {
    x: startX + 0.1,
    y: startY + 0.8,
    w: colWidth - 0.2,
    h: colHeight - 1,
    fontSize: 14,
    color: COLORS.text,
    fontFace: "Calibri",
    valign: "top",
    lineSpacingMultiple: 1.3,
  });

  // 方案
  const col2X = startX + colWidth + colGap;
  slide.addShape(pptx.ShapeType.rect, {
    x: col2X,
    y: startY,
    w: colWidth,
    h: colHeight,
    fill: { color: COLORS.lightGray },
    line: { color: COLORS.primary, width: 2 },
  });
  slide.addText("方案", {
    x: col2X,
    y: startY + 0.2,
    w: colWidth,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: COLORS.primary,
    fontFace: "Calibri",
    align: "center",
  });
  slide.addText(solution, {
    x: col2X + 0.1,
    y: startY + 0.8,
    w: colWidth - 0.2,
    h: colHeight - 1,
    fontSize: 14,
    color: COLORS.text,
    fontFace: "Calibri",
    valign: "top",
    lineSpacingMultiple: 1.3,
  });

  // 效果
  const col3X = col2X + colWidth + colGap;
  slide.addShape(pptx.ShapeType.rect, {
    x: col3X,
    y: startY,
    w: colWidth,
    h: colHeight,
    fill: { color: COLORS.lightGray },
    line: { color: COLORS.primary, width: 2 },
  });
  slide.addText("效果", {
    x: col3X,
    y: startY + 0.2,
    w: colWidth,
    h: 0.4,
    fontSize: 18,
    bold: true,
    color: COLORS.primary,
    fontFace: "Calibri",
    align: "center",
  });
  slide.addText(result, {
    x: col3X + 0.1,
    y: startY + 0.8,
    w: colWidth - 0.2,
    h: colHeight - 1,
    fontSize: 14,
    color: COLORS.text,
    fontFace: "Calibri",
    valign: "top",
    lineSpacingMultiple: 1.3,
  });

  // 页码
  slide.addText(`${pageNum}`, {
    x: 9.2,
    y: 7,
    w: 0.6,
    h: 0.4,
    fontSize: 12,
    color: COLORS.gray,
    fontFace: "Calibri",
    align: "center",
  });
}

// 添加结束页
function addEndSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.primary };
  slide.addText("感谢聆听", {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.5,
    fontSize: 48,
    bold: true,
    color: COLORS.white,
    fontFace: "Arial Black",
    align: "center",
  });
  slide.addText("Q&A 答疑环节", {
    x: 0.5,
    y: 4.2,
    w: 9,
    h: 1,
    fontSize: 28,
    color: COLORS.white,
    fontFace: "Calibri",
    align: "center",
  });
}

// ==================== 生成 PPT 内容 ====================

// 封面
addTitleSlide("Dify 使用讲解", "v3.3 | 2026-07-04");

// 第一部分：平台概览
addSectionSlide("一", "平台概览");

addContentSlide(1, "Dify 是什么", [
  { type: "subtitle", text: "一句话定义" },
  { type: "bullet", text: "Dify 是一个开源的大语言模型（LLM）应用开发平台" },
  { type: "bullet", text: "让开发者和业务人员快速构建 AI 应用，无需复杂编程" },
  { type: "subtitle", text: "核心价值" },
  { type: "bullet", text: "可视化编排：通过拖拽节点构建复杂工作流" },
  { type: "bullet", text: "模型无关：支持数百种 LLM 模型，灵活切换" },
  { type: "bullet", text: "快速部署：Docker 一键部署，开箱即用" },
  { type: "bullet", text: "企业级：支持团队协作、权限管理、API 集成" },
]);

addContentSlide(2, "核心功能", [
  { type: "bullet", text: "工作流（Workflow）：可视化流程编排，支持条件分支、循环、变量传递" },
  { type: "bullet", text: "Agent（智能体）：具备推理和工具调用能力，可自主决策完成复杂任务" },
  { type: "bullet", text: "RAG（检索增强生成）：基于知识库的问答系统，减少模型幻觉" },
  { type: "bullet", text: "模型管理：统一配置多家模型供应商，灵活切换和对比" },
  { type: "bullet", text: "API 集成：提供标准 REST API，轻松集成到现有系统" },
]);

addContentSlide(3, "应用场景", [
  { type: "bullet", text: "智能客服：7x24 小时自动回复，处理常见问题，提升客户满意度" },
  { type: "bullet", text: "内容生成：文章撰写、营销文案、产品描述，提高创作效率" },
  { type: "bullet", text: "数据分析：从非结构化数据中提取洞察，生成报告和摘要" },
  { type: "bullet", text: "知识问答：基于企业内部文档构建问答系统，快速检索知识" },
  { type: "bullet", text: "代码助手：代码生成、代码审查、技术文档生成" },
  { type: "bullet", text: "教育培训：个性化学习助手、智能答疑、课程内容生成" },
]);

addContentSlide(4, "界面导览", [
  { type: "image-placeholder", text: "Dify 控制台主界面" },
  { type: "bullet", text: "控制台：应用列表、快速入口、使用统计" },
  { type: "bullet", text: "应用列表：管理所有创建的应用，支持搜索和筛选" },
  { type: "bullet", text: "知识库：管理文档、配置检索策略" },
  { type: "bullet", text: "工具：内置工具和自定义工具管理" },
  { type: "bullet", text: "插件：扩展 Dify 功能的插件市场" },
]);

addContentSlide(5, "账户与设置", [
  { type: "bullet", text: "模型供应商配置：添加 OpenAI、Claude、国产模型等 API Key" },
  { type: "bullet", text: "成员管理：邀请团队成员，分配角色和权限" },
  { type: "bullet", text: "数据源：配置外部数据源，如数据库、API" },
  { type: "bullet", text: "API 扩展：通过 API 将 Dify 应用集成到第三方系统，如企业微信、钉钉、自有网站" },
  { type: "bullet", text: "语言切换：支持中文、英文等多种语言界面" },
]);

// 第二部分：模型配置
addSectionSlide("二", "模型配置");

addContentSlide(6, "支持的模型", [
  { type: "subtitle", text: "国内供应商" },
  { type: "bullet", text: "通义千问（阿里云）、文心一言（百度）、智谱 AI、讯飞星火、月之暗面（Kimi）" },
  { type: "subtitle", text: "OpenAI 兼容模型" },
  { type: "bullet", text: "任何兼容 OpenAI API 格式的模型，如 DeepSeek、零一万物等" },
  { type: "subtitle", text: "私有模型" },
  { type: "bullet", text: "本地部署的开源模型，如 Llama、ChatGLM、Qwen 等" },
  { type: "bullet", text: "通过 Ollama、vLLM 等工具部署私有模型" },
]);

addContentSlide(7, "API Key 配置", [
  { type: "image-placeholder", text: "模型供应商配置界面" },
  { type: "bullet", text: "步骤 1：进入设置 → 模型供应商" },
  { type: "bullet", text: "步骤 2：选择供应商，如 OpenAI、通义千问等" },
  { type: "bullet", text: "步骤 3：填写 API Key，保存配置" },
  { type: "bullet", text: "步骤 4：测试连接，确认配置成功" },
  { type: "subtitle", text: "常见问题" },
  { type: "bullet", text: "API Key 无效：检查是否复制完整，是否过期" },
  { type: "bullet", text: "余额不足：确认账户有足够额度" },
  { type: "bullet", text: "网络问题：检查代理设置或联系供应商" },
]);

addContentSlide(8, "模型类型说明", [
  { type: "subtitle", text: "推理模型（对话/生成）" },
  { type: "bullet", text: "用于对话、文本生成、问答等场景，如 GPT-4、Claude、通义千问" },
  { type: "subtitle", text: "Embedding 模型（向量化）" },
  { type: "bullet", text: "将文本转换为向量，用于知识库检索和语义搜索" },
  { type: "subtitle", text: "Rerank 模型（重排序）" },
  { type: "bullet", text: "对检索结果重新排序，提高相关性" },
  { type: "subtitle", text: "语音转文本模型（ASR）" },
  { type: "bullet", text: "将语音转换为文字，用于语音输入场景" },
  { type: "subtitle", text: "文本转语音模型（TTS）" },
  { type: "bullet", text: "将文字转换为语音，用于语音输出场景" },
]);

// 第三部分：应用类型概览
addSectionSlide("三", "应用类型概览");

addContentSlide(9, "五种应用类型", [
  { type: "subtitle", text: "Chatbot（聊天助手）" },
  { type: "bullet", text: "多轮对话应用，支持上下文记忆，适用于客服、问答" },
  { type: "subtitle", text: "Completion（文本生成）" },
  { type: "bullet", text: "单次文本生成，输入-输出模式，适用于翻译、摘要、写作" },
  { type: "subtitle", text: "Agent（智能体）" },
  { type: "bullet", text: "具备推理和工具调用能力，自主决策，适用于复杂任务" },
  { type: "subtitle", text: "Workflow（工作流）" },
  { type: "bullet", text: "可视化流程编排，节点拖拽、条件分支，适用于数据处理、自动化流程" },
  { type: "subtitle", text: "Chatflow（对话流）" },
  { type: "bullet", text: "基于工作流的对话应用，多轮对话 + 流程控制，适用于复杂对话场景" },
]);

// 第四部分：普通智能体
addSectionSlide("四", "普通智能体");

addContentSlide(10, "什么是普通智能体", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "普通智能体是 Dify 中最基础的应用类型，通过配置提示词和工具，让模型完成特定任务" },
  { type: "subtitle", text: "特点" },
  { type: "bullet", text: "配置简单：只需设置提示词和选择模型" },
  { type: "bullet", text: "快速上手：无需编排工作流，适合简单场景" },
  { type: "bullet", text: "灵活扩展：可添加工具增强能力" },
  { type: "subtitle", text: "适用场景" },
  { type: "bullet", text: "简单问答、文本生成、翻译、摘要等" },
  { type: "subtitle", text: "包含的应用类型" },
  { type: "bullet", text: "聊天助手（Chatbot）、文本生成（Completion）、Agent（智能体）" },
]);

addContentSlide(11, "创建流程", [
  { type: "image-placeholder", text: "创建应用界面" },
  { type: "bullet", text: "步骤 1：点击【创建应用】，选择应用类型（聊天助手/文本生成/Agent）" },
  { type: "bullet", text: "步骤 2：填写应用名称和描述" },
  { type: "bullet", text: "步骤 3：选择模型（如 GPT-4、通义千问等）" },
  { type: "bullet", text: "步骤 4：配置系统提示词，定义模型的角色和行为" },
  { type: "bullet", text: "步骤 5：（可选）添加工具，增强模型能力" },
  { type: "bullet", text: "步骤 6：点击【发布】，应用即可使用" },
]);

addContentSlide(12, "系统提示词设计", [
  { type: "subtitle", text: "角色设定" },
  { type: "bullet", text: "明确告诉模型它是谁，如【你是一位专业的法律顾问】" },
  { type: "subtitle", text: "规则约束" },
  { type: "bullet", text: "定义模型的行为边界，如【只回答法律问题，拒绝回答其他问题】" },
  { type: "subtitle", text: "输出格式" },
  { type: "bullet", text: "指定输出结构，如【回答必须包含：法律依据、分析过程、建议措施】" },
  { type: "subtitle", text: "示例" },
  { type: "bullet", text: "你是一位专业的法律顾问，专注于民事法律问题。请根据用户描述的情况，提供法律依据、分析过程和建议措施。如果问题超出民事法律范围，请明确告知。" },
]);

addContentSlide(13, "工具添加", [
  { type: "subtitle", text: "内置工具" },
  { type: "bullet", text: "Dify 提供 50+ 内置工具，如 Google 搜索、DALL·E 绘图、WolframAlpha 计算等" },
  { type: "bullet", text: "直接在应用配置中勾选需要的工具即可" },
  { type: "subtitle", text: "自定义工具" },
  { type: "bullet", text: "通过 OpenAPI Schema 定义自己的工具" },
  { type: "bullet", text: "支持 REST API、GraphQL 等接口" },
  { type: "bullet", text: "可配置认证方式（API Key、OAuth 等）" },
  { type: "subtitle", text: "使用场景" },
  { type: "bullet", text: "查询实时数据（天气、股票、新闻）" },
  { type: "bullet", text: "调用企业内部 API（订单、库存、用户信息）" },
  { type: "bullet", text: "执行特定操作（发送邮件、创建任务）" },
]);

addCaseSlide(
  14,
  "案例演示：法律知识问答助手",
  "用户需要一个能解答民事法律问题的智能助手，提供法律依据和建议。",
  "创建聊天助手，配置系统提示词定义法律专家角色，设定回答格式包含法律依据、分析过程和建议措施。",
  "智能体能准确识别法律问题，引用相关法条，给出专业且易懂的法律建议。"
);

addContentSlide(15, "案例要点总结", [
  { type: "subtitle", text: "提示词设计技巧" },
  { type: "bullet", text: "角色设定要具体：明确专业领域和身份" },
  { type: "bullet", text: "规则约束要清晰：定义什么能做、什么不能做" },
  { type: "bullet", text: "输出格式要规范：结构化输出便于用户理解" },
  { type: "subtitle", text: "边界处理" },
  { type: "bullet", text: "明确告知模型能力范围，超出范围时主动说明" },
  { type: "bullet", text: "添加免责声明，提醒用户咨询专业律师" },
]);

// 第五部分：工作流智能体
addSectionSlide("五", "工作流智能体");

addContentSlide(16, "什么是工作流智能体", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "工作流智能体通过可视化流程编排，将多个节点连接起来，完成复杂任务" },
  { type: "subtitle", text: "与普通智能体的区别" },
  { type: "bullet", text: "普通智能体：单步执行，模型直接生成结果" },
  { type: "bullet", text: "工作流智能体：多步执行，可包含条件判断、循环、变量传递" },
  { type: "subtitle", text: "适用场景" },
  { type: "bullet", text: "需要多步骤处理的复杂任务" },
  { type: "bullet", text: "需要条件分支的逻辑处理" },
  { type: "bullet", text: "需要调用多个工具或 API 的场景" },
]);

addContentSlide(17, "工作流设计器", [
  { type: "image-placeholder", text: "工作流设计器界面" },
  { type: "bullet", text: "画布操作：拖拽节点、连线、缩放、平移" },
  { type: "bullet", text: "节点拖拽：从左侧面板拖拽节点到画布" },
  { type: "bullet", text: "连线：点击节点输出端口，拖拽到另一个节点输入端口" },
  { type: "bullet", text: "调试：点击【调试】按钮，测试工作流执行" },
  { type: "bullet", text: "版本管理：保存多个版本，可随时回滚" },
]);

addContentSlide(18, "节点类型", [
  { type: "subtitle", text: "开始节点" },
  { type: "bullet", text: "工作流入口，定义输入变量" },
  { type: "subtitle", text: "LLM 节点" },
  { type: "bullet", text: "调用大语言模型，生成文本" },
  { type: "subtitle", text: "条件节点" },
  { type: "bullet", text: "根据条件分支，执行不同路径" },
  { type: "subtitle", text: "变量节点" },
  { type: "bullet", text: "定义和传递变量" },
  { type: "subtitle", text: "结束节点" },
  { type: "bullet", text: "工作流出口，定义输出变量" },
]);

addContentSlide(19, "变量传递", [
  { type: "subtitle", text: "输入变量" },
  { type: "bullet", text: "从开始节点传入，或从上游节点输出" },
  { type: "subtitle", text: "输出变量" },
  { type: "bullet", text: "节点执行后产生的结果，可传递给下游节点" },
  { type: "subtitle", text: "变量引用" },
  { type: "bullet", text: "在节点中使用 {{variable_name}} 引用变量" },
  { type: "bullet", text: "支持字符串、数字、对象、数组等类型" },
  { type: "subtitle", text: "示例" },
  { type: "bullet", text: "开始节点输入：{{user_input}}" },
  { type: "bullet", text: "LLM 节点输出：{{llm_result}}" },
  { type: "bullet", text: "结束节点输出：{{final_output}}" },
]);

addCaseSlide(
  20,
  "案例演示：信息提取助手",
  "从非结构化文本中提取关键信息（人名、时间、地点、事件），输出结构化 JSON。",
  "设计工作流：开始节点接收文本 → LLM 节点提取信息 → 代码节点格式化 JSON → 结束节点输出。",
  "自动从任意文本中提取结构化信息，准确率高，输出格式统一。"
);

addContentSlide(21, "案例要点总结", [
  { type: "subtitle", text: "节点编排" },
  { type: "bullet", text: "合理拆分任务，每个节点完成一个明确的子任务" },
  { type: "bullet", text: "使用条件节点处理不同情况" },
  { type: "subtitle", text: "输出格式化" },
  { type: "bullet", text: "使用代码节点格式化输出，确保结构统一" },
  { type: "bullet", text: "支持 JSON、XML、CSV 等多种格式" },
]);

// 第六部分：Chatflow 智能体
addSectionSlide("六", "Chatflow 智能体");

addContentSlide(22, "什么是 Chatflow", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "Chatflow 是基于工作流的对话应用，结合了工作流的流程控制和对话的多轮交互" },
  { type: "subtitle", text: "与工作流的区别" },
  { type: "bullet", text: "工作流：单次执行，输入→处理→输出" },
  { type: "bullet", text: "Chatflow：多轮对话，支持上下文记忆和流程控制" },
  { type: "subtitle", text: "适用场景" },
  { type: "bullet", text: "需要多轮对话收集信息的场景" },
  { type: "bullet", text: "需要根据对话内容动态调整流程的场景" },
  { type: "bullet", text: "复杂的客服、咨询、导购场景" },
]);

addContentSlide(23, "对话流设计", [
  { type: "subtitle", text: "多轮对话" },
  { type: "bullet", text: "支持上下文记忆，模型能记住之前的对话内容" },
  { type: "subtitle", text: "上下文传递" },
  { type: "bullet", text: "通过变量在不同节点间传递对话上下文" },
  { type: "subtitle", text: "流程控制" },
  { type: "bullet", text: "根据用户回答动态调整对话流程" },
  { type: "bullet", text: "使用条件节点判断用户意图，进入不同分支" },
]);

addContentSlide(24, "上下文管理", [
  { type: "subtitle", text: "会话记忆" },
  { type: "bullet", text: "自动保存对话历史，支持多轮交互" },
  { type: "bullet", text: "可配置记忆轮数，控制上下文长度" },
  { type: "subtitle", text: "变量作用域" },
  { type: "bullet", text: "全局变量：整个会话期间有效" },
  { type: "bullet", text: "局部变量：单个节点内有效" },
  { type: "bullet", text: "会话变量：单次对话内有效" },
]);

addContentSlide(25, "对话开场白", [
  { type: "subtitle", text: "设置方法" },
  { type: "bullet", text: "在应用配置中设置开场白内容" },
  { type: "bullet", text: "支持文本、图片、按钮等多种元素" },
  { type: "subtitle", text: "引导设计" },
  { type: "bullet", text: "明确告诉用户能做什么、不能做什么" },
  { type: "bullet", text: "提供示例问题，引导用户提问" },
  { type: "bullet", text: "设置快捷按钮，方便用户选择" },
]);

addCaseSlide(
  26,
  "案例演示：多轮问答助手",
  "构建一个能通过多轮对话收集用户信息并给出建议的助手。",
  "使用 Chatflow 设计对话流程：开场引导 → 问题分类 → 追问收集 → 综合建议。",
  "助手能自然地引导对话，收集完整信息后给出个性化建议。"
);

addContentSlide(27, "案例要点总结", [
  { type: "subtitle", text: "上下文管理技巧" },
  { type: "bullet", text: "合理设置记忆轮数，避免上下文过长影响性能" },
  { type: "bullet", text: "使用变量保存关键信息，便于后续使用" },
  { type: "bullet", text: "设计清晰的对话流程，避免用户迷路" },
]);

// 第七部分：普通知识库
addSectionSlide("七", "普通知识库");

addContentSlide(28, "什么是知识库", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "知识库是存储和管理文档的系统，支持基于文档的问答" },
  { type: "subtitle", text: "RAG 原理简介" },
  { type: "bullet", text: "RAG（Retrieval-Augmented Generation）= 检索 + 生成" },
  { type: "bullet", text: "先从知识库检索相关文档，再让模型基于检索结果生成回答" },
  { type: "bullet", text: "减少模型幻觉，提高回答准确性" },
]);

addContentSlide(29, "创建知识库", [
  { type: "image-placeholder", text: "创建知识库界面" },
  { type: "bullet", text: "步骤 1：进入知识库页面，点击【创建知识库】" },
  { type: "bullet", text: "步骤 2：填写知识库名称和描述" },
  { type: "bullet", text: "步骤 3：选择索引模式（高质量/经济）" },
  { type: "bullet", text: "步骤 4：上传文档，等待处理完成" },
]);

addContentSlide(30, "文档上传", [
  { type: "subtitle", text: "支持格式" },
  { type: "bullet", text: "文本文件：TXT、MD、HTML" },
  { type: "bullet", text: "办公文档：PDF、DOCX、PPTX、XLSX" },
  { type: "bullet", text: "电子书：EPUB" },
  { type: "subtitle", text: "大小限制" },
  { type: "bullet", text: "单文件最大 15MB" },
  { type: "bullet", text: "单个知识库最多 1000 个文档" },
]);

addContentSlide(31, "分段策略", [
  { type: "subtitle", text: "自动分段" },
  { type: "bullet", text: "系统自动按段落、句子分段" },
  { type: "bullet", text: "适合结构清晰的文档" },
  { type: "subtitle", text: "自定义分段" },
  { type: "bullet", text: "按指定分隔符分段（如换行、特定标记）" },
  { type: "bullet", text: "适合特定格式的文档" },
  { type: "subtitle", text: "分段长度" },
  { type: "bullet", text: "建议 300-500 token，平衡检索精度和上下文" },
]);

addContentSlide(32, "检索模式", [
  { type: "subtitle", text: "语义检索" },
  { type: "bullet", text: "基于向量相似度检索，理解语义" },
  { type: "bullet", text: "适合模糊查询、概念匹配" },
  { type: "subtitle", text: "关键词检索" },
  { type: "bullet", text: "基于关键词匹配，精确查找" },
  { type: "bullet", text: "适合专有名词、编号查询" },
  { type: "subtitle", text: "混合检索" },
  { type: "bullet", text: "结合语义和关键词，综合排序" },
  { type: "bullet", text: "推荐默认使用，效果最佳" },
]);

addCaseSlide(
  33,
  "案例演示：产品手册问答",
  "基于产品手册构建问答系统，用户可查询产品功能和使用方法。",
  "创建知识库上传产品手册，配置混合检索模式，创建聊天助手关联知识库。",
  "用户提问产品相关问题时，系统从手册中检索相关内容并生成准确回答。"
);

addContentSlide(34, "案例要点总结", [
  { type: "subtitle", text: "分段策略选择" },
  { type: "bullet", text: "结构化文档（如手册）：使用自动分段" },
  { type: "bullet", text: "非结构化文档（如笔记）：使用自定义分段" },
  { type: "subtitle", text: "召回优化" },
  { type: "bullet", text: "调整 TopK 参数，控制返回文档数量" },
  { type: "bullet", text: "使用 Rerank 模型，提高检索精度" },
]);

// 第八部分：工作流知识库
addSectionSlide("八", "工作流知识库");

addContentSlide(35, "知识库检索节点", [
  { type: "subtitle", text: "节点配置" },
  { type: "bullet", text: "选择知识库：从已有知识库中选择" },
  { type: "bullet", text: "查询变量：指定检索关键词来源" },
  { type: "subtitle", text: "检索参数" },
  { type: "bullet", text: "TopK：返回最相关的 K 个文档" },
  { type: "bullet", text: "Score 阈值：过滤低相关性结果" },
  { type: "bullet", text: "检索模式：语义/关键词/混合" },
]);

addContentSlide(36, "检索策略", [
  { type: "subtitle", text: "TopK" },
  { type: "bullet", text: "控制返回文档数量，建议 3-5 个" },
  { type: "bullet", text: "过多：引入噪音，影响生成质量" },
  { type: "bullet", text: "过少：可能遗漏关键信息" },
  { type: "subtitle", text: "Score 阈值" },
  { type: "bullet", text: "过滤低相关性结果，建议 0.5-0.7" },
  { type: "subtitle", text: "重排序" },
  { type: "bullet", text: "使用 Rerank 模型对结果重新排序" },
  { type: "bullet", text: "提高最终生成质量" },
]);

addCaseSlide(
  37,
  "案例演示：智能问答工作流",
  "构建一个结合知识库检索和 LLM 生成的智能问答工作流。",
  "工作流设计：开始节点 → 知识库检索节点 → LLM 节点（结合检索结果生成回答）→ 结束节点。",
  "实现精准的基于知识库的问答，回答有据可依，减少幻觉。"
);

addContentSlide(38, "案例要点总结", [
  { type: "subtitle", text: "检索策略优化" },
  { type: "bullet", text: "根据实际效果调整 TopK 和 Score 阈值" },
  { type: "bullet", text: "使用 Rerank 模型提高检索精度" },
  { type: "bullet", text: "定期更新知识库，保持内容新鲜" },
]);

// 第九部分：外部知识库
addSectionSlide("九", "外部知识库");

addContentSlide(39, "什么是外部知识库", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "连接外部数据源的知识库，如企业已有的文档系统、数据库" },
  { type: "subtitle", text: "与内部知识库的区别" },
  { type: "bullet", text: "内部知识库：文档上传到 Dify，由 Dify 管理" },
  { type: "bullet", text: "外部知识库：文档保留在外部系统，Dify 通过 API 检索" },
  { type: "subtitle", text: "适用场景" },
  { type: "bullet", text: "企业已有成熟的文档管理系统" },
  { type: "bullet", text: "文档量大，不适合全部上传到 Dify" },
  { type: "bullet", text: "需要实时检索最新数据" },
]);

addContentSlide(40, "外部知识库 API", [
  { type: "subtitle", text: "API 规范" },
  { type: "bullet", text: "遵循 Dify 外部知识库 API 规范" },
  { type: "bullet", text: "提供检索接口，接收查询请求，返回相关文档" },
  { type: "subtitle", text: "认证方式" },
  { type: "bullet", text: "API Key：简单认证，适合内部系统" },
  { type: "bullet", text: "OAuth：标准认证，适合第三方系统" },
  { type: "subtitle", text: "请求格式" },
  { type: "bullet", text: "POST 请求，包含查询文本和参数" },
  { type: "bullet", text: "返回 JSON 格式，包含检索结果" },
]);

addContentSlide(41, "创建外部知识库", [
  { type: "image-placeholder", text: "创建外部知识库界面" },
  { type: "bullet", text: "步骤 1：配置 API 端点和认证信息" },
  { type: "bullet", text: "步骤 2：创建外部知识库，填写名称和描述" },
  { type: "bullet", text: "步骤 3：绑定数据源，配置检索参数" },
  { type: "bullet", text: "步骤 4：测试检索，确认配置正确" },
]);

addContentSlide(42, "检索配置", [
  { type: "subtitle", text: "检索参数" },
  { type: "bullet", text: "TopK：返回文档数量" },
  { type: "bullet", text: "Score 阈值：最低相关性分数" },
  { type: "subtitle", text: "重排序" },
  { type: "bullet", text: "使用 Rerank 模型对结果重新排序" },
  { type: "subtitle", text: "过滤条件" },
  { type: "bullet", text: "按文档类型、时间、标签等过滤" },
]);

addCaseSlide(
  43,
  "案例演示：连接企业知识系统",
  "企业已有内部知识库系统，需要在 Dify 中集成使用。",
  "开发 API 适配层，在 Dify 中配置外部知识库连接，实现统一检索入口。",
  "员工可通过 Dify 统一访问企业知识系统，无需切换多个平台。"
);

addContentSlide(44, "案例要点总结", [
  { type: "subtitle", text: "API 设计要点" },
  { type: "bullet", text: "接口简洁，遵循 RESTful 规范" },
  { type: "bullet", text: "返回结构化的检索结果" },
  { type: "subtitle", text: "性能优化" },
  { type: "bullet", text: "使用缓存减少外部系统压力" },
  { type: "bullet", text: "设置合理的超时时间" },
]);

// 第十部分：MCP 与自定义工具
addSectionSlide("十", "MCP 与自定义工具");

addContentSlide(45, "什么是 MCP", [
  { type: "subtitle", text: "定义" },
  { type: "bullet", text: "MCP（Model Context Protocol）是模型上下文协议" },
  { type: "subtitle", text: "作用" },
  { type: "bullet", text: "标准化模型与工具的通信方式" },
  { type: "bullet", text: "让模型能调用外部工具，扩展能力边界" },
  { type: "subtitle", text: "优势" },
  { type: "bullet", text: "统一接口，降低集成成本" },
  { type: "bullet", text: "生态丰富，可复用现有工具" },
]);

addContentSlide(46, "MCP 服务器配置", [
  { type: "image-placeholder", text: "MCP 服务器配置界面" },
  { type: "bullet", text: "添加 MCP 服务器：填写服务器地址和端口" },
  { type: "bullet", text: "认证配置：API Key 或 OAuth" },
  { type: "bullet", text: "参数设置：超时时间、重试次数等" },
  { type: "bullet", text: "测试连接：确认服务器可用" },
]);

addContentSlide(47, "自定义工具", [
  { type: "subtitle", text: "创建自定义工具" },
  { type: "bullet", text: "通过 OpenAPI Schema 定义工具接口" },
  { type: "bullet", text: "支持 REST API、GraphQL 等" },
  { type: "subtitle", text: "API 定义" },
  { type: "bullet", text: "定义接口路径、方法、参数、返回值" },
  { type: "subtitle", text: "参数配置" },
  { type: "bullet", text: "配置参数类型、是否必填、默认值" },
]);

addCaseSlide(
  48,
  "案例演示：集成外部 API 工具",
  "让智能体能调用企业内部 API 查询订单、库存等业务数据。",
  "将内部 API 封装为自定义工具，配置认证方式，在智能体中添加工具。",
  "智能体可根据用户问题自动调用相应 API，实时查询业务数据并回答。"
);

addContentSlide(49, "案例要点总结", [
  { type: "subtitle", text: "工具设计最佳实践" },
  { type: "bullet", text: "工具职责单一，一个工具做一件事" },
  { type: "bullet", text: "参数清晰，便于模型理解" },
  { type: "bullet", text: "返回结构化数据，便于模型处理" },
]);

// 第十一部分：API 集成
addSectionSlide("十一", "API 集成");

addContentSlide(50, "后端即服务", [
  { type: "subtitle", text: "API 概览" },
  { type: "bullet", text: "Dify 提供完整的 REST API，可集成到任何系统" },
  { type: "bullet", text: "支持对话、文本生成、知识库检索等功能" },
  { type: "subtitle", text: "认证方式" },
  { type: "bullet", text: "API Key：在请求头中传递 Authorization: Bearer {api_key}" },
]);

addContentSlide(51, "获取 API 密钥", [
  { type: "image-placeholder", text: "API 密钥管理界面" },
  { type: "bullet", text: "步骤 1：进入应用详情页" },
  { type: "bullet", text: "步骤 2：点击【API 访问】标签" },
  { type: "bullet", text: "步骤 3：点击【API 密钥】，创建新密钥" },
  { type: "bullet", text: "步骤 4：复制密钥，妥善保存" },
]);

addContentSlide(52, "API 调用示例", [
  { type: "subtitle", text: "curl 代码" },
  { type: "bullet", text: "curl -X POST 'https://api.dify.ai/v1/chat-messages' \\" },
  { type: "bullet", text: "  -H 'Authorization: Bearer {api_key}' \\" },
  { type: "bullet", text: "  -H 'Content-Type: application/json' \\" },
  { type: "bullet", text: "  -d '{\"inputs\": {}, \"query\": \"你好\", \"user\": \"user-123\"}'" },
  { type: "subtitle", text: "返回结果" },
  { type: "bullet", text: "返回 JSON 格式，包含回答文本、会话 ID 等" },
]);

addContentSlide(53, "会话管理", [
  { type: "subtitle", text: "会话 ID" },
  { type: "bullet", text: "每个对话有唯一的 conversation_id" },
  { type: "bullet", text: "用于关联同一对话的多轮交互" },
  { type: "subtitle", text: "上下文保持" },
  { type: "bullet", text: "传递 conversation_id，模型能记住之前的对话" },
  { type: "bullet", text: "不传递则每次都是新对话" },
]);

addCaseSlide(
  54,
  "案例演示：搭建 Web 前端调用 Dify API",
  "用 HTML + JavaScript 搭建一个独立的问答页面，调用 Dify API 实现对话。",
  "创建 HTML 页面，使用 fetch 调用 Dify API，处理响应并展示对话结果。",
  "用户可在浏览器中直接与 Dify 应用交互，无需依赖第三方平台。"
);

addContentSlide(55, "案例要点总结", [
  { type: "subtitle", text: "错误处理" },
  { type: "bullet", text: "处理网络错误、API 错误、超时等异常" },
  { type: "bullet", text: "给用户友好的错误提示" },
  { type: "subtitle", text: "最佳实践" },
  { type: "bullet", text: "使用环境变量存储 API Key，不要硬编码" },
  { type: "bullet", text: "实现重试机制，提高稳定性" },
  { type: "bullet", text: "记录日志，便于问题排查" },
]);

// 第十二部分：最佳实践
addSectionSlide("十二", "最佳实践 — 会议纪要助手");

addCaseSlide(
  56,
  "案例场景",
  "输入会议内容（语音或文字），输出结构化会议纪要，包含议题、决议、待办事项。",
  "使用 Dify 构建工作流：语音转文字 → 提取关键信息 → 生成结构化纪要。",
  "自动从会议内容中提取关键信息，生成规范的会议纪要，节省人工整理时间。"
);

addContentSlide(57, "知识库与工作流设计", [
  { type: "subtitle", text: "知识库准备" },
  { type: "bullet", text: "上传会议纪要模板，定义输出格式" },
  { type: "bullet", text: "上传历史优秀纪要，作为参考" },
  { type: "subtitle", text: "工作流设计" },
  { type: "bullet", text: "LLM 节点 1：提取关键信息（议题、决议、待办）" },
  { type: "bullet", text: "LLM 节点 2：基于模板生成结构化纪要" },
  { type: "bullet", text: "代码节点：格式化输出" },
]);

addContentSlide(58, "智能体配置", [
  { type: "subtitle", text: "关联知识库" },
  { type: "bullet", text: "绑定会议纪要模板知识库" },
  { type: "subtitle", text: "提示词设计" },
  { type: "bullet", text: "角色：专业的会议纪要整理助手" },
  { type: "bullet", text: "任务：从会议内容中提取关键信息，按模板生成纪要" },
  { type: "bullet", text: "输出格式：包含议题、决议、待办事项、负责人、截止时间" },
]);

addContentSlide(59, "发布与总结", [
  { type: "subtitle", text: "通过 API 将案例暴露为服务" },
  { type: "bullet", text: "获取 API 密钥，集成到企业微信、钉钉或自有系统" },
  { type: "bullet", text: "员工可直接在 IM 中发送会议内容，自动获取纪要" },
  { type: "subtitle", text: "提示词技巧" },
  { type: "bullet", text: "明确输出格式，使用结构化提示" },
  { type: "subtitle", text: "性能优化" },
  { type: "bullet", text: "使用合适的模型，平衡质量和成本" },
  { type: "subtitle", text: "成本控制" },
  { type: "bullet", text: "设置 Token 限制，避免超长输入" },
]);

// 第十三部分：总结
addSectionSlide("十三", "总结");

addContentSlide(60, "内容回顾", [
  { type: "subtitle", text: "7 个案例" },
  { type: "bullet", text: "法律知识问答助手（普通智能体）" },
  { type: "bullet", text: "信息提取助手（工作流智能体）" },
  { type: "bullet", text: "多轮问答助手（Chatflow 智能体）" },
  { type: "bullet", text: "产品手册问答（普通知识库）" },
  { type: "bullet", text: "智能问答工作流（工作流知识库）" },
  { type: "bullet", text: "连接企业知识系统（外部知识库）" },
  { type: "bullet", text: "集成外部 API 工具（MCP 与自定义工具）" },
  { type: "subtitle", text: "核心知识点" },
  { type: "bullet", text: "应用类型、模型配置、知识库、工作流、API 集成" },
]);

addContentSlide(61, "后续学习资源", [
  { type: "subtitle", text: "官方文档" },
  { type: "bullet", text: "https://docs.dify.ai - 完整的使用指南" },
  { type: "bullet", text: "https://github.com/langgenius/dify - 开源代码仓库" },
  { type: "subtitle", text: "社区" },
  { type: "bullet", text: "Discord 社区：与其他开发者交流" },
  { type: "bullet", text: "GitHub Discussions：提问和反馈" },
  { type: "subtitle", text: "示例库" },
  { type: "bullet", text: "官方示例：https://docs.dify.ai/getting-started/readme/examples" },
  { type: "bullet", text: "社区分享：查看其他用户的应用案例" },
]);

addContentSlide(62, "答疑环节", [
  { type: "subtitle", text: "Q&A" },
  { type: "bullet", text: "欢迎提问！" },
  { type: "bullet", text: "常见问题：" },
  { type: "bullet", text: "  • 如何选择合适的模型？" },
  { type: "bullet", text: "  • 如何优化知识库检索效果？" },
  { type: "bullet", text: "  • 如何降低 API 调用成本？" },
  { type: "bullet", text: "  • 如何处理敏感数据？" },
]);

// 结束页
addEndSlide();

// 保存文件
pptx.writeFile({ fileName: "docs/pptx/Dify-使用讲解-v3.3.pptx" })
  .then(() => {
    console.log("✓ PPT 生成成功：docs/pptx/Dify-使用讲解-v3.3.pptx");
    console.log(`✓ 总页数：${pageNum + 1} 页`);
  })
  .catch((err) => {
    console.error("✗ PPT 生成失败：", err);
  });
