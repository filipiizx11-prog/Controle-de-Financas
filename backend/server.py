from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from bson import ObjectId

from pydantic import BaseModel, Field, ConfigDict

import jwt
from passlib.context import CryptContext


# ============================================================
# CONFIGURAÇÃO
# ============================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

if not mongo_url:
    raise RuntimeError("MONGO_URL não configurada")

if not db_name:
    raise RuntimeError("DB_NAME não configurada")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_ALGORITHM = "HS256"

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

security = HTTPBearer()


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Controle de Finanças",
    version="1.0.0"
)

api = APIRouter(prefix="/api")


# ============================================================
# CORS
# ============================================================

frontend_url = os.environ.get("FRONTEND_URL", "*")

if frontend_url == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [
        origin.strip()
        for origin in frontend_url.split(",")
        if origin.strip()
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# UTILITÁRIOS
# ============================================================

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")

    if not secret:
        raise RuntimeError("JWT_SECRET não configurado")

    return secret


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:
        return False


def normalize_email(email: str) -> str:
    return email.strip().lower()


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now_utc() + timedelta(days=7),
        "type": "access",
    }

    return jwt.encode(
        payload,
        get_jwt_secret(),
        algorithm=JWT_ALGORITHM
    )


def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role", "user"),
    }


def brl(value: float) -> float:
    return round(float(value or 0), 2)


# ============================================================
# MODELOS DE AUTENTICAÇÃO
# ============================================================

class RegisterIn(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: str = "user"


# ============================================================
# MODELOS DE TRANSAÇÕES
# ============================================================

class TransactionIn(BaseModel):
    type: str
    category: str
    description: str
    amount: float
    date: str
    account: Optional[str] = None


class TransactionOut(BaseModel):
    id: str
    type: str
    category: str
    description: str
    amount: float
    date: str
    account: Optional[str] = None


# ============================================================
# MODELOS DE ORÇAMENTO
# ============================================================

class BudgetIn(BaseModel):
    category: str
    amount: float


# ============================================================
# MODELOS DE CONFIGURAÇÕES
# ============================================================

class SettingsIn(BaseModel):
    moeda: str = "BRL"
    tema: str = "light"
    notificacoes: bool = True
    contas: List[str] = Field(default_factory=list)


# ============================================================
# AUTENTICAÇÃO
# ============================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Token inválido"
            )

        try:
            object_id = ObjectId(user_id)
        except Exception:
            raise HTTPException(
                status_code=401,
                detail="Token inválido"
            )

        user = await db.users.find_one({
            "_id": object_id
        })

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Usuário não encontrado"
            )

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token expirado"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido"
        )


# ============================================================
# REGISTER
# ============================================================

@api.post("/auth/register")
async def register(body: RegisterIn):

    email = normalize_email(body.email)

    if not email:
        raise HTTPException(
            status_code=400,
            detail="E-mail é obrigatório"
        )

    existing = await db.users.find_one({
        "email": email
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail="E-mail já cadastrado"
        )

    doc = {
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "user",
        "created_at": now_utc().isoformat(),
    }

    result = await db.users.insert_one(doc)

    uid = str(result.inserted_id)

    token = create_access_token(
        uid,
        email
    )

    user = {
        "id": uid,
        "name": body.name.strip(),
        "email": email,
        "role": "user",
    }

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


# ============================================================
# LOGIN
# ============================================================

@api.post("/auth/login")
async def login(body: LoginIn):

    email = normalize_email(body.email)

    user = await db.users.find_one({
        "email": email
    })

    if not user:
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos"
        )

    password_hash = user.get("password_hash")

    if not password_hash:
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos"
        )

    if not verify_password(
        body.password,
        password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos"
        )

    uid = str(user["_id"])

    token = create_access_token(
        uid,
        email
    )

    safe_user = serialize_user(user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": safe_user,
    }


# ============================================================
# ME
# ============================================================

@api.get("/auth/me")
async def me(
    current_user=Depends(get_current_user)
):
    return serialize_user(current_user)


# ============================================================
# DASHBOARD
# ============================================================

@api.get("/dashboard")
async def dashboard(
    current_user=Depends(get_current_user)
):

    transactions = await db.transactions.find({}).to_list(10000)

    total_income = 0.0
    total_expense = 0.0

    for transaction in transactions:
        amount = float(transaction.get("amount", 0) or 0)

        if transaction.get("type") == "income":
            total_income += amount
        else:
            total_expense += amount

    balance = total_income - total_expense

    return {
        "income": brl(total_income),
        "expense": brl(total_expense),
        "balance": brl(balance),
        "transactions_count": len(transactions),
    }


# ============================================================
# TRANSAÇÕES - LISTAR
# ============================================================

