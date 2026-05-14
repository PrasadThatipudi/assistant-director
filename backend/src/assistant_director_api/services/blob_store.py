import hashlib
from pathlib import Path

from assistant_director_api.config import Settings


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save_blob(settings: Settings, data: bytes) -> tuple[str, str]:
    digest = sha256_hex(data)
    storage_key = f"{digest[0:2]}/{digest[2:4]}/{digest}"
    target = settings.blob_storage_path / storage_key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return storage_key, digest


def read_blob(settings: Settings, storage_key: str) -> bytes:
    path = settings.blob_storage_path / storage_key
    if not path.is_file():
        raise FileNotFoundError(storage_key)
    return path.read_bytes()


def blob_path(settings: Settings, storage_key: str) -> Path:
    return settings.blob_storage_path / storage_key
