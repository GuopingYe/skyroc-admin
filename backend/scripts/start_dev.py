"""
Development Server Startup Script

强健的开发服务器启动脚本

核心功能:
1. 读取 .env 中的 API_PORT 配置
2. 自动检测并清理占用端口的僵尸进程
3. 启动 FastAPI 开发服务器

使用方法:
    python scripts/start_dev.py
    python scripts/start_dev.py --port 8081
    python scripts/start_dev.py --kill-only  # 仅清理端口，不启动
"""
import argparse
import os
import signal
import socket
import subprocess
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 尝试导入 psutil，如果没有则安装
try:
    import psutil
except ImportError:
    print("⚠️  psutil not found, installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
    import psutil


def find_process_on_port(port: int) -> list[int]:
    """
    查找占用指定端口的进程 PID 列表

    Args:
        port: 端口号

    Returns:
        占用该端口的进程 PID 列表
    """
    pids = []
    for conn in psutil.net_connections():
        if conn.laddr.port == port and conn.status == 'LISTEN':
            if conn.pid and conn.pid not in pids:
                pids.append(conn.pid)
    return pids


def kill_process_tree(pid: int) -> bool:
    """
    强制杀死进程及其子进程树

    Args:
        pid: 进程 ID

    Returns:
        是否成功杀死
    """
    try:
        process = psutil.Process(pid)

        # 先杀死所有子进程
        for child in process.children(recursive=True):
            try:
                child.kill()
                print(f"   🔫 Killed child process: PID {child.pid} ({child.name()})")
            except psutil.NoSuchProcess:
                pass

        # 再杀死主进程
        process.kill()
        print(f"   🔫 Killed main process: PID {pid} ({process.name()})")
        return True

    except psutil.NoSuchProcess:
        return False
    except psutil.AccessDenied:
        print(f"   ❌ Access denied when trying to kill PID {pid}")
        return False
    except Exception as e:
        print(f"   ❌ Error killing PID {pid}: {str(e)}")
        return False


def cleanup_port(port: int) -> int:
    """
    清理占用指定端口的所有进程

    Args:
        port: 端口号

    Returns:
        被杀死的进程数量
    """
    print(f"🔍 Checking port {port}...")

    pids = find_process_on_port(port)

    if not pids:
        print(f"   ✅ Port {port} is free!")
        return 0

    print(f"   ⚠️  Port {port} is occupied by {len(pids)} process(es): {pids}")

    killed_count = 0
    for pid in pids:
        if kill_process_tree(pid):
            killed_count += 1

    # 等待端口释放
    import time
    time.sleep(0.5)

    # 再次检查
    remaining = find_process_on_port(port)
    if remaining:
        print(f"   ⚠️  Still occupied by: {remaining}")
    else:
        print(f"   ✅ Port {port} is now free!")

    return killed_count


def is_port_available(port: int) -> bool:
    """
    检查端口是否可用

    Args:
        port: 端口号

    Returns:
        端口是否可用
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('0.0.0.0', port))
            return True
    except OSError:
        return False


def find_available_port(start_port: int, max_attempts: int = 10) -> int:
    """
    从指定端口开始，找到第一个可用的端口

    Args:
        start_port: 起始端口号
        max_attempts: 最大尝试次数

    Returns:
        可用的端口号
    """
    for port in range(start_port, start_port + max_attempts):
        if is_port_available(port):
            return port
    return start_port  # 如果都不可用，返回原始端口


def start_server(host: str, port: int, reload: bool = True, auto_port: bool = True) -> None:
    """
    启动 FastAPI 开发服务器

    Args:
        host: 监听地址
        port: 端口号
        reload: 是否启用热重载
        auto_port: 是否自动寻找可用端口
    """
    import uvicorn

    # 如果端口被占用且启用了自动端口选择，则寻找可用端口
    actual_port = port
    if auto_port and not is_port_available(port):
        print(f"\n⚠️  Port {port} is occupied, searching for available port...")
        actual_port = find_available_port(port + 1)
        if actual_port != port:
            print(f"✅ Found available port: {actual_port}")
        else:
            print(f"❌ No available port found in range {port}-{port + 10}")

    print(f"\n{'='*60}")
    print(f"🚀 Starting Clinical MDR Backend Development Server")
    print(f"{'='*60}")
    print(f"   Host: {host}")
    print(f"   Port: {actual_port}")
    print(f"   Reload: {reload}")
    print(f"   Docs: http://localhost:{actual_port}/docs")
    print(f"{'='*60}\n")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=actual_port,
        reload=reload,
        log_level="info",
    )


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="Clinical MDR Backend Development Server Starter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/start_dev.py              # Start on port from .env (default 8080)
    python scripts/start_dev.py --port 8081  # Start on port 8081
    python scripts/start_dev.py --kill-only  # Only kill processes, don't start
        """,
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Port to use (default: from .env API_PORT or 8080)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default=None,
        help="Host to bind (default: from .env API_HOST or 0.0.0.0)",
    )
    parser.add_argument(
        "--kill-only",
        action="store_true",
        help="Only kill processes on the port, don't start the server",
    )
    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable auto-reload",
    )

    args = parser.parse_args()

    # 加载配置
    from app.core.config import settings

    host = args.host or settings.API_HOST
    port = args.port or settings.API_PORT

    print(f"\n{'='*60}")
    print(f"🔧 Environment Configuration")
    print(f"{'='*60}")
    print(f"   API_HOST: {host}")
    print(f"   API_PORT: {port}")
    print(f"   ENVIRONMENT: {settings.ENVIRONMENT}")
    print(f"{'='*60}\n")

    # 清理端口
    killed = cleanup_port(port)

    if killed > 0:
        print(f"\n📊 Summary: Killed {killed} zombie process(es) on port {port}\n")

    if args.kill_only:
        print("✅ Kill-only mode: Port cleaned, exiting.")
        return

    # 再次确认端口可用
    if not is_port_available(port):
        print(f"\n❌ Port {port} is still occupied after cleanup!")
        print("   Please check manually or try a different port with --port")
        sys.exit(1)

    # 启动服务器
    start_server(host, port, reload=not args.no_reload)


if __name__ == "__main__":
    main()