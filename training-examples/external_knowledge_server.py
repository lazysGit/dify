"""
Dify 外部知识库 Server 端实现

实现 Dify 外部知识库 API 规范，供 Dify 调用检索。

API 规范文档：
https://docs.dify.ai/zh/cloud/use-dify/knowledge/external-knowledge-api

使用方法：
1. 安装依赖：pip install fastapi uvicorn
2. 启动服务：uvicorn external_knowledge_server:app --host 0.0.0.0 --port 8000
3. 在 Dify 中注册：
   - API 接口地址：http://your-server:8000
   - API Key：your-secret-api-key
   - 外部知识库 ID：demo-knowledge（或其他自定义 ID）
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
import uvicorn
import os

app = FastAPI(
    title="Dify External Knowledge API",
    description="Dify 外部知识库 API 服务实现",
    version="1.0.0"
)

# ==================== 配置 ====================
# 从环境变量读取，生产环境不要硬编码
API_KEY = os.getenv("DIFY_EXTERNAL_KB_API_KEY", "your-secret-api-key")

# 模拟的知识库数据（实际应用中应连接真实的知识库系统）
MOCK_KNOWLEDGE_BASE = {
    "demo-knowledge": [
        {
            "content": "Dify 是一个开源的 LLM 应用开发平台，提供 AI 工作流、RAG 管道、智能体能力和模型管理等功能。",
            "score": 0.95,
            "title": "Dify 平台介绍",
            "metadata": {"category": "产品介绍", "source": "official-docs"}
        },
        {
            "content": "RAG（检索增强生成）是当前大模型应用的核心技术之一。它的核心思想是：在生成回答之前，先从知识库中检索相关信息，然后将检索到的信息作为上下文提供给大模型。",
            "score": 0.88,
            "title": "RAG 技术原理",
            "metadata": {"category": "技术文档", "source": "tech-blog"}
        },
        {
            "content": "工作流（Workflow）是 Dify 的核心功能之一，允许用户通过可视化画布编排 AI 逻辑。工作流适合有明确输入输出的批处理任务，如信息提取、数据转换等。",
            "score": 0.82,
            "title": "工作流使用指南",
            "metadata": {"category": "使用教程", "source": "user-guide"}
        },
        {
            "content": "知识库的分段策略直接影响检索效果。分段长度太短会导致信息不完整，太长会包含过多噪音。推荐的分段长度为 500-1000 字符，重叠长度为分段长度的 10%-20%。",
            "score": 0.78,
            "title": "知识库配置最佳实践",
            "metadata": {"category": "最佳实践", "source": "best-practices"}
        },
        {
            "content": "Dify 支持多种检索模式：语义检索（基于向量相似度）、关键词检索（基于 BM25 算法）、混合检索（语义 + 关键词）。混合检索通常效果最好，兼顾语义理解和精确匹配。",
            "score": 0.75,
            "title": "检索模式对比",
            "metadata": {"category": "技术文档", "source": "tech-docs"}
        }
    ],
    "product-manual": [
        {
            "content": "智能手表支持 50 米防水（IP68 等级），可以洗手、淋雨、游泳，但不适合潜水、温泉、桑拿。",
            "score": 0.92,
            "title": "产品规格 - 防水性能",
            "metadata": {"category": "产品规格", "source": "product-manual"}
        },
        {
            "content": "手表续航时间：典型使用场景下 7-10 天，重度使用（连续心率监测+GPS 运动）3-5 天，省电模式可达 14 天。充电时间约 2 小时，使用磁吸充电线。",
            "score": 0.89,
            "title": "产品规格 - 续航时间",
            "metadata": {"category": "产品规格", "source": "product-manual"}
        },
        {
            "content": "配对步骤：1) 长按侧边按钮 3 秒开机 2) 手机下载官方 App 3) 打开 App 注册账号 4) 点击添加设备 5) 等待配对完成。",
            "score": 0.85,
            "title": "使用说明 - 配对指南",
            "metadata": {"category": "使用说明", "source": "user-manual"}
        }
    ]
}

# ==================== 数据模型 ====================

class RetrievalSetting(BaseModel):
    """检索参数"""
    top_k: int = Field(..., description="返回结果的最大数量", ge=1, le=100)
    score_threshold: float = Field(..., description="最低相似度分数（0-1）", ge=0.0, le=1.0)

class MetadataCondition(BaseModel):
    """元数据筛选条件"""
    name: str
    comparison_operator: str
    value: Optional[Any] = None

class RetrievalRequest(BaseModel):
    """检索请求"""
    knowledge_id: str = Field(..., description="外部系统中知识源的标识符")
    query: str = Field(..., description="用户的搜索查询")
    retrieval_setting: RetrievalSetting
    metadata_condition: Optional[Dict[str, Any]] = None

class RetrievalRecord(BaseModel):
    """检索结果记录"""
    content: str = Field(..., description="检索到的文本分段")
    score: float = Field(..., description="相似度分数（0-1）", ge=0.0, le=1.0)
    title: str = Field(..., description="源文档标题")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="任意键值对，不能为 null")

class RetrievalResponse(BaseModel):
    """检索响应"""
    records: List[RetrievalRecord]

class ErrorResponse(BaseModel):
    """错误响应"""
    error_code: int
    error_msg: str

# ==================== 认证 ====================

async def verify_api_key(authorization: Optional[str] = Header(None)):
    """
    验证 API Key
    
    Dify 在每个请求中将 API Key 作为 Bearer 令牌发送：
    Authorization: Bearer {API_KEY}
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": 1001,
                "error_msg": "Missing Authorization header"
            }
        )
    
    # 解析 Bearer Token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": 1001,
                "error_msg": "Invalid Authorization header format. Expected: Bearer {API_KEY}"
            }
        )
    
    api_key = parts[1]
    if api_key != API_KEY:
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": 1002,
                "error_msg": "Authorization failed. Please check your API key."
            }
        )
    
    return api_key

