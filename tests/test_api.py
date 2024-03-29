def test_api_get_entity(client):
    resp = client.get("/api/entities/Q30")
    assert resp.status_code == 200

    record = resp.json
    assert record["id"] == "Q30"
    assert record["label"]["lang2value"]["en"] == "United States of America"

    resp = client.get("/api/entities/Q1928381920192")
    assert resp.status_code == 404


def test_api_get_semantic_model(client, example_db):
    resp = client.get("/api/semanticmodel?limit=1000&offset=0&table=1")
    assert resp.status_code == 200
    sms = resp.json["items"]

    assert len(sms) == 1
    assert len(sms[0]["data"]["nodes"]) == 8
    assert sms[0]["data"]["nodes"][0]["label"] == "Name"


def test_api_search_entities(client):
    resp = client.get("/api/search/entities?q=united states")
    assert resp.status_code == 200
    search_results = resp.json["items"]

    assert len(search_results) == 10
    assert any(s["id"] == "Q30" for s in search_results[:5])
    assert any(s["label"] == "United States of America" for s in search_results[:5])

    resp = client.get("/api/search/entities?q=")
    search_results = resp.json["items"]
    assert len(search_results) == 0


def test_api_search_classes(client):
    resp = client.get("/api/search/classes?q=human")
    assert resp.status_code == 200
    search_results = resp.json["items"]

    assert len(search_results) == 10
    assert search_results[0]["id"] == "Q5"
    assert search_results[0]["label"] == "human"

    resp = client.get("/api/search/classes?q=")
    search_results = resp.json["items"]
    assert len(search_results) == 0


def test_api_search_properties(client):
    resp = client.get("/api/search/props?q=location")
    assert resp.status_code == 200
    search_results = resp.json["items"]

    assert len(search_results) == 10
    assert search_results[0]["id"] == "P276"
    assert search_results[0]["label"] == "location"

    resp = client.get("/api/search/props?q=")
    search_results = resp.json["items"]
    assert len(search_results) == 0


def test_api_create_table(client, example_db):
    resp = client.post(
        "/api/table",
        json={
            "name": "11th_Lok_Sabha",
            "description": "",
            "columns": [
                "No.",
                "Constituency",
                "Type",
                "Name of Elected M.P.",
                "Party Affiliation",
            ],
            "project": 1,
            "size": 28,
            "context_page": {
                "url": "https://en.wikipedia.org/wiki/11th_Lok_Sabha",
                "title": "11th Lok Sabha",
                "entity": "Q3534024",
            },
            "context_values": [{"type": "entityid", "value": "Q3534024"}],
            "context_tree": [],
        },
    )

    assert resp.status_code == 200