@api.get("/transactions")
async def list_transactions(
    current_user=Depends(get_current_user)
):

    transactions = await db.transactions.find(
        {}
    ).sort(
        "date",
        DESCENDING
    ).to_list(10000)

    result = []

    for transaction in transactions:
        result.append({
            "id": str(transaction["_id"]),
            "type": transaction.get("type"),
            "category": transaction.get("category"),
            "description": transaction.get("description"),
            "amount": brl(transaction.get("amount", 0)),
            "date": transaction.get("date"),
            "account": transaction.get("account"),
        })

    return result


# ============================================================
# TRANSAÇÕES - CRIAR
# ============================================================

@api.post("/transactions")
async def create_transaction(
    body: TransactionIn,
    current_user=Depends(get_current_user)
):

    if body.type not in ["income", "expense"]:
        raise HTTPException(
            status_code=400,
            detail="Tipo de transação inválido"
        )

    document = {
        "type": body.type,
        "category": body.category,
        "description": body.description,
        "amount": brl(body.amount),
        "date": body.date,
        "account": body.account,
        "created_at": now_utc().isoformat(),
    }

    result = await db.transactions.insert_one(
        document
    )

    return {
        "id": str(result.inserted_id),
        **document,
    }


# ============================================================
# TRANSAÇÕES - ATUALIZAR
# ============================================================

@api.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    body: TransactionIn,
    current_user=Depends(get_current_user)
):

    try:
        object_id = ObjectId(transaction_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ID inválido"
        )

    update = {
        "type": body.type,
        "category": body.category,
        "description": body.description,
        "amount": brl(body.amount),
        "date": body.date,
        "account": body.account,
    }

    result = await db.transactions.update_one(
        {"_id": object_id},
        {"$set": update}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Transação não encontrada"
        )

    return {
        "id": transaction_id,
        **update,
    }


# ============================================================
# TRANSAÇÕES - EXCLUIR
# ============================================================

