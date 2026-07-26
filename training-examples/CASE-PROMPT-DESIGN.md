# 案例提示词设计与测试问题汇总

> 本文档从 7 个案例中提取核心内容：提示词设计、设计解析、正常问题列表、边界问题列表。

---

## 案例 1：法律知识问答助手

**知识点**：普通智能体创建、系统提示词设计、边界处理

### 提示词设计

```
你是一个法律知识问答助手。请遵循以下规则:
1. 只回答基础法律知识问题
2. 回答要通俗易懂,避免过于专业的术语
3. 每次回答后提醒用户"如需具体法律建议,请咨询专业律师"
4. 不回答涉及具体案件的问题
```

### 设计解析

- **第 1 条**：定义能力边界，只回答"基础知识"，不处理复杂案件
- **第 2 条**：定义回答风格，面向普通用户而非法律专业人士
- **第 3 条**：强制风险提示，这是法律类应用的必要保护
- **第 4 条**：明确拒绝范围，避免 AI 卷入具体纠纷

### 正常问题列表

| 序号 | 测试问题 | 预期回答要点 |
|-----|---------|-------------|
| 1 | 劳动合同到期不续签有补偿吗 | 说明经济补偿金的计算标准（每满一年支付一个月工资），提醒咨询律师 |
| 2 | 租房合同里哪些条款是必须的 | 列举必要条款（租金、租期、押金、违约责任等），提醒咨询律师 |
| 3 | 知识产权包括哪些类型 | 说明著作权、专利权、商标权等主要类型，提醒咨询律师 |
| 4 | 劳动仲裁的流程是什么 | 说明申请、受理、开庭、裁决的基本流程，提醒咨询律师 |
| 5 | 消费者维权有哪些途径 | 列举协商、投诉、仲裁、诉讼等途径，提醒咨询律师 |

**验证要点**：
- ✅ 回答是否通俗易懂（没有堆砌法条）
- ✅ 是否在结尾包含风险提示
- ✅ 是否提供了实用的基础信息

### 边界问题列表

| 序号 | 测试问题 | 预期拒绝方式 |
|-----|---------|-------------|
| 1 | 帮我打官司 | 明确拒绝："我不能代理具体案件，建议咨询专业律师" |
| 2 | 邻居欠钱不还怎么办 | 可以说明一般维权途径，但不针对具体案件给建议 |
| 3 | 帮我写一份合同 | 拒绝："我不能起草具体合同，建议找律师定制" |
| 4 | 我被辞退了能赔多少 | 可以说明计算标准，但强调"具体金额需要咨询律师" |

**验证要点**：
- ✅ 是否拒绝了超出范围的问题
- ✅ 拒绝时是否保持礼貌和专业
- ✅ 是否仍然提供了基础信息（如果可能）

### Dify API 调用命令

**cURL 示例**：

```bash
curl -X POST 'http://123.56.40.34:8010/v1/chat-messages' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "劳动合同到期不续签有补偿吗",
    "response_mode": "blocking",
    "user": "user-001"
  }'
```

**参数说明**：
- `inputs`：空对象（本案例没有变量）
- `query`：用户问题
- `response_mode`：`blocking`（同步等待）或 `streaming`（流式返回）
- `user`：用户标识（用于区分不同用户）

---

## 案例 2：信息提取助手

**知识点**：工作流智能体（Workflow）、节点编排、变量传递与 JSON 输出

### 提示词设计

**系统提示词（System Prompt）**：

```
你是一个专业的信息提取助手。
```

**用户提示词（User Prompt）**：

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

### 设计解析

- **Temperature 设为 0**：信息提取需要确定性输出，不需要创造性
- **「只输出 JSON，不要其他内容」**：避免模型输出解释性文字，确保程序可解析
- **提供输出模板**：给出完整的 JSON 结构，让模型按模板填充
- **字段说明用「如有」**：告诉模型缺失字段用空字符串填充，而非 null 或缺失

### 正常问题列表

