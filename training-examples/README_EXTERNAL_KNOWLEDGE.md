# Dify 外部知识库 Server 端实现

本目录包含两个 Dify 外部知识库 Server 端实现，供 Dify 调用检索。

## 文件说明

| 文件 | 说明 | 适用场景 |
|------|------|---------|
| `external_knowledge_server.py` | 基础版（关键词检索） | 快速演示、学习 API 规范 |
| `external_knowledge_server_advanced.py` | 生产版（向量检索） | 生产环境、真实检索需求 |

## API 规范

两个实现都遵循 [Dify 外部知识库 API 规范](https://docs.dify.ai/zh/cloud/use-dify/knowledge/external-knowledge-api)。

### 端点

```
POST /retrieval
```

### 请求格式

```json
{
  "knowledge_id": "dify-docs",
  "query": "Dify 是什么？",
  "retrieval_setting": {
    "top_k": 3,
    "score_threshold": 0.5
  }
}
```

### 响应格式

```json
{
  "records": [
    {
      "content": "Dify 是一个开源的 LLM 应用开发平台...",
      "score": 0.95,
      "title": "Dify 平台介绍",
      "metadata": {"category": "产品介绍", "source": "official"}
    }
  ]
}
```

## 快速开始

### 1. 基础版（关键词检索）

**安装依赖**：

```bash
pip install fastapi uvicorn
```

**启动服务**：

```bash
cd training-examples
uvicorn external_knowledge_server:app --host 0.0.0.0 --port 8000
```

**测试 API**：

```bash
curl -X POST 'http://localhost:8000/retrieval' \
  -H 'Authorization: Bearer your-secret-api-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "knowledge_id": "demo-knowledge",
    "query": "Dify 是什么",
    "retrieval_setting": {
      "top_k": 3,
      "score_threshold": 0.5
    }
  }'
```

### 2. 生产版（向量检索）

**安装依赖**：

```bash
pip install fastapi uvicorn sentence-transformers numpy
```

**启动服务**：

```bash
cd training-examples
uvicorn external_knowledge_server_advanced:app --host 0.0.0.0 --port 8000
```

**测试 API**：

```bash
curl -X POST 'http://localhost:8000/retrieval' \
  -H 'Authorization: Bearer your-secret-api-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "knowledge_id": "dify-docs",
    "query": "什么是 RAG",
    "retrieval_setting": {
      "top_k": 3,
      "score_threshold": 0.5
    }
  }'
```

## 在 Dify 中配置

### Step 1: 注册外部知识库 API

1. 登录 Dify 平台
2. 进入 **知识库** 页面
3. 点击右上角 **外部知识库 API** → **添加外部知识库 API**
4. 填写：
   - **名称**：`本地知识库服务`（自定义）
   - **API 接口地址**：`http://your-server:8000`（Dify 会自动追加 `/retrieval`）
   - **API Key**：`your-secret-api-key`（与服务端配置一致）
5. 点击保存，Dify 会发送测试请求验证连接

### Step 2: 创建外部知识库

1. 在 **知识库** 页面，点击 **连接外部知识库**
2. 填写：
   - **外部知识库名称**：`Dify 平台文档`（自定义）
   - **外部知识库 API**：选择刚才注册的 API
   - **外部知识库 ID**：`dify-docs`（对应服务端的 knowledge_id）
   - **检索设置**：
     - Top K：3
     - 分数阈值：0.5
3. 点击创建

### Step 3: 在应用中使用

1. 创建或编辑应用
2. 在 **上下文** 部分，点击 **添加知识库**
3. 选择刚创建的外部知识库
4. 测试问答效果

## 自定义知识库

### 基础版

编辑 `external_knowledge_server.py` 中的 `MOCK_KNOWLEDGE_BASE`：

```python
MOCK_KNOWLEDGE_BASE = {
    "your-knowledge-id": [
        {
            "content": "文档内容...",
            "score": 0.9,
            "title": "文档标题",
            "metadata": {"key": "value"}
        }
    ]
}
```

### 生产版

编辑 `external_knowledge_server_advanced.py` 中的 `init_demo_knowledge_bases()` 函数，或从文件加载：

```python
def load_documents_from_file(file_path: str) -> List[Dict]:
    """从 JSON 文件加载文档"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# 在 init_demo_knowledge_bases() 中
documents = load_documents_from_file("my_knowledge.json")
search_engine.add_knowledge_base("my-kb", documents)
```

**JSON 文件格式**：

```json
[
  {
    "content": "文档内容...",
    "title": "文档标题",
    "metadata": {"category": "分类", "source": "来源"}
  }
]
```

## 连接真实知识库

生产环境中，应替换检索逻辑为真实的知识库系统：

### 方案 1：向量数据库

```python
# 使用 Milvus
from pymilvus import Collection

def search_with_milvus(query: str, top_k: int):
    collection = Collection("my_knowledge")
    query_embedding = model.encode(query)
    results = collection.search(
        data=[query_embedding],
        anns_field="embedding",
        param={"metric_type": "COSINE"},
        limit=top_k
    )
    return results
```

### 方案 2：Elasticsearch

```python
# 使用 Elasticsearch
from elasticsearch import Elasticsearch

es = Elasticsearch(["http://localhost:9200"])

def search_with_elasticsearch(query: str, top_k: int):
    results = es.search(
        index="my_knowledge",
        body={
            "query": {"match": {"content": query}},
            "size": top_k
        }
    )
    return results["hits"]["hits"]
```

### 方案 3：OpenAI Embedding + 余弦相似度

```python
import openai
import numpy as np

def get_embedding(text: str):
    response = openai.Embedding.create(
        model="text-embedding-3-small",
        input=text
    )
    return response["data"][0]["embedding"]

def search_with_openai(query: str, documents: List[Dict], top_k: int):
    query_embedding = get_embedding(query)
    
    results = []
    for doc in documents:
        doc_embedding = get_embedding(doc["content"])
        score = cosine_similarity(query_embedding, doc_embedding)
        results.append({**doc, "score": score})
    
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DIFY_EXTERNAL_KB_API_KEY` | `your-secret-api-key` | API 认证密钥 |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | 嵌入模型（生产版） |

## 错误码

| 错误码 | 说明 |
|--------|------|
| 1001 | 无效的 Authorization 请求头格式 |
| 1002 | 认证失败 |
| 2001 | 知识库不存在 |
| 9999 | 内部服务器错误 |

## 注意事项

1. **metadata 不能为 null**：每条记录的 `metadata` 必须是对象（`{}`），不能为 `null`
2. **必须包含 content 和 score**：缺少这两个字段会导致结果不完整
3. **API Key 安全**：生产环境使用环境变量，不要硬编码
4. **HTTPS**：生产环境建议使用 HTTPS
5. **性能优化**：向量检索应使用专业的向量数据库

## 参考文档

- [Dify 外部知识库 API 规范](https://docs.dify.ai/zh/cloud/use-dify/knowledge/external-knowledge-api)
- [连接外部知识库指南](https://docs.dify.ai/zh/cloud/use-dify/knowledge/connect-external-knowledge-base)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [sentence-transformers 文档](https://www.sbert.net/)
