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
