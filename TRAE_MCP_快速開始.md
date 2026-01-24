# Trae + IDA Pro MCP - 完整配置完成

## ✅ 配置完成状态

| 项目 | 状态 | 路径 |
|------|------|------|
| **Trae 配置** | ✅ 已配置 | `C:\Users\tian7\.trae\mcp_config.json` |
| **IDA Pro 插件** | ✅ 已安装 | `C:\Users\tian7\AppData\Roaming\Hex-Rays\IDA Pro\plugins\ida_mcp.py` |
| **IDA Free 支持** | ✅ 已启用 | `--allow-ida-free` |
| **Python 版本** | ✅ 3.12.9 | 符合要求 |

---

## 🚀 快速开始 (3 步)

### 步骤 1: 启动 IDA Pro
```
1. 打开 IDA Pro (或 IDA Free)
2. File → Open → 选择一个 .exe 文件
3. 等待自动分析完成 (显示 "auto analysis OK")
```

### 步骤 2: 验证 MCP 运行
```bash
netstat -ano | findstr :13337
```
如果有输出，说明 IDA Pro MCP 插件正在运行。

### 步骤 3: 启动 Trae
```
1. 完全关闭 Trae (包括后台进程)
2. 重新启动 Trae
3. 开始使用 AI 逆向工程!
```

---

## 💬 在 Trae 中使用

### 示例 1: 列出所有函数
```
请列出这个程序的所有函数
```

### 示例 2: 分析函数
```
请分析 main 函数：
- 反编译并添加注释
- 重命名变量为更有意义的名称
- 如果有可疑行为，请指出
```

### 示例 3: 完整逆向分析
```
帮我逆向分析这个程序：
1. 列出所有函数
2. 找到 main 函数
3. 反编译 main 函数
4. 查看字符串交叉引用
5. 分析程序的主要功能
6. 创建分析报告
```

---

## 🛠️ 可用的 MCP 工具

| 工具 | 说明 |
|------|------|
| `list_funcs` | 列出所有函数 |
| `decompile` | 反编译函数 |
| `disasm` | 反汇编函数 |
| `xrefs_to` | 查看交叉引用 |
| `strings` | 列出字符串 |
| `rename` | 重命名函数/变量 |
| `set_comments` | 添加注释 |
| `patch_asm` | 修改汇编代码 |
| `py_eval` | 执行 Python 代码 |

---

## 📋 Trae 配置文件

**位置**: `C:\Users\tian7\.trae\mcp_config.json`

```json
{
  "mcpServers": {
    "ida-pro-mcp": {
      "type": "http",
      "url": "http://127.0.0.1:13337/mcp"
    }
  }
}
```

---

## 🔧 故障排除

### 问题 1: Trae 无法连接 MCP
**原因**: IDA Pro 没有运行或没有加载二进制文件

**解决**:
1. 确认 IDA Pro 正在运行
2. 确认已加载一个二进制文件
3. 运行: `netstat -ano | findstr :13337`
4. 完全重启 Trae

### 问题 2: 找不到 IDA Pro
**解决**: 下载安装 IDA Free (免费)
- 官网: https://hex-rays.com/ida-free/

### 问题 3: 插件未显示
**解决**:
1. 完全重启 IDA Pro
2. 检查: Edit → Plugins → IDA MCP
3. 重新安装: `ida-pro-mcp --install --allow-ida-free`

---

## 📝 启动脚本

运行快速启动助手:
```
start-ida-trae.bat
```

这个脚本会:
- 检查端口 13337 状态
- 验证 Trae 配置
- 检查 IDA Pro 插件
- 显示启动步骤

---

## 🎯 最佳实践

1. **使用具体的提示词**: 明确告诉 AI 你想做什么
2. **分步分析**: 先列出函数，再逐个分析
3. **添加注释**: 让 AI 添加注释记录发现
4. **重命名**: 让 AI 重命名函数和变量提高可读性
5. **不要自己转换数字**: 使用 AI 的 int_convert 工具

---

## 📚 参考资源

- [IDA Pro MCP GitHub](https://github.com/mrexodia/ida-pro-mcp)
- [IDA Free 下载](https://hex-rays.com/ida-free/)
- [Trae 官网](https://trae.ai)

---

**配置时间**: 2026-01-18
**状态**: ✅ 配置完成，等待 IDA Pro 启动