@api.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user=Depends(get_current_user)
):

    try:
        object_id = ObjectId(transaction_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ID inválido"
        )

    result = await db.transactions.delete_one({
        "_id": object_id
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Transação não encontrada"
        )

    return {
        "message": "Transação excluída com sucesso"
    }


# ============================================================
# CATEGORIAS
# ============================================================

@api.get("/categories")
async def categories(
    current_user=Depends(get_current_user)
):

    categories = await db.transactions.distinct(
        "category"
    )

    return sorted([
        category
        for category in categories
        if category
    ])


# ============================================================
# ANALYTICS
# ============================================================

@api.get("/analytics")
async def analytics(
    current_user=Depends(get_current_user)
):

    transactions = await db.transactions.find(
        {}
    ).to_list(10000)

    by_category = {}
    by_month = {}

    for transaction in transactions:

        amount = float(
            transaction.get("amount", 0) or 0
        )

        transaction_type = transaction.get(
            "type"
        )

        category = transaction.get(
            "category",
            "Outros"
        )

        date = transaction.get(
            "date",
            ""
        )

        if transaction_type == "expense":

            by_category[category] = (
                by_category.get(category, 0)
                + amount
            )

        month = date[:7] if len(date) >= 7 else date

        if month:
            if month not in by_month:
                by_month[month] = {
                    "income": 0,
                    "expense": 0,
                }

            if transaction_type == "income":
                by_month[month]["income"] += amount
            else:
                by_month[month]["expense"] += amount

    return {
        "by_category": {
            key: brl(value)
            for key, value in by_category.items()
        },
        "by_month": {
            key: {
                "income": brl(value["income"]),
                "expense": brl(value["expense"]),
            }
            for key, value in by_month.items()
        },
    }


# ============================================================
# ORÇAMENTO
# ============================================================

@api.get("/budget")
async def get_budget(
    current_user=Depends(get_current_user)
):

    budgets = await db.budgets.find({}).to_list(
        1000
    )

    return [
        {
            "id": str(item["_id"]),
            "category": item.get("category"),
            "amount": brl(item.get("amount", 0)),
        }
        for item in budgets
    ]


@api.post("/budget")
async def create_budget(
    body: BudgetIn,
    current_user=Depends(get_current_user)
):

    document = {
        "category": body.category,
        "amount": brl(body.amount),
        "created_at": now_utc().isoformat(),
    }

    result = await db.budgets.insert_one(
        document
    )

    return {
        "id": str(result.inserted_id),
        **document,
    }


@api.delete("/budget/{budget_id}")
async def delete_budget(
    budget_id: str,
    current_user=Depends(get_current_user)
):

    try:
        object_id = ObjectId(budget_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="ID inválido"
        )

    result = await db.budgets.delete_one({
        "_id": object_id
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Orçamento não encontrado"
        )

    return {
        "message": "Orçamento excluído"
    }


# ============================================================
# ALERTAS
# ============================================================

@api.get("/alerts")
async def alerts(
    current_user=Depends(get_current_user)
):

    budgets = await db.budgets.find({}).to_list(
        1000
    )

    transactions = await db.transactions.find(
        {}
    ).to_list(10000)

    expenses = {}

    for transaction in transactions:

        if transaction.get("type") != "expense":
            continue

        category = transaction.get(
            "category",
            "Outros"
        )

        amount = float(
            transaction.get("amount", 0) or 0
        )

        expenses[category] = (
            expenses.get(category, 0)
            + amount
        )

    result = []

    for budget in budgets:

        category = budget.get("category")
        limit = float(
            budget.get("amount", 0) or 0
        )

        spent = expenses.get(
            category,
            0
        )

        if limit <= 0:
            continue

        percentage = (
            spent / limit
        ) * 100

        if percentage >= 100:
            level = "danger"
        elif percentage >= 80:
            level = "warning"
        else:
            continue

        result.append({
            "category": category,
            "budget": brl(limit),
            "spent": brl(spent),
            "percentage": round(
                percentage,
                2
            ),
            "level": level,
        })

    return result


# ============================================================
# CONFIGURAÇÕES
# ============================================================

@api.get("/settings")
async def get_settings(
    current_user=Depends(get_current_user)
):

    user_id = current_user["_id"]

    settings = await db.settings.find_one({
        "user_id": user_id
    })

    if not settings:
        return {
            "moeda": "BRL",
            "tema": "light",
            "notificacoes": True,
            "contas": [],
        }

    return {
        "moeda": settings.get(
            "moeda",
            "BRL"
        ),
        "tema": settings.get(
            "tema",
            "light"
        ),
        "notificacoes": settings.get(
            "notificacoes",
            True
        ),
        "contas": settings.get(
            "contas",
            []
        ),
    }


@api.put("/settings")
async def update_settings(
    body: SettingsIn,
    current_user=Depends(get_current_user)
):

    user_id = current_user["_id"]

    document = {
        "user_id": user_id,
        "moeda": body.moeda,
        "tema": body.tema,
        "notificacoes": body.notificacoes,
        "contas": body.contas,
        "updated_at": now_utc().isoformat(),
    }

    await db.settings.update_one(
        {"user_id": user_id},
        {"$set": document},
        upsert=True
    )

    return {
        "moeda": body.moeda,
        "tema": body.tema,
        "notificacoes": body.notificacoes,
        "contas": body.contas,
    }


# ============================================================
# CALENDÁRIO
# ============================================================

@api.get("/calendar")
async def calendar(
    current_user=Depends(get_current_user)
):

    transactions = await db.transactions.find(
        {}
    ).sort(
        "date",
        ASCENDING
    ).to_list(10000)

    result = []

    for transaction in transactions:

        result.append({
            "id": str(transaction["_id"]),
            "date": transaction.get("date"),
            "type": transaction.get("type"),
            "category": transaction.get("category"),
            "description": transaction.get("description"),
            "amount": brl(
                transaction.get("amount", 0)
            ),
        })

    return result


# ============================================================
# HEALTH CHECK
# ============================================================

@api.get("/health")
async def health():

    try:
        await db.command("ping")

        return {
            "status": "ok",
            "database": "connected",
        }

    except Exception as e:

        logger.exception(
            "Erro ao conectar ao MongoDB"
        )

        return {
            "status": "error",
            "database": "disconnected",
            "detail": str(e),
        }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():

    return {
        "message": "API Controle de Finanças online",
        "status": "ok",
    }


# ============================================================
# REGISTRA ROTAS
# ============================================================

app.include_router(api)


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup():

    logger.info(
        "Iniciando aplicação..."
    )

    # --------------------------------------------------------
    # Índice único por e-mail
    # --------------------------------------------------------

    try:

        await db.users.create_index(
            "email",
            unique=True
        )

        logger.info(
            "Índice de e-mail configurado"
        )

    except Exception:

        logger.exception(
            "Erro ao criar índice de e-mail"
        )

    # --------------------------------------------------------
    # Admin
    # --------------------------------------------------------

    admin_email = normalize_email(
        os.environ.get(
            "ADMIN_EMAIL",
            "casal@financas.com"
        )
    )

    admin_password = os.environ.get(
        "ADMIN_PASSWORD",
        "familia123"
    )

    existing = await db.users.find_one({
        "email": admin_email
    })

    if not existing:

        await db.users.insert_one({
            "name": "Casal",
            "email": admin_email,
            "password_hash": hash_password(
                admin_password
            ),
            "role": "admin",
            "created_at": now_utc().isoformat(),
        })

        logger.info(
            "Usuário administrador criado"
        )

    else:

        if not verify_password(
            admin_password,
            existing.get(
                "password_hash",
                ""
            )
        ):

            await db.users.update_one(
                {
                    "_id": existing["_id"]
                },
                {
                    "$set": {
                        "password_hash": hash_password(
                            admin_password
                        )
                    }
                }
            )

            logger.info(
                "Senha do administrador atualizada"
            )

    logger.info(
        "Aplicação iniciada com sucesso"
    )


# ============================================================
# SHUTDOWN
# ============================================================

@app.on_event("shutdown")
async def shutdown():

    logger.info(
        "Encerrando conexão com MongoDB..."
    )

    client.close()