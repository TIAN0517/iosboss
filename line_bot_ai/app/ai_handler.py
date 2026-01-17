"""
多 AI 提供者處理器
支援：Kimi (Moonshot) + GLM + Ollama
自動故障轉移
"""
import os
import requests

# ==================== Kimi (Moonshot) 配置 ====================
KIMI_API_URL = os.getenv(
    "KIMI_API_URL",
    "https://api.moonshot.cn/v1/chat/completions"
)
KIMI_API_KEY = os.getenv("KIMI_API_KEY", "sk-kimi-xiWAXckoC7h2MqbHFKdWEKjSNcOpEEzgytYTCUa9DgJLCJugYNbBeKMr72hss1eM")
KIMI_MODEL = os.getenv("KIMI_MODEL", "kimi-k2-thinking-turbo")

# ==================== GLM 配置 ====================
GLM_API_URL = os.getenv(
    "GLM_API_URL",
    "https://open.bigmodel.cn/api/paas/v4/chat/completions"
)
GLM_MODEL = os.getenv("GLM_MODEL", "glm-4.7")
GLM_TIMEOUT = int(os.getenv("GLM_TIMEOUT", "10"))

# GLM API Keys
def get_glm_keys() -> list[str]:
    """獲取所有 GLM API Keys"""
    keys = os.getenv("GLM_API_KEYS") or os.getenv("GLM_KEYS", "")
    key_list = [k.strip() for k in keys.split(",") if k.strip()]
    return key_list

# ==================== Ollama 配置 ====================
OLLAMA_API_URL = os.getenv(
    "OLLAMA_API_URL",
    "http://localhost:11434/api/chat"  # 本地 Ollama
)
# 使用 qwen2.5:14b - 已測試可回應中文
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:14b")


# ==================== AI 提供者 ====================

def ask_kimi(user_text: str, system_prompt: str, history: list[dict] | None = None) -> str:
    """使用 Kimi (Moonshot) API"""
    history = history or []

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_text})

    headers = {
        "Authorization": f"Bearer {KIMI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": KIMI_MODEL,
        "messages": messages,
        "temperature": 0.7,
    }

    response = requests.post(
        KIMI_API_URL,
        headers=headers,
        json=payload,
        timeout=15
    )
    response.raise_for_status()

    data = response.json()
    return data["choices"][0]["message"]["content"]


def ask_ollama(user_text: str, system_prompt: str, history: list[dict] | None = None) -> str:
    """使用 Ollama 本地模型"""
    history = history or []

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_text})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "num_predict": 80,  # 限制生成字數，加快回應（約 60-80 中文字）
        }
    }

    response = requests.post(
        OLLAMA_API_URL,
        json=payload,
        timeout=30
    )

    if response.status_code == 404:
        raise RuntimeError("Ollama 未運行，請先啟動 Ollama 服務")

    response.raise_for_status()
    data = response.json()
    return data["message"]["content"]


# ==================== 主要接口 ====================

def ask_glm_internal(user_text: str, system_prompt: str, history: list[dict] | None = None) -> str:
    """使用 GLM API（快速失敗，只試前 2 個 key）- 內部函數"""
    history = history or []

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_text})

    keys = get_glm_keys()

    # 只試前 2 個 key，加快回應速度
    max_attempts = min(2, len(keys))

    for idx in range(max_attempts):
        key = keys[idx]
        try:
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": GLM_MODEL,
                "messages": messages,
                "temperature": 0.7,
            }

            # 降低超時時間到 2 秒，快速失敗
            response = requests.post(
                GLM_API_URL,
                headers=headers,
                json=payload,
                timeout=2
            )
            response.raise_for_status()

            data = response.json()
            return data["choices"][0]["message"]["content"]

        except (requests.exceptions.Timeout, requests.exceptions.HTTPError) as e:
            # 401/429/Timeout → 快速試下一個 key
            if isinstance(e, requests.exceptions.HTTPError):
                if e.response.status_code in [401, 429]:
                    if idx < max_attempts - 1:
                        continue
            # Timeout 繼續試下一個
            if idx < max_attempts - 1:
                continue
            raise RuntimeError(f"GLM API 錯誤: {e}")

        except Exception as e:
            if idx < max_attempts - 1:
                continue
            raise RuntimeError(f"GLM 請求失敗: {e}")

    raise RuntimeError("GLM API 不可用")


def ask_glm(
    user_text: str,
    system_prompt: str,
    history: list[dict] | None = None,
) -> str:
    """
    AI 請求（只使用 Ollama）

    快速、穩定、只回應中文
    """
    history = history or []

    # 強調只能回應中文
    chinese_only_prompt = system_prompt + "\n\n重要：請務必使用繁體中文回應，不要使用任何英文或其他語言。"

    # 只使用 Ollama（本地 GPU，最快最穩定）
    try:
        print("[AI] 使用 Ollama 本地模型...")
        return ask_ollama(user_text, chinese_only_prompt, history)
    except Exception as e:
        print(f"[錯誤] Ollama 連線失敗: {e}")
        raise RuntimeError(f"AI 服務不可用: {e}")


# 全局客戶端實例（保持向下兼容）
_client = None


def get_client():
    """獲取全局客戶（向下兼容）"""
    global _client
    if _client is None:
        _client = True
    return _client


if __name__ == "__main__":
    print("🧪 測試多 AI 服務...")
    try:
        from app.prompt_loader import PROMPTS

        result = ask_glm("你好", PROMPTS["core"] + "\n\n" + PROMPTS["dihuang"])
        print(f"✅ 連接成功！\n回覆：{result}")
    except Exception as e:
        print(f"❌ 連接失敗：{e}")
