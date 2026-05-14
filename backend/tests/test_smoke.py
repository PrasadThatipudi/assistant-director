from assistant_director_api.main import app


def test_app_has_title() -> None:
    assert app.title == "Assistant Director API"