| 序号 | 输入文本 | 预期输出 |
|-----|---------|---------|
| 1 | 张三在2024年1月15日在北京支付了5000元，联系电话13800138000 | `{"name":"张三","date":"2024年1月15日","amount":"5000元","location":"北京","phone":"13800138000","company":""}` |
| 2 | 李四于2024年3月20日在上海向阿里巴巴公司支付了10000元服务费 | `{"name":"李四","date":"2024年3月20日","amount":"10000元","location":"上海","phone":"","company":"阿里巴巴"}` |
| 3 | 王五在2024年5月10日通过支付宝转账2000元给赵六，交易地点是深圳 | `{"name":"王五","date":"2024年5月10日","amount":"2000元","location":"深圳","phone":"","company":""}` |

**验证要点**：
- ✅ JSON 格式正确，可被 `json.loads()` 或 `JSON.parse()` 解析
- ✅ 包含全部 6 个字段
- ✅ 未提及的信息用空字符串 `""` 填充
- ✅ 输出只有 JSON，没有解释性文字或 markdown 标记

### 边界问题列表

| 序号 | 输入文本 | 预期行为 |
|-----|---------|---------|
| 1 | 上周在北京花了点钱 | 模糊信息处理：`date` 填"上周"或"未知"，`amount` 填"模糊金额"或"未知" |
| 2 | （空文本） | 所有字段为空字符串 |
| 3 | 今天天气真好 | 无相关信息，所有字段为空字符串 |
| 4 | 张三 13800138000 李四 13900139000 | 多人名/手机号场景，`name` 应提取第一个或明确说明有多人 |

### Dify API 调用命令

**cURL 示例**（工作流使用 `/workflows/run` 端点，而非 `/chat-messages`）：

```bash
curl -X POST 'http://123.56.40.34:8010/v1/workflows/run' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {
      "input": "张三在2024年1月15日在北京支付了5000元，联系电话13800138000"
    },
    "response_mode": "blocking",
    "user": "user-001"
  }'
```

**参数说明**：
- `inputs.input`：待提取的文本内容（对应开始节点定义的 `input` 变量）
- `response_mode`：`blocking`（同步等待）或 `streaming`（流式）
- `user`：用户标识

**响应结构**：

```json
{
  "data": {
    "outputs": {
      "result": "{\"name\":\"张三\",\"date\":\"2024年1月15日\",...}"
    },
    "status": "succeeded"
  }
}
```

### Server 端代码（Python）

```python
import requests
import json

API_KEY = "YOUR_API_KEY"
BASE_URL = "http://123.56.40.34:8010/v1"

def extract_info(text: str) -> dict:
    """调用信息提取工作流"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": {"input": text},
        "response_mode": "blocking",
        "user": "training-user-001"
    }
    response = requests.post(
        f"{BASE_URL}/workflows/run",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    output_text = response.json()["data"]["outputs"]["result"]

    # 清理可能的 markdown 代码块标记
    output_text = output_text.strip()
    if output_text.startswith("```json"):
        output_text = output_text[7:-3].strip()
    elif output_text.startswith("```"):
        output_text = output_text[3:-3].strip()

    return json.loads(output_text)

if __name__ == "__main__":
    result = extract_info("张三在2024年1月15日在北京支付了5000元")
    print(json.dumps(result, ensure_ascii=False, indent=2))
```

---

## 案例 3：多轮问答助手

**知识点**：Chatflow 对话流、上下文管理、会话记忆、conversation_id

### 提示词设计

```
你是一个友好的问答助手。请记住用户在对话中提到的信息，并在后续对话中使用这些信息。

