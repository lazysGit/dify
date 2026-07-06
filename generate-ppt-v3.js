const pptxgen = require("pptxgenjs");
const fs = require("fs");

// 读取幻灯片数据
const slidesData = JSON.parse(fs.readFileSync("training-examples/ppt-content/slides.json", "utf8"));

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

// 字体配置
const FONTS = {
  title: "Arial Black",
  body: "Arial",
  code: "Consolas",
};

// 创建阴影效果
function makeShadow() {
  return { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15 };
}

// 创建卡片
function addCard(slide, x, y, w, h, accentColor = COLORS.primary) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: COLORS.white },
    shadow: makeShadow(),
  });
  slide.addShape("rect", {
    x, y, w: 0.08, h,
    fill: { color: accentColor },
  });
}

// 添加页面标题（带序号）
function addPageTitle(slide, slideNumber, title) {
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
}

// 创建标题页
function createTitleSlide(pres, data) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.dark };
  
  // 装饰条
  slide.addShape("rect", {
    x: 0, y: 2.2, w: 1.5, h: 0.08,
    fill: { color: COLORS.primary },
  });
  
  slide.addText(data.title, {
    x: 0.5, y: 1.5, w: 9, h: 1.5,
    fontSize: 44, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  
  slide.addText(data.subtitle, {
    x: 0.5, y: 3.2, w: 9, h: 1,
    fontSize: 18, fontFace: FONTS.body, color: COLORS.accent,
    align: "left", valign: "top",
  });
  
  // 日期
  slide.addText(data.date, {
    x: 0.5, y: 4.5, w: 9, h: 0.5,
    fontSize: 14, fontFace: FONTS.body, color: COLORS.gray,
    align: "left", valign: "top",
  });
  
  return slide;
}

// 创建章节分隔页
function createSectionSlide(pres, part) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.primary };
  
  // 提取章节编号和标题
  const match = part.match(/第(.+?)部分[：:](.+)/);
  const sectionNum = match ? match[1] : "";
  const sectionTitle = match ? match[2] : part;
  
  slide.addText(`第${sectionNum}部分`, {
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

// 创建内容页
function createContentSlide(pres, slideNumber, data) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };
  
  addPageTitle(slide, slideNumber, data.title);
  
  const content = data.content;
  let yPos = 1.4;
  
  // 处理 items 类型
  if (content.items) {
    content.items.forEach((item, idx) => {
      // 名称
      slide.addText(item.name, {
        x: 0.5, y: yPos, w: 9, h: 0.4,
        fontSize: 16, fontFace: FONTS.title, color: COLORS.dark,
        bold: true, align: "left", valign: "middle",
      });
      yPos += 0.4;
      
      // 描述
      slide.addText(item.description, {
        x: 0.7, y: yPos, w: 8.8, h: 0.4,
        fontSize: 14, fontFace: FONTS.body, color: COLORS.text,
        align: "left", valign: "top",
        lineSpacingMultiple: 1.3,
      });
      yPos += 0.5;
      
      if (yPos > 5) return false; // 防止超出页面
    });
  }
  
  // 处理 categories 类型
  if (content.categories) {
    content.categories.forEach((cat, idx) => {
      slide.addText(cat.name, {
        x: 0.5, y: yPos, w: 2, h: 0.4,
        fontSize: 16, fontFace: FONTS.title, color: COLORS.primary,
        bold: true, align: "left", valign: "middle",
      });
      
      slide.addText(cat.examples.join("、"), {
        x: 2.5, y: yPos, w: 7, h: 0.4,
        fontSize: 14, fontFace: FONTS.body, color: COLORS.text,
        align: "left", valign: "middle",
      });
      yPos += 0.5;
    });
  }
  
  // 处理 definition + coreValue + highlights
  if (content.definition) {
    slide.addText(content.definition, {
      x: 0.5, y: yPos, w: 9, h: 0.5,
      fontSize: 16, fontFace: FONTS.body, color: COLORS.text,
      align: "left", valign: "top",
      lineSpacingMultiple: 1.4,
    });
    yPos += 0.6;
    
    if (content.coreValue) {
      slide.addText("核心价值：", {
        x: 0.5, y: yPos, w: 9, h: 0.4,
        fontSize: 15, fontFace: FONTS.title, color: COLORS.dark,
        bold: true, align: "left", valign: "middle",
      });
      yPos += 0.4;
      
      slide.addText(content.coreValue, {
        x: 0.7, y: yPos, w: 8.8, h: 0.5,
        fontSize: 14, fontFace: FONTS.body, color: COLORS.text,
        align: "left", valign: "top",
        lineSpacingMultiple: 1.3,
      });
      yPos += 0.6;
    }
    
    if (content.highlights) {
      content.highlights.forEach((hl) => {
        slide.addText(`• ${hl}`, {
          x: 0.7, y: yPos, w: 8.8, h: 0.35,
          fontSize: 14, fontFace: FONTS.body, color: COLORS.text,
          align: "left", valign: "middle",
        });
        yPos += 0.4;
      });
    }
  }
  
  return slide;
}

