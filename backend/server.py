from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Annotated, Any

import io
import uuid
import requests
import jwt
import bcrypt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends, UploadFile, File, Header, Query
from fastapi.responses import JSONResponse, Response, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict

# ----------------------------------------------------------------------------
# DB
# ----------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("financas")

app = FastAPI(title="Gestão Financeira Familiar")
api = APIRouter(prefix="/api")

# ----------------------------------------------------------------------------
# Helpers - Mongo / Pydantic
# ----------------------------------------------------------------------------
PyObjectId = Annotated[str, BeforeValidator(str)]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def money(v) -> float:
    try:
        return round(float(v or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


# ----------------------------------------------------------------------------
# Auth utils
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": now_utc() + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        user = serialize(user)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str
    phone: str
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    phone: str
    password: str


class TransactionIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tipo: str  # entrada | saida
    data: Optional[str] = None
    vencimento: Optional[str] = None
    responsavel: str = "ambos"  # eu | esposa | ambos | outro
    descricao: str
    categoria: Optional[str] = "Outros"
    valor: float
    forma_pagamento: Optional[str] = None
    conta: Optional[str] = None
    recorrente: bool = False
    frequencia: Optional[str] = "unica"
    status: str = "pendente"
    data_pagamento: Optional[str] = None
    data_prevista: Optional[str] = None
    observacoes: Optional[str] = None


class CategoryIn(BaseModel):
    nome: str
    tipo: str = "saida"  # entrada | saida
    limite_mensal: float = 0
    cor: Optional[str] = None


class AccountIn(BaseModel):
    nome: str
    tipo: str = "conta"  # conta | cartao | dinheiro
    saldo: float = 0


class TaskIn(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    data: Optional[str] = None
    horario: Optional[str] = None
    responsavel: str = "ambos"
    prioridade: str = "media"
    categoria: Optional[str] = None
    status: str = "a_fazer"
    observacoes: Optional[str] = None


class ReminderIn(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    data: Optional[str] = None
    hora: Optional[str] = None
    tipo: Optional[str] = "personalizado"
    frequencia: str = "uma_vez"


class NoteIn(BaseModel):
    titulo: str
    conteudo: Optional[str] = ""
    fixada: bool = False


class OpportunityIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    potencial_ganho: float = 0
    tempo_necessario: Optional[str] = None
    custo_inicial: float = 0
    prazo: Optional[str] = None
    responsavel: str = "ambos"
    status: str = "ideia"
    observacoes: Optional[str] = None


class GoalIn(BaseModel):
    titulo: str
    valor_meta: float = 0
    valor_atual: float = 0
    prazo: Optional[str] = None
    status: str = "ativa"


class SettingsIn(BaseModel):
    nome_usuario1: str = "Eu"
    nome_usuario2: str = "Minha Esposa"
    moeda: str = "BRL"
    primeiro_dia_mes: int = 1
    contas: List[str] = []
    cartoes: List[str] = []
    formas_pagamento: List[str] = []


# ----------------------------------------------------------------------------
# Date helpers
# ----------------------------------------------------------------------------
def today_str() -> str:
    return date.today().isoformat()


def parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except ValueError:
        return None


def add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    import calendar
    day = min(d.day, calendar.monthrange(y, m)[1])
    return date(y, m, day)


def next_date(d: date, freq: str) -> date:
    if freq == "semanal":
        return d + timedelta(days=7)
    if freq == "quinzenal":
        return d + timedelta(days=15)
    if freq == "mensal":
        return add_months(d, 1)
    if freq == "anual":
        return add_months(d, 12)
    return d


def person_query(person: Optional[str]) -> dict:
    if not person or person == "todos":
        return {}
    if person == "eu":
        return {"responsavel": {"$in": ["eu", "ambos"]}}
    if person == "esposa":
        return {"responsavel": {"$in": ["esposa", "ambos"]}}
    return {"responsavel": person}


def in_month(field_val: Optional[str], year: int, month: int) -> bool:
    d = parse_date(field_val)
    return bool(d and d.year == year and d.month == month)


def display_status(t: dict) -> str:
    """Compute overdue status for pending items dynamically."""
    st = t.get("status")
    if st in ("pendente", "previsto"):
        venc = parse_date(t.get("vencimento") or t.get("data_prevista"))
        if venc and venc < date.today():
            return "vencido" if t["tipo"] == "saida" else "atrasado"
    return st


# ----------------------------------------------------------------------------
# AUTH ROUTES
# ----------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    doc = {
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "user",
        "created_at": now_utc().isoformat(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email)
    user = {"id": uid, "name": body.name, "email": email, "role": "user"}
    resp = JSONResponse({"user": user, "token": token})
    resp.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return resp


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    uid = str(user["_id"])
    token = create_access_token(uid, email)
    safe = {"id": uid, "name": user.get("name"), "email": email, "role": user.get("role", "user")}
    resp = JSONResponse({"user": safe, "token": token})
    resp.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return resp


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("access_token", path="/")
    return resp


# ----------------------------------------------------------------------------
# Generic CRUD factory
# ----------------------------------------------------------------------------
def register_crud(name: str, collection: str, model):
    @api.get(f"/{name}")
    async def list_items(user: dict = Depends(get_current_user)):
        items = await db[collection].find().sort("created_at", -1).to_list(2000)
        return [serialize(i) for i in items]

    @api.post(f"/{name}")
    async def create_item(body: model, user: dict = Depends(get_current_user)):  # type: ignore
        doc = body.model_dump()
        doc["created_at"] = now_utc().isoformat()
        res = await db[collection].insert_one(doc)
        created = await db[collection].find_one({"_id": res.inserted_id})
        return serialize(created)

    @api.put(f"/{name}/{{item_id}}")
    async def update_item(item_id: str, body: model, user: dict = Depends(get_current_user)):  # type: ignore
        await db[collection].update_one({"_id": ObjectId(item_id)}, {"$set": body.model_dump()})
        updated = await db[collection].find_one({"_id": ObjectId(item_id)})
        if not updated:
            raise HTTPException(status_code=404, detail="Não encontrado")
        return serialize(updated)

    @api.delete(f"/{name}/{{item_id}}")
    async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
        await db[collection].delete_one({"_id": ObjectId(item_id)})
        return {"ok": True}


register_crud("categories", "categories", CategoryIn)
register_crud("accounts", "accounts", AccountIn)
register_crud("tasks", "tasks", TaskIn)
register_crud("reminders", "reminders", ReminderIn)
register_crud("notes", "notes", NoteIn)
register_crud("opportunities", "opportunities", OpportunityIn)
register_crud("goals", "goals", GoalIn)


# ----------------------------------------------------------------------------
# TRANSACTIONS (with recurrence + filters + mark paid)
# ----------------------------------------------------------------------------
@api.get("/transactions")
async def list_transactions(
    user: dict = Depends(get_current_user),
    tipo: Optional[str] = None,
    person: Optional[str] = None,
    status: Optional[str] = None,
    categoria: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    search: Optional[str] = None,
):
    q: dict = {}
    if tipo:
        q["tipo"] = tipo
    if categoria:
        q["categoria"] = categoria
    q.update(person_query(person))
    if search:
        q["descricao"] = {"$regex": search, "$options": "i"}
    items = await db.transactions.find(q).sort("data", -1).to_list(5000)
    out = []
    for t in items:
        t = serialize(t)
        t["status_display"] = display_status(t)
        if status and t["status_display"] != status and t["status"] != status:
            continue
        if year and month:
            ref = t.get("vencimento") or t.get("data") or t.get("data_prevista")
            if not in_month(ref, year, month):
                continue
        out.append(t)
    return out


async def _create_tx(doc: dict) -> dict:
    doc["valor"] = money(doc.get("valor"))
    doc["created_at"] = now_utc().isoformat()
    if not doc.get("data"):
        doc["data"] = today_str()
    res = await db.transactions.insert_one(doc)
    return await db.transactions.find_one({"_id": res.inserted_id})


@api.post("/transactions")
async def create_transaction(body: TransactionIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    created = await _create_tx(dict(doc))
    series_id = str(created["_id"])

    # generate recurrences (next 5 occurrences)
    if body.recorrente and body.frequencia and body.frequencia != "unica":
        await db.transactions.update_one({"_id": created["_id"]}, {"$set": {"series_id": series_id}})
        base_date = parse_date(doc.get("vencimento") or doc.get("data")) or date.today()
        for _ in range(5):
            base_date = next_date(base_date, body.frequencia)
            child = dict(doc)
            child["series_id"] = series_id
            child["status"] = "pendente" if body.tipo == "saida" else "previsto"
            child["data_pagamento"] = None
            if doc.get("vencimento"):
                child["vencimento"] = base_date.isoformat()
                child["data"] = base_date.isoformat()
            else:
                child["data"] = base_date.isoformat()
                child["data_prevista"] = base_date.isoformat()
            await _create_tx(child)
    return serialize(created)


@api.put("/transactions/{item_id}")
async def update_transaction(item_id: str, body: TransactionIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["valor"] = money(doc.get("valor"))
    await db.transactions.update_one({"_id": ObjectId(item_id)}, {"$set": doc})
    updated = await db.transactions.find_one({"_id": ObjectId(item_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="Não encontrado")
    return serialize(updated)


@api.delete("/transactions/{item_id}")
async def delete_transaction(item_id: str, scope: str = "one", user: dict = Depends(get_current_user)):
    tx = await db.transactions.find_one({"_id": ObjectId(item_id)})
    if not tx:
        raise HTTPException(status_code=404, detail="Não encontrado")
    if scope == "series" and tx.get("series_id"):
        await db.transactions.delete_many({"series_id": tx["series_id"]})
    else:
        await db.transactions.delete_one({"_id": ObjectId(item_id)})
    return {"ok": True}


@api.post("/transactions/{item_id}/pay")
async def mark_paid(item_id: str, user: dict = Depends(get_current_user)):
    tx = await db.transactions.find_one({"_id": ObjectId(item_id)})
    if not tx:
        raise HTTPException(status_code=404, detail="Não encontrado")
    new_status = "recebido" if tx["tipo"] == "entrada" else "pago"
    await db.transactions.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"status": new_status, "data_pagamento": today_str()}},
    )
    updated = await db.transactions.find_one({"_id": ObjectId(item_id)})
    return serialize(updated)


# ----------------------------------------------------------------------------
# DASHBOARD
# ----------------------------------------------------------------------------
async def _all_tx(person: Optional[str]) -> List[dict]:
    q = person_query(person)
    items = await db.transactions.find(q).to_list(10000)
    return [serialize(t) for t in items]


@api.get("/dashboard")
async def dashboard(
    user: dict = Depends(get_current_user),
    person: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
):
    ref = date.today()
    year = year or ref.year
    month = month or ref.month

    txs = await _all_tx(person)
    accounts = await db.accounts.find().to_list(1000)
    accounts_balance = sum(money(a.get("saldo")) for a in accounts)

    total_recebido_all = sum(money(t["valor"]) for t in txs if t["tipo"] == "entrada" and t["status"] == "recebido")
    total_pago_all = sum(money(t["valor"]) for t in txs if t["tipo"] == "saida" and t["status"] == "pago")
    saldo_atual = round(accounts_balance + total_recebido_all - total_pago_all, 2)

    def month_ref(t):
        return t.get("vencimento") or t.get("data") or t.get("data_prevista")

    entradas_mes = sum(
        money(t["valor"]) for t in txs
        if t["tipo"] == "entrada" and t["status"] == "recebido" and in_month(month_ref(t), year, month)
    )
    saidas_mes = sum(
        money(t["valor"]) for t in txs
        if t["tipo"] == "saida" and t["status"] == "pago" and in_month(month_ref(t), year, month)
    )
    contas_pagas = saidas_mes

    contas_pendentes = 0.0
    contas_vencidas = 0.0
    for t in txs:
        if t["tipo"] == "saida" and t["status"] in ("pendente",):
            ds = display_status(t)
            if ds == "vencido":
                contas_vencidas += money(t["valor"])
            elif in_month(month_ref(t), year, month) or (parse_date(month_ref(t)) and parse_date(month_ref(t)) >= date.today()):
                contas_pendentes += money(t["valor"])

    total_a_receber = sum(
        money(t["valor"]) for t in txs
        if t["tipo"] == "entrada" and t["status"] in ("previsto",)
    )

    contas_a_pagar_total = contas_pendentes + contas_vencidas
    saldo_projetado = round(saldo_atual + total_a_receber - contas_a_pagar_total, 2)
    valor_para_fechar = round(max(0.0, contas_a_pagar_total - (saldo_atual + total_a_receber)), 2)
    valor_disponivel = round(saldo_atual - contas_a_pagar_total, 2)
    renda_adicional = valor_para_fechar

    if valor_para_fechar > 0:
        health = "critical"
        health_msg = f"Déficit previsto — faltam {brl(valor_para_fechar)} para fechar o mês"
    elif valor_disponivel < 0.15 * (contas_a_pagar_total + 1):
        health = "warning"
        health_msg = "Atenção — margem financeira baixa"
    else:
        health = "positive"
        health_msg = "Contas cobertas — saldo suficiente"

    return {
        "saldo_atual": saldo_atual,
        "entradas_mes": round(entradas_mes, 2),
        "saidas_mes": round(saidas_mes, 2),
        "contas_pagas": round(contas_pagas, 2),
        "contas_pendentes": round(contas_pendentes, 2),
        "contas_vencidas": round(contas_vencidas, 2),
        "total_a_receber": round(total_a_receber, 2),
        "saldo_projetado": saldo_projetado,
        "valor_para_fechar": valor_para_fechar,
        "valor_disponivel": valor_disponivel,
        "renda_adicional": renda_adicional,
        "health": health,
        "health_msg": health_msg,
    }


def brl(v: float) -> str:
    s = f"{money(v):,.2f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"


# ----------------------------------------------------------------------------
# ANALYTICS
# ----------------------------------------------------------------------------
@api.get("/analytics")
async def analytics(
    user: dict = Depends(get_current_user),
    person: Optional[str] = None,
    year: Optional[int] = None,
):
    ref = date.today()
    year = year or ref.year
    txs = await _all_tx(person)

    # last 6 months entradas x saidas + saldo evolution
    months = []
    cursor = date(ref.year, ref.month, 1)
    seq = []
    for i in range(5, -1, -1):
        m = add_months(cursor, -i)
        seq.append((m.year, m.month))
    month_names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    running = 0.0
    saldo_evolucao = []
    for (yy, mm) in seq:
        def mref(t):
            return t.get("vencimento") or t.get("data") or t.get("data_prevista")
        ent = sum(money(t["valor"]) for t in txs if t["tipo"] == "entrada" and t["status"] == "recebido" and in_month(mref(t), yy, mm))
        sai = sum(money(t["valor"]) for t in txs if t["tipo"] == "saida" and t["status"] == "pago" and in_month(mref(t), yy, mm))
        months.append({"mes": f"{month_names[mm-1]}/{str(yy)[2:]}", "entradas": round(ent, 2), "saidas": round(sai, 2)})
        running += ent - sai
        saldo_evolucao.append({"mes": f"{month_names[mm-1]}/{str(yy)[2:]}", "saldo": round(running, 2)})

    # gastos por categoria (this year, pago)
    cat_map: dict = {}
    for t in txs:
        if t["tipo"] == "saida" and t["status"] == "pago":
            c = t.get("categoria") or "Outros"
            cat_map[c] = cat_map.get(c, 0) + money(t["valor"])
    gastos_categoria = [{"categoria": k, "valor": round(v, 2)} for k, v in sorted(cat_map.items(), key=lambda x: -x[1])]

    # gastos por pessoa
    def sum_person(tp, resp_list, status):
        return round(sum(money(t["valor"]) for t in txs if t["tipo"] == tp and t.get("responsavel") in resp_list and t["status"] == status), 2)

    gastos_pessoa = [
        {"pessoa": "Eu", "valor": sum_person("saida", ["eu"], "pago")},
        {"pessoa": "Esposa", "valor": sum_person("saida", ["esposa"], "pago")},
        {"pessoa": "Compartilhado", "valor": sum_person("saida", ["ambos"], "pago")},
    ]
    entradas_pessoa = [
        {"pessoa": "Eu", "valor": sum_person("entrada", ["eu"], "recebido")},
        {"pessoa": "Esposa", "valor": sum_person("entrada", ["esposa"], "recebido")},
        {"pessoa": "Compartilhado", "valor": sum_person("entrada", ["ambos"], "recebido")},
    ]

    pagas = sum(1 for t in txs if t["tipo"] == "saida" and t["status"] == "pago")
    pendentes = sum(1 for t in txs if t["tipo"] == "saida" and t["status"] == "pendente")
    contas_status = [
        {"nome": "Pagas", "valor": pagas},
        {"nome": "Pendentes", "valor": pendentes},
    ]

    return {
        "entradas_saidas": months,
        "saldo_evolucao": saldo_evolucao,
        "gastos_categoria": gastos_categoria,
        "gastos_pessoa": gastos_pessoa,
        "entradas_pessoa": entradas_pessoa,
        "contas_status": contas_status,
    }


# ----------------------------------------------------------------------------
# BUDGET (orçamento por categoria - uses category limits)
# ----------------------------------------------------------------------------
@api.get("/budget")
async def budget(user: dict = Depends(get_current_user), year: Optional[int] = None, month: Optional[int] = None):
    ref = date.today()
    year = year or ref.year
    month = month or ref.month
    cats = await db.categories.find({"tipo": "saida"}).to_list(1000)
    txs = await db.transactions.find({"tipo": "saida", "status": "pago"}).to_list(10000)
    out = []
    for c in cats:
        c = serialize(c)
        limite = money(c.get("limite_mensal"))
        if limite <= 0:
            continue
        gasto = sum(
            money(t["valor"]) for t in txs
            if t.get("categoria") == c["nome"] and in_month(t.get("vencimento") or t.get("data"), year, month)
        )
        pct = round((gasto / limite) * 100, 1) if limite else 0
        if pct >= 100:
            level = "excedido" if pct > 100 else "atingido"
        elif pct >= 80:
            level = "atencao"
        elif pct >= 50:
            level = "aviso"
        else:
            level = "ok"
        out.append({"categoria": c["nome"], "limite": limite, "gasto": round(gasto, 2), "pct": pct, "level": level})
    return out


# ----------------------------------------------------------------------------
# ALERTS
# ----------------------------------------------------------------------------
@api.get("/alerts")
async def alerts(user: dict = Depends(get_current_user)):
    out = []
    txs = await db.transactions.find({"tipo": "saida", "status": "pendente"}).to_list(10000)
    total_pend = sum(money(t["valor"]) for t in txs)
    if total_pend > 0:
        out.append({"level": "info", "msg": f"Você possui {brl(total_pend)} em contas pendentes."})
    for t in txs:
        venc = parse_date(t.get("vencimento"))
        if not venc:
            continue
        dias = (venc - date.today()).days
        if dias < 0:
            out.append({"level": "critical", "msg": f"Conta '{t.get('descricao')}' está vencida ({brl(money(t['valor']))})."})
        elif dias == 0:
            out.append({"level": "warning", "msg": f"Conta '{t.get('descricao')}' vence hoje."})
        elif dias == 1:
            out.append({"level": "warning", "msg": f"Conta '{t.get('descricao')}' vence amanhã."})
    # goals
    goals = await db.goals.find({"status": "ativa"}).to_list(1000)
    for g in goals:
        falta = money(g.get("valor_meta")) - money(g.get("valor_atual"))
        if falta > 0:
            out.append({"level": "info", "msg": f"Faltam {brl(falta)} para atingir a meta '{g.get('titulo')}'."})
    return out


# ----------------------------------------------------------------------------
# SETTINGS
# ----------------------------------------------------------------------------
@api.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    s = await db.settings.find_one({"key": "global"})
    if not s:
        default = SettingsIn(
            formas_pagamento=["Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Transferência"],
            contas=["Conta Corrente", "Poupança"],
            cartoes=["Cartão Principal"],
        ).model_dump()
        default["key"] = "global"
        await db.settings.insert_one(default)
        s = await db.settings.find_one({"key": "global"})
    return serialize(s)


@api.put("/settings")
async def update_settings(body: SettingsIn, user: dict = Depends(get_current_user)):
    await db.settings.update_one({"key": "global"}, {"$set": body.model_dump()}, upsert=True)
    s = await db.settings.find_one({"key": "global"})
    return serialize(s)


# ----------------------------------------------------------------------------
# CALENDAR
# ----------------------------------------------------------------------------
@api.get("/calendar")
async def calendar(user: dict = Depends(get_current_user), year: int = None, month: int = None):
    ref = date.today()
    year = year or ref.year
    month = month or ref.month
    events: List[dict] = []
    txs = await db.transactions.find().to_list(10000)
    for t in txs:
        t = serialize(t)
        d = t.get("vencimento") or t.get("data") or t.get("data_prevista")
        if in_month(d, year, month):
            events.append({
                "date": d[:10], "type": t["tipo"], "title": t.get("descricao"),
                "valor": money(t["valor"]), "status": display_status(t), "kind": "transacao",
            })
    for coll, kind, tfield, dfield in [("tasks", "tarefa", "titulo", "data"), ("reminders", "lembrete", "titulo", "data")]:
        rows = await db[coll].find().to_list(5000)
        for r in rows:
            r = serialize(r)
            d = r.get(dfield)
            if in_month(d, year, month):
                events.append({"date": d[:10], "type": kind, "title": r.get(tfield), "kind": kind, "status": r.get("status", "")})
    return events


# ----------------------------------------------------------------------------
# Seed
# ----------------------------------------------------------------------------
DEFAULT_CATEGORIES = [
    ("Moradia", "saida"), ("Energia", "saida"), ("Água", "saida"), ("Internet", "saida"),
    ("Telefone", "saida"), ("Alimentação", "saida"), ("Mercado", "saida"), ("Transporte", "saida"),
    ("Combustível", "saida"), ("Saúde", "saida"), ("Educação", "saida"), ("Lazer", "saida"),
    ("Assinaturas", "saida"), ("Cartão", "saida"), ("Empréstimos", "saida"), ("Financiamentos", "saida"),
    ("Impostos", "saida"), ("Compras", "saida"), ("Outros", "saida"),
    ("Salário", "entrada"), ("Freelance", "entrada"), ("Venda", "entrada"), ("Comissão", "entrada"),
    ("PIX Recebido", "entrada"), ("Renda Extra", "entrada"), ("Outros", "entrada"),
]


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "casal@financas.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "familia123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "name": "Casal", "email": admin_email, "password_hash": hash_password(admin_pw),
            "role": "admin", "created_at": now_utc().isoformat(),
        })
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    if await db.categories.count_documents({}) == 0:
        limites = {"Alimentação": 800, "Mercado": 1000, "Transporte": 400, "Lazer": 300}
        for nome, tipo in DEFAULT_CATEGORIES:
            await db.categories.insert_one({"nome": nome, "tipo": tipo, "limite_mensal": limites.get(nome, 0), "created_at": now_utc().isoformat()})

    await seed_demo()
    logger.info("Startup complete")


async def seed_demo():
    if await db.transactions.count_documents({}) > 0:
        return
    t = date.today()
    ym = lambda d: d.isoformat()

    def d(day):
        try:
            return date(t.year, t.month, day)
        except ValueError:
            return date(t.year, t.month, 28)

    demo = [
        # entradas recebidas
        {"tipo": "entrada", "data": ym(d(5)), "responsavel": "eu", "descricao": "Salário", "categoria": "Salário", "valor": 5200, "forma_pagamento": "Transferência", "conta": "Conta Corrente", "status": "recebido", "recorrente": True, "frequencia": "mensal"},
        {"tipo": "entrada", "data": ym(d(5)), "responsavel": "esposa", "descricao": "Salário", "categoria": "Salário", "valor": 4300, "forma_pagamento": "Transferência", "conta": "Conta Corrente", "status": "recebido", "recorrente": True, "frequencia": "mensal"},
        {"tipo": "entrada", "data": ym(d(12)), "responsavel": "eu", "descricao": "Freelance projeto site", "categoria": "Freelance", "valor": 1200, "forma_pagamento": "PIX", "conta": "Conta Corrente", "status": "recebido"},
        # entradas previstas (a receber)
        {"tipo": "entrada", "data": ym(d(25)), "data_prevista": ym(d(25)), "responsavel": "esposa", "descricao": "Comissão de vendas", "categoria": "Comissão", "valor": 800, "status": "previsto"},
        {"tipo": "entrada", "data": ym(d(20)), "data_prevista": ym(d(20)), "responsavel": "eu", "descricao": "Venda de móvel usado", "categoria": "Venda", "valor": 450, "status": "previsto"},
        # saidas pagas
        {"tipo": "saida", "data": ym(d(10)), "vencimento": ym(d(10)), "responsavel": "ambos", "descricao": "Aluguel", "categoria": "Moradia", "valor": 1800, "forma_pagamento": "Boleto", "status": "pago", "data_pagamento": ym(d(10)), "recorrente": True, "frequencia": "mensal"},
        {"tipo": "saida", "data": ym(d(8)), "vencimento": ym(d(8)), "responsavel": "eu", "descricao": "Mercado do mês", "categoria": "Mercado", "valor": 950, "forma_pagamento": "Cartão de Débito", "status": "pago", "data_pagamento": ym(d(8))},
        {"tipo": "saida", "data": ym(d(6)), "vencimento": ym(d(6)), "responsavel": "esposa", "descricao": "Energia elétrica", "categoria": "Energia", "valor": 240, "forma_pagamento": "Boleto", "status": "pago", "data_pagamento": ym(d(6))},
        {"tipo": "saida", "data": ym(d(9)), "vencimento": ym(d(9)), "responsavel": "ambos", "descricao": "Restaurante", "categoria": "Alimentação", "valor": 320, "forma_pagamento": "Cartão de Crédito", "status": "pago", "data_pagamento": ym(d(9))},
        # saidas pendentes / futuras
        {"tipo": "saida", "data": ym(d(15)), "vencimento": ym(d(15)), "responsavel": "ambos", "descricao": "Internet + TV", "categoria": "Internet", "valor": 180, "forma_pagamento": "Boleto", "status": "pendente", "recorrente": True, "frequencia": "mensal"},
        {"tipo": "saida", "data": ym(d(20)), "vencimento": ym(d(20)), "responsavel": "eu", "descricao": "Fatura do cartão", "categoria": "Cartão", "valor": 1450, "forma_pagamento": "Boleto", "status": "pendente"},
        {"tipo": "saida", "data": ym(d(18)), "vencimento": ym(d(18)), "responsavel": "esposa", "descricao": "Plano de saúde", "categoria": "Saúde", "valor": 520, "forma_pagamento": "Boleto", "status": "pendente", "recorrente": True, "frequencia": "mensal"},
        {"tipo": "saida", "data": ym(d(25)), "vencimento": ym(d(25)), "responsavel": "ambos", "descricao": "Streamings (assinaturas)", "categoria": "Assinaturas", "valor": 95, "status": "pendente"},
    ]
    for item in demo:
        base = {
            "responsavel": "ambos", "categoria": "Outros", "recorrente": False, "frequencia": "unica",
            "forma_pagamento": None, "conta": None, "data_pagamento": None, "data_prevista": None,
            "observacoes": None, "vencimento": None, "created_at": now_utc().isoformat(),
        }
        base.update(item)
        base["valor"] = money(base["valor"])
        await db.transactions.insert_one(base)

    await db.goals.insert_one({"titulo": "Reserva de emergência", "valor_meta": 3000, "valor_atual": 1200, "prazo": None, "status": "ativa", "created_at": now_utc().isoformat()})
    await db.opportunities.insert_one({"nome": "Freelancer de design", "descricao": "Criação de logos e artes para redes sociais.", "potencial_ganho": 1500, "custo_inicial": 0, "tempo_necessario": "10h/semana", "prazo": "30 dias", "responsavel": "eu", "status": "em_andamento", "observacoes": None, "created_at": now_utc().isoformat()})
    await db.tasks.insert_one({"titulo": "Renegociar plano de celular", "descricao": "Ligar para operadora e pedir desconto.", "data": ym(d(min(t.day + 3, 28))), "horario": "14:00", "responsavel": "eu", "prioridade": "media", "categoria": "Financeiro", "status": "a_fazer", "observacoes": None, "created_at": now_utc().isoformat()})
    await db.notes.insert_one({"titulo": "Planejamento do próximo mês", "conteudo": "Revisar assinaturas e cortar o que não usamos.", "fixada": True, "created_at": now_utc().isoformat()})
    await db.reminders.insert_one({"titulo": "Pagar fatura do cartão", "descricao": "Não deixar vencer!", "data": ym(d(20)), "hora": "09:00", "frequencia": "mensal", "tipo": "conta", "created_at": now_utc().isoformat()})


@api.get("/")
async def root():
    return {"message": "Gestão Financeira Familiar API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
