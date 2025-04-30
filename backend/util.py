import asyncio
from asyncio import Lock
from contextlib import asynccontextmanager

from osxmetadata import OSXMetaData

def get_tags(path):
    md = OSXMetaData(path)
    return [t[0] for t in md.tags]

@asynccontextmanager
async def acquire_lock(lock: Lock):
    try:
        await lock.acquire()
        yield
    finally:
        lock.release()


def is_async():
    try:
        asyncio.get_running_loop()
        return True
    except RuntimeError:
        return False


def safe_fire_and_forget(lambda_like):
    async def safe_background_task():
        try:
            await lambda_like()
        except Exception as e:
            print(f"Error in background task: {e}")

    if is_async():
        print("safe_fire_and_forget -> create_task()")
        asyncio.create_task(safe_background_task())
    else:
        print("safe_fire_and_forget -> run()")
        asyncio.run(safe_background_task())
