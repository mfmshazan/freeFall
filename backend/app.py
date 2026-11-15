"""Server entry point: the frozen prediction app from main.py plus the /api/briefing router.

Run with `uvicorn app:app`. main.py is hash-frozen by the validation audit, so extra routers are
registered here instead of editing it.
"""
from briefing import router as briefing_router
from main import app

# main.py may mount the built frontend at "/", which swallows routes added after it,
# so move the briefing routes ahead of any mount.
_count = len(app.router.routes)
app.include_router(briefing_router)
app.router.routes[:] = app.router.routes[_count:] + app.router.routes[:_count]
