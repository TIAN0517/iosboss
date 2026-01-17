"""
Prompt 加载器
启动时一次性加载所有提示词，之后不再读取文件
"""
from pathlib import Path

# prompts 目录路径
BASE = Path(__file__).resolve().parent.parent / "prompts"


def load_prompt(name: str) -> str:
    """
    从 prompts/ 目录加载提示词文件

    Args:
        name: 文件名（不含路径）

    Returns:
        提示词内容（字符串）
    """
    prompt_file = BASE / name
    try:
        return prompt_file.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise FileNotFoundError(f"提示词文件不存在: {prompt_file}")


# 启动时加载所有提示词
PROMPTS = {
    "core": load_prompt("prompt_core.prompt.txt"),
    "customer": load_prompt("role_customer.prompt.txt"),
    "owner": load_prompt("role_owner.prompt.txt"),
    "tech": load_prompt("role_tech.prompt.txt"),
    "asr_fix": load_prompt("asr_fix.prompt.txt"),
    "dihuang": load_prompt("group_dihuang.prompt.txt"),  # 帝皇瓦斯行群組
}


def get_system_prompt(role: str = "auto", include_asr: bool = True) -> str:
    """
    获取完整的系统提示词

    Args:
        role: 角色 ('auto', 'customer', 'owner', 'tech')
        include_asr: 是否包含 ASR 修正提示

    Returns:
        完整的系统提示词
    """
    parts = [PROMPTS["core"]]

    # 角色自动判断
    if role == "auto":
        parts.append("\n\n【角色自动判断】")
        parts.append("根据问题内容自动选择：客服/老板娘/技术 角色。")
    elif role == "customer":
        parts.append("\n\n")
        parts.append(PROMPTS["customer"])
    elif role == "owner":
        parts.append("\n\n")
        parts.append(PROMPTS["owner"])
    elif role == "tech":
        parts.append("\n\n")
        parts.append(PROMPTS["tech"])

    # ASR 修正（如果需要）
    if include_asr:
        parts.append("\n\n")
        parts.append(PROMPTS["asr_fix"])

    return "".join(parts)


# 预设提示词（最常用）
DEFAULT_PROMPT = get_system_prompt(role="auto", include_asr=True)


if __name__ == "__main__":
    print("📝 Prompt 加载器测试")
    print("=" * 60)
    print("\n默认提示词（前 300 字）：")
    print(DEFAULT_PROMPT[:300] + "...")
    print("\n" + "=" * 60)
    print("\n✅ 所有提示词加载成功：")
    for key in PROMPTS:
        print(f"   - {key}: {len(PROMPTS[key])} 字符")
