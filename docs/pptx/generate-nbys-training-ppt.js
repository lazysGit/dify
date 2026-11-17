/**
 * NBYS 定制功能培训 PPT v1.0（精简版，17 页）
 * 口径：docs/nbys/培训-定制功能-PPT大纲.md
 *
 * 用法：cd docs/pptx && node generate-nbys-training-ppt.js
 */

const path = require("path");
const PptxGenJS = require("pptxgenjs");

const COLORS = {
  paper: "FFFFFF",
  ink: "1A1A1A",
  muted: "5C5C5C",
  line: "D0D5DD",
  soft: "F2F4F7",
  accent: "0B6E4F",
  accentSoft: "E8F5F0",
  white: "FFFFFF",
};

const FONTS = {
  title: "Microsoft YaHei",
  body: "Microsoft YaHei",
  mono: "Consolas",
};

const W = 13.33;
const H = 7.5;
const M = 0.45;
const CW = W - M * 2;
const TOTAL = 17;

const ROOT = path.resolve(__dirname, "..");
const SHOT = path.join(ROOT, "nbys", "manual-screenshots");
const OUT = path.join(__dirname, "NBYS-定制功能培训-v1.0.pptx");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "NBYS / Dify";
pptx.title = "宁波韵升智能体平台 · 定制功能培训";
pptx.subject = "部门访问控制及相关能力 v1.0";

let page = 0;

function shot(name) {
  return path.join(SHOT, name);
}

function footer(slide, audience = "全员") {
  slide.addShape(pptx.ShapeType.rect, {
    x: M,
    y: H - 0.42,
    w: CW,
    h: 0.01,
    fill: { color: COLORS.line },
  });
  slide.addText(`必听：${audience}`, {
    x: M,
    y: H - 0.38,
    w: CW / 2,
    h: 0.3,
    fontSize: 11,
    fontFace: FONTS.body,
    color: COLORS.muted,
  });
  slide.addText(`${String(page).padStart(2, "0")} / ${String(TOTAL).padStart(2, "0")}`, {
    x: M + CW / 2,
    y: H - 0.38,
    w: CW / 2,
    h: 0.3,
    fontSize: 11,
    fontFace: FONTS.mono,
    color: COLORS.muted,
    align: "right",
  });
}

function titleBar(slide, title, subtitle) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.12,
    h: H,
    fill: { color: COLORS.accent },
  });
  slide.addText(title, {
    x: M,
    y: 0.28,
    w: CW,
    h: 0.48,
    fontSize: 26,
    fontFace: FONTS.title,
    bold: true,
    color: COLORS.ink,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: M,
      y: 0.78,
      w: CW,
      h: 0.32,
      fontSize: 13,
      fontFace: FONTS.body,
      color: COLORS.muted,
    });
  }
}

function bullets(slide, items, x, y, w, opts = {}) {
  const size = opts.fontSize || 15;
  const gap = opts.gap || 0.08;
  let yPos = y;
  items.forEach((text) => {
    const lines = Math.max(1, Math.ceil(text.length / (opts.charsPerLine || 42)));
    const h = Math.min(1.1, lines * 0.28 + 0.12);
    slide.addText(`•  ${text}`, {
      x,
      y: yPos,
      w,
      h,
      fontSize: size,
      fontFace: FONTS.body,
      color: COLORS.ink,
      valign: "top",
    });
    yPos += h + gap;
  });
  return yPos;
}

function addCover() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.accent };
  slide.addText("NBYS · 智能体平台", {
    x: M,
    y: M,
    w: CW,
    h: 0.35,
    fontSize: 14,
    fontFace: FONTS.mono,
    color: COLORS.white,
  });
  slide.addText("定制功能培训", {
    x: M,
    y: 2.4,
    w: CW,
    h: 0.9,
    fontSize: 48,
    fontFace: FONTS.title,
    bold: true,
    color: COLORS.white,
  });
  slide.addText("部门访问控制及相关能力（相对开源 Dify）", {
    x: M,
    y: 3.4,
    w: CW,
    h: 0.45,
    fontSize: 20,
    fontFace: FONTS.body,
    color: COLORS.white,
  });
  slide.addText("版本 v1.0  ·  2026-10-26  ·  建议 45–60 分钟", {
    x: M,
    y: H - M - 0.2,
    w: CW,
    h: 0.35,
    fontSize: 13,
    fontFace: FONTS.body,
    color: COLORS.white,
  });
}

