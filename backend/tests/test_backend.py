"""Backend API tests for Gestão Financeira Familiar."""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL") or "https://duo-control.preview.emergentagent.com"
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "casal@financas.com"
ADMIN_PW = "familia123"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture
def h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
def test_login_ok():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=30)
    assert r.status_code == 200
    assert r.json()["user"]["email"] == ADMIN_EMAIL


def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
    assert r.status_code == 401


def test_me_requires_auth():
    r = requests.get(f"{API}/auth/me", timeout=30)
    assert r.status_code == 401


def test_me_with_bearer(h):
    r = requests.get(f"{API}/auth/me", headers=h, timeout=30)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_register_duplicate(h):
    r = requests.post(f"{API}/auth/register", json={"name": "X", "email": ADMIN_EMAIL, "password": "abcdef"}, timeout=30)
    assert r.status_code == 400


# ---------- Dashboard / Analytics / Budget / Alerts / Calendar ----------
def test_dashboard(h):
    r = requests.get(f"{API}/dashboard", headers=h, timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["saldo_atual","entradas_mes","saidas_mes","contas_pendentes","contas_vencidas",
              "saldo_projetado","valor_para_fechar","health","health_msg","total_a_receber"]:
        assert k in d
    assert d["health"] in ("positive","warning","critical")


def test_analytics(h):
    r = requests.get(f"{API}/analytics", headers=h, timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["entradas_saidas","saldo_evolucao","gastos_categoria","gastos_pessoa","entradas_pessoa","contas_status"]:
        assert k in d
    assert len(d["entradas_saidas"]) == 6


def test_budget(h):
    r = requests.get(f"{API}/budget", headers=h, timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_alerts(h):
    r = requests.get(f"{API}/alerts", headers=h, timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_calendar(h):
    r = requests.get(f"{API}/calendar", headers=h, timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Transactions CRUD ----------
def test_transactions_list_filters(h):
    r = requests.get(f"{API}/transactions", headers=h, params={"tipo": "saida"}, timeout=30)
    assert r.status_code == 200
    for t in r.json():
        assert t["tipo"] == "saida"


def test_transaction_crud_and_dashboard_reflect(h):
    # create pending saida
    payload = {
        "tipo": "saida", "descricao": "TEST_conta_luz", "categoria": "Energia",
        "valor": 123.45, "vencimento": "2026-01-15", "data": "2026-01-15",
        "responsavel": "eu", "status": "pendente",
    }
    r = requests.post(f"{API}/transactions", headers=h, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    tx = r.json()
    tid = tx["id"]
    assert tx["descricao"] == "TEST_conta_luz"

    # GET
    r = requests.get(f"{API}/transactions", headers=h, params={"search": "TEST_conta_luz"}, timeout=30)
    assert r.status_code == 200
    assert any(t["id"] == tid for t in r.json())

    # Update
    upd = dict(payload); upd["valor"] = 200
    r = requests.put(f"{API}/transactions/{tid}", headers=h, json=upd, timeout=30)
    assert r.status_code == 200
    assert r.json()["valor"] == 200

    # Mark paid
    r = requests.post(f"{API}/transactions/{tid}/pay", headers=h, timeout=30)
    assert r.status_code == 200
    assert r.json()["status"] == "pago"

    # Delete
    r = requests.delete(f"{API}/transactions/{tid}", headers=h, timeout=30)
    assert r.status_code == 200


def test_transaction_recurrence_creates_series(h):
    payload = {
        "tipo": "saida", "descricao": "TEST_recorrente", "categoria": "Assinaturas",
        "valor": 50, "vencimento": "2026-01-10", "data": "2026-01-10",
        "responsavel": "ambos", "status": "pendente",
        "recorrente": True, "frequencia": "mensal",
    }
    r = requests.post(f"{API}/transactions", headers=h, json=payload, timeout=30)
    assert r.status_code == 200
    r = requests.get(f"{API}/transactions", headers=h, params={"search": "TEST_recorrente"}, timeout=30)
    items = r.json()
    assert len(items) >= 6  # base + 5 recurrences
    # cleanup via series
    tid = items[0]["id"]
    r = requests.delete(f"{API}/transactions/{tid}", headers=h, params={"scope": "series"}, timeout=30)
    assert r.status_code == 200
    r = requests.get(f"{API}/transactions", headers=h, params={"search": "TEST_recorrente"}, timeout=30)
    assert len(r.json()) == 0


# ---------- Generic CRUD collections ----------
@pytest.mark.parametrize("name,payload", [
    ("categories", {"nome": "TEST_cat", "tipo": "saida", "limite_mensal": 100}),
    ("accounts", {"nome": "TEST_acc", "tipo": "conta", "saldo": 50}),
    ("tasks", {"titulo": "TEST_task", "status": "a_fazer"}),
    ("reminders", {"titulo": "TEST_rem", "frequencia": "uma_vez"}),
    ("notes", {"titulo": "TEST_note", "conteudo": "x"}),
    ("opportunities", {"nome": "TEST_opp", "potencial_ganho": 100}),
    ("goals", {"titulo": "TEST_goal", "valor_meta": 500}),
])
def test_generic_crud(h, name, payload):
    r = requests.post(f"{API}/{name}", headers=h, json=payload, timeout=30)
    assert r.status_code == 200, f"{name} create: {r.text}"
    item = r.json()
    assert "id" in item
    iid = item["id"]

    r = requests.get(f"{API}/{name}", headers=h, timeout=30)
    assert r.status_code == 200
    assert any(x["id"] == iid for x in r.json())

    r = requests.put(f"{API}/{name}/{iid}", headers=h, json=payload, timeout=30)
    assert r.status_code == 200

    r = requests.delete(f"{API}/{name}/{iid}", headers=h, timeout=30)
    assert r.status_code == 200


# ---------- Settings ----------
def test_settings_get_and_update(h):
    r = requests.get(f"{API}/settings", headers=h, timeout=30)
    assert r.status_code == 200
    s = r.json()
    payload = {
        "nome_usuario1": s.get("nome_usuario1", "Eu"),
        "nome_usuario2": s.get("nome_usuario2", "Minha Esposa"),
        "moeda": "BRL", "primeiro_dia_mes": 1,
        "contas": s.get("contas", []),
        "cartoes": s.get("cartoes", []),
        "formas_pagamento": s.get("formas_pagamento", []),
    }
    r = requests.put(f"{API}/settings", headers=h, json=payload, timeout=30)
    assert r.status_code == 200


# ---------- Pay affects dashboard ----------
def test_pay_updates_dashboard(h):
    from datetime import date
    today = date.today()
    venc = today.replace(day=min(today.day, 28)).isoformat()

    r0 = requests.get(f"{API}/dashboard", headers=h, timeout=30).json()

    payload = {"tipo": "saida", "descricao": "TEST_pay_dash", "categoria": "Outros",
               "valor": 77, "vencimento": venc, "data": venc,
               "responsavel": "eu", "status": "pendente"}
    tx = requests.post(f"{API}/transactions", headers=h, json=payload, timeout=30).json()
    tid = tx["id"]
    requests.post(f"{API}/transactions/{tid}/pay", headers=h, timeout=30)

    r1 = requests.get(f"{API}/dashboard", headers=h, timeout=30).json()
    assert r1["saidas_mes"] >= r0["saidas_mes"] + 76.9
    requests.delete(f"{API}/transactions/{tid}", headers=h, timeout=30)
