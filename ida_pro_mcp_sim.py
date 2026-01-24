#!/usr/bin/env python3
"""
IDA Pro MCP 模擬服務器
用於測試 Trae 連接和功能
"""

import asyncio
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import time

class MCPHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/mcp':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                request = json.loads(post_data.decode('utf-8'))
                response = self.handle_mcp_request(request)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response_json = json.dumps(response)
                self.wfile.write(response_json.encode('utf-8'))
            except Exception as e:
                self.send_error(500, f"MCP Error: {str(e)}")
        else:
            self.send_error(404)
    
    def handle_mcp_request(self, request):
        """模擬MCP請求處理"""
        method = request.get('method', '')
        params = request.get('params', {})
        
        # 模擬一些基本的IDA Pro MCP功能
        if method == 'initialize':
            return {
                "jsonrpc": "2.0",
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "IDA Pro MCP Server",
                        "version": "2.0.0"
                    }
                }
            }
        
        elif method == 'tools/list':
            # 模擬工具列表
            return {
                "jsonrpc": "2.0",
                "result": {
                    "tools": [
                        {
                            "name": "list_funcs",
                            "description": "列出所有函數"
                        },
                        {
                            "name": "decompile", 
                            "description": "反編譯函數"
                        },
                        {
                            "name": "disasm",
                            "description": "反彙編函數"
                        },
                        {
                            "name": "xrefs_to",
                            "description": "查看交叉引用"
                        },
                        {
                            "name": "strings",
                            "description": "列出字符串"
                        }
                    ]
                }
            }
        
        elif method == 'tools/call':
            tool_name = params.get('name', '')
            arguments = params.get('arguments', {})
            
            # 模擬各種工具調用
            if tool_name == 'list_funcs':
                return {
                    "jsonrpc": "2.0",
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": "找到以下函數:\n0x401000 main\n0x401020 init\n0x401040 cleanup"
                            }
                        ]
                    }
                }
            
            elif tool_name == 'decompile':
                address = arguments.get('address', '0x401000')
                return {
                    "jsonrpc": "2.0",
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": f"反編譯函數 {address}:\nint main() {{\n  printf(\"Hello, World!\\n\");\n  return 0;\n}}"
                            }
                        ]
                    }
                }
            
            elif tool_name == 'strings':
                return {
                    "jsonrpc": "2.0",
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": "找到以下字符串:\n\"Hello, World!\"\n\"Error: %s\"\n\"Password: %s\""
                            }
                        ]
                    }
                }
            
            else:
                return {
                    "jsonrpc": "2.0",
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": f"工具 {tool_name} 調用成功（模擬模式）"
                            }
                        ]
                    }
                }
        
        else:
            return {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32601,
                    "message": f"Method {method} not found"
                }
            }

def start_mcp_server():
    """啟動MCP服務器"""
    server = HTTPServer(('127.0.0.1', 13337), MCPHandler)
    print("🚀 IDA Pro MCP 模擬服務器啟動中...")
    print("📍 地址: http://127.0.0.1:13337/mcp")
    print("🎯 端口: 13337")
    print("✅ 服務器就緒，等待 Trae 連接...")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 服務器已停止")
        server.shutdown()

if __name__ == '__main__':
    start_mcp_server()