function addGoals() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "目标与边界", "对齐本场预期");
  slide.addShape(pptx.ShapeType.roundRect, {
    x: M,
    y: 1.3,
    w: (CW - 0.3) / 2,
    h: 4.6,
    fill: { color: COLORS.accentSoft },
    rectRadius: 0.08,
  });
  slide.addText("本场会讲到", {
    x: M + 0.25,
    y: 1.5,
    w: (CW - 0.3) / 2 - 0.4,
    h: 0.4,
    fontSize: 18,
    fontFace: FONTS.title,
    bold: true,
    color: COLORS.accent,
  });
  bullets(
    slide,
    ["组织与部门分权", "发布到部门与探索可见性", "运行链接与嵌入 token", "模型白名单"],
    M + 0.25,
    2.1,
    (CW - 0.3) / 2 - 0.4,
    { fontSize: 16, charsPerLine: 22 },
  );

  slide.addShape(pptx.ShapeType.roundRect, {
    x: M + (CW - 0.3) / 2 + 0.3,
    y: 1.3,
    w: (CW - 0.3) / 2,
    h: 4.6,
    fill: { color: COLORS.soft },
    rectRadius: 0.08,
  });
  slide.addText("本场不讲", {
    x: M + (CW - 0.3) / 2 + 0.55,
    y: 1.5,
    w: (CW - 0.3) / 2 - 0.4,
    h: 0.4,
    fontSize: 18,
    fontFace: FONTS.title,
    bold: true,
    color: COLORS.muted,
  });
  bullets(
    slide,
    ["工作流 / Agent 编排", "提示词设计", "插件与工具接入", "开源 Dify 基础操作（见既有讲解 PPT）"],
    M + (CW - 0.3) / 2 + 0.55,
    2.1,
    (CW - 0.3) / 2 - 0.4,
    { fontSize: 16, charsPerLine: 22 },
  );
  footer(slide, "全员");
}

function addDiffRoles() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "差异 + 角色", "相对开源 Dify · 本平台多了什么");
  const left = [
    "树形部门（最多 10 级）",
    "工作室 / 知识库按归属部门隔离",
    "探索须「发布到用户部门」",
    "/chat 须登录且已发布（所有者不豁免）",
    "嵌入须合法 embed_token",
    "成员模型白名单",
    "知识库「所有部门成员」权限",
  ];
  slide.addText("能力差异", {
    x: M,
    y: 1.25,
    w: CW * 0.48,
    h: 0.35,
    fontSize: 16,
    bold: true,
    fontFace: FONTS.title,
    color: COLORS.accent,
  });
  bullets(slide, left, M, 1.7, CW * 0.48, { fontSize: 14, charsPerLine: 28, gap: 0.04 });

  slide.addShape(pptx.ShapeType.rect, {
    x: M + CW * 0.52,
    y: 1.25,
    w: 0.01,
    h: 5.0,
    fill: { color: COLORS.line },
  });

  const roles = [
    ["租户管理员", "管整棵部门树、跨部门转移、多部门发布、模型权限"],
    ["部门管理员", "管辖本部门+子部门成员与发布；不能改组织树"],
    ["编辑", "本部门创建/编辑；发布通常仅本部门"],
    ["成员", "探索与已发布应用为主；无知识库顶栏"],
  ];
  slide.addText("角色地图", {
    x: M + CW * 0.55,
    y: 1.25,
    w: CW * 0.45,
    h: 0.35,
    fontSize: 16,
    bold: true,
    fontFace: FONTS.title,
    color: COLORS.accent,
  });
  let y = 1.7;
  roles.forEach(([name, desc]) => {
    slide.addText(name, {
      x: M + CW * 0.55,
      y,
      w: CW * 0.45,
      h: 0.3,
      fontSize: 14,
      bold: true,
      fontFace: FONTS.body,
      color: COLORS.ink,
    });
    slide.addText(desc, {
      x: M + CW * 0.55,
      y: y + 0.28,
      w: CW * 0.45,
      h: 0.55,
      fontSize: 12,
      fontFace: FONTS.body,
      color: COLORS.muted,
    });
    y += 0.95;
  });
  slide.addText("注意：部门管理员徽章 ≠ 租户管理员", {
    x: M + CW * 0.55,
    y: 5.7,
    w: CW * 0.45,
    h: 0.35,
    fontSize: 12,
    bold: true,
    fontFace: FONTS.body,
    color: COLORS.accent,
  });
  footer(slide, "全员");
}

