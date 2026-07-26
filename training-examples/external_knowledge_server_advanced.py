"""
Dify 外部知识库 Server 端 - 生产级实现（使用向量检索）

使用 sentence-transformers 进行真实的向量检索。

安装依赖：
pip install fastapi uvicorn sentence-transformers numpy

启动服务：
uvicorn external_knowledge_server_advanced:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uvicorn
import os
import json
from pathlib import Path

app = FastAPI(
    title="Dify External Knowledge API (Advanced)",
    description="Dify 外部知识库 API 服务实现 - 使用向量检索",
    version="1.0.0"
)

# ==================== 配置 ====================
API_KEY = os.getenv("DIFY_EXTERNAL_KB_API_KEY", "your-secret-api-key")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")  # 轻量级模型

# ==================== 数据模型 ====================

class RetrievalSetting(BaseModel):
    top_k: int = Field(..., ge=1, le=100)
    score_threshold: float = Field(..., ge=0.0, le=1.0)

class RetrievalRequest(BaseModel):
    knowledge_id: str
    query: str
    retrieval_setting: RetrievalSetting
    metadata_condition: Optional[Dict[str, Any]] = None

class RetrievalRecord(BaseModel):
    content: str
    score: float = Field(..., ge=0.0, le=1.0)
    title: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RetrievalResponse(BaseModel):
    records: List[RetrievalRecord]

# ==================== 向量检索引擎 ====================

class VectorSearchEngine:
    """基于 sentence-transformers 的向量检索引擎"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.knowledge_bases: Dict[str, List[Dict]] = {}
        self.embeddings_cache: Dict[str, List] = {}
    
    def _load_model(self):
        """延迟加载模型"""
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                import numpy as np
                self.model = SentenceTransformer(model_name)
                self.np = np
                print(f"✅ 已加载嵌入模型: {model_name}")
            except ImportError:
                raise RuntimeError(
                    "请安装 sentence-transformers: pip install sentence-transformers"
                )
    
    def _compute_embeddings(self, texts: List[str]) -> List:
        """计算文本的向量表示"""
        self._load_model()
        return self.model.encode(texts, show_progress_bar=False)
    
    def _cosine_similarity(self, vec1, vec2) -> float:
        """计算余弦相似度"""
        dot_product = self.np.dot(vec1, vec2)
        norm1 = self.np.linalg.norm(vec1)
        norm2 = self.np.linalg.norm(vec2)
        return float(dot_product / (norm1 * norm2))
    
    def add_knowledge_base(self, knowledge_id: str, documents: List[Dict]):
        """
        添加知识库
        
        documents 格式：
        [
            {"content": "文本内容", "title": "标题", "metadata": {...}},
            ...
        ]
        """
        self.knowledge_bases[knowledge_id] = documents
        
        # 预计算向量
        texts = [doc["content"] for doc in documents]
        embeddings = self._compute_embeddings(texts)
        self.embeddings_cache[knowledge_id] = embeddings
        
        print(f"✅ 已加载知识库 '{knowledge_id}'，共 {len(documents)} 条文档")
    
    def search(
        self,
        knowledge_id: str,
        query: str,
        top_k: int,
        score_threshold: float
    ) -> List[Dict]:
        """执行向量检索"""
        if knowledge_id not in self.knowledge_bases:
            return []
        
        documents = self.knowledge_bases[knowledge_id]
        doc_embeddings = self.embeddings_cache[knowledge_id]
        
        # 计算查询向量
        query_embedding = self._compute_embeddings([query])[0]
        
        # 计算相似度
        results = []
        for i, doc in enumerate(documents):
            score = self._cosine_similarity(query_embedding, doc_embeddings[i])
            
            if score >= score_threshold:
                results.append({
                    "content": doc["content"],
                    "score": score,
                    "title": doc["title"],
                    "metadata": doc.get("metadata", {})
                })
        
        # 排序并返回 top_k
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

# 全局搜索引擎实例
search_engine = VectorSearchEngine(EMBEDDING_MODEL)

# ==================== 认证 ====================

async def verify_api_key(authorization: Optional[str] = Header(None)):
    """验证 API Key"""
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail={"error_code": 1001, "error_msg": "Missing Authorization header"}
        )
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail={"error_code": 1001, "error_msg": "Invalid Authorization format"}
        )
    
    if parts[1] != API_KEY:
        raise HTTPException(
            status_code=401,
            detail={"error_code": 1002, "error_msg": "Authorization failed"}
        )
    
    return parts[1]

# ==================== 初始化知识库 ====================

