from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import requests
import json

# 初始化 FastAPI 应用
app = FastAPI()

# Ollama 配置（固定对接本地 11434 端口）
OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5:14b"  # 你已有的 Ollama 模型

# 转换 OpenAI 请求为 Ollama 请求格式
def convert_openai_to_ollama(request_data: dict):
    ollama_data = {
        "model": request_data.get("model", DEFAULT_MODEL),
        "messages": request_data.get("messages", []),
        "stream": request_data.get("stream", False),
        "temperature": request_data.get("temperature", 0.7),
        "max_tokens": request_data.get("max_tokens", 2048)
    }
    return ollama_data

# 转换 Ollama 响应为 OpenAI 响应格式
def convert_ollama_to_openai(ollama_response: dict, model: str):
    if "error" in ollama_response:
        return {
            "error": {
                "message": ollama_response["error"],
                "type": "ollama_error"
            }
        }
    
    openai_response = {
        "id": f"chatcmpl-{ollama_response.get('id', 'local-123')}",
        "object": "chat.completion",
        "created": int(ollama_response.get("created", 0)),
        "model": model,
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": ollama_response.get("message", {}).get("content", "")
                },
                "finish_reason": ollama_response.get("done_reason", "stop"),
                "index": 0
            }
        ],
        "usage": {
            "prompt_tokens": ollama_response.get("prompt_eval_count", 0),
            "completion_tokens": ollama_response.get("eval_count", 0),
            "total_tokens": ollama_response.get("prompt_eval_count", 0) + ollama_response.get("eval_count", 0)
        }
    }
    return openai_response

# 实现 OpenAI 兼容的 /v1/chat/completions 接口（Cursor 核心调用接口）
@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    try:
        # 1. 接收 Cursor 的 OpenAI 格式请求
        request_data = await request.json()
        model = request_data.get("model", DEFAULT_MODEL)
        
        # 2. 转换为 Ollama 格式请求
        ollama_data = convert_openai_to_ollama(request_data)
        
        # 3. 发送请求到 Ollama 原生接口
        ollama_response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=ollama_data,
            headers={"Content-Type": "application/json"}
        )
        ollama_response.raise_for_status()
        ollama_data = ollama_response.json()
        
        # 4. 转换为 OpenAI 格式响应
        openai_data = convert_ollama_to_openai(ollama_data, model)
        
        # 5. 返回给 Cursor
        return JSONResponse(content=openai_data)
    
    except Exception as e:
        return JSONResponse(
            content={"error": {"message": str(e), "type": "proxy_error"}},
            status_code=500
        )

# 实现 OpenAI 兼容的 /v1/models 接口（Cursor 加载模型列表用）
@app.get("/v1/models")
async def list_models():
    try:
        # 从 Ollama 获取模型列表
        ollama_response = requests.get(f"{OLLAMA_BASE_URL}/api/tags")
        ollama_response.raise_for_status()
        ollama_models = ollama_response.json().get("models", [])
        
        # 转换为 OpenAI 格式
        openai_models = {
            "object": "list",
            "data": [
                {
                    "id": model["name"],
                    "object": "model",
                    "created": 0,
                    "owned_by": "ollama-local"
                } for model in ollama_models
            ]
        }
        return JSONResponse(content=openai_models)
    
    except Exception as e:
        return JSONResponse(
            content={"error": {"message": str(e), "type": "proxy_error"}},
            status_code=500
        )

# 启动命令（直接运行该脚本即可）
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,  # 代理端口，避开 8000 占用
        log_level="info"
    )