function addOwnership() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "归属 vs 发布", "本场最重要的一对概念");

  const cards = [
    { title: "归属部门", body: "应用 / 知识库「属于」谁\n决定工作室 / 知识库谁能看见并编辑", x: M },
    { title: "发布部门", body: "应用对哪些部门开放使用\n决定探索谁能看见、/chat 谁能打开", x: M + CW / 2 + 0.15 },
  ];
  cards.forEach((c) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.35,
      w: CW / 2 - 0.15,
      h: 2.2,
      fill: { color: COLORS.soft },
      rectRadius: 0.08,
    });
    slide.addText(c.title, {
      x: c.x + 0.25,
      y: 1.55,
      w: CW / 2 - 0.65,
      h: 0.4,
      fontSize: 20,
      bold: true,
      fontFace: FONTS.title,
      color: COLORS.accent,
    });
    slide.addText(c.body, {
      x: c.x + 0.25,
      y: 2.15,
      w: CW / 2 - 0.65,
      h: 1.1,
      fontSize: 15,
      fontFace: FONTS.body,
      color: COLORS.ink,
    });
  });

  slide.addText("一句话：改配置看归属，能不能用看发布。", {
    x: M,
    y: 3.8,
    w: CW,
    h: 0.4,
    fontSize: 18,
    bold: true,
    fontFace: FONTS.title,
    color: COLORS.ink,
  });

  const flow = [
    { t: "归属部门", s: "工作室可编辑" },
    { t: "发布部门", s: "探索可用" },
    { t: "发布部门", s: "/chat 可打开" },
  ];
  flow.forEach((f, i) => {
    const x = M + i * 4.1;
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y: 4.5,
      w: 3.7,
      h: 1.35,
      fill: { color: COLORS.accentSoft },
      rectRadius: 0.06,
    });
    slide.addText(f.t, {
      x: x + 0.2,
      y: 4.65,
      w: 3.3,
      h: 0.35,
      fontSize: 14,
      bold: true,
      fontFace: FONTS.body,
      color: COLORS.accent,
    });
    slide.addText(`→  ${f.s}`, {
      x: x + 0.2,
      y: 5.15,
      w: 3.3,
      h: 0.4,
      fontSize: 16,
      fontFace: FONTS.body,
      color: COLORS.ink,
    });
  });
  footer(slide, "全员");
}

function addDefaults() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "默认部门与误区", "先记住边界，再谈操作");
  bullets(
    slide,
    [
      "默认部门：唯一；不可作父部门、不可删除、不可移动——业务请建独立部门",
      "部门树：同父下名称唯一；最多 10 级",
      "误区 1：转移部门 ≠ 取消发布（原发布记录仍在，原部门探索可能仍可见）",
      "误区 2：发布到 B ≠ B 能改配置（B 只有使用权，没有工作室编辑权）",
      "生产环境已开启部门访问控制，终端用户无需改开关",
    ],
    M,
    1.4,
    CW,
    { fontSize: 16, charsPerLine: 48, gap: 0.12 },
  );
  footer(slide, "全员");
}