// 创建截图页（带灰色虚线框占位）
function createScreenshotSlide(pres, slideNumber, data) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };
  
  addPageTitle(slide, slideNumber, data.title);
  
  const content = data.content;
  
  // 截图占位框（灰色虚线）
  slide.addShape("rect", {
    x: 0.5, y: 1.4, w: 5.5, h: 3.8,
    fill: { color: COLORS.lightGray },
    line: { color: COLORS.gray, width: 1, dashType: "dash" },
  });
  
  slide.addText(`[截图占位]\n${content.screenshot}`, {
    x: 0.5, y: 1.4, w: 5.5, h: 3.8,
    fontSize: 14, fontFace: FONTS.body, color: COLORS.gray,
    align: "center", valign: "middle",
  });
  
  // 右侧说明
  let yPos = 1.4;
  
  if (content.description) {
    slide.addText(content.description, {
      x: 6.3, y: yPos, w: 3.2, h: 0.5,
      fontSize: 14, fontFace: FONTS.body, color: COLORS.text,
      align: "left", valign: "top",
      lineSpacingMultiple: 1.3,
    });
    yPos += 0.6;
  }
  
  // 标注列表
  if (content.annotations) {
    slide.addText("主要模块：", {
      x: 6.3, y: yPos, w: 3.2, h: 0.4,
      fontSize: 13, fontFace: FONTS.title, color: COLORS.dark,
      bold: true, align: "left", valign: "middle",
    });
    yPos += 0.4;
    
    content.annotations.forEach((ann) => {
      slide.addText(`• ${ann}`, {
        x: 6.3, y: yPos, w: 3.2, h: 0.3,
        fontSize: 12, fontFace: FONTS.body, color: COLORS.text,
        align: "left", valign: "middle",
      });
      yPos += 0.35;
    });
  }
  
  // 步骤列表
  if (content.steps) {
    slide.addText("操作步骤：", {
      x: 6.3, y: yPos, w: 3.2, h: 0.4,
      fontSize: 13, fontFace: FONTS.title, color: COLORS.dark,
      bold: true, align: "left", valign: "middle",
    });
    yPos += 0.4;
    
    content.steps.forEach((step, idx) => {
      slide.addText(`${idx + 1}. ${step}`, {
        x: 6.3, y: yPos, w: 3.2, h: 0.35,
        fontSize: 12, fontFace: FONTS.body, color: COLORS.text,
        align: "left", valign: "middle",
      });
      yPos += 0.4;
    });
  }
  
  // FAQ
  if (content.faq) {
    yPos = Math.max(yPos, 3.5);
    slide.addText("常见问题：", {
      x: 6.3, y: yPos, w: 3.2, h: 0.4,
      fontSize: 13, fontFace: FONTS.title, color: COLORS.dark,
      bold: true, align: "left", valign: "middle",
    });
    yPos += 0.4;
    
    content.faq.forEach((item) => {
      slide.addText(item, {
        x: 6.3, y: yPos, w: 3.2, h: 0.3,
        fontSize: 11, fontFace: FONTS.body, color: COLORS.text,
        align: "left", valign: "middle",
      });
      yPos += 0.35;
    });
  }
  
  return slide;
}

// 创建卡片页
function createCardsSlide(pres, slideNumber, data) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.lightGray };
  
  addPageTitle(slide, slideNumber, data.title);
  
  const items = data.content.items || [];
  const cardCount = Math.min(items.length, 4); // 最多4列
  const cardWidth = (9 - (cardCount - 1) * 0.3) / cardCount;
  
  items.slice(0, 4).forEach((item, index) => {
    const x = 0.5 + index * (cardWidth + 0.3);
    const colors = [COLORS.primary, COLORS.primaryDark, COLORS.primaryLight, COLORS.accent];
    
    addCard(slide, x, 1.4, cardWidth, 3.8, colors[index % 4]);
    
    slide.addText(item.name, {
      x: x + 0.15, y: 1.6, w: cardWidth - 0.3, h: 0.6,
      fontSize: 16, fontFace: FONTS.title, color: COLORS.dark,
      bold: true, align: "left", valign: "middle",
    });
    
    slide.addText(item.description, {
      x: x + 0.15, y: 2.3, w: cardWidth - 0.3, h: 2.8,
      fontSize: 13, fontFace: FONTS.body, color: COLORS.text,
      align: "left", valign: "top",
      lineSpacingMultiple: 1.4,
    });
  });
  
  return slide;
}

