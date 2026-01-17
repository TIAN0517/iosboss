"""
GLM-4.7 MAX AI 客户端
使用 ZhipuAI SDK 或直接 API 调用
"""
import os
import time
import requests
from typing import Iterator, Optional
from config import config

# 导入 ZhipuAI SDK（如果可用）
try:
    from zhipuai import ZhipuAI
    ZHIPU_SDK_AVAILABLE = True
except ImportError:
    ZHIPU_SDK_AVAILABLE = False
    print("[WARNING] ZhipuAI SDK not installed, using direct API calls")


class GLMClient:
    """GLM-4.7 客户端类"""

    def __init__(self):
        self.api_keys = config.GLM_API_KEYS
        self.current_key_index = 0
        self.model = config.GLM_MODEL
        self.fallback_model = config.GLM_FALLBACK_MODEL
        self.timeout = config.GLM_TIMEOUT
        self.max_retries = config.GLM_MAX_RETRIES
        self.api_base = config.GLM_API_BASE

        # 使用 SDK 客户端（如果可用）
        self.sdk_client: Optional["ZhipuAI"] = None
        if ZHIPU_SDK_AVAILABLE and any(self.api_keys):
            self.sdk_client = ZhipuAI(api_key=self._get_current_key())

    def _get_current_key(self) -> str:
        """获取当前使用的 API Key"""
        if not self.api_keys:
            raise ValueError("没有可用的 GLM API Key")
        return self.api_keys[self.current_key_index]

    def _rotate_key(self):
        """轮换到下一个 API Key"""
        if len(self.api_keys) > 1:
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            if self.sdk_client:
                self.sdk_client = ZhipuAI(api_key=self._get_current_key())

    def _extract_api_key(self, api_key: str) -> str:
        """从 API Key 中提取 ID 和 Secret（格式：id.secret）"""
        if "." in api_key:
            return api_key
        # 兼容旧格式，假设整个字符串是密钥
        return api_key

    def chat(
        self,
        message: str,
        history: list[dict] | None = None,
        system_prompt: str | None = None,
        stream: bool = False,
    ) -> str | Iterator[str]:
        """
        发送聊天请求

        Args:
            message: 用户消息
            history: 历史对话记录
            system_prompt: 系统提示词
            stream: 是否使用流式响应

        Returns:
            AI 回复文本（或流式迭代器）
        """
        history = history or []

        # 构建消息列表
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.extend(history)
        messages.append({"role": "user", "content": message})

        # 尝试请求（支持重试和密钥轮换）
        for attempt in range(self.max_retries):
            try:
                if self.sdk_client and ZHIPU_SDK_AVAILABLE:
                    return self._chat_sdk(messages, stream)
                else:
                    return self._chat_direct(messages, stream)
            except Exception as e:
                error_msg = str(e).lower()
                # 认证错误，尝试切换密钥
                if "auth" in error_msg or "401" in error_msg:
                    self._rotate_key()
                    continue
                # 其他错误，尝试重试
                if attempt < self.max_retries - 1:
                    wait_time = min(2 ** attempt, 10)
                    time.sleep(wait_time)
                    continue
                raise

        raise Exception("AI 服务请求失败，已达到最大重试次数")

    def _chat_sdk(
        self, messages: list[dict], stream: bool
    ) -> str | Iterator[str]:
        """使用 ZhipuAI SDK 发送请求"""
        response = self.sdk_client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=stream,
        )

        if stream:
            return self._process_sdk_stream(response)
        return response.choices[0].message.content

    def _process_sdk_stream(self, response) -> Iterator[str]:
        """处理 SDK 流式响应"""
        for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _chat_direct(
        self, messages: list[dict], stream: bool
    ) -> str | Iterator[str]:
        """使用直接 HTTP 请求"""
        api_key = self._get_current_key()

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": stream,
        }

        response = requests.post(
            f"{self.api_base}chat/completions",
            headers=headers,
            json=payload,
            timeout=self.timeout,
            stream=stream,
        )
        response.raise_for_status()

        if stream:
            return self._process_direct_stream(response)
        return response.json()["choices"][0]["message"]["content"]

    def _process_direct_stream(self, response) -> Iterator[str]:
        """处理直接 HTTP 流式响应"""
        for line in response.iter_lines():
            if line:
                line = line.decode("utf-8")
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        import json
                        chunk = json.loads(data)
                        if "choices" in chunk and chunk["choices"]:
                            delta = chunk["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                    except json.JSONDecodeError:
                        continue


# 便捷函数
def ask_glm(
    prompt: str,
    history: list[dict] | None = None,
    system_prompt: str = "你是一个专业、冷静、务实导向的企业级助理。",
) -> str:
    """
    向 GLM-4.7 发送问题

    Args:
        prompt: 用户问题
        history: 对话历史
        system_prompt: 系统提示词

    Returns:
        AI 回复文本
    """
    client = GLMClient()
    result = client.chat(prompt, history=history, system_prompt=system_prompt)

    # 处理流式响应（如果是）
    if isinstance(result, str):
        return result

    # 如果是迭代器，收集所有内容
    return "".join(list(result))


# 全局客户端实例
_glm_client: Optional[GLMClient] = None


def get_glm_client() -> GLMClient:
    """获取全局 GLM 客户端实例"""
    global _glm_client
    if _glm_client is None:
        _glm_client = GLMClient()
    return _glm_client


if __name__ == "__main__":
    # 测试
    print("🧪 测试 GLM-4.7 连接...")
    try:
        response = ask_glm("你好，请自我介绍。")
        print(f"✅ 连接成功！\n回复：{response}")
    except Exception as e:
        print(f"❌ 连接失败：{e}")