function addDeptMgmt() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "部门怎么管", "设置 > 部门管理  ·  演示穿插");
  bullets(
    slide,
    [
      "仅租户管理员可创建 / 调整部门树；部门管理员无「+ 创建部门」",
      "创建根部门：父部门留空；创建子部门：选择已有父部门（列表不含默认部门）",
      "删除前检查：无子部门、无成员、无归属应用/知识库、无发布勾选",
    ],
    M,
    1.25,
    CW * 0.52,
    { fontSize: 14, charsPerLine: 28, gap: 0.06 },
  );
  slide.addText("演示：建「技术部 → 前端组」", {
    x: M,
    y: 3.6,
    w: CW * 0.52,
    h: 0.35,
    fontSize: 13,
    bold: true,
    fontFace: FONTS.body,
    color: COLORS.accent,
  });
  try {
    slide.addImage({
      path: shot("01-department-list.png"),
      x: M + CW * 0.54,
      y: 1.25,
      w: CW * 0.46,
      h: 2.45,
    });
    slide.addImage({
      path: shot("02-create-department.png"),
      x: M + CW * 0.54,
      y: 3.85,
      w: CW * 0.46,
      h: 2.35,
    });
  } catch (e) {
    slide.addText(`截图缺失: ${e.message}`, { x: M + CW * 0.54, y: 1.5, w: 4, h: 0.4, fontSize: 12, color: COLORS.muted });
  }
  footer(slide, "租户管理员");
}

function addMembers() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "成员与部门管理员", "设置 > 成员 / 部门详情  ·  演示穿插");
  bullets(
    slide,
    [
      "创建成员：姓名、邮箱、初始密码、部门、角色；邮箱全局唯一",
      "部门管理员须租户角色为「编辑」才能建人；管辖范围=本部门+子部门",
      "设 / 取消部门管理员：仅租户管理员",
      "调岗（移出部门）：人走、其创建的应用/知识库仍留原部门；管理员徽章取消",
    ],
    M,
    1.25,
    CW * 0.5,
    { fontSize: 13, charsPerLine: 28, gap: 0.05 },
  );
  slide.addText("演示：建编辑账号 → 设部门管理员", {
    x: M,
    y: 4.0,
    w: CW * 0.5,
    h: 0.35,
    fontSize: 13,
    bold: true,
    fontFace: FONTS.body,
    color: COLORS.accent,
  });
  try {
    slide.addImage({
      path: shot("04-create-member.png"),
      x: M + CW * 0.52,
      y: 1.25,
      w: CW * 0.48,
      h: 2.5,
    });
    slide.addImage({
      path: shot("05-move-member.png"),
      x: M + CW * 0.52,
      y: 3.9,
      w: CW * 0.48,
      h: 2.3,
    });
  } catch (e) {
    slide.addText(`截图缺失: ${e.message}`, { x: M + CW * 0.52, y: 1.5, w: 4, h: 0.4, fontSize: 12, color: COLORS.muted });
  }
  footer(slide, "租户管理员、部门管理员");
}

function addStudio() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "工作室 / 知识库归属", "列表隔离 · 转移 ·「所有部门成员」");

  const rows = [
    [
      { text: "角色", options: { bold: true, fill: { color: COLORS.accent }, color: COLORS.white } },
      { text: "工作室列表", options: { bold: true, fill: { color: COLORS.accent }, color: COLORS.white } },
      { text: "知识库列表", options: { bold: true, fill: { color: COLORS.accent }, color: COLORS.white } },
    ],
    ["租户管理员", "全量，可筛选", "可筛选（受分享策略影响）"],
    ["部门管理员", "本部门 + 子部门", "部门隔离 + 分享权限"],
    ["编辑", "仅本部门", "仅本部门有权库"],
    ["成员", "仅本部门（使用为主）", "无知识库顶栏"],
  ];
  slide.addTable(
    rows.map((r) =>
      Array.isArray(r) && typeof r[0] === "object"
        ? r
        : r.map((c) => ({ text: c, options: { fontFace: FONTS.body, fontSize: 12, color: COLORS.ink } })),
    ),
    {
      x: M,
      y: 1.25,
      w: CW,
      colW: [2.2, 5.0, 5.33],
      border: [{ pt: 0.5, color: COLORS.line }],
      fontFace: FONTS.body,
      fontSize: 12,
      color: COLORS.ink,
      align: "left",
      valign: "middle",
    },
  );

  bullets(
    slide,
    [
      "新建应用 / 知识库落入当前账号部门",
      "转移部门：仅租户管理员；转移后发布记录仍在",
      "知识库「所有部门成员」：精确同部门，不含子部门（父部门管理员也不可见）",
      "演示：两部门对照工作室列表",
    ],
    M,
    4.35,
    CW,
    { fontSize: 14, charsPerLine: 55, gap: 0.04 },
  );
  footer(slide, "全员");
}

