def test_api_get_entity(client):
    resp = client.get("/api/entities/Q5")
    assert resp.status_code == 200

    record = resp.json
    assert record["id"] == "Q5"
    assert record["label"]["lang2value"]["en"] == "human"

    resp = client.get("/api/entities/Q1928381920192")
    assert resp.status_code == 404


def test_api_get_semantic_model(client, load_db):
    resp = client.get("/api/semanticmodel?limit=1000&offset=0&table=1")
    assert resp.status_code == 200
    sms = resp.json["items"]

    assert len(sms) == 1
    assert len(sms[0]["data"]["nodes"]) == 8
    assert sms[0]["data"]["nodes"][0]["label"] == "Name"


def test_api_create_table(client):
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
