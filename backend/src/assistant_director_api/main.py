from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from assistant_director_api.config import get_settings
from assistant_director_api.routers import projects, scenes, sync, users

app = FastAPI(title="Assistant Director API", version="0.2.0")

_settings = get_settings()

_origins = [o.strip() for o in _settings.cors_allow_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/v1")
app.include_router(projects.router, prefix="/v1")
app.include_router(scenes.router, prefix="/v1")
app.include_router(sync.router, prefix="/v1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
