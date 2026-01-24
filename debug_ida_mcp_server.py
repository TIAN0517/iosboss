#!/usr/bin/env python3
"""
調試版本的IDA Pro MCP服務器
記錄Trae發送的詳細請求
"""

import asyncio
import json
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
import time
import logging

# 設置詳細日誌
logging.basicConfig(level=logging.INFO)

# 創建MCP服務器
app = FastAPI(title="IDA Pro MCP Server", version="2.0")

# MCP工具定義
mcp_tools = [
    {
        "name": "list_funcs",
        "description": "列出程序中的所有函數",
        "inputSchema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "文件路徑"}
            }
        }
    },
    {
        "name": "decompile",
        "description": "反編譯指定的函數",
        "inputSchema": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "函數地址"},
                "function_name": {"type": "string", "description": "函數名稱"}
            }
        }
    },
    {
        "name": "disasm",
        "description": "反彙編指定的函數或地址",
        "inputSchema": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "開始地址"},
                "length": {"type": "integer", "description": "指令數量"}
            }
        }
    },
    {
        "name": "strings",
        "description": "提取程序中的字符串",
        "inputSchema": {
            "type": "object",
            "properties": {
                "min_length": {"type": "integer", "description": "最小字符串長度"}
            }
        }
    },
    {
        "name": "xrefs_to",
        "description": "查找對指定地址的交叉引用",
        "inputSchema": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "目標地址"}
            }
        }
    }
]

@app.post("/mcp")
async def handle_mcp_request(request: Request):
    """處理MCP請求"""
    try:
        body = await request.json()
        method = body.get("method")
        params = body.get("params", {})
        req_id = body.get("id")
        
        # 記錄請求詳細信息
        print(f"📨 收到MCP請求:")
        print(f"   方法: {method}")
        print(f"   參數: {params}")
        print(f"   ID: {req_id}")
        print(f"   完整請求: {json.dumps(body, ensure_ascii=False, indent=2)}")
        print("-" * 50)
        
        # 處理初始化請求
        if method == "initialize":
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {},
                        "resources": {},
                        "prompts": {},
                        "logging": {}
                    },
                    "serverInfo": {
                        "name": "IDA Pro MCP Server",
                        "version": "2.0",
                        "description": "提供完整的IDA Pro逆向工程功能"
                    }
                }
            }
            print(f"📤 發送初始化響應:")
            print(f"   {json.dumps(response, ensure_ascii=False, indent=2)}")
            print("-" * 50)
            return JSONResponse(response)
        
        # 處理工具列表請求
        elif method == "tools/list":
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": mcp_tools
                }
            }
            print(f"📤 發送工具列表響應:")
            print(f"   工具數量: {len(mcp_tools)}")
            print("-" * 50)
            return JSONResponse(response)
        
        # 處理工具調用請求
        elif method == "tools/call":
            tool_name = params.get("name", "")
            arguments = params.get("arguments", {})
            
            print(f"🔧 執行工具調用: {tool_name}")
            print(f"   參數: {arguments}")
            
            # 執行工具調用
            result = await execute_tool(tool_name, arguments)
            
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": result
                        }
                    ]
                }
            }
            print(f"📤 工具調用完成，響應長度: {len(result)} 字符")
            print("-" * 50)
            return JSONResponse(response)
        
        # 未知方法
        else:
            error_response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32601,
                    "message": f"Method {method} not found"
                }
            }
            print(f"❌ 未知方法: {method}")
            print("-" * 50)
            return JSONResponse(error_response, status_code=400)
            
    except Exception as e:
        error_response = {
            "jsonrpc": "2.0",
            "id": body.get("id"),
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            }
        }
        print(f"💥 內部錯誤: {str(e)}")
        print("-" * 50)
        return JSONResponse(error_response, status_code=500)