// 创建案例页（三栏布局：场景、方案、效果）
function createCaseSlide(pres, slideNumber, data) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };
  
  addPageTitle(slide, slideNumber, data.title);
  
  const content = data.content;
  
  // 场景卡片
  addCard(slide, 0.5, 1.4, 2.8, 3.8, COLORS.primary);
  slide.addShape("rect", {
    x: 0.5, y: 1.4, w: 2.8, h: 0.5,
    fill: { color: COLORS.primary },
  });
  slide.addText("场景", {
    x: 0.65, y: 1.5, w: 2.5, h: 0.4,
    fontSize: 14, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText(content.scenario, {
    x: 0.65, y: 2.1, w: 2.5, h: 3,
    fontSize: 12, fontFace: FONTS.body, color: COLORS.text,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.4,
  });
  
  // 方案卡片
  addCard(slide, 3.6, 1.4, 2.8, 3.8, COLORS.primaryDark);
  slide.addShape("rect", {
    x: 3.6, y: 1.4, w: 2.8, h: 0.5,
    fill: { color: COLORS.primaryDark },
  });
  slide.addText("方案", {
    x: 3.75, y: 1.5, w: 2.5, h: 0.4,
    fontSize: 14, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText(content.solution, {
    x: 3.75, y: 2.1, w: 2.5, h: 3,
    fontSize: 12, fontFace: FONTS.body, color: COLORS.text,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.4,
  });
  
  // 效果卡片
  addCard(slide, 6.7, 1.4, 2.8, 3.8, COLORS.primaryLight);
  slide.addShape("rect", {
    x: 6.7, y: 1.4, w: 2.8, h: 0.5,
    fill: { color: COLORS.primaryLight },
  });
  slide.addText("效果", {
    x: 6.85, y: 1.5, w: 2.5, h: 0.4,
    fontSize: 14, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText(content.result, {
    x: 6.85, y: 2.1, w: 2.5, h: 3,
    fontSize: 12, fontFace: FONTS.body, color: COLORS.text,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.4,
  });
  
  return slide;
}

// 创建代码页
function createCodeSlide(pres, slideNumber, data) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.dark };
  
  // 标题
  slide.addText(`${slideNumber}. ${data.title}`, {
    x: 0.5, y: 0.3, w: 9, h: 0.8,
    fontSize: 28, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  
  slide.addShape("rect", {
    x: 0.5, y: 1.1, w: 2, h: 0.04,
    fill: { color: COLORS.primary },
  });
  
  const content = data.content;
  
  // 代码块
  slide.addShape("rect", {
    x: 0.5, y: 1.4, w: 9, h: 2.5,
    fill: { color: COLORS.darkGray },
    line: { color: COLORS.gray, width: 1 },
  });
  
  slide.addText(`[${content.language}]`, {
    x: 0.7, y: 1.5, w: 8.6, h: 0.3,
    fontSize: 11, fontFace: FONTS.body, color: COLORS.accent,
    align: "left", valign: "middle",
  });
  
  slide.addText(content.code, {
    x: 0.7, y: 1.8, w: 8.6, h: 2,
    fontSize: 11, fontFace: FONTS.code, color: COLORS.white,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.3,
  });
  
  // 响应示例
  if (content.response) {
    slide.addText("响应示例：", {
      x: 0.5, y: 4.1, w: 9, h: 0.4,
      fontSize: 13, fontFace: FONTS.title, color: COLORS.accent,
      bold: true, align: "left", valign: "middle",
    });
    
    const responseText = JSON.stringify(content.response, null, 2);
    slide.addShape("rect", {
      x: 0.5, y: 4.5, w: 9, h: 1,
      fill: { color: COLORS.darkGray },
      line: { color: COLORS.gray, width: 1 },
    });
    
    slide.addText(responseText, {
      x: 0.7, y: 4.6, w: 8.6, h: 0.8,
      fontSize: 10, fontFace: FONTS.code, color: COLORS.white,
      align: "left", valign: "top",
      lineSpacingMultiple: 1.2,
    });
  }
  
  return slide;
}

// 创建总结页
function createSummarySlide(pres, slideNumber, data) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.dark };
  
  slide.addText(`${slideNumber}. ${data.title}`, {
    x: 0.5, y: 0.5, w: 9, h: 1,
    fontSize: 32, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "left", valign: "middle",
  });
  
  slide.addShape("rect", {
    x: 0.5, y: 1.5, w: 2, h: 0.04,
    fill: { color: COLORS.primary },
  });
  
  const tips = data.content.tips || [];
  let yPos = 1.8;
  
  tips.forEach((tip, idx) => {
    slide.addText(`${idx + 1}. ${tip}`, {
      x: 0.5, y: yPos, w: 9, h: 0.5,
      fontSize: 16, fontFace: FONTS.body, color: COLORS.accent,
      align: "left", valign: "middle",
      lineSpacingMultiple: 1.4,
    });
    yPos += 0.6;
  });
  
  return slide;
}

// 创建问答页
function createQASlide(pres, data) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.primary };
  
  const content = data.content;
  
  slide.addText(content.title || "Q & A", {
    x: 0.5, y: 1.5, w: 9, h: 1.5,
    fontSize: 48, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "center", valign: "middle",
  });
  
  if (content.description) {
    slide.addText(content.description, {
      x: 0.5, y: 3, w: 9, h: 0.8,
      fontSize: 20, fontFace: FONTS.body, color: COLORS.white,
      align: "center", valign: "middle",
    });
  }
  
  if (content.prompts) {
    let yPos = 4;
    content.prompts.forEach((prompt) => {
      slide.addText(`• ${prompt}`, {
        x: 1, y: yPos, w: 8, h: 0.4,
        fontSize: 14, fontFace: FONTS.body, color: COLORS.white,
        align: "center", valign: "middle",
      });
      yPos += 0.5;
    });
  }
  
  return slide;
}

// 创建结束页
function createEndSlide(pres, data) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.dark };
  
  const content = data.content;
  
  slide.addText(content.thanks || "感谢参与", {
    x: 0.5, y: 2, w: 9, h: 1.5,
    fontSize: 44, fontFace: FONTS.title, color: COLORS.white,
    bold: true, align: "center", valign: "middle",
  });
  
  if (content.contact) {
    let yPos = 3.8;
    const contacts = [];
    if (content.contact.website) contacts.push(`官网：${content.contact.website}`);
    if (content.contact.github) contacts.push(`GitHub：${content.contact.github}`);
    if (content.contact.discord) contacts.push(`Discord：${content.contact.discord}`);
    
    contacts.forEach((line) => {
      slide.addText(line, {
        x: 0.5, y: yPos, w: 9, h: 0.4,
        fontSize: 14, fontFace: FONTS.body, color: COLORS.accent,
        align: "center", valign: "middle",
      });
      yPos += 0.5;
    });
  }
  
  return slide;
}

