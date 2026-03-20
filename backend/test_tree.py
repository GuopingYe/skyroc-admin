import asyncio
from app.database import async_session_factory
from app.api.routers.pipeline import _build_tree

async def test():
    async with async_session_factory() as db:
        try:
            tree = await _build_tree(db)
            print("SUCCESS. Found", len(tree), "TAs.")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
