# 九九瓦斯行 LINE Bot AI

企业级 LINE Bot + GLM-4.7 MAX，专为瓦斯行业设计。

## 架构

```
line_bot_ai/
├── app/
│   ├── main.py              # FastAPI 入口（含群组静默规则）
│   ├── ai_handler.py        # GLM-4.7 调用
│   ├── asr_handler.py       # 语音转文字
│   └── prompt_loader.py     # 提示词加载
├── prompts/                 # 提示词文件（启动时加载）
│   ├── prompt_core.prompt.txt
│   ├── role_customer.prompt.txt
│   ├── role_owner.prompt.txt
│   ├── role_tech.prompt.txt
│   └── asr_fix.prompt.txt
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── install.ps1              # Windows 一键部署
└── install.sh               # Linux 一键部署
```

## 一键部署

### Windows（PowerShell 管理员）
```powershell
.\install.ps1
```

### Linux / VPS
```bash
chmod +x install.sh
./install.sh
```

## 配置

复制 `.env.example` 为 `.env` 并填入：

```ini
# 必需配置
GLM_KEY=你的_GLM4.7_API_KEY
LINE_CHANNEL_ACCESS_TOKEN=你的_LINE_TOKEN
LINE_CHANNEL_SECRET=你的_LINE_SECRET

# 可选配置
ASR_PROVIDER=whisper
WHISPER_MODEL=base
```

## 群组静默规则

| 场景 | 是否回复 |
|------|----------|
| 私聊 | ✅ 一定回 |
| 群组聊天 | ❌ 不回 |
| 群组 + "瓦斯助手" | ✅ 才回 |

**示例：**
- 私聊「瓦斯漏气怎么办？」→ 回复
- 群组「瓦斯漏气怎么办？」→ 不回
- 群组「瓦斯助手，瓦斯漏气怎么办？」→ 回复

## API 端点

| 端点 | 说明 |
|------|------|
| `GET /` | 服务信息 |
| `GET /api/health` | 健康检查 |
| `POST /api/webhook/line` | LINE Webhook |
| `POST /api/test/chat` | 测试聊天 |

## 升级策略（不断线）

```bash
git pull
docker compose build
docker compose up -d
```

- URL 不变
- Port 不变
- LINE 无需重新验证

## AI 角色系统

- **客服模式**：客户询问，亲切白话
- **老板娘模式**：内部决策，风险判断
- **技术模式**：法规流程，技术准确

## License

MIT