要求:
- 当用户告诉你姓名、偏好等信息时，明确确认你已记住
- 当用户询问之前提到的信息时，准确回忆并回答
- 保持对话的自然流畅，像朋友一样交流
```

**对话开场白**：

```
你好，我是你的问答助手。请问有什么可以帮助你的？
```

### 设计解析

- **「友好的问答助手」**：定义角色风格，让 AI 以亲切的方式交流
- **「明确确认你已记住」**：强制 AI 在收到信息时给出确认反馈，让用户知道信息已被记录
- **「准确回忆并回答」**：要求 AI 在后续对话中主动使用之前记住的信息
- **「像朋友一样交流」**：定义对话风格，避免机械式回答
- **开场白的作用**：给用户第一印象，建立友好氛围，引导用户开始对话

**关键配置**：
- **记忆轮数**：建议设置为 10 轮（保留最近的 N 轮对话）
- **记忆策略**：选择"滑动窗口"

### 正常问题列表

| 序号 | 对话场景 | 测试步骤 | 预期结果 |
|-----|---------|---------|---------|
| 1 | 记住用户姓名 | 第1轮："我叫张三" → 第2轮："你还记得我叫什么吗？" | 第2轮回答包含"张三" |
| 2 | 记住用户偏好 | 第1轮："我喜欢喝咖啡" → 第2轮："推荐一些饮品" | 推荐咖啡相关饮品（如拿铁、卡布奇诺等） |
| 3 | 记住上下文 | 第1轮："今天天气怎么样？" → 第2轮："明天呢？" | 第2轮理解是在问同一城市的明天天气 |

**验证要点**：
- ✅ 第1轮响应包含 `conversation_id`
- ✅ 第2轮请求携带了 `conversation_id`
- ✅ 第2轮回答正确回忆了之前的信息
- ✅ 不同场景使用不同的 `conversation_id`（会话隔离）

### 边界问题列表

| 序号 | 测试场景 | 预期行为 |
|-----|---------|---------|
| 1 | 不传 `conversation_id` 进行第2轮对话 | 模型"忘记"之前的信息，视为新对话 |
| 2 | 传递错误的 `conversation_id` | 模型无法找到对应会话，可能报错或视为新对话 |
| 3 | 超过记忆轮数（如第15轮问第1轮的内容） | 模型可能"忘记"早期对话内容 |
| 4 | 在同一会话中切换完全不同的话题 | 模型应保持上下文，但不会混淆不同话题 |

### Dify API 调用命令

**cURL 示例（第1轮对话 - 不传 conversation_id）**：

```bash
curl -X POST 'http://123.56.40.34:8010/v1/chat-messages' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "我叫张三",
    "response_mode": "blocking",
    "user": "user-001"
  }'
```

**响应示例**（注意保存 `conversation_id`）：

```json
{
  "message_id": "msg_abc123",
  "conversation_id": "conv_xyz789",
  "answer": "你好张三！很高兴认识你。我已经记住你的名字了。"
}
```

**cURL 示例（第2轮对话 - 携带 conversation_id）**：

```bash
curl -X POST 'http://123.56.40.34:8010/v1/chat-messages' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "你还记得我叫什么吗？",
    "response_mode": "blocking",
    "conversation_id": "conv_xyz789",
    "user": "user-001"
  }'
```

**关键区别**：第1轮不传 `conversation_id`（API 返回新的），第2轮传入上次的 `conversation_id`。

### Server 端代码（Python）

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "http://123.56.40.34:8010/v1"

def chat(query: str, conversation_id: str = None, user: str = "user-001") -> dict:
    """发送聊天消息，支持多轮对话"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": {},
        "query": query,
        "response_mode": "blocking",
        "user": user
    }
    if conversation_id:
        payload["conversation_id"] = conversation_id

    response = requests.post(
        f"{BASE_URL}/chat-messages",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    # 第1轮
    result1 = chat("我叫张三")
    print(f"助手: {result1['answer']}")
    conv_id = result1["conversation_id"]

    # 第2轮（携带 conversation_id）
    result2 = chat("你还记得我叫什么吗？", conv_id)
    print(f"助手: {result2['answer']}")
```

---

## 案例 4：产品手册问答系统

**知识点**：知识库创建与配置、RAG 原理、分段策略、检索模式选择

### 提示词设计

```
你是一个智能手表产品助手。请遵循以下规则:
1. 只基于知识库中的产品手册内容回答
2. 如果知识库中没有相关信息，明确告知用户"抱歉，产品手册中没有相关信息"
3. 回答要简洁明了，步骤清晰
4. 如果涉及操作步骤，使用编号列表
```

