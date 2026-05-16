from assistant_director_api.config import Settings, normalize_database_url


def test_normalize_postgresql_scheme() -> None:
    assert (
        normalize_database_url("postgresql://u:p@h/db")
        == "postgresql+psycopg://u:p@h/db"
    )


def test_normalize_postgres_scheme() -> None:
    assert normalize_database_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"


def test_normalize_leaves_psycopg_scheme() -> None:
    url = "postgresql+psycopg://u:p@h/db"
    assert normalize_database_url(url) == url


def test_settings_normalizes_database_url_from_env(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@h/db")
    settings = Settings()
    assert settings.database_url == "postgresql+psycopg://u:p@h/db"