def init_demo_knowledge_bases():
    """初始化演示知识库"""
    
    # 知识库 1：Dify 平台文档
    dify_docs = [
        {
            "content": "Dify 是一个开源的 LLM 应用开发平台，提供 AI 工作流、RAG 管道、智能体能力和模型管理等功能。它支持数百种模型提供商，包括 OpenAI、Anthropic、通义千问等。",
            "title": "Dify 平台介绍",
            "metadata": {"category": "产品介绍", "source": "official"}
        },
        {
            "content": "RAG（检索增强生成）是当前大模型应用的核心技术。它的核心思想是：在生成回答之前，先从知识库中检索相关信息，然后将检索到的信息作为上下文提供给大模型，让模型基于真实信息生成回答。",
            "title": "RAG 技术原理",
            "metadata": {"category": "技术文档", "source": "tech-blog"}
        },
        {
            "content": "工作流（Workflow）是 Dify 的核心功能之一，允许用户通过可视化画布编排 AI 逻辑。工作流适合有明确输入输出的批处理任务，如信息提取、数据转换、内容生成等。",
            "title": "工作流使用指南",
            "metadata": {"category": "使用教程", "source": "user-guide"}
        },
        {
            "content": "知识库的分段策略直接影响检索效果。分段长度太短会导致信息不完整，太长会包含过多噪音。推荐的分段长度为 500-1000 字符，重叠长度为分段长度的 10%-20%。",
            "title": "知识库配置最佳实践",
            "metadata": {"category": "最佳实践", "source": "best-practices"}
        },
        {
            "content": "Dify 支持多种检索模式：语义检索（基于向量相似度）、关键词检索（基于 BM25 算法）、混合检索（语义 + 关键词）。混合检索通常效果最好，兼顾语义理解和精确匹配。",
            "title": "检索模式对比",
            "metadata": {"category": "技术文档", "source": "tech-docs"}
        },
        {
            "content": "conversation_id 是 Dify 中用于维护多轮对话上下文的会话标识符。第1轮对话不传 conversation_id，API 返回新的 ID；后续对话传入该 ID，保持上下文连贯。",
            "title": "会话管理说明",
            "metadata": {"category": "API 文档", "source": "api-docs"}
        }
    ]
    
    # 知识库 2：智能手表产品手册
    product_manual = [
        {
            "content": "智能手表支持 50 米防水（IP68 等级），可以洗手、淋雨、游泳，但不适合潜水、温泉、桑拿。防水性能可能会因日常磨损而降低。",
            "title": "产品规格 - 防水性能",
            "metadata": {"category": "产品规格", "source": "manual"}
        },
        {
            "content": "手表续航时间：典型使用场景下 7-10 天，重度使用（连续心率监测+GPS 运动）3-5 天，省电模式可达 14 天。充电时间约 2 小时，使用磁吸充电线。",
            "title": "产品规格 - 续航时间",
            "metadata": {"category": "产品规格", "source": "manual"}
        },
        {
            "content": "配对步骤：1) 长按侧边按钮 3 秒开机 2) 手机下载官方 App（支持 iOS 和 Android）3) 打开 App 注册账号 4) 点击添加设备 5) 手表和手机靠近，等待配对完成。",
            "title": "使用说明 - 配对指南",
            "metadata": {"category": "使用说明", "source": "manual"}
        },
        {
            "content": "支持 20+ 种运动模式：户外跑步、室内跑步、骑行、游泳、瑜伽、健身、舞蹈、篮球、足球、羽毛球等。每种运动模式记录：运动时长、消耗卡路里、平均心率、运动轨迹（部分运动）。",
            "title": "使用说明 - 运动模式",
            "metadata": {"category": "使用说明", "source": "manual"}
        },
        {
            "content": "表带更换方法：1) 翻转手表，找到表带快拆按钮 2) 按下按钮，向外拉动表带 3) 将新表带插入，听到咔哒声即安装完成。支持 20mm 标准表带，可选硅胶、皮质、金属材质。",
            "title": "使用说明 - 表带更换",
            "metadata": {"category": "使用说明", "source": "manual"}
        }
    ]
    
    # 加载知识库
    search_engine.add_knowledge_base("dify-docs", dify_docs)
    search_engine.add_knowledge_base("product-manual", product_manual)

# ==================== API 端点 ====================

@app.post("/retrieval", response_model=RetrievalResponse)
async def retrieval(
    request: RetrievalRequest,
    api_key: str = Depends(verify_api_key)
):
    """检索端点"""
    try:
        results = search_engine.search(
            knowledge_id=request.knowledge_id,
            query=request.query,
            top_k=request.retrieval_setting.top_k,
            score_threshold=request.retrieval_setting.score_threshold
        )
        
        if not results and request.knowledge_id not in search_engine.knowledge_bases:
            raise HTTPException(
                status_code=404,
                detail={
                    "error_code": 2001,
                    "error_msg": f"Knowledge base '{request.knowledge_id}' not found"
                }
            )
        
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
        raise HTTPException(
            status_code=500,
            detail={"error_code": 9999, "error_msg": f"Internal error: {str(e)}"}
        )

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "model": EMBEDDING_MODEL,
        "knowledge_bases": list(search_engine.knowledge_bases.keys())
    }

@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "Dify External Knowledge API (Advanced)",
        "version": "1.0.0",
        "model": EMBEDDING_MODEL,
        "knowledge_bases": list(search_engine.knowledge_bases.keys())
    }

# ==================== 启动 ====================

@app.on_event("startup")
async def startup_event():
    """服务启动时初始化知识库"""
    print("🚀 正在初始化外部知识库服务...")
    init_demo_knowledge_bases()
    print("✅ 服务启动完成")

if __name__ == "__main__":
    uvicorn.run(
        "external_knowledge_server_advanced:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