### 设计解析

- **第 1 条**：RAG 的核心原则——只基于检索到的文档内容回答，避免 AI 幻觉
- **第 2 条**：处理检索失败的情况，诚实告知用户而非编造答案
- **第 3 条**：控制回答风格，简洁明了
- **第 4 条**：格式化要求，操作步骤使用编号列表，便于用户跟随

**用户提示词说明**：

知识库应用（Chatbot 类型关联知识库）的用户提示词由 Dify 自动组装。实际发送给模型的完整提示词结构如下：

```
[系统提示词]（上面定义的规则）

[上下文]（Dify 自动注入检索到的知识库片段）
<context>
{{#context#}}
</context>

[用户问题]（用户输入的 query）
```

其中 `{{#context#}}` 是 Dify 的内置变量，系统会自动将检索到的知识库文档片段注入到提示词中。用户无需手动编写用户提示词，只需在系统提示词中定义规则即可。

**关键配置**：
- **分段长度**：500 字符（太短信息不完整，太长包含过多噪音）
- **重叠长度**：50 字符（避免关键信息被截断在分段边界）
- **检索方式**：混合检索（语义 + 关键词）
- **Top-K**：3（返回最相关的 3 个片段）
- **Score 阈值**：0.5（过滤低相关性结果）

### 正常问题列表

| 序号 | 测试问题 | 预期回答要点 | 引用来源 |
|-----|---------|-------------|---------|
| 1 | 这个手表有哪些功能？ | 列出三大类功能：健康监测（心率、血氧、睡眠、压力）、运动记录（20+种模式）、智能提醒（来电、消息、日程、久坐） | 产品手册"主要功能"章节 |
| 2 | 如何配对手表？ | 说明 5 个步骤：长按开机、下载 App、注册账号、添加设备、等待配对完成 | 产品手册"使用说明-开机与配对"章节 |
| 3 | 手表续航多久？ | 说明三种场景：典型使用 7-10 天、重度使用 3-5 天、省电模式 14 天 | 产品手册"使用说明-充电说明"和"常见问题"章节 |
| 4 | 如何更换表带？ | 说明步骤：翻转手表、按下快拆按钮、向外拉动、插入新表带。说明支持 20mm 标准表带 | 产品手册"使用说明-表带更换"和"常见问题"章节 |
| 5 | 手表防水吗？ | 说明支持 50 米防水（IP68），可以洗手、淋雨、游泳，但不适合潜水、温泉、桑拿 | 产品手册"常见问题"章节 |

**验证要点**：
- ✅ 回答是否基于产品手册内容（没有编造不存在的功能）
- ✅ 是否包含引用来源（可在 API 响应的 `metadata.retriever_resources` 中查看）
- ✅ 回答是否简洁明了，步骤清晰

### 边界问题列表

| 序号 | 测试问题 | 预期回答 |
|-----|---------|---------|
| 1 | 这个手表多少钱？ | "抱歉，产品手册中没有价格信息" |
| 2 | 和其他品牌相比怎么样？ | "抱歉，产品手册中没有对比信息" |
| 3 | 手表的芯片型号是什么？ | "抱歉，产品手册中没有芯片型号信息" |
| 4 | 今天天气怎么样？ | "抱歉，我只能回答产品手册相关的问题" |

**验证要点**：
- ✅ 是否拒绝了超出手册范围的问题
- ✅ 拒绝时是否保持礼貌和专业
- ✅ 是否没有编造答案

### Dify API 调用命令

**cURL 示例**：

```bash
curl -X POST 'http://123.56.40.34:8010/v1/chat-messages' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "这个手表有哪些功能？",
    "response_mode": "blocking",
    "user": "user-001"
  }'
```

**响应示例**（注意 `metadata.retriever_resources` 包含检索到的知识库片段）：

```json
{
  "answer": "XX 智能手表的主要功能包括...",
  "metadata": {
    "retriever_resources": [
      {
        "position": 1,
        "dataset_name": "智能手表产品手册",
        "document_name": "product-manual.md",
        "score": 0.85,
        "content": "### 健康监测..."
      }
    ]
  }
}
```

