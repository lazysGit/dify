#!/usr/bin/env python3
"""
测试 Dify 外部知识库 Server

使用方法：
1. 先启动 server：uvicorn external_knowledge_server:app --port 8000
2. 运行测试：python test_external_knowledge.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_KEY = "your-secret-api-key"

def test_health():
    """测试健康检查"""
    print("=" * 60)
    print("测试 1: 健康检查")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    print()

def test_retrieval(knowledge_id: str, query: str, top_k: int = 3):
    """测试检索"""
    print("=" * 60)
    print(f"测试检索: knowledge_id={knowledge_id}, query={query}")
    print("=" * 60)
    
    payload = {
        "knowledge_id": knowledge_id,
        "query": query,
        "retrieval_setting": {
            "top_k": top_k,
            "score_threshold": 0.3
        }
    }
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{BASE_URL}/retrieval",
        headers=headers,
        json=payload
    )
    
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"找到 {len(data['records'])} 条结果:")
        for i, record in enumerate(data['records'], 1):
            print(f"\n  [{i}] 分数: {record['score']:.3f}")
            print(f"      标题: {record['title']}")
            print(f"      内容: {record['content'][:100]}...")
    else:
        print(f"错误: {response.text}")
    
    print()

def test_invalid_api_key():
    """测试无效 API Key"""
    print("=" * 60)
    print("测试: 无效 API Key")
    print("=" * 60)
    
    payload = {
        "knowledge_id": "demo-knowledge",
        "query": "test",
        "retrieval_setting": {"top_k": 3, "score_threshold": 0.5}
    }
    
    headers = {
        "Authorization": "Bearer wrong-key",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{BASE_URL}/retrieval",
        headers=headers,
        json=payload
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.text}")
    print()

def test_nonexistent_knowledge():
    """测试不存在的知识库"""
    print("=" * 60)
    print("测试: 不存在的知识库")
    print("=" * 60)
    
    payload = {
        "knowledge_id": "nonexistent",
        "query": "test",
        "retrieval_setting": {"top_k": 3, "score_threshold": 0.5}
    }
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{BASE_URL}/retrieval",
        headers=headers,
        json=payload
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.text}")
    print()

def main():
    print("\n🧪 Dify 外部知识库 Server 测试\n")
    
    try:
        # 测试健康检查
        test_health()
        
        # 测试正常检索
        test_retrieval("demo-knowledge", "Dify 是什么", top_k=3)
        test_retrieval("demo-knowledge", "RAG 技术", top_k=2)
        test_retrieval("product-manual", "手表防水吗", top_k=2)
        
        # 测试错误情况
        test_invalid_api_key()
        test_nonexistent_knowledge()
        
        print("✅ 所有测试完成！")
        
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器，请确保 server 已启动：")
        print("   uvicorn external_knowledge_server:app --port 8000")

if __name__ == "__main__":
    main()
