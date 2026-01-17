# Trae + IDA Pro MCP 完整配置指南

## ✅ 已完成配置

### 配置文件位置
`C:\Users\tian7\.trae\mcp_config.json`

### 当前配置内容
```json
{
  "mcpServers": {
    "ida-pro-mcp": {
      "command": "C:\\Users\\tian7\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
      "args": [
        "C:\\Users\\tian7\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages\\ida_pro_mcp\\server.py",
        "--ida-rpc",
        "http://127.0.0.1:13337"
      ]
    }
  }
}
```

### IDA Pro 插件位置
- 插件文件: `C:\Users\tian7\AppData\Roaming\Hex-Rays\IDA Pro\plugins\ida_mcp.py`
- 插件包: `C:\Users\tian7\AppData\Roaming\Hex-Rays\IDA Pro\plugins\ida_mcp\`

---

## 📋 使用步驟

### 1. 啟動 IDA Pro
1. 打開 IDA Pro
2. 加載一個二進製文件（.exe, .dll, .elf 等）
3. 等待 IDA 自動分析完成
4. **重要**: 插件會自動啟動 HTTP 服務器在 `http://127.0.0.1:13337/mcp`

### 2. 完全重啟 Trae
1. 完全關閉 Trae（包括後台進程）
2. 重新啟動 Trae
3. Trae 會自動加載 MCP 服務器

### 3. 在 Trae 中使用

現在你可以使用 AI 助手進行逆向工程分析！

---

## 🛠️ 可用的 MCP 工具

### 核心功能
| 工具 | 描述 | 示例 |
|------|------|------|
| `idb_meta` | 獲取 IDB 元數據 | "獲取當前數據庫信息" |
| `list_funcs` | 列出所有函數 | "列出所有函數" |
| `lookup_funcs` | 查找特定函數 | "查找地址 0x401000 的函數" |
| `decompile` | 反編譯函數 | "反編譯 main 函數" |
| `disasm` | 反彙編函數 | "反彙編 address 函數" |

### 分析功能
| 工具 | 描述 |
|------|------|
| `xrefs_to` | 查看交叉引用 |
| `callees` | 獲取函數調用的函數 |
| `callers` | 獲取調用該函數的函數 |
| `strings` | 列出字符串 |
| `imports` | 列出導入函數 |
| `exports` | 列出導出函數 |

### 修改功能
| 工具 | 描述 |
|------|------|
| `rename` | 批量重命名（函數、變量、參數） |
| `set_comments` | 添加注釋 |
| `patch_asm` | 修改匯編指令 |
| `apply_types` | 應用類型 |

### 內存操作
| 工具 | 描述 |
|------|------|
| `get_bytes` | 讀取原始字節 |
| `get_u8`, `get_u16`, `get_u32`, `get_u64` | 讀取整數 |
| `get_string` | 讀取字符串 |
| `read_struct` | 讀取結構體 |

### 搜索功能
| 工具 | 描述 |
|------|------|
| `find_bytes` | 搜索字節模式 |
| `find_insns` | 搜索指令序列 |
| `search` | 高級搜索 |

### Python 執行
| 工具 | 描述 |
|------|------|
| `py_eval` | 執行 Python 代碼 |

---

## 💬 使用示例提示詞

### 基礎分析
```
請分析這個二進製文件：
1. 列出所有函數
2. 找到 main 函數
3. 反編譯 main 函數並分析
```

### 深度分析
```
幫我逆向工程這個程序：
- 檢查反編譯代碼並添加注釋
- 重命名變量為更合適的名稱
- 如有必要，修改變量和參數類型
- 更改函數名稱使其更具描述性
- 如果需要更多細節，反彙編函數並添加注釋
- 永遠不要自己轉換數字基數，如需要請使用 int_convert MCP 工具！
- 最后創建一個 report.md 文件
```

### 字符串分析
```
列出所有字符串，並找到包含 "password" 的字符串
```

### 交叉引用分析
```
查找函數 0x401000 的所有交叉引用
```

### 函數調用關係
```
分析 main 函數調用了哪些函數？哪些函數調用了 main？
```

---

## 🔧 故障排除

### MCP 服務器無法連接
1. 確認 IDA Pro 已打開並加載了二進製文件
2. 確認 IDA Pro 中 HTTP 服務器正在運行（檢查端口 13337）
3. 完全重啟 Trae

### 插件未顯示
1. 確認 IDA Pro 已完全重啟
2. 檢查插件文件是否存在：`C:\Users\tian7\AppData\Roaming\Hex-Rays\IDA Pro\plugins\ida_mcp.py`
3. 在 IDA Pro 中：Edit → Plugins →IDA MCP

### Python 版本問題
確保使用 Python 3.11 或更高版本：
```bash
python --version
```

### 重新安裝
```bash
pip uninstall ida-pro-mcp
pip install https://github.com/mrexodia/ida-pro-mcp/archive/refs/heads/main.zip
ida-pro-mcp --install
```

---

## 📚 進階功能

### SSE 傳輸模式（可選）
如果需要使用 HTTP/SSE 模式：
```bash
uv run ida-pro-mcp --transport http://127.0.0.1:8744/sse
```

### Headless 模式（需要 idalib）
```bash
uv run idalib-mcp --host 127.0.0.1 --port 8745 path/to/executable
```

---

## 🎯 最佳實踐

1. **使用具體的提示詞**：明確告訴 AI 你想要做什麼
2. **讓 AI 使用 int_convert**：不要讓 LLM 自己做數字轉換
3. **分步分析**：先列出函數，然後逐個分析
4. **使用注釋**：讓 AI 添加注釋來記錄發現
5. **重命名**：讓 AI 重命名函數和變量以提高可讀性

---

## 📖 參考資料

- [IDA Pro MCP GitHub](https://github.com/mrexodia/ida-pro-mcp)
- [MCP 協議文檔](https://modelcontextprotocol.io/introduction)
- [Trae 官方文檔](https://trae.ai)

---

## ⚠️ 重要提示

- **IDA Free 不支持**：需要 IDA Pro 9.1 或更高版本
- **完全重啟**：安裝後必須完全重啟 IDA Pro 和 Trae
- **先加載二進製文件**：插件只在加載二進製文件後才會顯示菜單
- **端口占用**：確保端口 13337 沒有被其他程序占用

---

## 🚀 快速開始

1. 打開 IDA Pro → 加載一個 .exe 文件
2. 等待分析完成
3. 打開 Trae → 新建對話
4. 輸入：*"請列出這個程序的所有函數"*
5. 開始你的 AI 逆向工程之旅！

---

**配置完成時間**: 2026-01-17
**Python 版本**: 3.12.9
**ida-pro-mcp 版本**: 2.0.0