### Server 端代码（Python）

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "http://123.56.40.34:8010/v1"

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
    response.raise_for_status()
    result = response.json()
    return {
        "answer": result["answer"],
        "sources": [
            {
                "document": ref["document_name"],
                "score": ref["score"],
                "content": ref["content"][:100] + "..."
            }
            for ref in result.get("metadata", {}).get("retriever_resources", [])
        ]
    }

if __name__ == "__main__":
    result = ask_product_question("这个手表有哪些功能？")
    print(f"回答: {result['answer']}")
    print("\n引用来源:")
    for i, src in enumerate(result["sources"], 1):
        print(f"  {i}. {src['document']} (相似度: {src['score']:.2f})")
```

---

## 案例 5：智能问答工作流

**知识点**：工作流知识库检索节点配置、检索策略优化、检索与生成结合

### 提示词设计

```
你是一个产品问答助手。请根据以下检索到的文档内容，回答用户的问题。

检索到的文档:
{{retrieved_docs}}

用户问题:{{question}}

要求:
1. 只根据检索到的文档内容回答
2. 如果文档中没有相关信息，请说"抱歉，我无法找到相关信息"
3. 回答要简洁明了
4. 引用文档中的具体内容
```

### 设计解析

- **第1行**：定义角色"产品问答助手"，明确任务范围
- **第2行**：说明回答依据"检索到的文档内容"，避免 AI 凭空编造
- **`{{retrieved_docs}}`**：引用知识库检索节点的输出，这是检索到的相关文档片段
- **`{{question}}`**：引用开始节点的用户输入
- **要求1**：强制 AI 只基于检索内容回答，这是 RAG 的核心原则
- **要求2**：处理检索失败的情况，诚实告知用户而非编造答案
- **要求3**：控制回答长度，避免冗长
- **要求4**：要求引用具体内容，增强可信度

**与案例 4 的区别**：
- 案例 4 是普通知识库应用（自动检索-生成）
- 案例 5 是工作流知识库应用（可精确控制检索策略、TopK、阈值等）

### 正常问题列表

| 序号 | 测试问题 | 预期输出要点 | 验证目标 |
|-----|---------|-------------|---------|
| 1 | 这个手表有哪些功能？ | 列出三大功能：健康监测（心率、睡眠、血氧）、运动记录（跑步、游泳、骑行）、消息提醒（电话、短信、应用通知） | 检索到产品手册的功能介绍章节 |
| 2 | 如何配对手表？ | 4步配对流程：1) 打开手机蓝牙 2) 下载官方App 3) 在App中添加设备 4) 按照提示完成配对 | 检索到配对指南章节 |
| 3 | 手表续航多久？ | 续航约7天（典型使用场景），充电时间约2小时，支持磁吸快充 | 检索到规格参数章节 |

**验证要点**：
- ✅ 回答是否基于检索到的文档
- ✅ 回答是否简洁明了
- ✅ 是否引用了文档中的具体内容

### 边界问题列表

| 序号 | 测试问题 | 预期行为 |
|-----|---------|---------|
| 1 | 手表支持哪些运动模式？ | 诚实说明"手册中只提到20+种运动模式，未列出具体列表"，不编造具体列表 |
| 2 | 手表的芯片型号是什么？ | "抱歉，我无法找到相关信息" |
| 3 | 这个手表和其他品牌相比怎么样？ | "抱歉，我无法找到相关信息"（知识库中没有对比信息） |
| 4 | （检索结果为空时的行为） | LLM 应检查 `retrieved_docs` 为空，按提示词要求诚实告知用户 |

**验证要点**：
- ✅ 是否诚实说明信息不足，不编造答案
- ✅ 是否没有凭空生成知识库中不存在的信息

### Dify API 调用命令

**cURL 示例**（工作流使用 `/workflows/run` 端点）：

```bash
curl -X POST 'http://123.56.40.34:8010/v1/workflows/run' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {
      "question": "这个手表有哪些功能？"
    },
    "response_mode": "blocking",
    "user": "user-001"
  }'
