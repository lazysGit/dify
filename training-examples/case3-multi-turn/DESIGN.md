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
