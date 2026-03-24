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
import time
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
    try:
        for conn in psutil.net_connections():
            if conn.laddr and conn.laddr.port == port and conn.status == 'LISTEN':
                if conn.pid and conn.pid not in pids:
                    pids.append(conn.pid)
    except (psutil.AccessDenied, PermissionError):
        pass
    return pids


def find_related_python_processes(main_pids: list[int]) -> set[int]:
    """
    查找与主进程相关的所有 Python 进程（包括子进程和 multiprocessing spawn 的进程）

    Args:
        main_pids: 主进程 PID 列表

    Returns:
        所有相关进程的 PID 集合
    """
    all_pids = set(main_pids)

    for pid in main_pids:
        try:
            process = psutil.Process(pid)
            # 获取所有子进程
            for child in process.children(recursive=True):
                all_pids.add(child.pid)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    # 查找所有可能是 uvicorn worker 的 Python 进程
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline') or []
            cmdline_str = ' '.join(cmdline).lower()
            # 检查是否是 uvicorn 或相关的 Python 进程
            if any(keyword in cmdline_str for keyword in ['uvicorn', 'app.main', 'multiprocessing.spawn']):
                all_pids.add(proc.info['pid'])
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    return all_pids


def kill_process_forcefully(pid: int) -> bool:
    """
    强制杀死进程（兼容 Windows 和 Unix）

    Args:
        pid: 进程 ID

    Returns:
        是否成功杀死
    """
    try:
        process = psutil.Process(pid)
        name = process.name()

        # 先尝试优雅终止
        try:
            process.terminate()
            # 等待最多 2 秒
            process.wait(timeout=2)
            print(f"   ✅ Terminated: PID {pid} ({name})")
            return True
        except psutil.TimeoutExpired:
            pass

        # 如果超时，强制杀死
        process.kill()
        process.wait(timeout=1)
        print(f"   🔫 Force killed: PID {pid} ({name})")
        return True

    except psutil.NoSuchProcess:
        return True  # 已经不存在
    except psutil.AccessDenied:
        # Windows 上可能需要管理员权限
        print(f"   ⚠️  Access denied for PID {pid}, trying system command...")
        try:
            if sys.platform == 'win32':
                subprocess.run(['taskkill', '/F', '/PID', str(pid)],
                             capture_output=True, check=False)
            else:
                os.kill(pid, signal.SIGKILL)
            return True
        except Exception:
            return False
    except Exception as e:
        print(f"   ❌ Error killing PID {pid}: {str(e)}")
        return False


def cleanup_port(port: int, max_retries: int = 3) -> int:
    """
    清理占用指定端口的所有进程

    Args:
        port: 端口号
        max_retries: 最大重试次数

    Returns:
        被杀死的进程数量
    """
    print(f"🔍 Checking port {port}...")

    total_killed = 0

    for attempt in range(max_retries):
        pids = find_process_on_port(port)

        if not pids:
            if attempt == 0:
                print(f"   ✅ Port {port} is free!")
            else:
                print(f"   ✅ Port {port} is now free!")
            return total_killed

        if attempt > 0:
            print(f"   🔄 Retry {attempt + 1}/{max_retries}...")

        print(f"   ⚠️  Port {port} is occupied by {len(pids)} process(es): {pids}")

        # 找到所有相关进程
        all_pids = find_related_python_processes(pids)
        if all_pids != set(pids):
            print(f"   📋 Found {len(all_pids)} related process(es) to kill")

        # 杀死所有相关进程
        killed_this_round = 0
        for pid in all_pids:
            if kill_process_forcefully(pid):
                killed_this_round += 1
                total_killed += 1

        # 等待端口释放
        time.sleep(1)

    # 最终检查
    remaining = find_process_on_port(port)
    if remaining:
        print(f"   ❌ Port {port} is still occupied by: {remaining}")
        print(f"   💡 Try running with administrator privileges or manually kill the process")
    else:
        print(f"   ✅ Port {port} is now free!")

    return total_killed


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
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
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

    # 清理端口（带重试）
    killed = cleanup_port(port)

    if killed > 0:
        print(f"\n📊 Summary: Killed {killed} process(es) on port {port}\n")

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