```

**响应示例**：

```json
{
  "data": {
    "outputs": {
      "answer": "根据产品手册，这款智能手表主要有三大功能..."
    },
    "status": "succeeded",
    "elapsed_time": 2.5,
    "total_tokens": 500
  }
}
```

### Server 端代码（Python）

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "http://123.56.40.34:8010/v1"

def ask_product_question(question: str) -> str:
    """向产品问答工作流提问"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": {"question": question},
        "response_mode": "blocking",
        "user": "user-001"
    }
    response = requests.post(
        f"{BASE_URL}/workflows/run",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()["data"]["outputs"]["answer"]

if __name__ == "__main__":
    questions = ["这个手表有哪些功能？", "如何配对手表？", "手表续航多久？"]
    for q in questions:
        print(f"\n问题: {q}")
        print(f"回答: {ask_product_question(q)}")
```

---

## 案例 6：搭建 Web 前端调用 Dify API

**知识点**：Dify API 认证、会话管理、前端集成

### 提示词设计

本案例不涉及自定义提示词设计（使用默认助手），重点在于 API 集成。

**API 请求格式**：

```json
{
  "inputs": {},
  "query": "用户问题",
  "response_mode": "blocking",
  "conversation_id": "",
  "user": "user-123"
}
```

### 设计解析

- **`inputs`**：空对象（本案例没有变量）
- **`query`**：用户问题
- **`response_mode`**：`blocking`（同步等待）或 `streaming`（流式返回）
- **`conversation_id`**：会话标识符
  - 首次对话：传空字符串 `""`
  - 继续对话：传入上次响应返回的 `conversation_id`
  - 新对话：清空 `conversation_id` 或传空字符串
- **`user`**：用户标识，用于区分不同用户的会话

**会话保持策略**：
- 第1轮对话不传 `conversation_id`，API 返回新的 `conversation_id`
- 后续对话传入 `conversation_id`，保持上下文连贯
- 每个场景使用新的对话（新的 `conversation_id`）

### 正常问题列表

| 序号 | 测试场景 | 测试步骤 | 预期结果 |
|-----|---------|---------|---------|
| 1 | 简单问答 | 输入"你好"，点击发送 | 显示助手回复，如"你好！有什么可以帮助你的？"，状态栏显示会话 ID |
| 2 | 上下文保持 | 第1轮："我叫张三" → 第2轮："你还记得我叫什么吗？" | 第2轮回复能正确回答"张三"，两次请求使用相同的 `conversation_id` |
| 3 | 多轮对话 | 连续发送多条消息 | 对话历史正确展示，加载动画正常显示和隐藏 |

**验证要点**：
- ✅ API 调用成功，返回正确的响应格式
- ✅ 会话 ID 正确保持，多轮对话上下文连贯
- ✅ 前端页面正常显示，交互流畅

### 边界问题列表

| 序号 | 测试场景 | 预期行为 |
|-----|---------|---------|
| 1 | 无效 API Key | 显示红色错误提示框，错误信息包含"Invalid API key"，5秒后自动消失 |
| 2 | 网络错误 | 显示"请求失败"错误提示，输入框恢复可用状态 |
| 3 | 快速连续点击发送 | 加载状态下禁用发送按钮和输入框，防止重复请求 |
| 4 | 点击"新对话"按钮 | 清空 `conversation_id`，清空对话历史，显示欢迎消息 |

### Server 端代码（Python Flask 后端代理）

前端直接暴露 API Key 存在安全风险，生产环境推荐使用后端代理：

```
前端 → 你的后端 → Dify API
```

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # 允许前端跨域请求

# Dify 配置（从环境变量读取，不要硬编码）
DIFY_API_KEY = "app-xxxxxxxxxxxxxxxx"
DIFY_BASE_URL = "http://123.56.40.34:8010/v1"

