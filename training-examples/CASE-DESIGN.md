# Dify 培训案例详细设计文档

**版本**: v1.0  
**日期**: 2026-07-07  
**适用 Dify 版本**: 0.6+

---

## 概述

本文档包含 Dify 培训课程的 7 个完整案例设计，涵盖从入门到高级的全部知识点。每个案例都包含：

- **知识点与目标**：学完能掌握什么
- **场景设计**：为什么这样做，架构思路
- **完整代码**：Dify 配置 + API 调用代码（cURL/Python/JavaScript）
- **测试验证**：输入 → 预期输出 → 如何验证
- **扩展思考**：进阶方向、常见坑
- **讲师备注**：讲解重点、演示节奏、学员常见问题

### 案例总览

| 序号 | 案例名称 | 知识点 | 难度 | 预计时长 |
|------|---------|--------|------|---------|
| 1 | 法律知识问答助手 | 普通智能体、提示词设计、边界处理 | 入门 | 45-60 分钟 |
| 2 | 信息提取助手 | 工作流智能体、节点编排、JSON 输出 | 入门 | 30 分钟 |
| 3 | 多轮问答助手 | Chatflow、上下文管理、会话记忆 | 入门 | 45-60 分钟 |
| 4 | 产品手册问答 | 知识库创建、RAG 原理、分段策略 | 中级 | 60-90 分钟 |
| 5 | 智能问答工作流 | 知识库检索节点、检索策略优化 | 中级 | 60-90 分钟 |
| 6 | Web 前端调用 Dify API | API 认证、会话管理、前端集成 | 中级 | 60-90 分钟 |
| 7 | 会议纪要助手 | 知识库 + 工作流 + API 综合应用 | 高级 | 90-120 分钟 |

### 学习路径建议

```
入门阶段（案例 1-3）
├─ 案例 1：法律知识问答助手 → 掌握普通智能体和提示词设计
├─ 案例 2：信息提取助手 → 掌握工作流智能体和节点编排
└─ 案例 3：多轮问答助手 → 掌握 Chatflow 和上下文管理

中级阶段（案例 4-6）
├─ 案例 4：产品手册问答 → 掌握知识库创建和 RAG 原理
├─ 案例 5：智能问答工作流 → 掌握知识库检索节点配置
└─ 案例 6：Web 前端调用 API → 掌握 API 集成和前端开发

高级阶段（案例 7）
└─ 案例 7：会议纪要助手 → 综合应用所有知识点
```

---

## 目录