function addPublishRules() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "发布与探索规则", "启用站点 + 发布部门");
  bullets(
    slide,
    [
      "发布：启用站点，并勾选目标发布部门",
      "探索可见 = 已发布 + 站点开启 + 发布到用户所属部门（或管辖范围）",
      "编辑通常只能发布到本部门；跨部门发布需租户管理员或有权的部门管理员",
      "探索看不见时，按清单排查：站点、发布部门、用户所在部门",
    ],
    M,
    1.25,
    CW * 0.48,
    { fontSize: 13, charsPerLine: 26, gap: 0.05 },
  );
  try {
    slide.addImage({
      path: shot("06-publish-departments.png"),
      x: M + CW * 0.5,
      y: 1.25,
      w: CW * 0.5,
      h: 2.55,
    });
    slide.addImage({
      path: shot("07-explore.png"),
      x: M + CW * 0.5,
      y: 3.95,
      w: CW * 0.5,
      h: 2.25,
    });
  } catch (e) {
    slide.addText(`截图缺失: ${e.message}`, { x: M + CW * 0.5, y: 1.5, w: 4, h: 0.4, fontSize: 12, color: COLORS.muted });
  }
  footer(slide, "全员");
}

function addCollab() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "标准协作路径", "A 建、B 用  ·  演示主线");

  const steps = [
    { n: "1", t: "A 部门编辑创建并配置应用（归属 A）" },
    { n: "2", t: "启用站点，发布部门勾选 B" },
    { n: "3", t: "B 在探索中使用；工作室改不了 A 的配置" },
    { n: "4", t: "仅当 B 要维护配置时，租户管理员再转移归属，并复核原发布勾选" },
  ];
  steps.forEach((s, i) => {
    const y = 1.35 + i * 1.05;
    slide.addShape(pptx.ShapeType.ellipse, {
      x: M,
      y: y + 0.05,
      w: 0.55,
      h: 0.55,
      fill: { color: COLORS.accent },
    });
    slide.addText(s.n, {
      x: M,
      y: y + 0.12,
      w: 0.55,
      h: 0.4,
      fontSize: 18,
      bold: true,
      fontFace: FONTS.title,
      color: COLORS.white,
      align: "center",
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: M + 0.75,
      y,
      w: CW - 0.75,
      h: 0.85,
      fill: { color: i === 3 ? COLORS.accentSoft : COLORS.soft },
      rectRadius: 0.06,
    });
    slide.addText(s.t, {
      x: M + 0.95,
      y: y + 0.2,
      w: CW - 1.15,
      h: 0.5,
      fontSize: 16,
      fontFace: FONTS.body,
      color: COLORS.ink,
    });
  });
  footer(slide, "全员");
}

