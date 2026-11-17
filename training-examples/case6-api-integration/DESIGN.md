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
