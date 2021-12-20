def test_api_get_entity(client):
    resp = client.get("/api/entities/Q5")
    assert resp.status_code == 200

    record = resp.json
    assert record["id"] == "Q5"
    assert record["label"]["en"] == "human"

    resp = client.get("/api/entities/Q1928381920192")
    assert resp.status_code == 404


def test_api_get_semantic_model(client):
    resp = client.get("/api/semanticmodel?limit=1000&offset=0&table=1")
    assert resp.status_code == 200
    sms = resp.json["items"]

    assert len(sms) == 2
    assert len(sms[0]["data"]["nodes"]) == 10
    assert sms[0]["data"]["nodes"][0]["label"] == "human (Q5)"