function addChatEmbed() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "运行链接与嵌入", "/chat 与 /chatbot");

  slide.addShape(pptx.ShapeType.roundRect, {
    x: M,
    y: 1.25,
    w: CW / 2 - 0.15,
    h: 3.2,
    fill: { color: COLORS.soft },
    rectRadius: 0.08,
  });
  slide.addText("/chat/{code}", {
    x: M + 0.25,
    y: 1.45,
    w: CW / 2 - 0.65,
    h: 0.4,
    fontSize: 18,
    bold: true,
    fontFace: FONTS.mono,
    color: COLORS.accent,
  });
  bullets(
    slide,
    ["须登录", "须已发布到当前用户部门", "所有者也不豁免"],
    M + 0.25,
    2.05,
    CW / 2 - 0.65,
    { fontSize: 14, charsPerLine: 20 },
  );

  slide.addShape(pptx.ShapeType.roundRect, {
    x: M + CW / 2 + 0.15,
    y: 1.25,
    w: CW / 2 - 0.15,
    h: 3.2,
    fill: { color: COLORS.soft },
    rectRadius: 0.08,
  });
  slide.addText("/chatbot + embed_token", {
    x: M + CW / 2 + 0.4,
    y: 1.45,
    w: CW / 2 - 0.65,
    h: 0.4,
    fontSize: 16,
    bold: true,
    fontFace: FONTS.mono,
    color: COLORS.accent,
  });
  bullets(
    slide,
    ["须合法 embed_token", "复制 snippet 自动带 token", "可签发 / 重置", "无 token：嵌入链接无效"],
    M + CW / 2 + 0.4,
    2.05,
    CW / 2 - 0.65,
    { fontSize: 14, charsPerLine: 20 },
  );

  try {
    slide.addImage({
      path: shot("08-embed-dialog.png"),
      x: M,
      y: 4.6,
      w: CW / 2 - 0.15,
      h: 1.85,
    });
    slide.addImage({
      path: shot("10-chat-no-permission.png"),
      x: M + CW / 2 + 0.15,
      y: 4.6,
      w: CW / 2 - 0.15,
      h: 1.85,
    });
  } catch (e) {
    slide.addText(`截图缺失: ${e.message}`, { x: M, y: 4.7, w: 6, h: 0.35, fontSize: 12, color: COLORS.muted });
  }
  footer(slide, "全员（管理员细讲嵌入）");
}

function addModel() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "模型白名单", "为何 · 谁配 · 谁查");
  bullets(
    slide,
    [
      "为何：按成员限制可用模型，控成本与合规",
      "谁配：仅租户管理员；入口 设置 > 成员 → 模型权限",
      "谁查：成员在模型选择器中受白名单约束；管理员选择器全量",
      "默认模型始终可用且不可取消；保存过名单后，平台新加模型不会自动加入",
      "限制作用在选择器；应用已保存的模型，运行时不因白名单变更而拦截",
    ],
    M,
    1.25,
    CW * 0.5,
    { fontSize: 13, charsPerLine: 28, gap: 0.06 },
  );
  try {
    slide.addImage({
      path: shot("09-model-permissions.png"),
      x: M + CW * 0.52,
      y: 1.25,
      w: CW * 0.48,
      h: 5.0,
    });
  } catch (e) {
    slide.addText(`截图缺失: ${e.message}`, { x: M + CW * 0.52, y: 1.5, w: 4, h: 0.4, fontSize: 12, color: COLORS.muted });
  }
  footer(slide, "租户管理员为主");
}

function addScenarios() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "场景速查（四宫格）", "课后可当速查页");
  const cells = [
    { t: "① 建组织并任命", d: "建部门树 → 创建编辑账号 → 设部门管理员" },
    { t: "② 跨部门协作", d: "A 建应用 → 发布到 B → B 探索使用" },
    { t: "③ 员工调岗", d: "移出部门：人走资产留；管理员徽章取消" },
    { t: "④ 删部门前检查", d: "无子部门 / 成员 / 归属资产 / 发布勾选" },
  ];
  cells.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (CW / 2 + 0.15);
    const y = 1.3 + row * 2.5;
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w: CW / 2 - 0.15,
      h: 2.25,
      fill: { color: COLORS.soft },
      rectRadius: 0.08,
    });
    slide.addText(c.t, {
      x: x + 0.25,
      y: y + 0.35,
      w: CW / 2 - 0.65,
      h: 0.45,
      fontSize: 18,
      bold: true,
      fontFace: FONTS.title,
      color: COLORS.accent,
    });
    slide.addText(c.d, {
      x: x + 0.25,
      y: y + 1.0,
      w: CW / 2 - 0.65,
      h: 0.9,
      fontSize: 15,
      fontFace: FONTS.body,
      color: COLORS.ink,
    });
  });
  footer(slide, "全员");
}