// 主函数
async function generatePPT() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Dify";
  pres.title = slidesData.title;
  
  // 创建封面页
  createTitleSlide(pres, {
    title: slidesData.title,
    subtitle: slidesData.subtitle,
    date: slidesData.date,
  });
  
  let currentPart = "";
  let slideCounter = 0;
  
  for (const slideData of slidesData.slides) {
    // 跳过第一个 title 类型（已作为封面处理）
    if (slideData.type === "title" && slideData.id === 1) {
      continue;
    }
    
    // 检查是否需要添加章节分隔页
    if (slideData.part && slideData.part !== currentPart) {
      currentPart = slideData.part;
      createSectionSlide(pres, currentPart);
    }
    
    slideCounter++;
    
    switch (slideData.type) {
      case "title":
        // 其他 title 类型作为内容页处理
        createContentSlide(pres, slideCounter, slideData);
        break;
        
      case "content":
        createContentSlide(pres, slideCounter, slideData);
        break;
        
      case "screenshot":
        createScreenshotSlide(pres, slideCounter, slideData);
        break;
        
      case "case":
        createCaseSlide(pres, slideCounter, slideData);
        break;
        
      case "summary":
        createSummarySlide(pres, slideCounter, slideData);
        break;
        
      case "code":
        createCodeSlide(pres, slideCounter, slideData);
        break;
        
      case "qa":
        createQASlide(pres, slideData);
        break;
        
      case "end":
        createEndSlide(pres, slideData);
        break;
        
      case "cards":
        createCardsSlide(pres, slideCounter, slideData);
        break;
        
      default:
        console.warn(`Unknown slide type: ${slideData.type}`);
    }
  }
  
  // 保存文件
  const outputPath = "Dify_Training_v3.pptx";
  await pres.writeFile({ fileName: outputPath });
  console.log(`✓ PPT 生成成功：${outputPath}`);
  console.log(`✓ 总页数：${pres.slides.length} 页`);
}

// 执行
generatePPT().catch(console.error);