# ==================== 检索逻辑 ====================

def simple_keyword_search(query: str, documents: List[Dict], top_k: int, score_threshold: float) -> List[Dict]:
    """
    简单的关键词检索实现
    
    实际应用中应替换为真实的检索逻辑，如：
    - 向量检索（使用 OpenAI Embedding、Cohere 等）
    - 全文检索（使用 Elasticsearch、Meilisearch 等）
    - 混合检索
    """
    results = []
    query_lower = query.lower()
    
    for doc in documents:
        content = doc["content"].lower()
        
        # 简单的关键词匹配评分
        # 实际应用中应使用向量相似度或其他检索算法
        score = 0.0
        
        # 完全匹配加分
        if query_lower in content:
            score = 0.9
        else:
            # 部分关键词匹配
            query_words = query_lower.split()
            matched_words = sum(1 for word in query_words if word in content)
            if matched_words > 0:
                score = min(0.8, matched_words / len(query_words) * 0.8)
        
        # 应用分数阈值
        if score >= score_threshold:
            results.append({
                "content": doc["content"],
                "score": score,
                "title": doc["title"],
                "metadata": doc["metadata"]
            })
    
    # 按分数排序，返回 top_k
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]

def retrieve_from_knowledge_base(
    knowledge_id: str,
    query: str,
    top_k: int,
    score_threshold: float
) -> List[Dict]:
    """
    从知识库检索
    
    实际应用中应连接真实的知识库系统，如：
    - 自建向量数据库（Milvus、Pinecone、Weaviate 等）
    - 第三方知识服务（AWS Bedrock、Azure Cognitive Search 等）
    - 全文检索引擎（Elasticsearch、Meilisearch 等）
    """
    # 检查知识库是否存在
    if knowledge_id not in MOCK_KNOWLEDGE_BASE:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": 2001,
                "error_msg": f"Knowledge base '{knowledge_id}' not found"
            }
        )
    
    documents = MOCK_KNOWLEDGE_BASE[knowledge_id]
    
    # 执行检索（这里使用简单的关键词检索，实际应使用向量检索等）
    results = simple_keyword_search(query, documents, top_k, score_threshold)
    
    return results

# ==================== API 端点 ====================

@app.post("/retrieval", response_model=RetrievalResponse)
async def retrieval(
    request: RetrievalRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    检索端点
    
    Dify 在你配置的端点 URL 后追加 /retrieval。
    例如：如果注册的地址为 https://your-service.com，
    Dify 将请求发送至 https://your-service.com/retrieval
    """
    try:
        # 执行检索
        results = retrieve_from_knowledge_base(
            knowledge_id=request.knowledge_id,
            query=request.query,
            top_k=request.retrieval_setting.top_k,
            score_threshold=request.retrieval_setting.score_threshold
        )
        
        # 构造响应
        records = [
            RetrievalRecord(
                content=r["content"],
                score=r["score"],
                title=r["title"],
                metadata=r["metadata"]
            )
            for r in results
        ]
        
        return RetrievalResponse(records=records)
    
    except HTTPException:
        raise
    except Exception as e:
        # 捕获未预期的错误
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": 9999,
                "error_msg": f"Internal server error: {str(e)}"
            }
        )

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok", "message": "External Knowledge API is running"}

@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "Dify External Knowledge API",
        "version": "1.0.0",
        "endpoints": {
            "retrieval": "POST /retrieval",
            "health": "GET /health"
        }
    }

# ==================== 启动 ====================

if __name__ == "__main__":
    # 开发环境启动
    uvicorn.run(
        "external_knowledge_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