- [案例 1：法律知识问答助手](#案例-1法律知识问答助手)
- [案例 2：信息提取助手](#案例-2信息提取助手)
- [案例 3：多轮问答助手](#案例-3多轮问答助手)
- [案例 4：产品手册问答](#案例-4产品手册问答)
- [案例 5：智能问答工作流](#案例-5智能问答工作流)
- [案例 6：Web 前端调用 Dify API](#案例-6web-前端调用-dify-api)
- [案例 7：会议纪要助手](#案例-7会议纪要助手)

---

---
案例名称: 法律知识问答助手
知识点: 普通智能体创建、系统提示词设计、边界处理
难度: 入门
预计时长: 45-60 分钟
---

# 法律知识问答助手 - 详细设计文档

## 1. 知识点与目标

完成本案例后,学员将掌握:

- **普通智能体创建**: 在 Dify 平台创建一个基础的 Chatbot 应用
- **系统提示词设计**: 理解如何编写有效的系统提示词来约束 AI 行为
- **边界处理**: 学会通过规则约束让 AI 拒绝超出范围的问题
- **API 调用**: 掌握通过 API 集成智能体到外部系统的方法

### 核心概念

**普通智能体 (Chatbot)** 是最基础的 AI 应用类型,适合单轮或多轮对话场景。与工作流智能体不同,它不需要复杂的流程控制,通过系统提示词就能定义行为边界。

**系统提示词**是智能体的"灵魂",它决定了 AI 的角色、能力范围和回答风格。好的提示词能让 AI 表现得更专业、更可控。

## 2. 场景设计

### 2.1 场景背景

法律咨询是高频需求,但专业律师服务成本高。很多基础法律问题(比如劳动合同、租房合同、消费者维权)其实有明确的法律规定,普通人可以通过 AI 助手快速获取基础知识。

但法律问题有特殊性:
- **准确性要求高**: 错误的法律建议可能导致严重后果
- **边界必须清晰**: AI 不能替代专业律师处理具体案件
- **风险提示必要**: 每次回答都要提醒用户咨询专业律师

这就是为什么我们需要一个"有边界"的法律知识问答助手,而不是让 AI 随意回答所有法律问题。

### 2.2 架构思路

**为什么选择普通智能体而不是工作流智能体?**

| 对比维度 | 普通智能体 | 工作流智能体 |
|---------|-----------|-------------|
| 适用场景 | 简单问答、知识查询 | 复杂流程、多步骤处理 |
| 开发成本 | 低(只需提示词) | 高(需要设计流程) |
| 维护难度 | 简单 | 复杂 |
| 本案例匹配度 | ✅ 完全匹配 | ❌ 过度设计 |

法律知识问答本质上是"问什么答什么",不需要条件分支、数据查询、多轮确认等复杂流程。用工作流智能体就像用大炮打蚊子。

### 2.3 核心设计: 提示词结构

好的系统提示词包含三个要素:

```
角色定义 + 行为规则 + 输出格式
```

**本案例的提示词设计:**

```
你是一个法律知识问答助手。请遵循以下规则:
1. 只回答基础法律知识问题
2. 回答要通俗易懂,避免过于专业的术语
3. 每次回答后提醒用户"如需具体法律建议,请咨询专业律师"
4. 不回答涉及具体案件的问题
```

**设计解析:**

- **第 1 条**: 定义能力边界,只回答"基础知识",不处理复杂案件
- **第 2 条**: 定义回答风格,面向普通用户而非法律专业人士
- **第 3 条**: 强制风险提示,这是法律类应用的必要保护
- **第 4 条**: 明确拒绝范围,避免 AI 卷入具体纠纷

## 3. 完整代码

### 3.1 Dify 平台配置

#### 应用类型

选择 **Chatbot**(普通智能体)

#### 系统提示词

完整内容如下:

```
你是一个法律知识问答助手。请遵循以下规则:
1. 只回答基础法律知识问题
2. 回答要通俗易懂,避免过于专业的术语
3. 每次回答后提醒用户"如需具体法律建议,请咨询专业律师"
4. 不回答涉及具体案件的问题
```

#### 模型选择建议

| 模型 | 适用场景 | 说明 |
|-----|---------|------|
| GPT-3.5-Turbo | 入门学习 | 成本低,响应快,适合测试 |
| GPT-4 | 生产环境 | 理解能力更强,回答更准确 |
| Claude-3-Haiku | 平衡选择 | 性价比高,中文表现好 |

**建议**: 学习阶段用 GPT-3.5-Turbo,验证效果后再切换到更强的模型。

#### 其他配置

- **对话轮数**: 建议设置为 10 轮(支持多轮追问)
- **温度参数**: 0.3(法律问答需要准确性,不需要太多创造性)
- **最大 Token**: 800(足够回答大部分问题)

### 3.2 API 调用代码

创建应用后,在 Dify 平台的"访问 API"页面获取 API Key。

#### cURL 示例

```bash
curl -X POST 'https://api.dify.ai/v1/chat-messages' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "劳动合同到期不续签有补偿吗",
    "response_mode": "blocking",
    "user": "user-001"
  }'
```

**参数说明:**
- `inputs`: 空对象(本案例没有变量)
- `query`: 用户问题
- `response_mode`: `blocking`(同步等待)或 `streaming`(流式返回)
- `user`: 用户标识(用于区分不同用户)

#### Python 示例

```python
import requests
import json

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.dify.ai/v1"

def ask_legal_question(question: str) -> str:
    """向法律知识助手提问"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": {},
        "query": question,
        "response_mode": "blocking",
        "user": "user-001"
    }
    
    response = requests.post(
        f"{BASE_URL}/chat-messages",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        result = response.json()
        return result["answer"]
    else:
        raise Exception(f"API 调用失败: {response.text}")

# 使用示例
if __name__ == "__main__":
    question = "劳动合同到期不续签有补偿吗"
    answer = ask_legal_question(question)
    print(f"问题: {question}")
    print(f"回答: {answer}")
```

#### JavaScript 示例

```javascript
const API_KEY = "YOUR_API_KEY";
const BASE_URL = "https://api.dify.ai/v1";

async function askLegalQuestion(question) {
  const response = await fetch(`${BASE_URL}/chat-messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: {},
      query: question,
      response_mode: "blocking",
      user: "user-001"
    })
  });

  if (!response.ok) {
    throw new Error(`API 调用失败: ${response.statusText}`);
  }

  const result = await response.json();
  return result.answer;
}

// 使用示例
async function main() {
  const question = "劳动合同到期不续签有补偿吗";
  const answer = await askLegalQuestion(question);
  console.log(`问题: ${question}`);
  console.log(`回答: ${answer}`);
}

main().catch(console.error);
```

## 4. 测试验证

### 4.1 正常问题测试

以下问题应该得到详细、有用的回答:

| 序号 | 测试问题 | 预期回答要点 |
|-----|---------|-------------|
| 1 | 劳动合同到期不续签有补偿吗 | 说明经济补偿金的计算标准(每满一年支付一个月工资),提醒咨询律师 |
| 2 | 租房合同里哪些条款是必须的 | 列举必要条款(租金、租期、押金、违约责任等),提醒咨询律师 |
| 3 | 知识产权包括哪些类型 | 说明著作权、专利权、商标权等主要类型,提醒咨询律师 |
| 4 | 劳动仲裁的流程是什么 | 说明申请、受理、开庭、裁决的基本流程,提醒咨询律师 |
| 5 | 消费者维权有哪些途径 | 列举协商、投诉、仲裁、诉讼等途径,提醒咨询律师 |

**验证要点:**
- ✅ 回答是否通俗易懂(没有堆砌法条)
- ✅ 是否在结尾包含风险提示
- ✅ 是否提供了实用的基础信息

### 4.2 边界问题测试

以下问题应该被拒绝或引导:

| 序号 | 测试问题 | 预期拒绝方式 |
|-----|---------|-------------|
| 1 | 帮我打官司 | 明确拒绝: "我不能代理具体案件,建议咨询专业律师" |
| 2 | 邻居欠钱不还怎么办 | 可以说明一般维权途径,但不针对具体案件给建议 |
| 3 | 帮我写一份合同 | 拒绝: "我不能起草具体合同,建议找律师定制" |
| 4 | 我被辞退了能赔多少 | 可以说明计算标准,但强调"具体金额需要咨询律师" |

**验证要点:**
- ✅ 是否拒绝了超出范围的问题
- ✅ 拒绝时是否保持礼貌和专业
- ✅ 是否仍然提供了基础信息(如果可能)

### 4.3 如何判断提示词是否生效

**检查清单:**

1. **风险提示检查**: 随机抽取 5 个回答,检查是否每个都包含"如需具体法律建议,请咨询专业律师"
2. **边界拒绝检查**: 用边界问题测试,检查是否明确拒绝或引导
3. **语言风格检查**: 回答是否通俗易懂,没有堆砌专业术语
4. **一致性检查**: 多次问同一个问题,回答风格是否一致

如果以上检查都通过,说明提示词设计有效。

## 5. 扩展思考

### 5.1 如何增加更多法律领域

当前提示词只覆盖"基础法律知识",可以通过以下方式扩展:

**方案 1: 修改提示词**

```
你是一个法律知识问答助手,擅长以下领域:
- 劳动法
- 合同法
- 知识产权法
- 消费者权益保护法

请遵循以下规则:
...
```

**方案 2: 使用知识库**

在 Dify 中上传法律文档(比如《劳动法》《合同法》全文),让 AI 基于知识库回答,提高准确性。

### 5.2 如何处理复杂案件咨询

如果用户坚持咨询具体案件,可以:

1. **明确拒绝**: "我不能处理具体案件"
2. **提供指引**: "建议您携带相关材料咨询专业律师"
3. **提供基础信息**: "我可以告诉您这类案件的一般处理流程"

### 5.3 如何集成法律知识库

**步骤:**

1. 在 Dify 平台创建"知识库"
2. 上传法律文档(PDF、Word、TXT 格式)
3. 在智能体配置中关联知识库
4. 修改提示词,要求 AI 基于知识库内容回答

**优势:**
- 回答更准确(基于真实法律条文)
- 可以引用具体法条
- 减少 AI 幻觉

## 6. 讲师备注

### 6.1 讲解重点

**提示词设计技巧(10 分钟)**

重点讲解提示词的四个要素:

1. **角色定义**: "你是一个法律知识问答助手"
   - 为什么需要明确角色? 因为 AI 需要知道自己"是谁"
   - 角色决定了回答的风格和专业程度

2. **能力边界**: "只回答基础法律知识问题"
   - 为什么要设边界? 避免 AI 回答超出能力范围的问题
   - 边界越清晰,AI 表现越可控

3. **输出要求**: "回答要通俗易懂"
   - 为什么要规定风格? 面向不同用户群体需要不同的表达方式
   - 法律类应用尤其要注意避免专业术语堆砌

4. **强制规则**: "每次回答后提醒用户..."
   - 为什么需要强制规则? 某些信息(比如风险提示)必须每次都出现
   - 这是保护用户和保护自己的必要措施

### 6.2 演示节奏

**建议流程(45 分钟):**

1. **场景介绍(5 分钟)**: 为什么需要法律知识问答助手
2. **平台演示(10 分钟)**: 创建应用、配置提示词、选择模型
3. **正常问答演示(10 分钟)**: 用 5 个正常问题展示效果
4. **边界测试演示(10 分钟)**: 用 4 个边界问题展示拒绝效果
5. **API 调用演示(5 分钟)**: 展示如何通过代码调用
6. **Q&A(5 分钟)**: 解答学员疑问

**关键演示点:**

- 先演示正常问答,让学员看到 AI 的有用性
- 再演示边界拒绝,让学员看到 AI 的可控性
- 对比有/无风险提示的回答,强调合规重要性

### 6.3 学员常见问题

**Q1: 为什么模型有时候还是会回答边界问题?**

A: 这是提示词工程的常见挑战。解决方法:
- 提示词更明确: "绝对不回答涉及具体案件的问题"
- 增加示例: 在提示词中给出拒绝的示例
- 调整模型: 更强的模型(GPT-4)遵循指令的能力更强
- 多次迭代: 观察失败案例,持续优化提示词

**Q2: 为什么不让 AI 回答所有法律问题?**

A: 三个原因:
- **准确性**: AI 可能给出错误的法律建议,导致用户损失
- **合规性**: 法律咨询需要执业资格,AI 不能替代律师
- **责任**: 如果 AI 建议导致用户损失,平台可能承担法律责任

**Q3: 如何评估提示词的好坏?**

A: 三个标准:
- **有效性**: AI 是否按照提示词的要求回答
- **一致性**: 多次提问,回答风格是否稳定
- **边界性**: 是否能正确拒绝超出范围的问题

**Q4: 温度参数为什么要设置为 0.3?**

A: 温度参数控制回答的随机性:
- 0.0: 完全确定性,每次回答几乎一样
- 0.7: 中等随机性,回答更多样
- 1.0: 高度随机,回答可能偏离主题

法律问答需要准确性和一致性,所以用较低的温度(0.3)。如果是创意写作,可以用更高的温度(0.7-1.0)。

### 6.4 常见错误

**错误 1: 提示词太模糊**

```
❌ 你是一个法律助手,回答用户问题。
```

问题: 没有定义边界,AI 会回答所有问题,包括具体案件。

**错误 2: 规则太多**

```
❌ 你是一个法律知识问答助手。请遵循以下规则:
1. 只回答基础法律知识问题
2. 回答要通俗易懂
3. 每次回答后提醒用户咨询律师
4. 不回答涉及具体案件的问题
5. 回答长度不超过 200 字
6. 必须引用具体法条
7. 不能使用专业术语
8. 必须给出三个建议
...
```

问题: 规则太多,AI 可能顾此失彼,反而表现不稳定。建议控制在 5 条以内。

**错误 3: 没有风险提示**

法律类应用必须包含风险提示,这既是保护用户,也是保护平台。

### 6.5 进阶建议

对于学有余力的学员,可以尝试:

1. **添加知识库**: 上传法律文档,让 AI 基于知识库回答
2. **多轮对话**: 测试 AI 是否能在多轮对话中保持一致性
3. **变量使用**: 添加变量(比如"用户身份: 劳动者/雇主"),让 AI 根据变量调整回答
4. **工作流智能体**: 对比普通智能体和工作流智能体的差异

---

**文档版本**: v1.0  
**最后更新**: 2026-07-07  
**适用 Dify 版本**: 0.6+


---


---
案例名称: 信息提取助手
案例编号: case2
知识点:
  - 工作流智能体（Workflow）的创建
  - 工作流设计器的节点编排
  - 变量传递与 JSON 输出格式化
难度: 入门
预计时长: 30 分钟
前置知识: 案例 1（聊天助手）
---

# 案例 2：信息提取助手

## 1. 知识点与目标

完成本案例后，学员将掌握以下能力：

- **掌握工作流智能体（Workflow）的创建**：理解 Workflow 应用与普通聊天应用的区别，学会在 Dify 平台中创建 Workflow 类型应用
- **理解工作流设计器的节点编排**：熟悉可视化画布的操作方式，能够拖拽、连接和配置节点
- **学会变量传递和 JSON 输出格式化**：掌握节点之间如何通过变量引用传递数据，以及如何通过提示词约束 LLM 输出结构化 JSON

### 核心概念

| 概念 | 说明 |
|------|------|
| Workflow（工作流） | 以流程图方式编排 AI 逻辑，适合有明确输入输出的批处理任务 |
| 节点（Node） | 工作流中的最小执行单元，每个节点完成一个具体任务 |
| 变量传递 | 上游节点的输出可以作为下游节点的输入，通过 `{{变量名}}` 引用 |
| 结构化输出 | 通过提示词约束 LLM 输出特定格式（如 JSON），便于程序解析 |

## 2. 场景设计

### 2.1 场景背景

企业在日常运营中会产生大量非结构化文本，例如客户留言、交易记录、日志摘要等。人工提取关键信息效率低、容易出错。本案例构建一个信息提取助手，自动从自然语言文本中提取姓名、日期、金额、地点等关键字段，输出结构化 JSON。

**典型输入：**

```
张三在 2024 年 1 月 15 日在北京支付了 5000 元，联系电话 13800138000
```

**期望输出：**

```json
{
  "name": "张三",
  "date": "2024年1月15日",
  "amount": "5000元",
  "location": "北京",
  "phone": "13800138000",
  "company": ""
}
```

### 2.2 架构思路：为什么用工作流而不是普通智能体

| 对比维度 | 普通聊天应用（Chatflow） | 工作流应用（Workflow） |
|---------|------------------------|----------------------|
| 交互模式 | 多轮对话，上下文连续 | 单次执行，输入 → 处理 → 输出 |
| 适用场景 | 客服问答、闲聊、多轮推理 | 批处理、数据提取、格式转换 |
| 输出可控性 | 较弱，依赖模型自由发挥 | 较强，可通过节点约束输出格式 |
| API 调用 | 需要维护会话 ID | 无状态，每次调用独立 |

**选择 Workflow 的理由：**

1. **任务明确**：信息提取是一次性任务，不需要多轮对话
2. **输出结构化**：需要稳定的 JSON 格式，工作流更容易约束
3. **易于集成**：无状态设计，方便通过 API 批量调用
4. **可扩展**：后续可以轻松添加数据验证、格式转换等节点

### 2.3 核心设计

本案例采用最基础的三节点流程：

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  开始节点  │ ──→ │  LLM 节点 │ ──→ │  结束节点  │
│ (Input)   │     │ (处理)    │     │ (Output)  │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     └─ input ───────→└─ text ───────→└─ result
```

**数据流向：**

1. 开始节点接收用户输入的文本（变量 `input`）
2. LLM 节点读取 `{{input}}`，执行信息提取，输出 JSON
3. 结束节点将 LLM 的输出作为最终结果返回

## 3. 完整代码

### 3.1 Dify 平台配置

#### 应用类型

- **应用类型**：工作流（Workflow）
- **应用名称**：信息提取助手
- **应用描述**：从非结构化文本中提取关键信息，输出结构化 JSON

#### 工作流节点设计

##### 节点 1：开始节点（Start）

开始节点是整个工作流的入口，负责定义输入变量。

| 配置项 | 值 |
|-------|-----|
| 节点类型 | 开始（Start） |
| 变量名 | `input` |
| 变量类型 | 段落（Paragraph） |
| 必填 | 是 |
| 默认值 | （留空） |
| 提示文字 | 请输入需要提取信息的文本 |

**变量说明：**

- `input`：用户输入的待提取文本，类型为段落（支持多行文本）
- 该变量会在后续 LLM 节点中通过 `{{input}}` 引用

##### 节点 2：LLM 节点

LLM 节点是核心处理节点，负责调用大语言模型进行信息提取。

| 配置项 | 值 |
|-------|-----|
| 节点类型 | LLM |
| 模型 | gpt-4o / gpt-3.5-turbo / 通义千问 / 文心一言（任选） |
| Temperature | 0（确保输出稳定） |
| Max Tokens | 500 |
| 上游节点 | 开始节点 |

**提示词配置：**

系统提示词（System Prompt）留空或填写：

```
你是一个专业的信息提取助手。
```

用户提示词（User Prompt）：

```
请从以下文本中提取关键信息，以 JSON 格式输出：
- name: 人名
- date: 日期
- amount: 金额
- location: 地点
- phone: 手机号（如有）
- company: 公司名（如有）

文本：{{input}}

输出格式：
{
  "name": "",
  "date": "",
  "amount": "",
  "location": "",
  "phone": "",
  "company": ""
}

只输出 JSON，不要其他内容。
```

**变量引用说明：**

- `{{input}}`：引用开始节点定义的 `input` 变量
- 在 Dify 提示词编辑器中，输入 `{{` 会弹出变量选择菜单，选择 `input` 即可
- LLM 节点的输出变量默认为 `text`，可在结束节点中引用

**关键配置要点：**

1. **Temperature 设为 0**：信息提取需要确定性输出，不需要创造性
2. **提示词明确约束**：要求「只输出 JSON，不要其他内容」，避免模型输出解释性文字
3. **提供输出模板**：给出完整的 JSON 结构，让模型按模板填充

##### 节点 3：结束节点（End）

结束节点定义工作流的最终输出。

| 配置项 | 值 |
|-------|-----|
| 节点类型 | 结束（End） |
| 上游节点 | LLM 节点 |
| 输出变量名 | `result` |
| 输出变量值 | `{{LLM 节点.text}}` |

**变量引用说明：**

- `{{LLM 节点.text}}`：引用 LLM 节点的输出（`text` 是 LLM 节点的默认输出变量）
- 在 Dify 界面中，选择 LLM 节点后可以看到其输出变量列表

#### 模型选择建议

| 模型 | 适用场景 | 说明 |
|------|---------|------|
| gpt-3.5-turbo | 教学演示 | 速度快、成本低，适合简单提取任务 |
| gpt-4o | 生产环境 | 准确率高，对复杂文本的理解更好 |
| 通义千问（qwen-plus） | 国内部署 | 中文理解能力强，延迟低 |
| 文心一言（ernie-bot） | 国内部署 | 百度生态，中文场景优化 |

**教学建议**：演示时使用 gpt-3.5-turbo 或通义千问，成本低、响应快。

### 3.2 API 调用代码

工作流应用通过 `/workflows/run` 接口调用，与聊天应用的接口不同。

#### 前置准备

1. 在 Dify 平台获取 API Key：应用 → 访问 API → API 密钥
2. 记录 API Base URL：`https://api.dify.ai/v1`（云端）或 `http://your-host/v1`（私有部署）

#### cURL 示例

```bash
curl -X POST 'https://api.dify.ai/v1/workflows/run' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {
      "input": "张三在2024年1月15日在北京支付了5000元，联系电话13800138000"
    },
    "response_mode": "blocking",
    "user": "training-user-001"
  }'
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `inputs` | object | 是 | 输入变量，key 为变量名，value 为变量值 |
| `inputs.input` | string | 是 | 待提取的文本内容 |
| `response_mode` | string | 是 | 响应模式：`blocking`（同步等待）或 `streaming`（流式） |
| `user` | string | 是 | 用户标识，用于区分不同用户 |

#### Python 示例

```python
import requests
import json

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.dify.ai/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def extract_info(text: str) -> dict:
    """调用信息提取工作流"""
    payload = {
        "inputs": {
            "input": text
        },
        "response_mode": "blocking",
        "user": "training-user-001"
    }

    response = requests.post(
        f"{BASE_URL}/workflows/run",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    result = response.json()

    # 提取工作流输出
    output_text = result["data"]["outputs"]["result"]

    # 解析 JSON（模型输出可能包含 markdown 代码块标记）
    output_text = output_text.strip()
    if output_text.startswith("```json"):
        output_text = output_text[7:-3].strip()
    elif output_text.startswith("```"):
        output_text = output_text[3:-3].strip()

    return json.loads(output_text)


# 测试
if __name__ == "__main__":
    test_text = "张三在2024年1月15日在北京支付了5000元，联系电话13800138000"
    result = extract_info(test_text)
    print(json.dumps(result, ensure_ascii=False, indent=2))
```

#### JavaScript 示例

```javascript
const API_KEY = "YOUR_API_KEY";
const BASE_URL = "https://api.dify.ai/v1";

async function extractInfo(text) {
  const response = await fetch(`${BASE_URL}/workflows/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: {
        input: text,
      },
      response_mode: "blocking",
      user: "training-user-001",
    }),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }

  const result = await response.json();
  const outputText = result.data.outputs.result;

  // 清理可能的 markdown 代码块标记
  const cleaned = outputText
    .trim()
    .replace(/^```json\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  return JSON.parse(cleaned);
}

// 测试
const testText = "张三在2024年1月15日在北京支付了5000元，联系电话13800138000";
extractInfo(testText).then((result) => {
  console.log(JSON.stringify(result, null, 2));
});
```

## 4. 测试验证

### 测试用例 1：基础信息提取

**输入：**

```
张三在2024年1月15日在北京支付了5000元，联系电话13800138000
```

**预期输出：**

```json
{
  "name": "张三",
  "date": "2024年1月15日",
  "amount": "5000元",
  "location": "北京",
  "phone": "13800138000",
  "company": ""
}
```

**验证要点：**

- `name` 正确提取为「张三」
- `date` 包含完整日期信息
- `phone` 正确识别 11 位手机号
- `company` 为空字符串（文本中未提及公司）

### 测试用例 2：包含公司信息

**输入：**

```
李四于2024年3月20日在上海向阿里巴巴公司支付了10000元服务费
```

**预期输出：**

```json
{
  "name": "李四",
  "date": "2024年3月20日",
  "amount": "10000元",
  "location": "上海",
  "phone": "",
  "company": "阿里巴巴"
}
```

**验证要点：**

- `company` 正确提取为「阿里巴巴」（可能包含「公司」二字，均可接受）
- `phone` 为空（文本中未提及手机号）
- `amount` 提取为「10000元」（可能包含「服务费」，视模型理解而定）

### 测试用例 3：复杂场景

**输入：**

```
王五在2024年5月10日通过支付宝转账2000元给赵六，交易地点是深圳
```

**预期输出：**

```json
{
  "name": "王五",
  "date": "2024年5月10日",
  "amount": "2000元",
  "location": "深圳",
  "phone": "",
  "company": ""
}
```

**验证要点：**

- `name` 提取为「王五」（付款人），「赵六」是收款人，不应出现在 `name` 字段
- `location` 正确提取为「深圳」
- 所有字段均存在，缺失信息用空字符串填充

### 验证清单

| 检查项 | 通过标准 |
|-------|---------|
| JSON 格式正确 | 输出可被 `json.loads()` 或 `JSON.parse()` 解析 |
| 字段完整 | 包含全部 6 个字段：name、date、amount、location、phone、company |
| 无多余内容 | 输出只有 JSON，没有解释性文字或 markdown 标记 |
| 缺失字段处理 | 未提及的信息用空字符串 `""` 填充，而非 `null` 或缺失 |

## 5. 扩展思考

### 5.1 如何增加更多提取字段

**场景**：需要提取邮箱、订单号、商品名称等更多字段。

**方法**：

1. 在 LLM 节点的提示词中添加新字段说明：

```
- email: 邮箱地址（如有）
- order_id: 订单号（如有）
- product: 商品名称（如有）
```

2. 在 JSON 输出模板中添加对应字段：

```json
{
  "name": "",
  "date": "",
  "amount": "",
  "location": "",
  "phone": "",
  "company": "",
  "email": "",
  "order_id": "",
  "product": ""
}
```

**注意事项**：字段越多，模型出错概率越高。建议根据实际业务需求精简字段。

### 5.2 如何处理模糊信息

**场景**：输入文本中的信息不够明确，例如「上周在北京花了点钱」。

**处理策略**：

1. **在提示词中增加模糊处理规则**：

```
如果信息不明确或缺失，请在对应字段填写"未知"。
如果金额是模糊描述（如"一点钱"），请在 amount 字段填写"模糊金额"。
```

2. **添加置信度字段**：

```json
{
  "name": "",
  "date": "",
  "amount": "",
  "location": "",
  "phone": "",
  "company": "",
  "confidence": {
    "name": "high",
    "date": "low",
    "amount": "low"
  }
}
```

### 5.3 如何添加数据验证节点

**场景**：需要验证提取的手机号格式是否正确、金额是否为数字。

**方法**：在 LLM 节点和结束节点之间添加「代码执行」节点。

**工作流变为**：

```
开始节点 → LLM 节点 → 代码节点（验证） → 结束节点
```

**代码节点示例（Python）**：

```python
import json
import re

def main(llm_output: str) -> dict:
    # 解析 JSON
    data = json.loads(llm_output)

    # 验证手机号格式
    if data.get("phone"):
        if not re.match(r"^1[3-9]\d{9}$", data["phone"]):
            data["phone"] = ""
            data["validation_errors"] = "手机号格式不正确"

    # 验证金额是否为数字
    if data.get("amount"):
        amount_str = data["amount"].replace("元", "").replace(",", "")
        if not amount_str.isdigit():
            data["validation_errors"] = "金额格式不正确"

    return {"validated_result": json.dumps(data, ensure_ascii=False)}
```

## 6. 讲师备注

### 6.1 讲解重点

**重点 1：工作流节点编排**

- 强调工作流与聊天应用的区别：工作流是「一次性执行」，聊天应用是「多轮对话」
- 演示如何在画布上拖拽节点、连接连线
- 解释数据流向：开始 → LLM → 结束，每个节点的输入输出是什么

**重点 2：变量传递**

- 演示如何在提示词中引用变量：输入 `{{` 触发变量选择
- 强调变量名必须与开始节点定义的一致（`input` 而非 `text` 或其他）
- 解释 LLM 节点的输出变量 `text` 如何在结束节点中被引用

**重点 3：提示词工程**

- 解释为什么要求「只输出 JSON，不要其他内容」
- 演示如果不加这个约束，模型可能输出什么（解释性文字 + JSON）
- 强调 Temperature 设为 0 的原因：信息提取需要确定性，不需要创造性

### 6.2 演示节奏

**建议时长：30 分钟**

| 阶段 | 时长 | 内容 |
|------|------|------|
| 引入 | 3 分钟 | 展示场景背景，说明为什么需要信息提取 |
| 创建工作流 | 5 分钟 | 在 Dify 平台创建 Workflow 应用，添加三个节点 |
| 配置节点 | 10 分钟 | 详细配置每个节点，重点讲解提示词和变量引用 |
| 测试演示 | 5 分钟 | 在平台界面输入测试用例，展示输出结果 |
| API 调用 | 5 分钟 | 演示 cURL 和 Python 调用方式 |
| 扩展讨论 | 2 分钟 | 简要介绍扩展思路，留给学员课后探索 |

**演示技巧：**

1. **先展示工作流画布**：让学员对整体结构有直观认识
2. **再演示输入输出**：用测试用例 1 展示效果，建立信心
3. **最后讲解细节**：变量传递、提示词约束等技术细节

### 6.3 学员常见问题

**问题 1：为什么模型输出的 JSON 格式不对？**

**常见原因：**

- 提示词没有明确约束「只输出 JSON」
- Temperature 设置过高（建议设为 0）
- 模型能力不足（换用 gpt-4o 或通义千问）

**解决方法：**

1. 检查提示词是否包含「只输出 JSON，不要其他内容」
2. 将 Temperature 调为 0
3. 如果问题持续，尝试换用更强的模型
4. 在代码中添加 JSON 解析的容错处理（去除 markdown 标记）

**问题 2：为什么变量引用不生效？**

**常见原因：**

- 变量名拼写错误（`input` 写成 `Input` 或 `text`）
- 没有使用 `{{}}` 语法（写成 `{input}` 或 `input`）
- 变量没有在上游节点定义

**解决方法：**

1. 检查变量名是否与开始节点定义的一致
2. 确保使用 `{{input}}` 而非其他格式
3. 在提示词编辑器中输入 `{{`，从下拉菜单选择变量

**问题 3：API 调用返回 404 或 401？**

**常见原因：**

- API 路径错误（应该是 `/workflows/run` 而非 `/chat-messages`）
- API Key 错误或未设置
- Base URL 不正确

**解决方法：**

1. 确认接口路径：工作流是 `/workflows/run`，聊天是 `/chat-messages`
2. 检查 Authorization header：`Bearer YOUR_API_KEY`
3. 确认 Base URL：云端是 `https://api.dify.ai/v1`，私有部署替换为实际地址

**问题 4：提取的字段值不准确怎么办？**

**优化方向：**

1. **优化提示词**：提供更详细的字段说明和示例
2. **Few-shot 学习**：在提示词中添加 1-2 个输入输出示例
3. **分步提取**：复杂场景可以拆分为多个 LLM 节点，每个节点提取部分字段
4. **后处理验证**：添加代码节点进行格式校验和修正

### 6.4 教学检查清单

在学员动手实践前，确认以下要点已讲解：

- [ ] 工作流应用与聊天应用的区别
- [ ] 如何创建 Workflow 类型应用
- [ ] 三个节点的作用和配置方法
- [ ] 变量引用的语法：`{{变量名}}`
- [ ] 提示词中 JSON 格式约束的重要性
- [ ] Temperature 设为 0 的原因
- [ ] API 调用接口：`/workflows/run`
- [ ] 如何获取和使用 API Key

### 6.5 课后作业

1. **基础任务**：按照文档完成信息提取助手的搭建，通过全部 3 个测试用例
2. **进阶任务**：增加 2 个新字段（邮箱、订单号），并添加对应的测试用例
3. **挑战任务**：添加代码执行节点，实现手机号格式验证功能


---


---
案例名称: 多轮问答助手
知识点: Chatflow 对话流、上下文管理、会话记忆、conversation_id
难度: 入门
预计时长: 45-60 分钟
前置知识: 案例1 - 法律问答助手
---

# 案例3: 多轮问答助手

## 1. 知识点与目标

完成本案例后,你将掌握:

- **Chatflow 的创建与配置**: 理解 Chatflow(对话流)与简单 Chatbot 的区别,学会创建支持多轮对话的应用
- **上下文管理机制**: 掌握 Dify 如何通过 conversation_id 维护对话上下文,理解记忆轮数的配置方法
- **会话记忆与变量作用域**: 学会在多轮对话中保持上下文连贯性,理解会话级别的数据隔离

核心概念:
- **conversation_id**: 会话唯一标识符,用于关联同一对话的所有消息
- **记忆轮数**: 模型能"记住"的历史对话轮数,影响上下文长度和响应质量
- **上下文窗口**: 模型单次能处理的最大 token 数量,决定了记忆轮数的实际上限

## 2. 场景设计

### 2.1 场景背景

想象一个智能客服场景: 用户通过多轮对话告诉助手自己的姓名、偏好、需求,助手需要记住这些信息并在后续对话中使用。比如:

- 用户说"我叫张三",助手记住姓名
- 用户说"我喜欢喝咖啡",助手记住偏好
- 用户问"推荐一些饮品",助手基于之前的偏好推荐咖啡相关饮品

这种能力是构建智能客服、个人助理、教育辅导等应用的基础。

### 2.2 架构思路: Chatflow vs Chatbot

Dify 提供两种对话应用类型:

| 特性 | Chatbot(简单模式) | Chatflow(对话流模式) |
|------|------------------|---------------------|
| 配置复杂度 | 低,只需提示词 | 中等,可编排节点 |
| 上下文控制 | 自动管理 | 可精细控制 |
| 扩展性 | 有限 | 可集成工具、知识库 |
| 适用场景 | 简单问答 | 复杂业务流程 |

本案例使用 **Chatflow 模式**,因为它提供了更好的上下文控制能力,且为后续复杂案例打下基础。

### 2.3 核心设计

本案例的三个关键设计点:

1. **对话开场白**: 友好的开场白引导用户开始对话,降低使用门槛
2. **上下文记忆**: 通过配置记忆轮数,让模型"记住"之前的对话内容
3. **个性化回复**: 基于上下文信息,提供针对性的回复而非通用回答

## 3. 完整代码

### 3.1 Dify 平台配置

#### 应用类型

创建应用时选择: **聊天助手** → **Chatflow 模式**

#### 系统提示词

```
你是一个友好的问答助手。请记住用户在对话中提到的信息,并在后续对话中使用这些信息。

要求:
- 当用户告诉你姓名、偏好等信息时,明确确认你已记住
- 当用户询问之前提到的信息时,准确回忆并回答
- 保持对话的自然流畅,像朋友一样交流
```

#### 对话开场白设置

在应用配置的"开场白"字段中设置:

```
你好,我是你的问答助手。请问有什么可以帮助你的?
```

开场白的作用:
- 给用户第一印象,建立友好氛围
- 引导用户开始对话
- 可以在开场白中加入功能说明或使用提示

#### 上下文记忆配置

在"功能"→"记忆"中配置:

- **记忆轮数**: 建议设置为 10 轮(本案例测试只需 2-3 轮,但实际应用中建议更大)
- **记忆策略**: 选择"滑动窗口",保留最近的 N 轮对话

记忆轮数的选择原则:
- 太少: 模型"忘记"重要信息,用户体验差
- 太多: 超出上下文窗口限制,响应变慢,成本增加
- 建议: 根据实际场景测试,找到平衡点

### 3.2 API 调用代码

#### 前置准备

获取 API 密钥:
1. 进入应用详情页
2. 点击"访问 API"
3. 创建 API 密钥并保存

API 基础地址: `https://api.dify.ai/v1`

#### cURL 示例(含 conversation_id 管理)

**第1轮对话: 告诉助手姓名**

```bash
curl -X POST 'https://api.dify.ai/v1/chat-messages' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "我叫张三",
    "response_mode": "blocking",
    "user": "user123"
  }'
```

响应示例:
```json
{
  "message_id": "msg_abc123",
  "conversation_id": "conv_xyz789",
  "answer": "你好张三!很高兴认识你。我已经记住你的名字了。有什么我可以帮助你的吗?",
  "created_at": 1234567890
}
```

**关键点**: 保存响应中的 `conversation_id`,后续对话需要使用它。

**第2轮对话: 询问助手是否记住姓名**

```bash
curl -X POST 'https://api.dify.ai/v1/chat-messages' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "你还记得我叫什么吗?",
    "response_mode": "blocking",
    "user": "user123",
    "conversation_id": "conv_xyz789"
  }'
```

响应示例:
```json
{
  "message_id": "msg_def456",
  "conversation_id": "conv_xyz789",
  "answer": "当然记得,你叫张三!",
  "created_at": 1234567891
}
```

**注意**: 第2轮请求中包含了 `conversation_id`,这样模型就能"看到"之前的对话历史。

#### Python 示例(演示多轮对话)

```python
import requests
import json

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.dify.ai/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def chat(query, conversation_id=None, user="user123"):
    """发送聊天消息"""
    payload = {
        "inputs": {},
        "query": query,
        "response_mode": "blocking",
        "user": user
    }
    
    # 如果是后续对话,添加 conversation_id
    if conversation_id:
        payload["conversation_id"] = conversation_id
    
    response = requests.post(
        f"{BASE_URL}/chat-messages",
        headers=headers,
        json=payload
    )
    
    return response.json()

# 场景1: 记住用户姓名
print("=== 场景1: 记住用户姓名 ===")

# 第1轮
result1 = chat("我叫张三")
print(f"用户: 我叫张三")
print(f"助手: {result1['answer']}")
conversation_id = result1['conversation_id']

# 第2轮
result2 = chat("你还记得我叫什么吗?", conversation_id)
print(f"用户: 你还记得我叫什么吗?")
print(f"助手: {result2['answer']}")

print("\n=== 场景2: 记住用户偏好 ===")

# 新对话
result3 = chat("我喜欢喝咖啡")
print(f"用户: 我喜欢喝咖啡")
print(f"助手: {result3['answer']}")
conversation_id = result3['conversation_id']

# 第2轮
result4 = chat("推荐一些饮品", conversation_id)
print(f"用户: 推荐一些饮品")
print(f"助手: {result4['answer']}")

print("\n=== 场景3: 记住上下文 ===")

# 新对话
result5 = chat("今天天气怎么样?")
print(f"用户: 今天天气怎么样?")
print(f"助手: {result5['answer']}")
conversation_id = result5['conversation_id']

# 第2轮
result6 = chat("明天呢?", conversation_id)
print(f"用户: 明天呢?")
print(f"助手: {result6['answer']}")
```

**代码要点**:
- `chat()` 函数封装了 API 调用逻辑
- 第1轮对话不传 `conversation_id`,API 会返回新的 conversation_id
- 后续对话传入 `conversation_id`,保持上下文连贯
- 每个场景使用新的对话(新的 conversation_id)

#### JavaScript 示例(演示会话保持)

```javascript
const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api.dify.ai/v1';

async function chat(query, conversationId = null, user = 'user123') {
  const payload = {
    inputs: {},
    query: query,
    response_mode: 'blocking',
    user: user
  };
  
  // 如果是后续对话,添加 conversation_id
  if (conversationId) {
    payload.conversation_id = conversationId;
  }
  
  const response = await fetch(`${BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  return await response.json();
}

// 场景1: 记住用户姓名
async function testScenario1() {
  console.log('=== 场景1: 记住用户姓名 ===');
  
  // 第1轮
  const result1 = await chat('我叫张三');
  console.log('用户: 我叫张三');
  console.log(`助手: ${result1.answer}`);
  const conversationId = result1.conversation_id;
  
  // 第2轮
  const result2 = await chat('你还记得我叫什么吗?', conversationId);
  console.log('用户: 你还记得我叫什么吗?');
  console.log(`助手: ${result2.answer}`);
}

// 场景2: 记住用户偏好
async function testScenario2() {
  console.log('\n=== 场景2: 记住用户偏好 ===');
  
  const result3 = await chat('我喜欢喝咖啡');
  console.log('用户: 我喜欢喝咖啡');
  console.log(`助手: ${result3.answer}`);
  const conversationId = result3.conversation_id;
  
  const result4 = await chat('推荐一些饮品', conversationId);
  console.log('用户: 推荐一些饮品');
  console.log(`助手: ${result4.answer}`);
}

// 场景3: 记住上下文
async function testScenario3() {
  console.log('\n=== 场景3: 记住上下文 ===');
  
  const result5 = await chat('今天天气怎么样?');
  console.log('用户: 今天天气怎么样?');
  console.log(`助手: ${result5.answer}`);
  const conversationId = result5.conversation_id;
  
  const result6 = await chat('明天呢?', conversationId);
  console.log('用户: 明天呢?');
  console.log(`助手: ${result6.answer}`);
}

// 运行所有测试
async function runTests() {
  await testScenario1();
  await testScenario2();
  await testScenario3();
}

runTests();
```

**代码要点**:
- 使用 async/await 处理异步请求
- `conversationId` 参数默认为 null,第1轮对话不传
- 每个测试场景独立,使用新的 conversation_id
- 实际项目中,可以将 conversation_id 存储在 localStorage 或数据库中

## 4. 测试验证

### 场景1: 记住用户姓名(2轮对话)

**测试步骤**:

1. 第1轮: 发送"我叫张三"
   - 预期: 助手回应"你好张三!很高兴认识你..."
   - 验证: 响应中包含 `conversation_id`

2. 第2轮: 发送"你还记得我叫什么吗?"(携带 conversation_id)
   - 预期: 助手回答"你叫张三"或类似内容
   - 验证: 回答中正确包含"张三"

**验证要点**:
- ✅ 第1轮响应包含 `conversation_id`
- ✅ 第2轮请求携带了 `conversation_id`
- ✅ 第2轮回答正确回忆了用户姓名

### 场景2: 记住用户偏好(2轮对话)

**测试步骤**:

1. 第1轮: 发送"我喜欢喝咖啡"
   - 预期: 助手确认记住了偏好
   - 验证: 响应中包含 `conversation_id`

2. 第2轮: 发送"推荐一些饮品"(携带 conversation_id)
   - 预期: 助手推荐咖啡相关饮品(如拿铁、卡布奇诺等)
   - 验证: 推荐内容与咖啡相关

**验证要点**:
- ✅ 助手记住了用户的咖啡偏好
- ✅ 推荐内容体现了个性化
- ✅ conversation_id 正确传递

### 场景3: 记住上下文(2轮对话)

**测试步骤**:

1. 第1轮: 发送"今天天气怎么样?"
   - 预期: 助手回答北京天气(或询问城市)
   - 验证: 响应中包含 `conversation_id`

2. 第2轮: 发送"明天呢?"(携带 conversation_id)
   - 预期: 助手理解是在问北京明天的天气
   - 验证: 回答中包含"北京"和"明天"

**验证要点**:
- ✅ 助手理解了省略的上下文
- ✅ 第2轮回答正确关联了第1轮的城市信息
- ✅ conversation_id 正确传递

### 通用验证清单

- [ ] API 调用成功,返回 200 状态码
- [ ] 每轮对话都正确传递了 `conversation_id`
- [ ] 模型能够回忆之前提到的信息
- [ ] 回答内容自然流畅,没有突兀感
- [ ] 不同场景使用不同的 `conversation_id`(会话隔离)

## 5. 扩展思考

### 5.1 如何设置记忆轮数

**配置位置**: 应用配置 → 功能 → 记忆

**设置建议**:

| 应用场景 | 建议轮数 | 说明 |
|---------|---------|------|
| 简单问答 | 5-10 轮 | 满足基本对话需求 |
| 客服对话 | 20-30 轮 | 需要记住较多上下文 |
| 长对话场景 | 50+ 轮 | 注意上下文窗口限制 |

**注意事项**:
- 记忆轮数不是越大越好
- 每轮对话都会占用 token,影响响应速度和成本
- 建议根据实际测试调整

### 5.2 如何处理长对话的性能问题

**问题**: 随着对话轮数增加,上下文变长,导致:
- 响应变慢
- token 消耗增加
- 可能超出模型上下文窗口限制

**解决方案**:

1. **合理设置记忆轮数**: 只保留必要的历史对话
2. **使用摘要策略**: 定期总结对话内容,用摘要替代完整历史
3. **分段对话**: 将长对话拆分为多个独立会话
4. **选择大上下文模型**: 如 Claude-3(200K tokens)、GPT-4(128K tokens)

**实践建议**:
- 监控对话长度和响应时间
- 在用户体验和性能之间找到平衡
- 考虑使用流式响应提升用户体验

### 5.3 如何清除会话上下文

**方法1: 不传 conversation_id**

```python
# 开始新对话,不传 conversation_id
result = chat("新问题")  # 会创建新的 conversation_id
```

**方法2: 调用删除会话 API**

```bash
curl -X DELETE 'https://api.dify.ai/v1/conversations/{conversation_id}' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

**方法3: 在代码中管理**

```python
# 清除当前会话,开始新对话
conversation_id = None  # 重置为 None
result = chat("新问题", conversation_id)  # 创建新会话
```

**使用场景**:
- 用户明确要求"重新开始"
- 话题完全改变,不需要之前的上下文
- 调试或测试需要干净的会话状态

## 6. 讲师备注

### 6.1 讲解重点

**重点1: Chatflow 的上下文管理**

讲解要点:
- Chatflow 如何自动管理对话历史
- conversation_id 的作用和重要性
- 记忆轮数对上下文的影响

演示方法:
- 在 Dify 平台展示记忆配置界面
- 对比不同记忆轮数下的对话效果
- 解释 token 消耗与记忆轮数的关系

**重点2: conversation_id 的作用**

讲解要点:
- conversation_id 是会话的唯一标识
- 第1轮对话不传,API 返回新的 conversation_id
- 后续对话必须携带,否则会被视为新会话

演示方法:
- 演示不传 conversation_id 的情况(模型"忘记"之前的信息)
- 演示传递 conversation_id 的情况(模型"记住"之前的信息)
- 对比两种情况的差异,加深理解

### 6.2 演示节奏

**建议节奏**(45-60 分钟):

1. **理论讲解**(10 分钟)
   - 介绍多轮对话的概念和应用场景
   - 讲解 Chatflow 和上下文管理的基本原理
   - 解释 conversation_id 的作用

2. **平台配置演示**(10 分钟)
   - 在 Dify 平台创建 Chatflow 应用
   - 配置系统提示词和开场白
   - 设置记忆轮数

3. **API 调用演示**(15 分钟)
   - 先用 Dify 平台的"调试"界面演示(直观)
   - 再用 cURL 演示 API 调用(技术细节)
   - 最后用 Python/JavaScript 演示完整代码(实战)

4. **学员动手实践**(15 分钟)
   - 学员按照案例代码练习
   - 测试三个场景
   - 讲师巡场指导

5. **总结与答疑**(5-10 分钟)
   - 回顾核心知识点
   - 解答学员问题
   - 预告下一案例

### 6.3 学员常见问题

**问题1: 为什么模型记不住之前的对话?**

常见原因:
- ❌ 没有传递 `conversation_id`
- ❌ 传递了错误的 `conversation_id`
- ❌ 记忆轮数设置太小
- ❌ 超出了模型的上下文窗口限制

解决方法:
- ✅ 检查代码是否正确传递了 `conversation_id`
- ✅ 打印 `conversation_id` 确认值正确
- ✅ 增加记忆轮数配置
- ✅ 检查对话总长度是否超出限制

**问题2: conversation_id 应该存储在哪里?**

根据应用场景选择:
- **Web 应用**: 存储在 localStorage 或 sessionStorage
- **移动应用**: 存储在本地数据库或 SharedPreferences
- **后端服务**: 存储在 Redis 或数据库,关联用户 ID
- **测试调试**: 存储在变量中即可

**问题3: 如何调试多轮对话问题?**

调试技巧:
1. 打印每轮对话的请求和响应
2. 检查 `conversation_id` 是否正确传递
3. 在 Dify 平台查看对话日志
4. 使用"调试"模式逐步验证

**问题4: 记忆轮数设置多少合适?**

建议:
- 从 10 轮开始测试
- 根据实际对话长度调整
- 监控 token 消耗和响应时间
- 在用户体验和成本之间平衡

### 6.4 教学提示

**引导问题**:
- "如果模型记不住之前的对话,用户体验会怎样?"
- "为什么需要 conversation_id,而不是自动记住所有对话?"
- "记忆轮数设置太大会有什么问题?"

**类比说明**:
- conversation_id 就像聊天记录的文件名,不同文件的内容是隔离的
- 记忆轮数就像人的短期记忆,太多会记不住,太少会忘记重要信息

**常见误区**:
- ❌ 认为模型会自动记住所有对话(需要显式传递 conversation_id)
- ❌ 认为记忆轮数越大越好(要考虑性能和成本)
- ❌ 混淆不同会话的 conversation_id(每个会话独立)

---

**下一案例**: 案例4 - 知识库问答助手(将介绍如何集成外部知识库)


---


---
案例名称: 产品手册问答系统
知识点: 知识库创建与配置、RAG 原理、分段策略、检索模式选择
难度: 中级
预计时长: 60-90 分钟
---

# 产品手册问答系统 - 详细设计文档

## 1. 知识点与目标

完成本案例后,学员将掌握:

- **知识库的创建和配置**: 在 Dify 平台创建知识库并上传文档
- **RAG(检索增强生成)原理**: 理解为什么需要知识库,以及如何通过检索提高回答准确性
- **分段策略的选择**: 掌握不同分段方式对检索效果的影响
- **检索模式的选择**: 理解语义检索、关键词检索、混合检索的适用场景
- **API 调用**: 掌握通过 API 调用带知识库的问答应用

### 核心概念

**RAG(Retrieval-Augmented Generation,检索增强生成)** 是当前大模型应用的核心技术之一。它的核心思想是:在生成回答之前,先从知识库中检索相关信息,然后将检索到的信息作为上下文提供给大模型,让模型基于真实信息生成回答。

**为什么需要 RAG?**

大模型有两个致命缺陷:
1. **幻觉问题**: 模型会编造看似合理但实际错误的信息
2. **知识时效性**: 模型的训练数据有截止日期,无法回答最新信息

RAG 通过引入外部知识库,让模型"开卷考试"而不是"闭卷考试",大幅提高回答的准确性和可靠性。

**知识库工作流程:**

```
文档上传 → 文本分段 → 向量化(Embedding) → 存储到向量数据库
                                                    ↓
用户提问 → 问题向量化 → 相似度检索 → 获取相关片段 → 拼接上下文 → 大模型生成回答
```

## 2. 场景设计

### 2.1 场景背景

智能手表产品手册包含大量技术细节:功能说明、使用方法、常见问题解答。用户在使用产品时经常需要查询这些信息,但翻阅手册效率低下。

传统客服的问题:
- **响应慢**: 需要等待人工回复
- **成本高**: 需要培训大量客服人员
- **一致性差**: 不同客服可能给出不同答案

AI 问答系统的优势:
- **7x24 小时响应**: 随时解答用户问题
- **答案一致**: 基于同一份手册,答案标准化
- **成本低**: 一次配置,长期使用

但直接用大模型回答产品问题有严重风险:
- **幻觉**: 模型可能编造不存在的功能
- **不准确**: 可能给出错误的操作步骤
- **无法引用**: 无法告诉用户信息来源

这就是为什么我们需要知识库:让 AI 基于真实的产品手册回答,并且可以引用来源。

### 2.2 架构思路

**为什么选择知识库而不是微调模型?**

| 对比维度 | 知识库(RAG) | 模型微调 |
|---------|-----------|---------|
| 更新成本 | 低(直接更新文档) | 高(需要重新训练) |
| 可解释性 | 强(可以引用来源) | 弱(黑盒) |
| 准确性 | 高(基于真实文档) | 中(可能幻觉) |
| 实施难度 | 低(无需训练) | 高(需要数据和算力) |
| 适用场景 | 知识密集型问答 | 风格/格式调整 |

产品手册的特点是:
- **内容结构化**: 有明确的功能说明、操作步骤
- **更新频繁**: 产品迭代快,手册经常更新
- **准确性要求高**: 错误信息可能导致用户误操作

知识库方案完美匹配这些特点:更新文档即可更新知识,检索结果可以追溯来源。

### 2.3 核心设计:RAG 流程

**完整的 RAG 流程包含三个阶段:**

**阶段 1:文档预处理(离线)**

```
产品手册文档
    ↓
文本提取(从 PDF/Word/Markdown 提取纯文本)
    ↓
文本分段(将长文档切分成小段)
    ↓
向量化(使用 Embedding 模型将文本转换为向量)
    ↓
存储到向量数据库
```

**阶段 2:检索(在线)**

```
用户提问
    ↓
问题向量化(使用相同的 Embedding 模型)
    ↓
相似度计算(余弦相似度)
    ↓
返回 Top-K 个最相关的片段
```

**阶段 3:生成(在线)**

```
检索到的片段 + 用户问题
    ↓
拼接成 Prompt
    ↓
大模型生成回答
```

**关键参数:**

- **分段长度**: 每段文本的字符数,影响检索粒度
- **重叠长度**: 相邻分段的重叠字符数,避免信息被截断
- **Top-K**: 返回最相关的 K 个片段,K 越大信息越多但噪音也越多
- **Score 阈值**: 相似度阈值,低于阈值的结果会被过滤

## 3. 完整代码

### 3.1 Dify 平台配置

#### 步骤 1:创建知识库

1. 登录 Dify 平台,进入"知识库"页面
2. 点击"创建知识库"
3. 填写知识库信息:
   - **名称**: 智能手表产品手册
   - **描述**: XX 智能手表的产品手册,包含功能说明、使用方法和常见问题
   - **索引方式**: 高质量(使用 Embedding 模型)

#### 步骤 2:上传文档

1. 在知识库详情页,点击"添加文档"
2. 选择文件:`product-manual.md`(产品手册)
3. 等待文档上传和处理完成

**产品手册内容示例(product-manual.md):**

```markdown
# XX 智能手表产品手册

## 产品概述

XX 智能手表是一款集健康监测、运动记录、智能提醒于一体的可穿戴设备。

## 主要功能

### 健康监测
- **心率监测**: 24 小时连续心率监测,支持静息心率和运动心率记录
- **血氧检测**: 随时检测血氧饱和度,关注呼吸健康
- **睡眠监测**: 自动识别睡眠状态,分析深睡、浅睡、REM 时长
- **压力监测**: 基于心率变异性分析压力水平,提供呼吸训练

### 运动记录
支持 20+ 种运动模式:
- 户外跑步、室内跑步、骑行
- 游泳(支持 50 米防水)
- 瑜伽、健身、舞蹈
- 篮球、足球、羽毛球

每种运动模式记录:运动时长、消耗卡路里、平均心率、运动轨迹(部分运动)

### 智能提醒
- 来电提醒
- 短信/微信/钉钉消息提醒
- 日程提醒
- 久坐提醒

## 使用说明

### 开机与配对
1. 长按侧边按钮 3 秒开机
2. 手机下载"XX 健康"App(iOS/Android)
3. 打开 App,注册账号
4. 点击"添加设备",选择"XX 智能手表"
5. 手表和手机靠近,等待配对完成

### 充电说明
- 使用磁吸充电线
- 充电时间:约 2 小时充满
- 续航时间:
  - 典型使用:7-10 天
  - 重度使用(连续心率+GPS):3-5 天
  - 省电模式:14 天

### 表带更换
1. 翻转手表,找到表带快拆按钮
2. 按下按钮,向外拉动表带
3. 将新表带插入,听到"咔哒"声即安装完成

支持 20mm 标准表带,可选硅胶、皮质、金属材质。

## 常见问题

### Q: 手表防水吗?
A: 支持 50 米防水(IP68 等级),可以洗手、淋雨、游泳,但不适合潜水、温泉、桑拿。

### Q: 如何查看历史数据?
A: 打开"XX 健康"App,首页显示今日数据,点击"历史"查看过往记录。支持导出 PDF 报告。

### Q: 如何更新固件?
A: 手表会通过 App 自动检查更新,也可以在 App 中点击"设备设置"-"固件更新"手动检查。更新时保持手机和手表连接。

### Q: 手表续航多久?
A: 典型使用场景下 7-10 天,重度使用(连续心率监测+GPS 运动)3-5 天,省电模式可达 14 天。

### Q: 如何更换表带?
A: 翻转手表,按下快拆按钮,向外拉动即可拆卸。安装时将新表带插入,听到"咔哒"声即完成。支持 20mm 标准表带。
```

#### 步骤 3:配置分段策略

在文档上传后,需要配置分段策略:

**分段方式选择:**

| 分段方式 | 说明 | 适用场景 |
|---------|------|---------|
| 自动分段 | 系统智能识别段落边界 | 通用场景,推荐新手使用 |
| 自定义分段 | 按指定分隔符(如换行符)分段 | 文档结构清晰,有明确分隔符 |
| 按长度分段 | 固定长度切分 | 文档无明确结构 |

**本案例配置:**

- **分段方式**: 自动分段
- **分段长度**: 500 字符
- **重叠长度**: 50 字符

**参数说明:**

- **分段长度 500 字符**: 
  - 太短(如 100 字符):信息不完整,检索到的片段可能缺少上下文
  - 太长(如 2000 字符):包含过多无关信息,增加噪音
  - 500 字符是经验值,适合大部分文档

- **重叠长度 50 字符**:
  - 作用:避免关键信息被截断在分段边界
  - 例如:如果一句话正好在分段边界,重叠可以保留完整句子
  - 通常设置为分段长度的 10%-20%

#### 步骤 4:配置检索模式

**检索模式选择:**

| 检索模式 | 原理 | 适用场景 |
|---------|------|---------|
| 语义检索 | 基于向量相似度,理解语义 | 问题表述多样,需要同义匹配 |
| 关键词检索 | 基于 BM25 算法,匹配关键词 | 问题包含专有名词、型号等 |
| 混合检索 | 语义 + 关键词,综合排序 | 通用场景,效果最好 |

**本案例配置:**

- **检索方式**: 混合检索(语义 + 关键词)
- **Top-K**: 3
- **Score 阈值**: 0.5

**参数说明:**

- **Top-K = 3**:
  - 返回最相关的 3 个片段
  - K 太小:可能遗漏重要信息
  - K 太大:引入噪音,增加 Token 消耗
  - 3-5 是常用范围

- **Score 阈值 = 0.5**:
  - 相似度低于 0.5 的结果会被过滤
  - 阈值太高:可能过滤掉有用信息
  - 阈值太低:引入不相关内容
  - 0.5 是经验值,可根据实际效果调整

#### 步骤 5:关联到应用

1. 创建或编辑应用(选择 Chatbot 类型)
2. 在"上下文"部分,点击"添加知识库"
3. 选择刚创建的"智能手表产品手册"知识库
4. 配置系统提示词:

```
你是一个智能手表产品助手。请遵循以下规则:
1. 只基于知识库中的产品手册内容回答
2. 如果知识库中没有相关信息,明确告知用户"抱歉,产品手册中没有相关信息"
3. 回答要简洁明了,步骤清晰
4. 如果涉及操作步骤,使用编号列表
```

### 3.2 API 调用代码

创建应用后,在 Dify 平台的"访问 API"页面获取 API Key。

#### cURL 示例

```bash
curl -X POST 'https://api.dify.ai/v1/chat-messages' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "这个手表有哪些功能?",
    "response_mode": "blocking",
    "user": "user-001"
  }'
```

**参数说明:**
- `inputs`: 空对象(本案例没有变量)
- `query`: 用户问题
- `response_mode`: `blocking`(同步等待)或 `streaming`(流式返回)
- `user`: 用户标识(用于区分不同用户)

**响应示例:**

```json
{
  "event": "message",
  "task_id": "xxx",
  "message_id": "xxx",
  "conversation_id": "xxx",
  "answer": "XX 智能手表的主要功能包括:\n\n**健康监测**:\n- 心率监测:24 小时连续心率监测\n- 血氧检测:随时检测血氧饱和度\n- 睡眠监测:分析深睡、浅睡、REM 时长\n- 压力监测:基于心率变异性分析压力水平\n\n**运动记录**:\n支持 20+ 种运动模式,包括跑步、骑行、游泳、瑜伽等\n\n**智能提醒**:\n- 来电提醒\n- 消息提醒(短信/微信/钉钉)\n- 日程提醒\n- 久坐提醒",
  "metadata": {
    "retriever_resources": [
      {
        "position": 1,
        "dataset_id": "xxx",
        "dataset_name": "智能手表产品手册",
        "document_id": "xxx",
        "document_name": "product-manual.md",
        "score": 0.85,
        "content": "### 健康监测\n- **心率监测**: 24 小时连续心率监测..."
      }
    ]
  }
}
```

**注意**: `metadata.retriever_resources` 包含检索到的知识库片段,可以用于展示引用来源。

#### Python 示例

```python
import requests
import json

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.dify.ai/v1"

def ask_product_question(question: str) -> dict:
    """向产品手册问答系统提问"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": {},
        "query": question,
        "response_mode": "blocking",
        "user": "user-001"
    }
    
    response = requests.post(
        f"{BASE_URL}/chat-messages",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        result = response.json()
        return {
            "answer": result["answer"],
            "sources": [
                {
                    "document": ref["document_name"],
                    "score": ref["score"],
                    "content": ref["content"][:100] + "..."  # 截取前 100 字符
                }
                for ref in result.get("metadata", {}).get("retriever_resources", [])
            ]
        }
    else:
        raise Exception(f"API 调用失败: {response.text}")

# 使用示例
if __name__ == "__main__":
    question = "这个手表有哪些功能?"
    result = ask_product_question(question)
    
    print(f"问题: {question}")
    print(f"回答: {result['answer']}")
    print("\n引用来源:")
    for i, source in enumerate(result["sources"], 1):
        print(f"{i}. {source['document']} (相似度: {source['score']:.2f})")
        print(f"   内容预览: {source['content']}")
```

#### JavaScript 示例

```javascript
const API_KEY = "YOUR_API_KEY";
const BASE_URL = "https://api.dify.ai/v1";

async function askProductQuestion(question) {
  const response = await fetch(`${BASE_URL}/chat-messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: {},
      query: question,
      response_mode: "blocking",
      user: "user-001"
    })
  });

  if (!response.ok) {
    throw new Error(`API 调用失败: ${response.statusText}`);
  }

  const result = await response.json();
  
  return {
    answer: result.answer,
    sources: (result.metadata?.retriever_resources || []).map(ref => ({
      document: ref.document_name,
      score: ref.score,
      content: ref.content.substring(0, 100) + "..."
    }))
  };
}

// 使用示例
async function main() {
  const question = "这个手表有哪些功能?";
  const result = await askProductQuestion(question);
  
  console.log(`问题: ${question}`);
  console.log(`回答: ${result.answer}`);
  console.log("\n引用来源:");
  result.sources.forEach((source, i) => {
    console.log(`${i + 1}. ${source.document} (相似度: ${source.score.toFixed(2)})`);
    console.log(`   内容预览: ${source.content}`);
  });
}

main().catch(console.error);
```

## 4. 测试验证

### 4.1 测试问题与预期回答

以下问题应该得到基于产品手册的准确回答:

| 序号 | 测试问题 | 预期回答要点 | 引用来源 |
|-----|---------|-------------|---------|
| 1 | 这个手表有哪些功能? | 列出三大类功能:健康监测(心率、血氧、睡眠、压力)、运动记录(20+种模式)、智能提醒(来电、消息、日程、久坐) | 产品手册"主要功能"章节 |
| 2 | 如何配对手表? | 说明 5 个步骤:长按开机、下载 App、注册账号、添加设备、等待配对完成 | 产品手册"使用说明-开机与配对"章节 |
| 3 | 手表续航多久? | 说明三种场景:典型使用 7-10 天、重度使用 3-5 天、省电模式 14 天 | 产品手册"使用说明-充电说明"和"常见问题"章节 |
| 4 | 如何更换表带? | 说明步骤:翻转手表、按下快拆按钮、向外拉动、插入新表带。说明支持 20mm 标准表带 | 产品手册"使用说明-表带更换"和"常见问题"章节 |
| 5 | 手表防水吗? | 说明支持 50 米防水(IP68),可以洗手、淋雨、游泳,但不适合潜水、温泉、桑拿 | 产品手册"常见问题"章节 |

**验证要点:**

- ✅ 回答是否基于产品手册内容(没有编造不存在的功能)
- ✅ 是否包含引用来源(可以在 API 响应的 `metadata.retriever_resources` 中查看)
- ✅ 回答是否简洁明了,步骤清晰
- ✅ 如果问题超出手册范围,是否明确告知"产品手册中没有相关信息"

### 4.2 边界问题测试

以下问题应该被拒绝或明确告知无相关信息:

| 序号 | 测试问题 | 预期回答 |
|-----|---------|---------|
| 1 | 这个手表多少钱? | "抱歉,产品手册中没有价格信息" |
| 2 | 和其他品牌相比怎么样? | "抱歉,产品手册中没有对比信息" |
| 3 | 手表的芯片型号是什么? | "抱歉,产品手册中没有芯片型号信息" |
| 4 | 今天天气怎么样? | "抱歉,我只能回答产品手册相关的问题" |

**验证要点:**

- ✅ 是否拒绝了超出手册范围的问题
- ✅ 拒绝时是否保持礼貌和专业
- ✅ 是否没有编造答案

### 4.3 如何判断知识库配置是否生效

**检查清单:**

1. **检索结果检查**: 通过 API 响应的 `metadata.retriever_resources` 查看检索到的片段
   - 片段是否与问题相关?
   - 相似度分数是否合理(通常 > 0.5)?
   - 是否来自正确的文档?

2. **回答准确性检查**: 对比回答和产品手册原文
   - 回答是否基于手册内容?
   - 是否有编造的信息?
   - 关键数据(如续航时间)是否准确?

3. **引用来源检查**: 检查回答是否可以追溯到具体章节
   - 功能问题应该引用"主要功能"章节
   - 操作问题应该引用"使用说明"章节
   - FAQ 问题应该引用"常见问题"章节

4. **边界拒绝检查**: 用边界问题测试
   - 是否明确告知"产品手册中没有相关信息"?
   - 是否没有编造答案?

如果以上检查都通过,说明知识库配置有效。

## 5. 扩展思考

### 5.1 不同分段策略的效果对比

**实验设计:**

准备同一份产品手册,使用不同的分段策略,对比检索效果:

| 实验组 | 分段长度 | 重叠长度 | 预期效果 |
|-------|---------|---------|---------|
| A | 200 字符 | 20 字符 | 片段细碎,可能缺少上下文 |
| B | 500 字符 | 50 字符 | 平衡,推荐配置 |
| C | 1000 字符 | 100 字符 | 片段完整,但可能包含过多无关信息 |
| D | 2000 字符 | 200 字符 | 片段过大,检索精度下降 |

**评估指标:**

1. **检索准确率**: 检索到的片段是否与问题相关
2. **回答准确率**: 最终回答是否准确
3. **Token 消耗**: 检索片段占用的 Token 数量

**预期结论:**

- 分段长度 500-1000 字符是通用场景的合理范围
- 重叠长度设置为分段长度的 10%-20%
- 具体最优值需要根据文档类型和问答场景调整

### 5.2 语义检索 vs 关键词检索 vs 混合检索

**三种检索模式的原理:**

**语义检索:**
- 使用 Embedding 模型将文本和问题转换为向量
- 计算向量之间的余弦相似度
- 优势:理解语义,可以匹配同义词(如"电池续航"和"续航时间")
- 劣势:对专有名词、型号等精确匹配能力弱

**关键词检索:**
- 基于 BM25 算法,统计关键词在文档中的出现频率
- 优势:精确匹配专有名词、型号(如"XX 智能手表")
- 劣势:无法理解语义,同义词匹配能力弱

**混合检索:**
- 同时进行语义检索和关键词检索
- 使用 RRF(Reciprocal Rank Fusion)等算法综合排序
- 优势:兼顾语义理解和精确匹配
- 劣势:计算成本略高

**适用场景对比:**

| 问题类型 | 示例 | 推荐检索模式 |
|---------|------|------------|
| 同义表达 | "电池能用多久" vs "续航时间" | 语义检索 |
| 专有名词 | "XX 智能手表" | 关键词检索 |
| 通用问题 | "如何配对手表" | 混合检索 |

**本案例选择混合检索的原因:**

产品手册既包含通用描述(功能说明),也包含专有名词(产品型号、技术参数),混合检索可以兼顾两种场景。

### 5.3 如何优化召回率

**召回率(Recall)** 是指检索到的相关片段占所有相关片段的比例。召回率低意味着遗漏了重要信息。

**优化方法:**

**方法 1:调整分段策略**

- 减小分段长度:片段更细,检索更精确
- 增加重叠长度:避免信息被截断

**方法 2:调整检索参数**

- 增加 Top-K:返回更多片段(如从 3 增加到 5)
- 降低 Score 阈值:允许更多片段通过(如从 0.5 降低到 0.4)

**方法 3:查询重写(Query Rewriting)**

- 将用户问题改写为多个变体
- 例如:"手表续航" → "电池能用多久"、"充电一次用多长时间"
- 对每个变体分别检索,合并结果

**方法 4:多路召回**

- 同时使用多种检索策略(如语义检索 + 关键词检索)
- 合并结果,去重排序

**方法 5:重排序(Reranking)**

- 先检索 Top-20 个片段
- 使用 Cross-Encoder 模型重新打分
- 返回 Top-3 个最终结果

**实践建议:**

1. 先使用默认配置,观察检索效果
2. 分析失败案例,找出是检索问题还是生成问题
3. 如果是检索问题,逐步调整参数
4. 每次只调整一个参数,观察效果变化
5. 建立测试集,量化评估优化效果

## 6. 讲师备注

### 6.1 讲解重点

**RAG 原理(15 分钟)**

重点讲解三个核心概念:

1. **为什么需要 RAG?**
   - 大模型的幻觉问题:模型会编造看似合理但错误的信息
   - 知识时效性问题:模型无法回答训练数据之外的信息
   - 解决方案:让模型"开卷考试",基于真实文档回答

2. **RAG 的工作流程**
   - 离线阶段:文档预处理(分段 → 向量化 → 存储)
   - 在线阶段:检索(问题向量化 → 相似度计算) + 生成(拼接上下文 → 模型回答)
   - 用图示展示完整流程

3. **关键参数的影响**
   - 分段长度:影响检索粒度
   - Top-K:影响信息量和噪音
   - Score 阈值:影响召回率和准确率

**分段策略的影响(10 分钟)**

用实际例子展示不同分段策略的效果:

**示例文档:**
```
XX 智能手表支持 50 米防水(IP68 等级),可以洗手、淋雨、游泳,但不适合潜水、温泉、桑拿。
```

**分段长度 100 字符:**
```
片段 1: "XX 智能手表支持 50 米防水(IP68 等级),可以洗手、淋雨、"
片段 2: "游泳,但不适合潜水、温泉、桑拿。"
```

问题:"手表可以游泳吗?"
- 检索到片段 1:信息不完整,不知道可以游泳
- 检索到片段 2:信息不完整,不知道是什么产品

**分段长度 500 字符:**
```
片段 1: "XX 智能手表支持 50 米防水(IP68 等级),可以洗手、淋雨、游泳,但不适合潜水、温泉、桑拿。"
```

问题:"手表可以游泳吗?"
- 检索到片段 1:信息完整,明确可以游泳

**结论:** 分段长度太短会导致信息不完整,影响回答质量。

### 6.2 演示节奏

**建议流程(60 分钟):**

1. **场景介绍(5 分钟)**: 为什么需要产品手册问答系统
2. **RAG 原理讲解(15 分钟)**: 知识库工作流程、关键参数
3. **平台演示(15 分钟)**: 
   - 创建知识库(2 分钟)
   - 上传文档(3 分钟)
   - 配置分段策略(5 分钟,重点讲解参数含义)
   - 配置检索模式(5 分钟,对比三种模式)
4. **问答效果演示(10 分钟)**: 
   - 用 5 个正常问题展示效果
   - 展示引用来源(通过 API 响应)
   - 用 2-3 个边界问题展示拒绝效果
5. **API 调用演示(10 分钟)**: 
   - 展示 cURL 命令
   - 展示 Python/JavaScript 代码
   - 解析响应结构,重点讲解 `metadata.retriever_resources`
6. **Q&A(5 分钟)**: 解答学员疑问

**关键演示点:**

- 先讲解 RAG 原理,让学员理解"为什么"
- 再演示平台配置,让学员看到"怎么做"
- 最后展示 API 调用,让学员知道"如何集成"
- 对比有/无知识库的回答质量,强调 RAG 的价值

### 6.3 学员常见问题

**Q1: 为什么检索不到正确的文档片段?**

A: 可能的原因和解决方法:

1. **分段策略不合理**
   - 分段长度太大:片段包含过多无关信息,相似度被稀释
   - 解决方法:减小分段长度(如从 1000 降到 500)

2. **检索模式不匹配**
   - 问题包含专有名词,但只用了语义检索
   - 解决方法:切换到混合检索

3. **Score 阈值太高**
   - 相关片段的相似度低于阈值,被过滤掉
   - 解决方法:降低阈值(如从 0.5 降到 0.4)

4. **Top-K 太小**
   - 相关片段排在第 4、5 位,但只返回 Top-3
   - 解决方法:增加 Top-K(如从 3 增加到 5)

**排查步骤:**
1. 通过 API 响应的 `metadata.retriever_resources` 查看检索到的片段
2. 检查片段的相似度分数
3. 对比问题和片段,分析为什么不相关
4. 逐步调整参数,观察效果变化

**Q2: 分段长度和重叠长度应该设置为多少?**

A: 没有标准答案,需要根据文档类型调整:

| 文档类型 | 推荐分段长度 | 推荐重叠长度 |
|---------|------------|------------|
| 产品手册(结构化) | 500-800 字符 | 50-100 字符 |
| 法律文档(长段落) | 800-1200 字符 | 100-200 字符 |
| 技术文档(代码多) | 300-500 字符 | 30-50 字符 |
| 新闻文章(短文本) | 200-400 字符 | 20-40 字符 |

**经验法则:**
- 分段长度:500-1000 字符是通用范围
- 重叠长度:分段长度的 10%-20%
- 最终需要通过实验确定最优值

**Q3: 为什么混合检索比单一检索效果好?**

A: 因为混合检索兼顾了两种匹配方式:

**语义检索的优势:**
- 理解同义词:"电池续航" = "续航时间"
- 理解语义:"如何配对" ≈ "怎么连接"

**关键词检索的优势:**
- 精确匹配专有名词:"XX 智能手表"
- 精确匹配型号:"IP68"

**混合检索:**
- 同时使用两种方法
- 综合排序,取最优结果
- 既理解语义,又精确匹配

**Q4: 如何提高回答的准确性?**

A: 从两个方面优化:

**1. 优化检索(找到正确的片段)**
- 调整分段策略
- 调整检索参数(Top-K、Score 阈值)
- 使用混合检索
- 查询重写(将问题改写为多个变体)

**2. 优化生成(基于片段生成更好的回答)**
- 优化系统提示词:明确要求"只基于知识库内容回答"
- 调整模型:更强的模型(GPT-4)理解能力更强
- 调整温度参数:降低温度(如 0.3)提高确定性

**Q5: 知识库的文档格式有什么要求?**

A: Dify 支持多种格式:

| 格式 | 说明 | 适用场景 |
|-----|------|---------|
| PDF | 支持文本提取 | 产品手册、报告 |
| Word | 支持 .docx 格式 | 文档、手册 |
| Markdown | 结构化文本 | 技术文档 |
| TXT | 纯文本 | 简单文档 |
| HTML | 网页内容 | 在线文档 |

**最佳实践:**
- 文档结构清晰(有标题、段落、列表)
- 避免过多图片(图片无法提取文本)
- 使用标准格式(避免特殊编码)

### 6.4 常见错误

**错误 1:分段长度设置不合理**

```
❌ 分段长度:100 字符
```

问题:片段太短,信息不完整。例如一个操作步骤被切分成多个片段,检索到的片段缺少上下文。

**正确做法:**
```
✅ 分段长度:500 字符
```

**错误 2:检索模式选择不当**

```
❌ 只使用语义检索,问题包含专有名词"XX 智能手表"
```

问题:语义检索对专有名词匹配能力弱,可能检索不到相关片段。

**正确做法:**
```
✅ 使用混合检索,兼顾语义和关键词匹配
```

**错误 3:没有配置系统提示词**

```
❌ 系统提示词:你是一个助手。
```

问题:没有约束 AI 只基于知识库回答,AI 可能编造答案。

**正确做法:**
```
✅ 系统提示词:你是一个产品助手。请遵循以下规则:
1. 只基于知识库中的产品手册内容回答
2. 如果知识库中没有相关信息,明确告知用户
3. 回答要简洁明了
```

**错误 4:Top-K 设置过大**

```
❌ Top-K:10
```

问题:返回过多片段,包含大量无关信息,增加 Token 消耗,降低回答质量。

**正确做法:**
```
✅ Top-K:3-5
```

### 6.5 进阶建议

对于学有余力的学员,可以尝试:

1. **多文档知识库**: 上传多个产品手册(如不同型号),测试 AI 是否能区分不同产品
2. **查询重写**: 实现查询重写功能,将用户问题改写为多个变体,提高召回率
3. **重排序**: 使用 Cross-Encoder 模型对检索结果重排序,提高准确率
4. **对话历史**: 配置多轮对话,测试 AI 是否能在多轮对话中保持上下文
5. **评估指标**: 建立测试集,计算召回率、准确率、F1 等指标,量化评估效果

---

**文档版本**: v1.0  
**最后更新**: 2026-07-07  
**适用 Dify 版本**: 0.6+


---


---
案例名称: 智能问答工作流
知识点: 工作流知识库检索节点配置、检索策略优化、检索与生成结合
难度: 中级
预计时长: 60-90 分钟
前置案例: 案例4(知识库创建与管理)
---

# 智能问答工作流 - 详细设计文档

## 1. 知识点与目标

完成本案例后,学员将掌握:

- **知识库检索节点配置**: 在工作流中添加和配置知识库检索节点
- **检索策略理解**: 掌握 TopK、Score 阈值、重排序等检索优化方法
- **检索与生成结合**: 学会将知识库检索结果作为 LLM 的上下文输入
- **工作流设计思维**: 理解工作流应用与普通知识库应用的区别和适用场景

### 核心概念

**工作流知识库检索**与普通知识库应用的关键区别在于可控性和灵活性。普通知识库应用自动完成"检索-生成"流程,用户无法干预中间步骤。工作流则让你精确控制每个环节:检索什么、如何检索、如何处理检索结果、如何生成回答。

**检索策略**直接影响回答质量。TopK 决定检索多少条文档,Score 阈值过滤低相关性结果,重排序模型提升结果排序准确度。理解这些参数的含义和调优方法,是构建高质量问答系统的关键。

**变量引用**是工作流的核心机制。通过 `{{variable_name}}` 语法,你可以在节点之间传递数据,实现灵活的数据流转。

## 2. 场景设计

### 2.1 场景背景

企业产品手册、技术文档、FAQ 等资料往往篇幅长、内容多。用户提问时,需要从海量文档中精准定位相关信息,并生成简洁明了的回答。这就是典型的 RAG(Retrieval-Augmented Generation)应用场景。

本案例以智能手表产品手册为例,演示如何构建一个基于知识库的智能问答系统。用户提问后,系统会:

1. 从产品手册中检索相关段落
2. 将检索结果和用户问题一起发送给 LLM
3. LLM 基于检索内容生成准确回答
4. 如果检索不到相关信息,诚实告知用户

这种架构的优势是回答有据可依,减少 AI 幻觉,同时能处理企业私有知识。

### 2.2 架构思路

**工作流知识库 vs 普通知识库应用**

| 对比维度 | 普通知识库应用 | 工作流知识库应用 |
|---------|--------------|----------------|
| 检索控制 | 自动检索,用户无法干预 | 可配置检索策略、TopK、阈值 |
| 结果处理 | 直接拼接为上下文 | 可添加预处理、过滤、重排序 |
| 生成控制 | 固定提示词模板 | 可自定义提示词、引用变量 |
| 多知识库 | 支持但配置简单 | 可设计复杂的多知识库检索逻辑 |
| 适用场景 | 快速搭建、简单问答 | 需要精细控制、复杂业务逻辑 |
| 开发成本 | 低(配置即用) | 中(需要设计工作流) |

**为什么本案例选择工作流?**

产品问答场景需要精确控制检索和生成过程。比如:
- 需要限制检索结果数量,避免上下文过长
- 需要设置相关性阈值,过滤低质量结果
- 需要自定义提示词,要求 AI 只基于检索内容回答
- 未来可能扩展为多知识库检索、添加重排序模型

工作流提供了这种灵活性和可控性。

### 2.3 核心设计: 四节点工作流

本案例的工作流包含 4 个节点,形成清晰的数据流:

```
开始节点 → 知识库检索节点 → LLM 节点 → 结束节点
   ↓              ↓                ↓           ↓
question    retrieved_docs      answer      answer
```

**节点职责:**

1. **开始节点**: 接收用户输入的问题(`question` 变量)
2. **知识库检索节点**: 从产品手册中检索相关文档片段
3. **LLM 节点**: 基于检索结果和用户问题生成回答
4. **结束节点**: 输出最终回答(`answer` 变量)

这种线性结构适合简单的问答场景。如果需要在检索失败时提供备选方案,可以添加条件分支节点。

## 3. 完整代码

### 3.1 Dify 平台配置

#### 应用类型

选择 **Workflow**(工作流)

#### 前置条件

本案例需要使用案例4创建的知识库"产品手册"。如果尚未创建,请先完成案例4,确保知识库中包含智能手表产品手册文档。

#### 工作流节点设计

##### 节点1: 开始节点

**配置说明:**

- **节点名称**: 开始
- **输入变量**: 
  - 变量名: `question`
  - 变量类型: 文本(String)
  - 描述: 用户的问题
  - 是否必填: 是

**作用**: 定义工作流的入口,接收用户输入的问题。这个变量会在后续节点中被引用。

##### 节点2: 知识库检索节点

**配置说明:**

- **节点名称**: 检索产品手册
- **知识库选择**: 产品手册(案例4创建的知识库)
- **检索模式**: 混合检索(Hybrid Search)
  - 混合检索结合向量检索和关键词检索,兼顾语义相似度和精确匹配
  - 其他选项: 向量检索(纯语义)、全文检索(纯关键词)
- **TopK**: 3
  - 返回最相关的 3 个文档片段
  - 值太小可能遗漏重要信息,值太大增加上下文长度和成本
- **Score 阈值**: 0.5(可选)
  - 过滤相关性得分低于 0.5 的结果
  - 阈值越高,结果越精确但可能遗漏相关内容
- **重排序模型**: 无(基础配置,扩展思考中会讨论)
- **输出变量**: `retrieved_docs`
  - 变量类型: 文本(String)
  - 内容: 检索到的文档片段,多个片段用换行分隔

**变量引用方式:**

在后续节点中,通过 `{{retrieved_docs}}` 引用这个变量的值。

**配置截图说明:**

在 Dify 平台中,知识库检索节点的配置界面包含:
1. 知识库选择下拉框(选择"产品手册")
2. 检索模式单选框(选择"混合检索")
3. TopK 数值输入框(输入 3)
4. Score 阈值滑块(拖动到 0.5)
5. 输出变量名称输入框(输入 `retrieved_docs`)

##### 节点3: LLM 节点(回答生成)

**配置说明:**

- **节点名称**: 生成回答
- **模型选择**: GPT-3.5-Turbo(学习阶段)或 GPT-4(生产环境)
- **温度参数**: 0.3(问答需要准确性,不需要太多创造性)
- **最大 Token**: 800

**提示词(完整内容):**

```
你是一个产品问答助手。请根据以下检索到的文档内容,回答用户的问题。

检索到的文档:
{{retrieved_docs}}

用户问题:{{question}}

要求:
1. 只根据检索到的文档内容回答
2. 如果文档中没有相关信息,请说"抱歉,我无法找到相关信息"
3. 回答要简洁明了
4. 引用文档中的具体内容
```

**提示词设计解析:**

- **第1行**: 定义角色"产品问答助手",明确任务范围
- **第2行**: 说明回答依据"检索到的文档内容",避免 AI 凭空编造
- **`{{retrieved_docs}}`**: 引用知识库检索节点的输出,这是检索到的相关文档片段
- **`{{question}}`**: 引用开始节点的用户输入
- **要求1**: 强制 AI 只基于检索内容回答,这是 RAG 的核心原则
- **要求2**: 处理检索失败的情况,诚实告知用户而非编造答案
- **要求3**: 控制回答长度,避免冗长
- **要求4**: 要求引用具体内容,增强可信度

**变量引用方式:**

在提示词编辑器中,通过输入 `{{` 触发变量选择器,选择 `retrieved_docs` 和 `question`。Dify 会自动插入变量引用语法。

##### 节点4: 结束节点

**配置说明:**

- **节点名称**: 结束
- **输出变量**: 
  - 变量名: `answer`
  - 变量值: 引用 LLM 节点的输出
  - 引用方式: 点击输入框,选择"LLM 节点" → "输出"

**作用**: 定义工作流的出口,将 LLM 生成的回答作为最终输出。

#### 模型选择建议

| 模型 | 适用场景 | 说明 |
|-----|---------|------|
| GPT-3.5-Turbo | 入门学习 | 成本低,响应快,适合测试工作流逻辑 |
| GPT-4 | 生产环境 | 理解能力更强,能更好地遵循"只基于检索内容回答"的指令 |
| Claude-3-Haiku | 平衡选择 | 性价比高,中文表现好,遵循指令能力强 |

**建议**: 学习阶段用 GPT-3.5-Turbo 验证工作流逻辑,验证效果后切换到 GPT-4 或 Claude-3-Haiku 提升回答质量。

#### 工作流连接

确保节点之间正确连接:

```
开始节点 ──→ 知识库检索节点 ──→ LLM 节点 ──→ 结束节点
```

在 Dify 画布中,拖动节点边缘的连接点创建连线。连线表示数据流向。

### 3.2 API 调用代码

创建应用后,在 Dify 平台的"访问 API"页面获取 API Key。

**注意**: 工作流应用使用 `/workflows/run` 端点,而不是聊天应用的 `/chat-messages` 端点。

#### cURL 示例

```bash
curl -X POST 'https://api.dify.ai/v1/workflows/run' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {
      "question": "这个手表有哪些功能?"
    },
    "response_mode": "blocking",
    "user": "user-001"
  }'
```

**参数说明:**
- `inputs`: 包含工作流输入变量的对象,本案例只有 `question` 一个变量
- `response_mode`: `blocking`(同步等待)或 `streaming`(流式返回)
- `user`: 用户标识(用于区分不同用户)

**响应示例:**

```json
{
  "task_id": "task-123456",
  "workflow_run_id": "run-789012",
  "data": {
    "id": "run-789012",
    "workflow_id": "workflow-abc",
    "status": "succeeded",
    "outputs": {
      "answer": "根据产品手册,这款智能手表主要有三大功能:\n\n1. **健康监测**: 支持心率监测、睡眠追踪、血氧检测...\n2. **运动记录**: 支持跑步、游泳、骑行等多种运动模式...\n3. **消息提醒**: 可接收电话、短信、应用通知..."
    },
    "elapsed_time": 2.5,
    "total_tokens": 500,
    "created_at": 1234567890
  }
}
```

#### Python 示例

```python
import requests
import json

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.dify.ai/v1"

def ask_product_question(question: str) -> str:
    """向产品问答工作流提问"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": {
            "question": question
        },
        "response_mode": "blocking",
        "user": "user-001"
    }
    
    response = requests.post(
        f"{BASE_URL}/workflows/run",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        result = response.json()
        # 工作流输出在 data.outputs 中
        return result["data"]["outputs"]["answer"]
    else:
        raise Exception(f"API 调用失败: {response.text}")

# 使用示例
if __name__ == "__main__":
    questions = [
        "这个手表有哪些功能?",
        "如何配对手表?",
        "手表续航多久?"
    ]
    
    for question in questions:
        print(f"\n问题: {question}")
        try:
            answer = ask_product_question(question)
            print(f"回答: {answer}")
        except Exception as e:
            print(f"错误: {e}")
```

**代码解析:**

- **第14-17行**: 构造 `inputs` 对象,包含 `question` 变量
- **第20行**: 调用 `/workflows/run` 端点(注意不是 `/chat-messages`)
- **第26行**: 从 `data.outputs.answer` 提取回答(工作流的响应结构与聊天应用不同)

#### JavaScript 示例

```javascript
const API_KEY = "YOUR_API_KEY";
const BASE_URL = "https://api.dify.ai/v1";

async function askProductQuestion(question) {
  const response = await fetch(`${BASE_URL}/workflows/run`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: {
        question: question
      },
      response_mode: "blocking",
      user: "user-001"
    })
  });

  if (!response.ok) {
    throw new Error(`API 调用失败: ${response.statusText}`);
  }

  const result = await response.json();
  // 工作流输出在 data.outputs 中
  return result.data.outputs.answer;
}

// 使用示例
async function main() {
  const questions = [
    "这个手表有哪些功能?",
    "如何配对手表?",
    "手表续航多久?"
  ];
  
  for (const question of questions) {
    console.log(`\n问题: ${question}`);
    try {
      const answer = await askProductQuestion(question);
      console.log(`回答: ${answer}`);
    } catch (error) {
      console.error(`错误: ${error.message}`);
    }
  }
}

main().catch(console.error);
```

**代码解析:**

- **第11-13行**: 构造 `inputs` 对象,传入 `question` 变量
- **第24行**: 从 `result.data.outputs.answer` 提取回答
- **第28-39行**: 循环测试多个问题,展示批量调用方式

## 4. 测试验证

### 4.1 测试用例

以下测试用例覆盖正常问答和边界情况:

| 序号 | 测试问题 | 预期输出要点 | 验证目标 |
|-----|---------|-------------|---------|
| 1 | 这个手表有哪些功能? | 列出三大功能:健康监测(心率、睡眠、血氧)、运动记录(跑步、游泳、骑行)、消息提醒(电话、短信、应用通知) | 检索到产品手册的功能介绍章节 |
| 2 | 如何配对手表? | 4步配对流程:1) 打开手机蓝牙 2) 下载官方App 3) 在App中添加设备 4) 按照提示完成配对 | 检索到配对指南章节 |
| 3 | 手表续航多久? | 续航约7天(典型使用场景),充电时间约2小时,支持磁吸快充 | 检索到规格参数章节 |
| 4 | 手表支持哪些运动模式? | 抱歉,手册中只提到支持20+种运动模式,未列出具体列表 | 诚实说明信息不足,不编造具体列表 |

### 4.2 验证要点

**核心验证项:**

1. **回答是否基于检索到的文档**
   - 检查回答内容是否与产品手册一致
   - 如果手册中没有的信息,回答不应该凭空编造
   - 可以通过修改知识库内容(比如故意写错参数)来验证 AI 是否真的基于检索内容回答

2. **是否诚实说明信息不足**
   - 测试用例4是关键:手册中只提到"20+种运动模式",没有具体列表
   - 正确的回答应该诚实说明"手册中只提到20+种,未列出具体列表"
   - 错误的回答会编造具体的运动模式列表(比如"支持跑步、游泳、骑行、瑜伽...")

3. **回答是否简洁明了**
   - 检查回答是否直接回答问题,没有冗余信息
   - 检查是否引用了文档中的具体内容(比如"根据产品手册第X章...")

4. **检索结果是否相关**
   - 在 Dify 平台的"运行日志"中查看每次检索返回的文档片段
   - 检查检索结果是否与问题相关
   - 如果检索结果不相关,可能需要调整检索策略或优化知识库内容

### 4.3 如何查看运行日志

在 Dify 平台中,每次工作流运行都会生成详细的日志:

1. 进入应用的"日志"页面
2. 点击某次运行记录
3. 查看每个节点的输入输出:
   - **开始节点**: 查看 `question` 变量的值
   - **知识库检索节点**: 查看 `retrieved_docs` 变量的值(检索到的文档片段)
   - **LLM 节点**: 查看完整的提示词和生成的回答
   - **结束节点**: 查看最终输出的 `answer`

运行日志是调试和优化工作流的重要工具。通过日志,你可以看到检索是否准确、提示词是否生效、回答是否符合预期。

## 5. 扩展思考

### 5.1 如何调整 TopK 和 Score 阈值优化检索效果

**TopK 调优:**

TopK 控制返回的文档片段数量。调优建议:

- **TopK = 1-2**: 适合简单问题,只需要一个关键信息点
  - 优点: 上下文短,成本低,响应快
  - 缺点: 可能遗漏重要信息
- **TopK = 3-5**: 适合中等复杂度问题,需要多个信息点
  - 优点: 平衡检索全面性和上下文长度
  - 缺点: 需要 LLM 有较好的信息整合能力
- **TopK = 6-10**: 适合复杂问题,需要全面了解某个主题
  - 优点: 检索全面,不易遗漏
  - 缺点: 上下文长,成本高,可能引入噪音

**实践建议**: 从 TopK = 3 开始,观察检索结果。如果发现遗漏重要信息,逐步增加到 5。如果检索结果中有大量不相关内容,减少到 2。

**Score 阈值调优:**

Score 阈值过滤相关性得分低于阈值的结果。调优建议:

- **阈值 = 0.3-0.5**: 宽松过滤,保留更多结果
  - 优点: 不易遗漏相关信息
  - 缺点: 可能引入低质量结果
- **阈值 = 0.5-0.7**: 中等过滤,平衡质量和数量
  - 优点: 过滤明显不相关的结果,保留高质量内容
  - 缺点: 可能过滤掉边缘相关但有用的信息
- **阈值 = 0.7-0.9**: 严格过滤,只保留高度相关的结果
  - 优点: 结果质量高,噪音少
  - 缺点: 可能过滤掉有用信息,导致"检索不到相关信息"

**实践建议**: 从阈值 = 0.5 开始,观察检索结果。如果发现回答中包含不相关内容,提高阈值到 0.7。如果经常提示"无法找到相关信息",降低阈值到 0.3。

**TopK 和阈值的组合:**

两个参数需要配合使用:

- **高 TopK + 高阈值**: 检索全面但只保留高质量结果(推荐起点:TopK=5, 阈值=0.6)
- **低 TopK + 低阈值**: 快速检索,容忍一定噪音(适合简单问答:TopK=2, 阈值=0.4)
- **高 TopK + 低阈值**: 最大化检索范围,依赖 LLM 筛选(适合复杂问题:TopK=8, 阈值=0.3)

### 5.2 如何添加重排序(Rerank)模型

**什么是重排序?**

重排序是在初次检索后,使用更精确的模型对结果重新排序。初次检索(向量检索或关键词检索)速度快但精度有限,重排序模型(如 BGE-Reranker、Cohere Rerank)精度高但速度慢。两者结合可以兼顾速度和精度。

**在 Dify 中添加重排序:**

1. 在知识库检索节点中,找到"重排序模型"配置项
2. 选择已配置的重排序模型(需要在"设置 → 模型供应商"中先添加)
3. 设置重排序后的 TopK(通常比初次检索的 TopK 小)

**推荐的重排序模型:**

| 模型 | 特点 | 适用场景 |
|-----|------|---------|
| BGE-Reranker-large | 开源,中文表现好,精度高 | 自部署场景,对成本敏感 |
| Cohere Rerank | 商业 API,精度高,支持多语言 | 云服务商,追求最佳效果 |
| Jina Reranker | 开源,轻量级,速度快 | 资源有限场景 |

**重排序的效果:**

添加重排序后,检索质量通常会有明显提升:

- 检索结果排序更准确,最相关的内容排在前面
- 可以设置更高的初次检索 TopK(比如 10),然后通过重排序筛选出最佳的 3 条
- 减少 LLM 处理噪音信息的可能性

**成本考虑:**

重排序模型会增加 API 调用成本和时间延迟。如果初次检索效果已经很好,可以不加重的排序。只有在检索质量成为瓶颈时,才考虑添加重排序。

### 5.3 如何处理检索不到相关文档的情况

**问题场景:**

当用户问题与知识库内容不相关,或者 Score 阈值设置过高时,可能检索不到相关文档。此时 `retrieved_docs` 变量为空或只包含低相关性结果。

**处理方案1: 在提示词中处理(本案例方案)**

本案例的提示词已经包含处理逻辑:

```
如果文档中没有相关信息,请说"抱歉,我无法找到相关信息"
```

LLM 会检查 `retrieved_docs` 的内容,如果为空或不相关,会按照提示词要求诚实告知用户。

**处理方案2: 添加条件分支节点**

在工作流中添加条件分支,根据检索结果数量或得分决定后续流程:

```
开始节点 → 知识库检索节点 → 条件分支节点
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              检索到结果            未检索到结果
                    ↓                   ↓
              LLM 节点          直接返回预设回答
                    ↓                   ↓
                    └─────────┬─────────┘
                              ↓
                          结束节点
```

**条件分支配置:**

- **条件**: `retrieved_docs` 不为空 且 检索结果的最高 Score > 0.5
- **True 分支**: 进入 LLM 节点生成回答
- **False 分支**: 进入"代码执行"节点,返回预设回答"抱歉,我无法找到相关信息"

**处理方案3: 多知识库回退**

如果主知识库检索不到,可以尝试从备用知识库检索:

```
开始节点 → 主知识库检索 → 条件分支 → 主知识库LLM
                              ↓
                         备用知识库检索 → 备用知识库LLM
```

这种方案适合有多个知识库的场景,比如主知识库是产品手册,备用知识库是通用FAQ。

**实践建议:**

对于简单的产品问答场景,方案1(在提示词中处理)已经足够。只有在对回答质量要求极高,或者需要复杂的回退逻辑时,才考虑方案2或方案3。

## 6. 讲师备注

### 6.1 讲解重点

**知识库检索节点配置(15 分钟)**

这是本案例的核心知识点,需要详细讲解:

1. **检索模式选择**
   - 向量检索: 基于语义相似度,适合理解用户意图
   - 关键词检索: 基于精确匹配,适合查找专有名词、型号
   - 混合检索: 结合两者,本案例推荐
   - 演示: 用同一个问题分别测试三种模式,对比检索结果

2. **TopK 参数的影响**
   - 演示: 设置 TopK=1、3、5,观察检索结果和最终回答的差异
   - 强调: TopK 不是越大越好,需要平衡全面性和噪音
   - 实例: TopK=1 时可能遗漏重要信息,TopK=10 时可能引入不相关内容

3. **Score 阈值的作用**
   - 演示: 设置阈值=0.3、0.5、0.7,观察检索结果的质量变化
   - 强调: 阈值过高会导致"检索不到相关信息",过低会引入噪音
   - 实例: 阈值=0.7 时,某些边缘相关但有用的信息被过滤

4. **变量引用机制**
   - 演示: 如何在 LLM 节点的提示词中引用 `{{retrieved_docs}}` 和 `{{question}}`
   - 强调: 变量引用是工作流的核心,实现节点间的数据流转
   - 常见错误: 忘记引用变量,或者引用错误的变量名

**检索与生成的结合(10 分钟)**

重点讲解 RAG 的核心原则:

1. **只基于检索内容回答**
   - 为什么重要: 避免 AI 幻觉,确保回答有据可依
   - 如何实现: 在提示词中明确要求"只根据检索到的文档内容回答"
   - 验证方法: 修改知识库内容(比如故意写错参数),检查 AI 是否跟随修改

2. **诚实说明信息不足**
   - 为什么重要: 宁可说"不知道",也不要编造答案
   - 如何实现: 在提示词中要求"如果文档中没有相关信息,请说'抱歉,我无法找到相关信息'"
   - 验证方法: 问知识库中没有的问题(比如"手表支持哪些运动模式?"),检查是否诚实回答

3. **引用具体内容**
   - 为什么重要: 增强可信度,方便用户查证
   - 如何实现: 在提示词中要求"引用文档中的具体内容"
   - 验证方法: 检查回答中是否包含"根据产品手册第X章..."这样的引用

### 6.2 演示节奏

**建议流程(60 分钟):**

1. **场景介绍(5 分钟)**
   - 为什么需要智能问答工作流
   - 工作流知识库 vs 普通知识库的区别
   - 本案例的目标: 构建基于产品手册的问答系统

2. **知识库回顾(5 分钟)**
   - 快速回顾案例4创建的知识库
   - 确认知识库中包含智能手表产品手册
   - 展示知识库的文档列表和分段情况

3. **工作流搭建(20 分钟)**
   - 创建工作流应用
   - 逐个添加和配置 4 个节点
   - 重点讲解知识库检索节点的配置
   - 连接节点,形成完整工作流

4. **测试演示(15 分钟)**
   - 用 4 个测试用例演示问答效果
   - 展示运行日志,查看检索结果和生成过程
   - 对比不同 TopK 和阈值的效果差异

5. **API 调用演示(10 分钟)**
   - 展示 cURL 和 Python 调用示例
   - 强调工作流 API 与聊天应用 API 的区别
   - 演示批量调用多个问题

6. **扩展讨论(5 分钟)**
   - 如何优化检索效果
   - 如何添加重排序模型
   - 如何处理检索失败的情况

**关键演示点:**

- 先展示工作流画布,让学员看到整体结构
- 再演示问答效果,让学员看到实际价值
- 最后对比普通知识库,强调工作流的可控性
- 通过运行日志展示中间过程,让学员理解数据流

### 6.3 学员常见问题

**Q1: 为什么检索不到正确的文档?**

A: 可能的原因和解决方法:

1. **知识库内容问题**
   - 文档没有正确分段,关键信息被拆分到不同段落
   - 解决方法: 在知识库管理中检查分段情况,调整分段策略

2. **检索模式不匹配**
   - 使用向量检索时,专有名词(如型号"Watch X1")可能检索不到
   - 解决方法: 切换到混合检索,结合关键词检索

3. **Score 阈值过高**
   - 阈值设置过高,过滤掉了相关但得分不高的结果
   - 解决方法: 降低阈值到 0.3-0.5

4. **TopK 过小**
   - 只检索 1-2 条结果,可能遗漏重要信息
   - 解决方法: 增加 TopK 到 3-5

**Q2: 如何优化检索效果?**

A: 优化检索效果的三个层次:

1. **知识库层面**
   - 优化文档分段: 确保每个段落包含完整的信息点
   - 添加元数据: 为文档添加标签、分类,辅助检索
   - 清理噪音: 删除无关内容(如页眉页脚、广告)

2. **检索策略层面**
   - 调整 TopK 和 Score 阈值
   - 切换到混合检索
   - 添加重排序模型

3. **提示词层面**
   - 明确要求"只基于检索内容回答"
   - 要求引用具体内容
   - 处理检索失败的情况

**Q3: 工作流知识库和普通知识库有什么区别?**

A: 核心区别在于可控性:

- **普通知识库**: 自动完成"检索-生成"流程,用户无法干预中间步骤。适合快速搭建简单问答。
- **工作流知识库**: 可以精确控制检索策略、结果处理、生成逻辑。适合需要精细控制的场景。

类比: 普通知识库像自动咖啡机,按一个按钮就出咖啡。工作流知识库像手冲咖啡,可以控制水温、水量、冲泡时间。

**Q4: 为什么 AI 还是会编造答案?**

A: 可能的原因:

1. **提示词不够明确**
   - 没有明确要求"只基于检索内容回答"
   - 解决方法: 在提示词中强调"只根据检索到的文档内容回答,不要添加额外信息"

2. **检索结果不相关**
   - 检索到的文档与问题无关,但 AI 仍然尝试回答
   - 解决方法: 提高 Score 阈值,或者在提示词中要求"如果文档中没有相关信息,请说'抱歉,我无法找到相关信息'"

3. **模型能力不足**
   - 弱模型(如 GPT-3.5)遵循指令的能力较弱
   - 解决方法: 切换到更强的模型(如 GPT-4 或 Claude-3)

**Q5: 如何支持多轮对话?**

A: 工作流本身是无状态的,每次运行独立。要支持多轮对话,有两种方案:

1. **在外部维护对话历史**
   - 在应用层维护对话历史
   - 每次调用工作流时,将历史对话作为输入变量传入
   - 在提示词中引用历史对话

2. **使用聊天应用而非工作流**
   - 如果多轮对话是核心需求,考虑使用聊天应用类型
   - 聊天应用内置对话历史管理

本案例聚焦单轮问答,多轮对话可以作为扩展练习。

### 6.4 常见错误

**错误1: 忘记连接节点**

```
❌ 开始节点    知识库检索节点    LLM 节点    结束节点
   (没有连线)
```

问题: 节点之间没有连线,数据无法流转,工作流无法运行。

解决: 在画布中拖动节点边缘的连接点创建连线。

**错误2: 变量引用错误**

```
❌ 提示词中写: 检索到的文档: {retrieved_docs}
   (缺少一个花括号)
```

问题: 变量引用语法错误,Dify 无法识别变量,会当作普通文本处理。

解决: 使用双花括号 `{{retrieved_docs}}`,或者通过变量选择器插入。

**错误3: 知识库选择错误**

```
❌ 知识库检索节点选择了其他知识库(如"通用FAQ")
```

问题: 检索不到产品手册的内容,回答不准确。

解决: 在知识库检索节点中确认选择的是"产品手册"知识库。

**错误4: 提示词没有要求"只基于检索内容回答"**

```
❌ 提示词: 请回答用户的问题: {{question}}
   (没有引用检索结果,也没有约束回答依据)
```

问题: AI 会基于自己的训练数据回答,可能编造产品手册中没有的信息。

解决: 在提示词中明确要求"只根据检索到的文档内容回答"。

### 6.5 进阶建议

对于学有余力的学员,可以尝试:

1. **添加重排序模型**: 在知识库检索节点中添加重排序模型,对比检索效果
2. **多知识库检索**: 创建多个知识库(如产品手册、FAQ、技术文档),在工作流中检索多个知识库
3. **条件分支**: 添加条件分支节点,在检索失败时提供备选方案
4. **代码执行节点**: 添加代码执行节点,对检索结果进行预处理(如过滤、排序)
5. **对话历史**: 在外部维护对话历史,实现多轮问答

---

**文档版本**: v1.0  
**最后更新**: 2026-07-07  
**适用 Dify 版本**: 0.6+  
**前置案例**: 案例4(知识库创建与管理)


---


---
案例名称: 搭建 Web 前端调用 Dify API
知识点: Dify API 认证、会话管理、前端集成
难度: 中级
预计时长: 60-90 分钟
适用对象: 有前端开发基础的开发者
---

# 案例 6：搭建 Web 前端调用 Dify API

## 1. 知识点与目标

完成本案例后，你将掌握：

- **Dify API 认证方式**：理解 API Key 的获取和使用方法，掌握 Bearer Token 认证机制
- **会话管理**：理解 `conversation_id` 的作用，学会在多轮对话中保持上下文
- **前端集成能力**：使用 HTML + CSS + JavaScript 搭建独立的问答页面，无需框架依赖
- **API 调用实践**：掌握请求格式、响应处理、错误处理的完整流程

**核心概念：**

| 概念 | 说明 |
|------|------|
| API Key | 用于身份认证的密钥，从 Dify 平台获取 |
| conversation_id | 会话标识符，用于维持多轮对话的上下文 |
| response_mode | 响应模式，`blocking`（阻塞）或 `streaming`（流式） |
| user | 用户标识，用于区分不同用户的会话 |

## 2. 场景设计

### 2.1 场景背景

你已经用 Dify 创建了一个智能助手应用，现在需要将它集成到自己的网站或系统中。这需要：

- 从前端页面调用 Dify API
- 保持用户的对话上下文
- 处理加载状态和错误情况
- 提供良好的用户体验

### 2.2 架构思路

```
┌─────────────┐
│  前端页面    │
│ (HTML/JS)   │
└──────┬──────┘
       │
       │ 1. 用户输入问题
       │ 2. 发送 HTTP 请求
       ▼
┌─────────────────────────────────────┐
│         Dify API                    │
│  POST /v1/chat-messages             │
│  Headers: Authorization: Bearer xxx │
└──────┬──────────────────────────────┘
       │
       │ 3. 处理请求
       │ 4. 调用 LLM
       ▼
┌─────────────┐
│   LLM 模型  │
│ (GPT/Claude)│
└──────┬──────┘
       │
       │ 5. 返回响应
       ▼
┌─────────────────────────────────────┐
│         Dify API                    │
│  返回 answer + conversation_id      │
└──────┬──────────────────────────────┘
       │
       │ 6. 解析响应
       │ 7. 展示结果
       ▼
┌─────────────┐
│  前端页面    │
│  显示回答    │
└─────────────┘
```

### 2.3 核心设计

**API Key 获取：**
- 登录 Dify 平台
- 进入应用 → 「访问 API」页面
- 创建 API Key 并安全保存

**请求格式：**
```json
{
  "inputs": {},
  "query": "用户问题",
  "response_mode": "blocking",
  "conversation_id": "",
  "user": "user-123"
}
```

**响应处理：**
- 成功：提取 `answer` 字段显示回答
- 会话保持：保存 `conversation_id` 用于后续请求
- 错误：处理 `code` 和 `message` 字段

**会话保持策略：**
- 首次对话：`conversation_id` 传空字符串
- 继续对话：传入上次响应返回的 `conversation_id`
- 新对话：清空 `conversation_id` 或传空字符串

## 3. 完整代码

### 3.1 Dify 平台配置

#### 获取 API Key 的步骤

1. 登录 [Dify 平台](https://cloud.dify.ai)
2. 选择或创建一个应用
3. 点击左侧菜单的「访问 API」
4. 点击「API 密钥」→「新建密钥」
5. 复制生成的 API Key（格式如 `app-xxxxxxxxxxxxxxxx`）

**重要提示：**
- API Key 具有应用级别的访问权限，请妥善保管
- 不要将 API Key 提交到代码仓库
- 生产环境建议使用环境变量或密钥管理服务

#### API 端点说明

**基础信息：**

| 项目 | 值 |
|------|-----|
| 端点 | `POST https://api.dify.ai/v1/chat-messages` |
| 认证方式 | Bearer Token |
| Content-Type | `application/json` |

**请求头格式：**

```
Authorization: Bearer {your_api_key}
Content-Type: application/json
```

### 3.2 API 调用代码

#### cURL 示例（基础调用）

```bash
curl -X POST 'https://api.dify.ai/v1/chat-messages' \
  -H 'Authorization: Bearer app-xxxxxxxxxxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "你好",
    "response_mode": "blocking",
    "conversation_id": "",
    "user": "user-123"
  }'
```

**预期响应：**

```json
{
  "event": "message",
  "message_id": "msg-123",
  "conversation_id": "conv-456",
  "mode": "chat",
  "answer": "你好！有什么可以帮助你的？",
  "metadata": {
    "usage": {
      "prompt_tokens": 10,
      "completion_tokens": 20,
      "total_tokens": 30
    }
  },
  "created_at": 1234567890
}
```

#### Python 示例（含会话管理）

```python
import requests
import json

class DifyChat:
    def __init__(self, api_key, user_id="user-123"):
        self.api_key = api_key
        self.user_id = user_id
        self.conversation_id = ""
        self.base_url = "https://api.dify.ai/v1"
        
    def chat(self, query):
        """发送消息并获取回复"""
        url = f"{self.base_url}/chat-messages"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "inputs": {},
            "query": query,
            "response_mode": "blocking",
            "conversation_id": self.conversation_id,
            "user": self.user_id
        }
        
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            
            # 保存 conversation_id 用于后续对话
            self.conversation_id = result.get("conversation_id", "")
            
            return {
                "success": True,
                "answer": result.get("answer", ""),
                "conversation_id": self.conversation_id,
                "message_id": result.get("message_id", "")
            }
            
        except requests.exceptions.HTTPError as e:
            error_data = e.response.json() if e.response else {}
            return {
                "success": False,
                "error": error_data.get("message", str(e)),
                "code": error_data.get("code", "unknown")
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "code": "exception"
            }
    
    def new_conversation(self):
        """开始新的对话"""
        self.conversation_id = ""

# 使用示例
if __name__ == "__main__":
    # 替换为你的 API Key
    API_KEY = "app-xxxxxxxxxxxxxxxx"
    
    chat = DifyChat(API_KEY)
    
    # 第一轮对话
    print("用户：你好")
    result = chat.chat("你好")
    if result["success"]:
        print(f"助手：{result['answer']}")
        print(f"会话 ID: {result['conversation_id']}\n")
    
    # 第二轮对话（保持上下文）
    print("用户：你还记得我叫什么吗？")
    result = chat.chat("你还记得我叫什么吗？")
    if result["success"]:
        print(f"助手：{result['answer']}")
```

#### JavaScript 示例（含会话管理）

```javascript
class DifyChat {
  constructor(apiKey, userId = 'user-123') {
    this.apiKey = apiKey;
    this.userId = userId;
    this.conversationId = '';
    this.baseUrl = 'https://api.dify.ai/v1';
  }
  
  async chat(query) {
    const url = `${this.baseUrl}/chat-messages`;
    
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    
    const data = {
      inputs: {},
      query: query,
      response_mode: 'blocking',
      conversation_id: this.conversationId,
      user: this.userId
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      // 保存 conversation_id 用于后续对话
      this.conversationId = result.conversation_id || '';
      
      return {
        success: true,
        answer: result.answer || '',
        conversationId: this.conversationId,
        messageId: result.message_id || ''
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code || 'unknown'
      };
    }
  }
  
  newConversation() {
    this.conversationId = '';
  }
}

// 使用示例
async function demo() {
  const API_KEY = 'app-xxxxxxxxxxxxxxxx';
  const chat = new DifyChat(API_KEY);
  
  // 第一轮对话
  console.log('用户：你好');
  const result1 = await chat.chat('你好');
  if (result1.success) {
    console.log(`助手：${result1.answer}`);
    console.log(`会话 ID: ${result1.conversationId}\n`);
  }
  
  // 第二轮对话（保持上下文）
  console.log('用户：你还记得我叫什么吗？');
  const result2 = await chat.chat('你还记得我叫什么吗？');
  if (result2.success) {
    console.log(`助手：${result2.answer}`);
  }
}

demo();
```

### 3.3 完整 Web 前端页面

以下是一个完整的单文件 HTML 页面，包含美观的界面设计和完整的对话功能：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dify 智能助手</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    
    .container {
      width: 100%;
      max-width: 800px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 90vh;
      max-height: 800px;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .chat-area {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f7f8fa;
    }
    
    .message {
      margin-bottom: 16px;
      display: flex;
      align-items: flex-start;
      animation: fadeIn 0.3s ease-in;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .message.user {
      flex-direction: row-reverse;
    }
    
    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
      margin: 0 12px;
    }
    
    .message.user .message-avatar {
      background: #667eea;
      color: white;
    }
    
    .message.assistant .message-avatar {
      background: #10b981;
      color: white;
    }
    
    .message-content {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 12px;
      line-height: 1.6;
      font-size: 15px;
    }
    
    .message.user .message-content {
      background: #667eea;
      color: white;
      border-top-right-radius: 4px;
    }
    
    .message.assistant .message-content {
      background: white;
      color: #333;
      border-top-left-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    .loading {
      display: inline-flex;
      gap: 4px;
    }
    
    .loading span {
      width: 8px;
      height: 8px;
      background: #667eea;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    
    .loading span:nth-child(1) { animation-delay: -0.32s; }
    .loading span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    
    .input-area {
      padding: 20px;
      background: white;
      border-top: 1px solid #e5e7eb;
    }
    
    .input-container {
      display: flex;
      gap: 12px;
    }
    
    .input-field {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 15px;
      transition: border-color 0.2s;
    }
    
    .input-field:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .send-button {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .send-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .send-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .controls {
      display: flex;
      gap: 12px;
      margin-top: 12px;
      justify-content: space-between;
      align-items: center;
    }
    
    .control-button {
      padding: 8px 16px;
      background: #f3f4f6;
      color: #374151;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .control-button:hover {
      background: #e5e7eb;
    }
    
    .status {
      font-size: 13px;
      color: #6b7280;
    }
    
    .error-message {
      background: #fee2e2;
      color: #991b1b;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      border-left: 4px solid #ef4444;
    }
    
    .welcome-message {
      text-align: center;
      color: #9ca3af;
      padding: 40px 20px;
    }
    
    .welcome-message h2 {
      font-size: 20px;
      margin-bottom: 8px;
      color: #6b7280;
    }
    
    .welcome-message p {
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 Dify 智能助手</h1>
      <p>基于 Dify API 的对话演示</p>
    </div>
    
    <div class="chat-area" id="chatArea">
      <div class="welcome-message">
        <h2>欢迎使用 Dify 智能助手</h2>
        <p>在下方输入框中输入问题，开始对话</p>
      </div>
    </div>
    
    <div class="input-area">
      <div class="input-container">
        <input 
          type="text" 
          class="input-field" 
          id="inputField" 
          placeholder="输入你的问题..."
          autocomplete="off"
        >
        <button class="send-button" id="sendButton">发送</button>
      </div>
      <div class="controls">
        <button class="control-button" id="newChatButton">新对话</button>
        <span class="status" id="status">就绪</span>
      </div>
    </div>
  </div>

  <script>
    // ==================== 配置区域 ====================
    // 请替换为你的 Dify API Key
    const API_KEY = 'app-xxxxxxxxxxxxxxxx';
    const USER_ID = 'user-' + Date.now();
    // =================================================

    class DifyChatApp {
      constructor() {
        this.conversationId = '';
        this.baseUrl = 'https://api.dify.ai/v1';
        this.isLoading = false;
        
        // DOM 元素
        this.chatArea = document.getElementById('chatArea');
        this.inputField = document.getElementById('inputField');
        this.sendButton = document.getElementById('sendButton');
        this.newChatButton = document.getElementById('newChatButton');
        this.status = document.getElementById('status');
        
        // 绑定事件
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.inputField.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });
        this.newChatButton.addEventListener('click', () => this.newConversation());
      }
      
      async sendMessage() {
        const query = this.inputField.value.trim();
        if (!query || this.isLoading) return;
        
        // 清除欢迎消息
        const welcome = this.chatArea.querySelector('.welcome-message');
        if (welcome) welcome.remove();
        
        // 显示用户消息
        this.addMessage('user', query);
        this.inputField.value = '';
        
        // 显示加载状态
        this.setLoading(true);
        const loadingMsg = this.addMessage('assistant', '', true);
        
        try {
          const result = await this.callAPI(query);
          
          // 移除加载动画
          loadingMsg.remove();
          
          if (result.success) {
            this.addMessage('assistant', result.answer);
            this.status.textContent = `会话 ID: ${result.conversationId.substring(0, 8)}...`;
          } else {
            this.showError(result.error);
          }
          
        } catch (error) {
          loadingMsg.remove();
          this.showError('请求失败：' + error.message);
        } finally {
          this.setLoading(false);
        }
      }
      
      async callAPI(query) {
        const url = `${this.baseUrl}/chat-messages`;
        
        const headers = {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        };
        
        const data = {
          inputs: {},
          query: query,
          response_mode: 'blocking',
          conversation_id: this.conversationId,
          user: USER_ID
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        this.conversationId = result.conversation_id || '';
        
        return {
          success: true,
          answer: result.answer || '',
          conversationId: this.conversationId
        };
      }
      
      addMessage(role, content, isLoading = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '🤖';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isLoading) {
          contentDiv.innerHTML = '<div class="loading"><span></span><span></span><span></span></div>';
        } else {
          contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        this.chatArea.appendChild(messageDiv);
        
        // 滚动到底部
        this.chatArea.scrollTop = this.chatArea.scrollHeight;
        
        return messageDiv;
      }
      
      showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = '❌ ' + message;
        this.chatArea.appendChild(errorDiv);
        this.chatArea.scrollTop = this.chatArea.scrollHeight;
        
        // 5 秒后移除错误消息
        setTimeout(() => errorDiv.remove(), 5000);
      }
      
      setLoading(loading) {
        this.isLoading = loading;
        this.sendButton.disabled = loading;
        this.inputField.disabled = loading;
        this.status.textContent = loading ? '发送中...' : '就绪';
      }
      
      newConversation() {
        this.conversationId = '';
        this.chatArea.innerHTML = `
          <div class="welcome-message">
            <h2>新对话已开始</h2>
            <p>在下方输入框中输入问题，开始对话</p>
          </div>
        `;
        this.status.textContent = '就绪';
      }
    }
    
    // 初始化应用
    const app = new DifyChatApp();
  </script>
</body>
</html>
```

**使用说明：**

1. 将上述代码保存为 `index.html` 文件
2. 修改代码中的 `API_KEY` 为你的 Dify API Key
3. 用浏览器打开 `index.html` 文件即可使用

**功能特性：**

- ✅ 美观的渐变界面设计
- ✅ 完整的对话历史展示
- ✅ 会话自动保持（通过 `conversation_id`）
- ✅ 加载动画提示
- ✅ 错误处理和提示
- ✅ 新对话功能
- ✅ 响应式布局，支持移动端

## 4. 测试验证

### 测试用例 1：简单问答

**测试步骤：**

1. 打开前端页面
2. 在输入框输入「你好」
3. 点击发送按钮或按 Enter 键

**预期结果：**

- 显示用户消息气泡：「你好」
- 显示加载动画
- 收到助手回复，例如：「你好！有什么可以帮助你的？」
- 状态栏显示会话 ID

**验证要点：**

```bash
# 使用 cURL 验证 API 调用
curl -X POST 'https://api.dify.ai/v1/chat-messages' \
  -H 'Authorization: Bearer app-xxxxxxxxxxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "你好",
    "response_mode": "blocking",
    "conversation_id": "",
    "user": "test-user"
  }'
```

预期响应包含：
- `conversation_id`：非空字符串
- `answer`：助手的回复内容
- `message_id`：消息唯一标识

### 测试用例 2：继续对话（上下文保持）

**测试步骤：**

1. 第一轮对话：输入「我叫张三」
2. 第二轮对话：输入「你还记得我叫什么吗？」

**预期结果：**

- 第一轮回复确认收到名字
- 第二轮回复能正确回答「张三」
- 两次请求使用相同的 `conversation_id`

**验证要点：**

```python
# Python 验证代码
chat = DifyChat("app-xxxxxxxxxxxxxxxx")

# 第一轮
result1 = chat.chat("我叫张三")
print(f"第一轮会话 ID: {result1['conversation_id']}")

# 第二轮
result2 = chat.chat("你还记得我叫什么吗？")
print(f"第二轮会话 ID: {result2['conversation_id']}")

# 验证会话 ID 相同
assert result1['conversation_id'] == result2['conversation_id']
print("✅ 会话保持成功")
```

### 测试用例 3：错误处理（无效 API Key）

**测试步骤：**

1. 修改代码中的 `API_KEY` 为无效值（如 `app-invalid`）
2. 发送任意消息

**预期结果：**

- 显示红色错误提示框
- 错误信息包含「Invalid API key」或类似提示
- 5 秒后错误提示自动消失
- 输入框恢复可用状态

**验证要点：**

```bash
# 使用无效 API Key 测试
curl -X POST 'https://api.dify.ai/v1/chat-messages' \
  -H 'Authorization: Bearer app-invalid' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "你好",
    "response_mode": "blocking",
    "conversation_id": "",
    "user": "test-user"
  }'
```

预期响应：

```json
{
  "code": "unauthorized",
  "message": "Invalid API key"
}
```

HTTP 状态码：401

### 测试检查清单

- [ ] API 调用成功，返回正确的响应格式
- [ ] 会话 ID 正确保持，多轮对话上下文连贯
- [ ] 前端页面正常显示，交互流畅
- [ ] 加载状态正确显示和隐藏
- [ ] 错误情况有友好提示
- [ ] 新对话功能正常，清空会话 ID

## 5. 扩展思考

### 5.1 如何处理流式响应（Streaming）

**问题：** 阻塞模式需要等待完整回复，用户体验不够流畅。

**解决方案：** 使用流式响应，逐字显示回复内容。

**实现思路：**

```javascript
async function chatStreaming(query) {
  const response = await fetch(`${BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: {},
      query: query,
      response_mode: 'streaming',  // 改为 streaming
      conversation_id: conversationId,
      user: USER_ID
    })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    // 解析 SSE 格式的数据
    // data: {"event": "message", "answer": "你", ...}
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));
        if (data.event === 'message') {
          // 逐字追加到界面
          appendToMessage(data.answer);
        }
      }
    }
  }
}
```

**关键点：**

- 使用 `response_mode: 'streaming'`
- 解析 Server-Sent Events (SSE) 格式
- 使用 `ReadableStream` 逐块读取
- 实时更新界面，无需等待完整回复

### 5.2 如何实现用户认证和 API Key 管理

**问题：** 前端直接暴露 API Key 存在安全风险。

**解决方案：**

**方案一：后端代理（推荐）**

```
前端 → 你的后端 → Dify API
```

```javascript
// 前端调用自己的后端
async function chatViaBackend(query) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`  // 用户认证 token
    },
    body: JSON.stringify({ query })
  });
  return response.json();
}
```

```python
# 后端代码（Flask 示例）
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)
DIFY_API_KEY = "app-xxxxxxxxxxxxxxxx"  # 后端环境变量

@app.route('/api/chat', methods=['POST'])
def chat():
    # 验证用户身份
    user_token = request.headers.get('Authorization')
    if not verify_user(user_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    # 调用 Dify API
    data = request.json
    response = requests.post(
        'https://api.dify.ai/v1/chat-messages',
        headers={
            'Authorization': f'Bearer {DIFY_API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            "inputs": {},
            "query": data['query'],
            "response_mode": "blocking",
            "conversation_id": data.get('conversation_id', ''),
            "user": get_user_id(user_token)
        }
    )
    
    return jsonify(response.json())
```

**方案二：API Key 轮换**

- 为每个用户生成临时 API Key
- 设置使用限额和过期时间
- 使用 Dify 的 API Key 管理功能

### 5.3 如何处理并发请求和限流

**问题：** 多个用户同时请求可能导致限流或性能问题。

**解决方案：**

**前端限流：**

```javascript
class RateLimiter {
  constructor(maxRequests = 5, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }
  
  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(
      time => now - time < this.timeWindow
    );
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
}

const limiter = new RateLimiter(5, 60000); // 每分钟最多 5 次

async function sendMessage(query) {
  if (!limiter.canMakeRequest()) {
    showError('请求过于频繁，请稍后再试');
    return;
  }
  
  // 发送请求...
}
```

**后端队列：**

```python
from collections import deque
import time

class RequestQueue:
    def __init__(self, max_requests=100, time_window=60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
    
    def acquire(self):
        now = time.time()
        
        # 清理过期请求
        while self.requests and now - self.requests[0] > self.time_window:
            self.requests.popleft()
        
        if len(self.requests) >= self.max_requests:
            return False
        
        self.requests.append(now)
        return True

# 使用
queue = RequestQueue()

@app.route('/api/chat')
def chat():
    if not queue.acquire():
        return jsonify({"error": "Rate limit exceeded"}), 429
    
    # 处理请求...
```

**其他优化策略：**

- 使用请求队列和重试机制
- 实现请求去重（相同问题不重复调用）
- 添加缓存层（常见问题直接返回缓存结果）
- 使用 CDN 加速静态资源
- 实现优雅降级（API 不可用时的备用方案）

## 6. 讲师备注

### 6.1 讲解重点

**核心概念（15 分钟）：**

1. **API 认证机制**
   - 解释 Bearer Token 的工作原理
   - 强调 API Key 的安全性和保管方法
   - 演示如何从 Dify 平台获取 API Key

2. **会话管理**
   - 解释 `conversation_id` 的作用
   - 演示有/无 `conversation_id` 的区别
   - 说明何时开始新对话

3. **请求/响应格式**
   - 逐字段解释请求参数
   - 分析响应结构和关键字段
   - 说明错误响应的处理方式

**代码演示（30 分钟）：**

1. **cURL 调用（5 分钟）**
   - 先展示最简单的 API 调用
   - 让学员理解 HTTP 请求的基本结构
   - 现场修改参数，观察响应变化

2. **Python 代码（10 分钟）**
   - 展示封装的 `DifyChat` 类
   - 重点讲解会话管理逻辑
   - 演示多轮对话的效果

3. **JavaScript 代码（10 分钟）**
   - 对比 Python 和 JavaScript 实现的异同
   - 讲解异步请求的处理
   - 强调错误处理的重要性

4. **完整前端页面（5 分钟）**
   - 展示最终效果
   - 快速浏览代码结构
   - 说明关键功能点

**动手实践（30 分钟）：**

- 学员获取自己的 API Key
- 修改代码并运行
- 测试多轮对话
- 尝试错误处理场景

### 6.2 演示节奏

**建议时间安排：**

| 阶段 | 时长 | 内容 |
|------|------|------|
| 开场 | 5 分钟 | 介绍案例目标和场景 |
| 概念讲解 | 15 分钟 | API 认证、会话管理、请求格式 |
| cURL 演示 | 5 分钟 | 最简单的 API 调用 |
| Python 演示 | 10 分钟 | 封装类和会话管理 |
| JavaScript 演示 | 10 分钟 | 前端调用和异步处理 |
| 完整页面展示 | 5 分钟 | 展示最终效果 |
| 学员实践 | 30 分钟 | 动手操作和答疑 |
| 扩展讨论 | 10 分钟 | 流式响应、安全、限流 |

**演示技巧：**

- 先用 cURL 建立直觉，再展示代码封装
- 对比有/无 `conversation_id` 的效果差异
- 故意使用错误 API Key 演示错误处理
- 让学员观察网络请求（浏览器开发者工具）

### 6.3 学员常见问题

**Q1：API Key 泄露了怎么办？**

**回答要点：**
- 立即在 Dify 平台删除泄露的 Key
- 生成新的 API Key
- 检查是否有异常调用记录
- 生产环境使用后端代理，不要在前端暴露 Key

**Q2：遇到跨域问题（CORS）怎么办？**

**回答要点：**
- Dify API 默认支持 CORS，可以直接从前端调用
- 如果遇到问题，检查是否使用了正确的域名
- 生产环境建议使用后端代理，避免跨域问题
- 本地开发可以使用浏览器插件临时解决（不推荐）

**Q3：如何管理多个用户的会话？**

**回答要点：**
- 使用 `user` 字段区分不同用户
- 每个用户的 `conversation_id` 是独立的
- 后端存储用户和会话的映射关系
- 可以使用数据库持久化会话历史

**Q4：响应太慢，如何优化？**

**回答要点：**
- 使用流式响应（`response_mode: 'streaming'`）
- 添加加载动画提升用户体验
- 实现请求超时和重试机制
- 考虑使用更快的 LLM 模型
- 添加缓存层减少重复请求

**Q5：如何处理并发请求？**

**回答要点：**
- 前端实现请求队列和限流
- 后端使用请求队列控制并发
- 实现请求去重和缓存
- 使用异步处理提高吞吐量
- 监控 API 调用限额，避免超限

### 6.4 扩展练习建议

**基础练习：**
- 修改界面样式（颜色、布局）
- 添加消息时间戳
- 实现清空对话历史功能

**进阶练习：**
- 实现流式响应显示
- 添加 Markdown 渲染支持
- 实现对话历史导出功能

**高级练习：**
- 搭建后端代理服务
- 实现用户登录和会话管理
- 添加对话历史持久化（数据库）
- 实现多应用切换功能

### 6.5 评估标准

**合格标准：**
- 能成功调用 Dify API
- 理解会话管理的原理
- 能修改和运行示例代码
- 能处理基本的错误情况

**优秀标准：**
- 能解释完整的请求/响应流程
- 能实现流式响应
- 能设计后端代理方案
- 能提出性能优化建议

---

**文档版本：** v1.0  
**最后更新：** 2026-07-07  
**适用 Dify 版本：** 0.6+


---


---
案例名称: 会议纪要助手
案例编号: case7
知识点:
  - 知识库应用（可选）
  - 工作流设计
  - 多 LLM 节点串联
  - 信息提取与结构化
  - API 集成
难度: 高级
前置案例:
  - case1-law-qa（知识库基础）
  - case2-info-extract（信息提取）
  - case5-workflow-qa（工作流基础）
  - case6-api-integration（API 调用）
预计时长: 45-60 分钟
---

# 案例 7：会议纪要助手

## 1. 知识点与目标

### 1.1 核心知识点

本案例是综合案例，串联前面所有知识点：

| 知识点 | 来源案例 | 在本案例中的应用 |
|--------|----------|------------------|
| 知识库 | case1-law-qa | 可选：上传会议纪要模板作为参考 |
| 信息提取 | case2-info-extract | 从非结构化会议内容提取结构化信息 |
| 工作流 | case5-workflow-qa | 多节点串联实现复杂任务 |
| API 集成 | case6-api-integration | 通过 API 调用工作流 |

### 1.2 学习目标

完成本案例后，学员能够：

1. **掌握知识库 + 工作流 + API 的综合应用**
   - 理解各组件如何协同工作
   - 学会选择合适的架构方案

2. **理解多 LLM 节点串联的设计模式**
   - 为什么拆分成两个 LLM 节点
   - 节点间如何传递数据
   - 如何设计节点间的依赖关系

3. **学会从非结构化文本提取结构化信息**
   - 设计信息提取的提示词
   - 使用 JSON 格式规范输出
   - 将提取结果转化为结构化文档

---

## 2. 场景设计

### 2.1 场景背景

**业务场景：** 企业日常会议频繁，会后需要整理会议纪要。手动整理耗时且容易遗漏关键信息。

**解决方案：** 构建一个会议纪要助手，输入会议内容（可以是录音转写文本、手写笔记等），自动输出结构化的会议纪要。

**输入输出：**

| 输入 | 输出 |
|------|------|
| 非结构化的会议内容文本 | 结构化的会议纪要（Markdown 格式） |

### 2.2 架构思路

**为什么用两个 LLM 节点？**

```
方案 A：单节点直接生成
会议内容 → LLM → 会议纪要

问题：
- 提示词复杂，既要提取信息又要格式化输出
- 难以调试，出错时不知道是提取问题还是格式问题
- 灵活性差，想改格式需要改整个提示词
```

```
方案 B：双节点分步处理（推荐）
会议内容 → LLM1（信息提取）→ LLM2（纪要生成）→ 会议纪要

优势：
- 职责分离，每个节点专注一件事
- 易于调试，可以单独检查提取结果
- 灵活性高，可以独立调整提取逻辑和输出格式
- 可复用，提取节点可以用于其他场景
```

**设计原则：** 复杂任务拆分成多个简单任务，每个任务由一个专门的节点处理。

### 2.3 核心设计

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│   开始节点   │ ──▶ │  LLM 节点 1      │ ──▶ │  LLM 节点 2      │ ──▶ │   结束节点   │
│             │     │  （信息提取）     │     │  （纪要生成）     │     │             │
│ meeting_    │     │                 │     │                 │     │ meeting_    │
│ content     │     │ 输出:           │     │ 输入:           │     │ summary     │
│             │     │ extracted_info  │     │ extracted_info  │     │             │
└─────────────┘     └─────────────────┘     └─────────────────┘     └─────────────┘
```

**数据流：**

1. 开始节点接收 `meeting_content`（会议内容）
2. LLM 节点 1 提取关键信息，输出 `extracted_info`（JSON 格式）
3. LLM 节点 2 根据提取的信息生成结构化纪要，输出 `meeting_summary`
4. 结束节点返回 `meeting_summary`

---

## 3. 完整代码

### 3.1 Dify 平台配置

#### 3.1.1 应用类型

- **类型：** Workflow（工作流）
- **名称：** 会议纪要助手
- **描述：** 输入会议内容，自动生成结构化会议纪要

#### 3.1.2 前置条件（可选）

如果需要参考标准会议纪要模板，可以：

1. 准备模板文件 `meeting_template.md`
2. 在「知识库」中创建新知识库「会议纪要模板」
3. 上传模板文件
4. 在 LLM 节点 2 中引用知识库

> **提示：** 本案例中模板直接写在提示词里，所以知识库是可选的。

#### 3.1.3 工作流节点设计

##### 节点 1：开始节点

| 配置项 | 值 |
|--------|-----|
| 节点类型 | 开始节点 (Start) |
| 变量名 | `meeting_content` |
| 变量类型 | 段落 (Paragraph) |
| 必填 | 是 |
| 提示 | 请输入会议内容，可以是录音转写文本、手写笔记等 |

##### 节点 2：LLM 节点 1（信息提取）

| 配置项 | 值 |
|--------|-----|
| 节点类型 | LLM |
| 节点名称 | 信息提取 |
| 模型 | gpt-4o / claude-3-5-sonnet / qwen-max（推荐） |
| 温度 | 0.3（低温度，保证提取准确性） |

**变量引用：**

| 变量名 | 引用 |
|--------|------|
| `meeting_content` | `{{#start.meeting_content#}}` |

**系统提示词：**

```
你是一个专业的会议信息提取助手。你的任务是从会议内容中提取关键信息，并以 JSON 格式输出。

提取要求：
1. topic: 会议主题，用一句话概括
2. time: 会议时间，如果未提及则留空
3. location: 会议地点，如果未提及则留空
4. participants: 参会人员列表，数组格式
5. agenda: 会议议题列表，数组格式，每个议题用一句话概括
6. conclusions: 会议结论列表，数组格式，每个结论用一句话概括
7. todos: 待办事项列表，每项包含 task（任务）、owner（负责人）、deadline（截止时间）
8. next_meeting: 下次会议安排，如果未提及则留空

注意事项：
- 如果某项信息在会议内容中未提及，对应字段留空（字符串为空，数组为空数组）
- 待办事项的 owner 和 deadline 如果未提及，也留空
- 只输出 JSON，不要输出任何其他内容
```

**用户提示词：**

```
请从以下会议内容中提取关键信息：

{{#start.meeting_content#}}

输出格式：
{
  "topic": "",
  "time": "",
  "location": "",
  "participants": [],
  "agenda": [],
  "conclusions": [],
  "todos": [
    {
      "task": "",
      "owner": "",
      "deadline": ""
    }
  ],
  "next_meeting": ""
}
```

**输出变量：**

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `extracted_info` | String | LLM 输出的 JSON 字符串 |

##### 节点 3：LLM 节点 2（纪要生成）

| 配置项 | 值 |
|--------|-----|
| 节点类型 | LLM |
| 节点名称 | 纪要生成 |
| 模型 | gpt-4o / claude-3-5-sonnet / qwen-max |
| 温度 | 0.7（适中温度，保证文本流畅性） |

**变量引用：**

| 变量名 | 引用 |
|--------|------|
| `extracted_info` | `{{#llm_info_extract.text#}}` |

> **说明：** `llm_info_extract` 是 LLM 节点 1 的节点 ID，`.text` 表示获取 LLM 输出的文本内容。

**系统提示词：**

```
你是一个专业的会议纪要撰写助手。你的任务是根据提取的会议信息，按照标准模板生成结构化的会议纪要。

写作要求：
1. 语言简洁、专业、正式
2. 议题和结论使用序号列表
3. 待办事项格式统一：序号 + 任务内容 + 负责人 + 截止时间
4. 如果某项信息缺失，标注「未提及」
5. 保持格式整齐，便于阅读
```

**用户提示词：**

```
请根据以下信息，按照会议纪要模板生成结构化的会议纪要。

提取的信息：
{{#llm_info_extract.text#}}

模板格式：

会议纪要

会议主题：{主题}
会议时间：{时间}
会议地点：{地点}
参会人员：{参会人员}

一、会议议题
{议题列表}

二、会议结论
{结论内容}

三、待办事项
1. {待办 1} - 负责人：{负责人 1} - 截止时间：{时间 1}
2. {待办 2} - 负责人：{负责人 2} - 截止时间：{时间 2}

四、下次会议安排
{下次会议信息}

请生成完整的会议纪要。
```

**输出变量：**

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `meeting_summary` | String | 生成的会议纪要文本 |

##### 节点 4：结束节点

| 配置项 | 值 |
|--------|-----|
| 节点类型 | 结束节点 (End) |
| 输出变量名 | `meeting_summary` |
| 变量引用 | `{{#llm_summary_generate.text#}}` |

> **说明：** `llm_summary_generate` 是 LLM 节点 2 的节点 ID。

#### 3.1.4 模型选择建议

| 节点 | 推荐模型 | 原因 |
|------|----------|------|
| LLM 节点 1（信息提取） | gpt-4o / qwen-max | 需要准确理解文本并提取结构化信息 |
| LLM 节点 2（纪要生成） | gpt-4o-mini / qwen-plus | 主要是格式化输出，对模型要求较低 |

> **成本优化：** 节点 2 可以使用更便宜的模型，因为任务相对简单。

### 3.2 API 调用代码

#### 3.2.1 cURL 示例

```bash
curl -X POST 'https://api.dify.ai/v1/workflows/run' \
  -H "Authorization: Bearer {your_api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "meeting_content": "今天开会讨论了 Q3 销售目标。张三负责华东区，李四负责华南区，王五负责华北区。大家一致认为 Q3 目标应该比 Q2 增长 20%。张三说华东区需要增加 3 个销售，李四说华南区需要增加 2 个销售。下周三前各区域提交详细的销售计划。下次会议定在下周四下午 3 点。"
    },
    "response_mode": "blocking",
    "user": "user_123"
  }'
```

**响应示例：**

```json
{
  "task_id": "xxx",
  "workflow_run_id": "xxx",
  "data": {
    "id": "xxx",
    "workflow_id": "xxx",
    "status": "succeeded",
    "outputs": {
      "meeting_summary": "会议纪要\n\n会议主题：Q3 销售目标讨论\n会议时间：未提及\n会议地点：未提及\n参会人员：张三、李四、王五\n\n一、会议议题\n1. Q3 销售目标制定\n2. 各区域销售计划\n\n二、会议结论\n1. Q3 目标比 Q2 增长 20%\n2. 华东区需要增加 3 个销售\n3. 华南区需要增加 2 个销售\n\n三、待办事项\n1. 提交详细销售计划 - 负责人：各区域负责人 - 截止时间：下周三\n\n四、下次会议安排\n下周四下午 3 点"
    },
    "elapsed_time": 5.23,
    "total_tokens": 1234,
    "created_at": 1704067200
  }
}
```

#### 3.2.2 Python 示例

```python
import requests
import json

def generate_meeting_summary(meeting_content: str, api_key: str) -> str:
    """
    调用 Dify 工作流生成会议纪要
    
    Args:
        meeting_content: 会议内容文本
        api_key: Dify API Key
    
    Returns:
        生成的会议纪要
    """
    url = "https://api.dify.ai/v1/workflows/run"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": {
            "meeting_content": meeting_content
        },
        "response_mode": "blocking",
        "user": "user_123"
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    result = response.json()
    
    if result["data"]["status"] == "succeeded":
        return result["data"]["outputs"]["meeting_summary"]
    else:
        raise Exception(f"工作流执行失败: {result}")


# 使用示例
if __name__ == "__main__":
    API_KEY = "your_api_key_here"
    
    meeting_text = """
    今天开会讨论了 Q3 销售目标。张三负责华东区，李四负责华南区，王五负责华北区。
    大家一致认为 Q3 目标应该比 Q2 增长 20%。张三说华东区需要增加 3 个销售，
    李四说华南区需要增加 2 个销售。下周三前各区域提交详细的销售计划。
    下次会议定在下周四下午 3 点。
    """
    
    summary = generate_meeting_summary(meeting_text, API_KEY)
    print(summary)
```

#### 3.2.3 JavaScript 示例

```javascript
/**
 * 调用 Dify 工作流生成会议纪要
 * @param {string} meetingContent - 会议内容文本
 * @param {string} apiKey - Dify API Key
 * @returns {Promise<string>} 生成的会议纪要
 */
async function generateMeetingSummary(meetingContent, apiKey) {
  const url = 'https://api.dify.ai/v1/workflows/run';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: {
        meeting_content: meetingContent
      },
      response_mode: 'blocking',
      user: 'user_123'
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (result.data.status === 'succeeded') {
    return result.data.outputs.meeting_summary;
  } else {
    throw new Error(`工作流执行失败: ${JSON.stringify(result)}`);
  }
}

// 使用示例
const API_KEY = 'your_api_key_here';

const meetingText = `
今天开会讨论了 Q3 销售目标。张三负责华东区，李四负责华南区，王五负责华北区。
大家一致认为 Q3 目标应该比 Q2 增长 20%。张三说华东区需要增加 3 个销售，
李四说华南区需要增加 2 个销售。下周三前各区域提交详细的销售计划。
下次会议定在下周四下午 3 点。
`;

generateMeetingSummary(meetingText, API_KEY)
  .then(summary => console.log(summary))
  .catch(error => console.error('Error:', error));
```

---

## 4. 测试验证

### 4.1 测试用例 1：Q3 销售目标讨论会议

**输入：**

```
今天开会讨论了 Q3 销售目标。张三负责华东区，李四负责华南区，王五负责华北区。
大家一致认为 Q3 目标应该比 Q2 增长 20%。张三说华东区需要增加 3 个销售，
李四说华南区需要增加 2 个销售。下周三前各区域提交详细的销售计划。
下次会议定在下周四下午 3 点。
```

**预期输出：**

```markdown
会议纪要

会议主题：Q3 销售目标讨论
会议时间：未提及
会议地点：未提及
参会人员：张三、李四、王五

一、会议议题
1. Q3 销售目标制定
2. 各区域销售计划讨论

二、会议结论
1. Q3 销售目标比 Q2 增长 20%
2. 华东区需要增加 3 个销售人员
3. 华南区需要增加 2 个销售人员

三、待办事项
1. 提交详细销售计划 - 负责人：各区域负责人 - 截止时间：下周三

四、下次会议安排
下周四下午 3 点
```

**验证要点：**

| 检查项 | 预期结果 |
|--------|----------|
| 主题提取 | ✅ 正确识别为「Q3 销售目标讨论」 |
| 参会人员 | ✅ 包含张三、李四、王五 |
| 结论提取 | ✅ 包含增长 20%、各区增加销售 |
| 待办事项 | ✅ 包含提交销售计划、截止时间 |
| 下次会议 | ✅ 包含下周四下午 3 点 |

### 4.2 测试用例 2：产品评审会

**输入：**

```
产品评审会。参加人员有产品经理小刘、开发负责人小陈、测试负责人小周。
主要讨论了新版本的功能。小刘说需要增加用户反馈功能，小陈说开发周期需要 2 周，
小周说测试需要 3 天。下周一开始开发，预计 2 周后上线。
```

**预期输出：**

```markdown
会议纪要

会议主题：产品评审会
会议时间：未提及
会议地点：未提及
参会人员：小刘（产品经理）、小陈（开发负责人）、小周（测试负责人）

一、会议议题
1. 新版本功能讨论
2. 开发计划安排

二、会议结论
1. 新版本需要增加用户反馈功能
2. 开发周期预计 2 周
3. 测试周期预计 3 天
4. 下周一开始开发，预计 2 周后上线

三、待办事项
1. 开始新版本开发 - 负责人：小陈 - 截止时间：下周一
2. 完成测试 - 负责人：小周 - 截止时间：开发完成后 3 天

四、下次会议安排
未提及
```

**验证要点：**

| 检查项 | 预期结果 |
|--------|----------|
| 主题提取 | ✅ 正确识别为「产品评审会」 |
| 参会人员 | ✅ 包含角色信息 |
| 结论提取 | ✅ 包含功能需求、开发周期、测试周期 |
| 待办事项 | ✅ 包含开发启动、测试安排 |
| 下次会议 | ✅ 标注为「未提及」 |

### 4.3 验证清单

- [ ] 信息提取完整，没有遗漏关键信息
- [ ] 纪要格式规范，符合模板要求
- [ ] 待办事项清晰，包含任务、负责人、截止时间
- [ ] 缺失信息正确标注为「未提及」
- [ ] 语言简洁专业，没有口语化表达

---

## 5. 扩展思考

### 5.1 如何添加更多提取字段

**场景：** 需要提取「会议决议」「风险提示」「资源需求」等额外信息。

**方案：**

1. **修改 LLM 节点 1 的提示词**，添加新的提取字段：

```json
{
  "topic": "",
  "time": "",
  "location": "",
  "participants": [],
  "agenda": [],
  "conclusions": [],
  "todos": [],
  "next_meeting": "",
  "decisions": [],
  "risks": [],
  "resource_needs": []
}
```

2. **修改 LLM 节点 2 的模板**，添加对应的输出段落：

```markdown
五、会议决议
{决议列表}

六、风险提示
{风险列表}

七、资源需求
{资源需求列表}
```

**注意事项：**
- 字段越多，提取难度越大，可能需要更强的模型
- 建议逐步添加字段，验证效果后再继续扩展

### 5.2 如何处理超长会议内容

**问题：** 会议内容超过模型上下文限制（如 2 小时会议录音转写可能有数万字）。

**方案：**

**方案 A：分段处理**

```
超长内容 → 分段 → 每段分别提取 → 合并结果 → 生成纪要
```

实现方式：
1. 在开始节点前添加「代码执行」节点，将长文本分段
2. 使用「迭代」节点对每段分别调用 LLM 提取
3. 使用「代码执行」节点合并提取结果
4. 最后调用 LLM 生成纪要

**方案 B：摘要 + 提取**

```
超长内容 → LLM 摘要 → 提取关键信息 → 生成纪要
```

实现方式：
1. 添加一个 LLM 节点，先对长文本做摘要
2. 再对摘要进行信息提取
3. 最后生成纪要

**方案 C：使用长上下文模型**

- 使用支持长上下文的模型（如 Claude 3 Opus 200K、GPT-4 Turbo 128K）
- 简单直接，但成本较高

### 5.3 如何集成到企业微信/钉钉等办公系统

**场景：** 会议结束后，自动将会议纪要推送到企业群。

**方案：**

```
会议录音 → 语音转文字 → Dify 工作流 → 生成纪要 → 推送到企业微信/钉钉
```

**实现步骤：**

1. **语音转文字：** 使用讯飞、阿里云等语音识别服务
2. **调用 Dify 工作流：** 使用 3.2 节的 API 代码
3. **推送到企业系统：**

```python
# 企业微信机器人推送示例
import requests

def send_to_wechat_work(webhook_url: str, content: str):
    """推送消息到企业微信群"""
    payload = {
        "msgtype": "markdown",
        "markdown": {
            "content": content
        }
    }
    response = requests.post(webhook_url, json=payload)
    return response.json()

# 使用示例
summary = generate_meeting_summary(meeting_text, DIFY_API_KEY)
send_to_wechat_work(WECHAT_WEBHOOK_URL, summary)
```

**钉钉机器人推送示例：**

```python
def send_to_dingtalk(webhook_url: str, content: str):
    """推送消息到钉钉群"""
    payload = {
        "msgtype": "markdown",
        "markdown": {
            "title": "会议纪要",
            "text": content
        }
    }
    response = requests.post(webhook_url, json=payload)
    return response.json()
```

---

## 6. 讲师备注

### 6.1 讲解重点

**重点 1：多 LLM 节点串联的设计思想**

- 为什么要拆分？类比软件工程中的「单一职责原则」
- 对比单节点方案，展示双节点方案的优势
- 强调「分而治之」是处理复杂任务的核心方法

**重点 2：信息提取技巧**

- 提示词中明确要求 JSON 格式输出
- 使用低温度（0.3）保证提取准确性
- 演示如何调试提取结果（单独运行 LLM 节点 1）

**重点 3：变量引用方式**

- 开始节点变量：`{{#start.变量名#}}`
- LLM 节点输出：`{{#节点ID.text#}}`
- 强调节点 ID 的命名规范（建议使用英文，便于引用）

### 6.2 演示节奏

**建议时长：45-60 分钟**

| 环节 | 时长 | 内容 |
|------|------|------|
| 场景介绍 | 5 分钟 | 展示业务场景，说明输入输出 |
| 工作流画布 | 10 分钟 | 展示 4 个节点的连接关系，讲解数据流 |
| 节点配置 | 15 分钟 | 逐个讲解每个节点的配置，重点讲提示词 |
| 运行演示 | 10 分钟 | 输入测试用例，展示输出结果 |
| API 调用 | 10 分钟 | 演示 cURL 和 Python 调用 |
| 扩展讨论 | 5-10 分钟 | 讨论扩展场景，回答学员问题 |

**演示技巧：**

1. **先展示整体，再讲解细节**
   - 先展示工作流画布，让学员有整体印象
   - 再逐个节点讲解配置

2. **对比演示**
   - 先展示单节点方案的问题
   - 再展示双节点方案的优势

3. **实时调试**
   - 单独运行 LLM 节点 1，展示提取结果
   - 如果提取不完整，现场调整提示词

### 6.3 学员常见问题

**问题 1：为什么信息提取不完整？**

**可能原因：**
- 会议内容本身信息不足
- 提示词不够清晰，模型理解有偏差
- 模型能力不足（使用了太小的模型）

**解决方案：**
- 检查输入内容，确保包含足够信息
- 优化提示词，添加更明确的提取要求
- 尝试使用更强的模型（如 gpt-4o）

**问题 2：如何优化提示词？**

**优化方法：**
- 添加示例（Few-shot）：给模型展示期望的输入输出
- 明确约束：如「只输出 JSON，不要其他内容」
- 分步引导：先让模型思考，再输出结果

**问题 3：JSON 格式输出不稳定怎么办？**

**解决方案：**
- 使用支持 JSON Mode 的模型
- 在提示词中强调「只输出 JSON」
- 添加代码执行节点，用代码解析和校验 JSON
- 使用 Dify 的「结构化输出」功能（如果支持）

**问题 4：节点 ID 是什么？怎么找？**

**解答：**
- 节点 ID 是工作流中每个节点的唯一标识
- 在节点配置面板的顶部可以看到
- 建议使用有意义的英文命名（如 `llm_info_extract`）
- 引用格式：`{{#节点ID.输出变量名#}}`

**问题 5：可以添加更多节点吗？**

**解答：**
- 可以，工作流支持任意数量的节点
- 常见扩展：添加「代码执行」节点做数据转换、添加「条件分支」做不同处理
- 建议：节点不要太多，保持工作流清晰可读

### 6.4 课后作业

1. **基础作业：** 按照案例搭建会议纪要助手，运行测试用例
2. **进阶作业：** 添加「会议决议」和「风险提示」两个提取字段
3. **挑战作业：** 实现超长会议内容的分段处理方案

---

## 附录

### A. 会议纪要模板

```markdown
会议纪要

会议主题：{主题}
会议时间：{时间}
会议地点：{地点}
参会人员：{参会人员}

一、会议议题
{议题列表}

二、会议结论
{结论内容}

三、待办事项
1. {待办 1} - 负责人：{负责人 1} - 截止时间：{时间 1}
2. {待办 2} - 负责人：{负责人 2} - 截止时间：{时间 2}

四、下次会议安排
{下次会议信息}
```

### B. 工作流节点配置速查表

| 节点 | 类型 | 输入变量 | 输出变量 | 模型 | 温度 |
|------|------|----------|----------|------|------|
| 开始 | Start | - | `meeting_content` | - | - |
| 信息提取 | LLM | `meeting_content` | `extracted_info` | gpt-4o | 0.3 |
| 纪要生成 | LLM | `extracted_info` | `meeting_summary` | gpt-4o-mini | 0.7 |
| 结束 | End | `meeting_summary` | - | - | - |

### C. 相关资源

- [Dify 工作流文档](https://docs.dify.ai/zh-hans/guides/workflow)
- [Dify API 文档](https://docs.dify.ai/zh-hans/guides/application-publishing/developing-with-apis)
- [提示词工程指南](https://docs.dify.ai/zh-hans/guides/application-orchestrate/prompt-engineering)