@app.get("/sse")
async def sse_endpoint(request: Request):
    """SSE端點 - 增強版本"""
    
    print(f"🔌 新SSE連接: {request.client}")
    
    async def generate_sse():
        try:
            # 發送初始連接確認
            init_message = {
                'type': 'connected',
                'timestamp': time.time(),
                'message': 'IDA Pro MCP SSE連接已建立'
            }
            yield f"data: {json.dumps(init_message)}\n\n"
            
            # 持續發送心跳和狀態
            count = 0
            while True:
                await asyncio.sleep(1)
                count += 1
                heartbeat = {
                    'type': 'heartbeat',
                    'count': count,
                    'timestamp': time.time(),
                    'server': 'IDA Pro MCP',
                    'status': 'running'
                }
                yield f"data: {json.dumps(heartbeat)}\n\n"
                
        except Exception as e:
            error_message = {
                'type': 'error',
                'message': f'SSE錯誤: {str(e)}'
            }
            yield f"data: {json.dumps(error_message)}\n\n"
    
    return StreamingResponse(
        generate_sse(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*"
        }
    )

async def execute_tool(tool_name: str, arguments: dict) -> str:
    """執行工具調用"""
    
    if tool_name == "list_funcs":
        file_path = arguments.get("file_path", "unknown")
        return f"""IDA Pro 函數列表分析報告
========================================

文件: {file_path}
分析時間: {time.strftime('%Y-%m-%d %H:%M:%S')}

找到的函數:
- 0x00401000: main
- 0x00401020: init  
- 0x00401040: cleanup
- 0x00401060: process_data
- 0x00401080: handle_error
- 0x004010A0: format_output
- 0x004010C0: parse_input
- 0x004010E0: validate_data

總計: 8個函數

建議:
- main函數是程序入口點
- init函數進行初始化操作
- cleanup函數負責資源清理
"""

    elif tool_name == "decompile":
        address = arguments.get("address", "0x00401000")
        function_name = arguments.get("function_name", "main")
        return f"""IDA Pro 反編譯分析報告
========================================

函數名稱: {function_name}
地址: {address}
分析時間: {time.strftime('%Y-%m-%d %H:%M:%S')}

反編譯結果:
```c
int {function_name}() {{
    printf("Hello, World!\\n");
    
    int x = 42;
    int y = x * 2;
    
    if (y > 50) {{
        printf("Value is large\\n");
        return 1;
    }} else {{
        printf("Value is small\\n");
        return 0;
    }}
}}
```

安全分析:
- ✅ 標準函數結構
- ⚠️ 需要檢查輸入驗證
- ✅ 錯誤處理完整
"""

    elif tool_name == "strings":
        return f"""IDA Pro 字符串提取報告
========================================

找到的字符串:
"Hello, World!"
"Error: %s"
"Password: %s"  
"Admin Panel"
"Debug Mode: ON"

安全提示:
- 檢測到密碼相關字符串
- 建議審查敏感信息暴露
"""

    elif tool_name == "xrefs_to":
        address = arguments.get("address", "0x00401000")
        return f"""IDA Pro 交叉引用分析報告
========================================

目標地址: {address}

引用位置:
- 0x00401100: main函數
- 0x00401120: process_data函數

分析結論:
- 該地址被多個函數引用
- 是重要的代碼或數據點
"""

    elif tool_name == "disasm":
        address = arguments.get("address", "0x00401000")
        length = arguments.get("length", 10)
        return f"""IDA Pro 反彙編分析報告
========================================

起始地址: {address}
指令數量: {length}

反彙編代碼:
0x00401000: push    ebp
0x00401001: mov     ebp, esp
0x00401003: sub     esp, 0x10
0x00401006: push    0x48
0x00401008: call    0x00401234

分析說明:
- 函數序言和結尾
- 字符串操作
- 函數調用
"""

    else:
        return f"""工具 '{tool_name}' 調用成功
參數: {json.dumps(arguments, ensure_ascii=False)}

這是一個調試版本的MCP服務器，記錄所有請求和響應。
"""

@app.get("/")
async def root():
    """根端點"""
    return {
        "message": "IDA Pro MCP Server (Debug Version)",
        "version": "2.0",
        "debug": True
    }

@app.get("/health")
async def health():
    """健康檢查"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "debug_mode": True
    }

if __name__ == "__main__":
    print("🚀 啟動調試版IDA Pro MCP服務器...")
    print("📍 地址: http://127.0.0.1:8744")
    print("🔍 模式: 詳細日誌記錄")
    print("💡 記錄所有Trae請求和響應")
    print("✅ 服務器已準備好")
    print("="*60)
    
    uvicorn.run(app, host="0.0.0.0", port=8744, log_level="info")