@app.route('/api/chat', methods=['POST'])
def chat():
    """代理 Dify 聊天 API"""
    data = request.json

    # 调用 Dify API
    response = requests.post(
        f'{DIFY_BASE_URL}/chat-messages',
        headers={
            'Authorization': f'Bearer {DIFY_API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'inputs': {},
            'query': data.get('query', ''),
            'response_mode': data.get('response_mode', 'blocking'),
            'conversation_id': data.get('conversation_id', ''),
            'user': data.get('user', 'web-user')
        }
    )

    if response.ok:
        return jsonify(response.json())
    else:
        return jsonify({
            'error': response.json().get('message', 'API 调用失败'),
            'code': response.status_code
        }), response.status_code

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """删除/清空会话"""
    response = requests.delete(
        f'{DIFY_BASE_URL}/conversations/{conversation_id}',
        headers={'Authorization': f'Bearer {DIFY_API_KEY}'}
    )
    return jsonify({'success': response.ok})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**前端调用方式**（替换直接调用 Dify API）：

```javascript
// 调用自己的后端，而非直接调用 Dify API
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    query: '你好',
    conversation_id: '',
    user: 'web-user'
  })
});
```

---

## 案例 7：会议纪要助手

**知识点**：工作流设计、多 LLM 节点串联、信息提取与结构化

### 提示词设计

**LLM 节点 1（信息提取）- 系统提示词**：

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

**LLM 节点 2（纪要生成）- 系统提示词**：

```
你是一个专业的会议纪要撰写助手。你的任务是根据提取的会议信息，按照标准模板生成结构化的会议纪要。

写作要求：
1. 语言简洁、专业、正式
2. 议题和结论使用序号列表
3. 待办事项格式统一：序号 + 任务内容 + 负责人 + 截止时间
4. 如果某项信息缺失，标注「未提及」
5. 保持格式整齐，便于阅读
```

**LLM 节点 1（信息提取）- 用户提示词**：

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

**LLM 节点 2（纪要生成）- 用户提示词**：

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

### 设计解析

**为什么用两个 LLM 节点？**

- **职责分离**：每个节点专注一件事（提取 vs 生成）
- **易于调试**：可以单独检查提取结果
- **灵活性高**：可以独立调整提取逻辑和输出格式
- **可复用**：提取节点可以用于其他场景

**温度参数设计**：
- LLM 节点 1（信息提取）：Temperature = 0.3（低温度，保证提取准确性）
- LLM 节点 2（纪要生成）：Temperature = 0.7（适中温度，保证文本流畅性）

**模型选择**：
- LLM 节点 1：需要准确理解文本并提取结构化信息，推荐 gpt-4o / qwen-max
- LLM 节点 2：主要是格式化输出，对模型要求较低，可用 gpt-4o-mini / qwen-plus

### 正常问题列表

| 序号 | 输入（会议内容） | 预期输出要点 |
|-----|-----------------|-------------|
| 1 | 今天开会讨论了 Q3 销售目标。张三负责华东区，李四负责华南区，王五负责华北区。大家一致认为 Q3 目标应该比 Q2 增长 20%。张三说华东区需要增加 3 个销售，李四说华南区需要增加 2 个销售。下周三前各区域提交详细的销售计划。下次会议定在下周四下午 3 点。 | 主题：Q3 销售目标讨论；参会人员：张三、李四、王五；结论：增长20%、各区增加销售；待办：提交销售计划（下周三）；下次会议：下周四下午3点 |
| 2 | 产品评审会。参加人员有产品经理小刘、开发负责人小陈、测试负责人小周。主要讨论了新版本的功能。小刘说需要增加用户反馈功能，小陈说开发周期需要 2 周，小周说测试需要 3 天。下周一开始开发，预计 2 周后上线。 | 主题：产品评审会；参会人员含角色信息；结论：增加用户反馈功能、开发2周、测试3天；待办：开始开发（小陈，下周一）、完成测试（小周） |

**验证要点**：
- ✅ 信息提取完整，没有遗漏关键信息
- ✅ 纪要格式规范，符合模板要求
- ✅ 待办事项清晰，包含任务、负责人、截止时间
- ✅ 语言简洁专业，没有口语化表达

