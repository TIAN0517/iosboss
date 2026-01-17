"""
LINE Bot AI Service - FastAPI 入口
九九瓦斯行 LINE Bot + GLM-4.7 MAX AI 助理
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from config import config
from line_webhook import router as webhook_router

# 配置日志
os.makedirs(os.path.dirname(config.LOG_FILE) if os.path.dirname(config.LOG_FILE) else ".", exist_ok=True)
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(config.LOG_FILE, encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("=" * 60)
    logger.info(f"🚀 {config.APP_NAME} v{config.APP_VERSION} 启动中...")
    logger.info("=" * 60)

    # 验证配置
    if not config.validate():
        logger.error("❌ 配置验证失败，请检查环境变量")
        raise RuntimeError("配置验证失败")

    # 创建临时目录
    os.makedirs(config.TMP_AUDIO_DIR, exist_ok=True)
    logger.info(f"📁 临时音频目录: {config.TMP_AUDIO_DIR}")

    # 初始化 AI 客户端（预热）
    try:
        from ai_glm47 import get_glm_client
        ai_client = get_glm_client()
        logger.info(f"🤖 AI 客户端已初始化 (GLM-{config.GLM_MODEL})")
    except Exception as e:
        logger.warning(f"⚠️  AI 客户端初始化失败: {e}")

    logger.info("=" * 60)
    logger.info("✅ 服务启动完成")
    logger.info(f"   监听地址: http://{config.HOST}:{config.PORT}")
    logger.info(f"   LINE Webhook: /api/webhook/line")
    logger.info("=" * 60)

    yield

    # 关闭时
    logger.info("🛑 服务正在关闭...")


# 创建 FastAPI 应用
app = FastAPI(
    title=config.APP_NAME,
    version=config.APP_VERSION,
    description="九九瓦斯行 LINE Bot + GLM-4.7 MAX AI 助理",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(webhook_router)

# 挂载静态文件（用于音频文件）
audio_dir = config.TMP_AUDIO_DIR
os.makedirs(audio_dir, exist_ok=True)
app.mount("/audio", StaticFiles(directory=audio_dir), name="audio")


# ==================== 根路径 ====================
@app.get("/")
async def root():
    """根路径"""
    return {
        "service": config.APP_NAME,
        "version": config.APP_VERSION,
        "status": "running",
        "endpoints": {
            "health": "/api/health",
            "webhook": "/api/webhook/line",
            "docs": "/api/docs"
        }
    }


# ==================== 健康检查 ====================
@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "ok",
        "service": config.APP_NAME,
        "version": config.APP_VERSION,
        "ai_provider": "GLM-4.7",
        "voice_input": config.ENABLE_VOICE_INPUT,
        "voice_output": config.ENABLE_VOICE_OUTPUT
    }


# ==================== 配置信息 ====================
@app.get("/api/config")
async def get_config():
    """获取当前配置（脱敏）"""
    from ai_glm47 import get_glm_client

    ai_client = get_glm_client()

    return {
        "app": {
            "name": config.APP_NAME,
            "version": config.APP_VERSION,
            "debug": config.DEBUG
        },
        "line": {
            "configured": bool(config.LINE_CHANNEL_ACCESS_TOKEN),
            "webhook": "/api/webhook/line"
        },
        "ai": {
            "provider": "GLM-4.7",
            "model": config.GLM_MODEL,
            "fallback_model": config.GLM_FALLBACK_MODEL,
            "api_keys_count": len(config.GLM_API_KEYS),
            "timeout": config.GLM_TIMEOUT,
            "max_retries": config.GLM_MAX_RETRIES
        },
        "voice": {
            "asr_provider": config.ASR_PROVIDER,
            "tts_provider": config.TTS_PROVIDER,
            "input_enabled": config.ENABLE_VOICE_INPUT,
            "output_enabled": config.ENABLE_VOICE_OUTPUT
        },
        "session": {
            "ttl": config.SESSION_TTL,
            "max_history": config.MAX_HISTORY_LENGTH
        }
    }


# ==================== 全局异常处理 ====================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理"""
    logger.error(f"❌ 未捕获的异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if config.DEBUG else "服务器内部错误"
        }
    )


# ==================== 测试端点 ====================
@app.post("/api/test/chat")
async def test_chat(request: Request):
    """测试 AI 聊天功能"""
    try:
        body = await request.json()
        message = body.get("message", "")
        history = body.get("history", [])

        if not message:
            return JSONResponse(
                status_code=400,
                content={"error": "缺少 message 参数"}
            )

        from ai_glm47 import ask_glm
        from prompts import DEFAULT_SYSTEM_PROMPT

        response = ask_glm(message, history=history, system_prompt=DEFAULT_SYSTEM_PROMPT)

        return {
            "message": message,
            "response": response,
            "provider": "GLM-4.7"
        }

    except Exception as e:
        logger.error(f"❌ 测试聊天失败: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


# ==================== 主函数 ====================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG,
        log_level=config.LOG_LEVEL.lower(),
        access_log=True
    )
