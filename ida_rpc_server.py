#!/usr/bin/env python3
"""
IDA Pro 模擬RPC服務器
為IDA Pro MCP提供基本的RPC接口
"""

import http.server
import socketserver
import json
import threading
import time

class IDARPCHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "IDA Pro RPC Server", "version": "1.0"}).encode())
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/jsonrpc':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request = json.loads(post_data.decode('utf-8'))
            
            # 模擬IDA Pro RPC響應
            response = {
                "jsonrpc": "2.0",
                "result": {"success": True, "message": "IDA Pro RPC模擬響應"},
                "id": request.get('id')
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404)

def start_ida_rpc_server():
    """啟動IDA RPC服務器"""
    with socketserver.TCPServer(("127.0.0.1", 13337), IDARPCHandler) as httpd:
        print("🚀 IDA Pro RPC模擬服務器啟動")
        print("📍 地址: http://127.0.0.1:13337")
        httpd.serve_forever()

if __name__ == "__main__":
    start_ida_rpc_server()