function addMatrix() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "角色 × 能力矩阵", "谁能干什么（精简）");
  const header = ["能力", "租户管理员", "部门管理员", "编辑", "成员"].map((t) => ({
    text: t,
    options: { bold: true, fill: { color: COLORS.accent }, color: COLORS.white, align: "center" },
  }));
  const body = [
    ["部门 CRUD / 移动树", "是", "否", "否", "否"],
    ["创建成员", "是", "管辖内（须编辑）", "否", "否"],
    ["设部门管理员", "是", "否", "否", "否"],
    ["转移归属", "是", "否", "否", "否"],
    ["发布部门范围", "全部", "本+子部门", "本部门", "无入口"],
    ["配置模型权限", "是", "否", "否", "否"],
  ].map((r) =>
    r.map((c, idx) => ({
      text: c,
      options: {
        fontFace: FONTS.body,
        fontSize: 13,
        color: COLORS.ink,
        align: idx === 0 ? "left" : "center",
        fill: { color: COLORS.paper },
      },
    })),
  );
  slide.addTable([header, ...body], {
    x: M,
    y: 1.4,
    w: CW,
    colW: [3.3, 2.3, 2.5, 2.2, 2.23],
    border: [{ pt: 0.5, color: COLORS.line }],
    fontFace: FONTS.body,
    valign: "middle",
  });
  footer(slide, "全员");
}

function addFaq() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "FAQ", "高频问题");
  const faqs = [
    ["Q：转移后原部门探索仍可见？", "A：发布记录未取消，需手动取消对应发布勾选。"],
    ["Q：部门管理员看不到「创建部门」？", "A：仅租户管理员可建树。"],
    ["Q：创建部门失败没有「名称已存在」？", "A：现网常为通用文案「创建部门失败」。"],
    ["Q：成员看不到知识库菜单？", "A：成员角色无知识库顶栏。"],
    ["Q：所有者打开 /chat 仍失败？", "A：所有者也不豁免部门发布校验。"],
  ];
  faqs.forEach((f, i) => {
    const y = 1.25 + i * 0.95;
    slide.addText(f[0], {
      x: M,
      y,
      w: CW,
      h: 0.35,
      fontSize: 15,
      bold: true,
      fontFace: FONTS.body,
      color: COLORS.ink,
    });
    slide.addText(f[1], {
      x: M,
      y: y + 0.35,
      w: CW,
      h: 0.35,
      fontSize: 14,
      fontFace: FONTS.body,
      color: COLORS.muted,
    });
  });
  footer(slide, "全员");
}

function addNext() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  titleBar(slide, "配套与下一步", "材料 · 试点 · 回访");
  bullets(
    slide,
    [
      "使用手册：docs/nbys/使用手册-部门访问控制.md（及同名 docx）",
      "验收材料：docs/test_case/ 下 UAT 用例与 v1.4 本地复测报告",
      "截图素材：docs/nbys/manual-screenshots/",
      "下一步：确定试点部门、开通账号、收集问题并回访",
    ],
    M,
    1.5,
    CW,
    { fontSize: 16, charsPerLine: 55, gap: 0.15 },
  );
  footer(slide, "全员");
}

function addThanks() {
  page += 1;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.accent };
  slide.addText("谢谢 · 提问交流", {
    x: M,
    y: 2.6,
    w: CW,
    h: 0.8,
    fontSize: 40,
    bold: true,
    fontFace: FONTS.title,
    color: COLORS.white,
    align: "center",
  });
  slide.addText("细节以使用手册与现网文案为准", {
    x: M,
    y: 3.6,
    w: CW,
    h: 0.45,
    fontSize: 18,
    fontFace: FONTS.body,
    color: COLORS.white,
    align: "center",
  });
  slide.addText(`${String(page).padStart(2, "0")} / ${String(TOTAL).padStart(2, "0")}`, {
    x: M,
    y: H - M,
    w: CW,
    h: 0.3,
    fontSize: 12,
    fontFace: FONTS.mono,
    color: COLORS.white,
    align: "right",
  });
}

async function main() {
  addCover();
  addGoals();
  addDiffRoles();
  addOwnership();
  addDefaults();
  addDeptMgmt();
  addMembers();
  addStudio();
  addPublishRules();
  addCollab();
  addChatEmbed();
  addModel();
  addScenarios();
  addMatrix();
  addFaq();
  addNext();
  addThanks();

  if (page !== TOTAL) {
    console.warn(`page count mismatch: built ${page}, expected ${TOTAL}`);
  }
  await pptx.writeFile({ fileName: OUT });
  console.log(`wrote ${OUT} (${page} slides)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
