# server.py - 最终稳定版 (简化数据库操作，增强稳定性)

import asyncio
import websockets
import json
import sqlite3
import datetime
import traceback # 用于打印详细的错误信息

# 存储结构：{ "用户名": websocket, ... }
USERS = {}

# --- 数据库操作函数 (简化以提高稳定性) ---
# 注意: 如果不需要历史消息，可以完全删除这部分，但我们保留骨架
DB_FILE = 'chat_history.db'

def init_db():
    """初始化 SQLite 数据库和消息表"""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY,
                sender TEXT NOT NULL,
                receiver TEXT,
                message_text TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"!!! 数据库初始化失败: {e}")

def save_message(sender, receiver, text):
    """保存公聊消息到数据库"""
    if receiver is not None:
        return
    try:
        # **注意：此处修复了之前代码中可能的拼写错误 (sqlite3)**
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        timestamp = datetime.datetime.now().isoformat()
        
        cursor.execute(
            "INSERT INTO messages (sender, receiver, message_text, timestamp) VALUES (?, ?, ?, ?)",
            (sender, receiver, text, timestamp)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"!!! 警告: 消息保存到数据库失败: {e}")

def get_recent_messages(limit=20):
    """获取最近的公聊历史消息"""
    # 保持返回空列表，确保连接稳定
    return [] 
    
init_db()
# ---------------------------------

async def notify_users_count():
    """向所有客户端发送当前在线用户数量和在线用户列表"""
    online_names = list(USERS.keys())
    message = json.dumps({"type": "count", "data": len(USERS), "users": online_names}) 
    
    if USERS:
        # 使用 try-except 包裹发送，避免单个客户端失败导致整个广播崩溃
        send_tasks = [client.send(message) for client in USERS.values()]
        await asyncio.gather(*send_tasks, return_exceptions=True)

async def chat_handler(websocket, path):
    """处理单个 WebSocket 连接及其消息"""
    username = None 

    try:
        # 1. 注册阶段
        registration_message = await websocket.recv()
        data = json.loads(registration_message)
        
        if data.get("type") != "register" or not data.get("user"):
            await websocket.send(json.dumps({"type": "error", "message": "Missing registration info."}))
            return

        username = data["user"]
        
        if username in USERS:
             await websocket.send(json.dumps({"type": "error", "message": f"Username '{username}' already taken. Please refresh and choose another."}))
             return

        # 注册用户
        USERS[username] = websocket
        print(f"用户 {username} 连接. 当前用户数: {len(USERS)}")
        
        # 发送用户数通知
        await notify_users_count()
        
        # 发送空历史记录，确保客户端不会因缺少 "history" 消息而等待
        history_message = json.dumps({"type": "history", "messages": get_recent_messages()}) 
        await websocket.send(history_message)
        
        # 2. 循环处理后续消息
        async for message in websocket:
            # 消息处理逻辑 (保持不变)
            try:
                data = json.loads(message)
                current_time = datetime.datetime.now().isoformat()
            except json.JSONDecodeError:
                print(f"!!! 警告: 接收到非 JSON 格式消息: {message}")
                continue
            
            # --- 消息路由逻辑 ---
            
            if data.get("type") == "public_chat":
                text = data.get("message", "")
                save_message(username, None, text)
                
                broadcast_message = json.dumps({"type": "chat", "user": username, "message": text, "time": current_time})
                send_tasks = [client.send(broadcast_message) for client in USERS.values()]
                await asyncio.gather(*send_tasks, return_exceptions=True)
            
            # ... 其他消息类型处理 (private_transfer, file_transfer, typing_status) ...
            
            # 由于篇幅限制，此处省略了与之前版本相同但逻辑正确的私聊、文件、输入状态代码
            
            elif data.get("type") == "private_transfer":
                target_user = data["to_user"]
                text = data.get("message", "")
                if target_user in USERS and target_user != username:
                    private_message = json.dumps({"type": "private", "user": username, "to_user": target_user, "message": text, "time": current_time})
                    await USERS[target_user].send(private_message)
                    await websocket.send(private_message)
                else:
                    await websocket.send(json.dumps({"type": "info", "message": f"System: User {target_user} is not online."}))

            elif data.get("type") == "file_transfer":
                filename = data.get("filename", "未知文件")
                file_message = json.dumps({"type": "file", "user": username, "filename": filename, "file_data": data.get("file_data"), "time": current_time})
                send_tasks = [client.send(file_message) for client in USERS.values()]
                await asyncio.gather(*send_tasks, return_exceptions=True)

            elif data.get("type") == "typing_status":
                status_message = json.dumps({"type": "typing_notification", "user": username, "is_typing": data.get("is_typing", False)})
                for client in USERS.values():
                    if client != websocket:
                        try:
                            await client.send(status_message)
                        except websockets.ConnectionClosed:
                            pass # 忽略已关闭的连接

    except websockets.ConnectionClosed:
        pass
    except Exception as e:
        print(f"!!! 致命错误: 用户 {username} 的连接处理中发生异常: {e}")
        traceback.print_exc() # 打印详细的堆栈信息
    finally:
        # 3. 用户断开连接
        if username and username in USERS:
            del USERS[username]
            print(f"用户 {username} 断开连接. 当前用户数: {len(USERS)}")
            await notify_users_count()

# 启动 WebSocket 服务器
start_server = websockets.serve(chat_handler, "localhost", 8775)

print("WebSocket 服务器已启动，监听 ws://localhost:8765")

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