### 边界问题列表

| 序号 | 输入（会议内容） | 预期行为 |
|-----|-----------------|---------|
| 1 | 今天开了个会，讨论了一些事情。（信息极度模糊） | 主题提取为"会议讨论"，其他字段大部分为空或"未提及" |
| 2 | （空文本） | 所有字段为空，纪要中各项标注"未提及" |
| 3 | 超长会议内容（如2小时会议录音转写，数万字） | 可能超出模型上下文限制，需要分段处理或使用长上下文模型 |
| 4 | 会议内容包含多个议题，且议题之间频繁切换 | 应能正确归类不同议题的结论和待办，不混淆 |

### Dify API 调用命令

**cURL 示例**（工作流使用 `/workflows/run` 端点）：

```bash
curl -X POST 'http://123.56.40.34:8010/v1/workflows/run' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {
      "meeting_content": "今天开会讨论了 Q3 销售目标。张三负责华东区，李四负责华南区，王五负责华北区。大家一致认为 Q3 目标应该比 Q2 增长 20%。张三说华东区需要增加 3 个销售，李四说华南区需要增加 2 个销售。下周三前各区域提交详细的销售计划。下次会议定在下周四下午 3 点。"
    },
    "response_mode": "blocking",
    "user": "user-001"
  }'
```

**响应示例**：

```json
{
  "data": {
    "outputs": {
      "meeting_summary": "会议纪要\n\n会议主题：Q3 销售目标讨论\n会议时间：未提及\n..."
    },
    "status": "succeeded",
    "elapsed_time": 5.23,
    "total_tokens": 1234
  }
}
```

### Server 端代码（Python）

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "http://123.56.40.34:8010/v1"

def generate_meeting_summary(meeting_content: str) -> str:
    """调用 Dify 工作流生成会议纪要"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": {"meeting_content": meeting_content},
        "response_mode": "blocking",
        "user": "user-001"
    }
    response = requests.post(
        f"{BASE_URL}/workflows/run",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    result = response.json()
    if result["data"]["status"] == "succeeded":
        return result["data"]["outputs"]["meeting_summary"]
    else:
        raise Exception(f"工作流执行失败: {result}")

if __name__ == "__main__":
    meeting_text = """
    今天开会讨论了 Q3 销售目标。张三负责华东区，李四负责华南区，王五负责华北区。
    大家一致认为 Q3 目标应该比 Q2 增长 20%。张三说华东区需要增加 3 个销售，
    李四说华南区需要增加 2 个销售。下周三前各区域提交详细的销售计划。
    下次会议定在下周四下午 3 点。
    """
    summary = generate_meeting_summary(meeting_text)
    print(summary)
```

---

## 附录：提示词设计通用原则

### 1. 角色定义

明确告诉 AI "你是谁"，决定了回答的风格和专业程度。

**示例**：
- "你是一个法律知识问答助手"
- "你是一个专业的信息提取助手"
- "你是一个智能手表产品助手"

### 2. 能力边界

定义 AI 能做什么、不能做什么，避免回答超出能力范围的问题。

**示例**：
- "只回答基础法律知识问题"
- "只基于知识库中的产品手册内容回答"
- "只根据检索到的文档内容回答"

### 3. 输出格式

规定回答的格式和风格，确保输出可控。

**示例**：
- "回答要通俗易懂"
- "只输出 JSON，不要其他内容"
- "如果涉及操作步骤，使用编号列表"

### 4. 强制规则

某些信息必须每次都出现，如风险提示、免责声明等。

**示例**：
- "每次回答后提醒用户'如需具体法律建议，请咨询专业律师'"
- "如果知识库中没有相关信息，明确告知用户"

### 5. 温度参数

- **低温度（0-0.3）**：信息提取、法律问答等需要准确性的场景
- **中温度（0.5-0.7）**：会议纪要生成等需要流畅性的场景
- **高温度（0.8-1.0）**：创意写作等需要多样性的场景

---

**文档版本**：v1.0  
**最后更新**：2026-07-07  
**适用 Dify 版本**：0.6+
