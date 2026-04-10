#!/usr/bin/env python3
"""
init_db.py
──────────────────────────────────────────────────────────────────────────────
Script independiente para crear TODAS las tablas en Supabase (o cualquier
PostgreSQL) a partir de los modelos SQLAlchemy del proyecto.

UBICACIÓN: Colocar dentro de la carpeta `backend/`

    backend/
    ├── init_db.py        ← este archivo
    ├── .env
    └── app/
        └── ...

USO:
    cd backend
    python init_db.py

    # O sobreescribiendo la URL directamente:
    DATABASE_URL="postgresql+asyncpg://postgres:PASS@db.REF.supabase.co:5432/postgres" \\
        python init_db.py

TABLAS QUE CREA:
    users, organizations, organization_users, events, transactions,
    raffles, raffle_numbers, raffle_purchases, member_sales, draws

ENUMS QUE CREA (PostgreSQL native types):
    userrole, eventtype, eventstatus, transactiontype, numberstatus

COMPORTAMIENTO:
    - Idempotente: usa checkfirst=True (no falla si la tabla ya existe)
    - Detecta y adapta URLs de Supabase automáticamente (ssl=require)
    - Muestra progreso detallado en consola con colores ANSI
──────────────────────────────────────────────────────────────────────────────
"""

# ══════════════════════════════════════════════════════════════════════════════
# PASO 0 — stdlib puro (sin imports del proyecto aún)
# ══════════════════════════════════════════════════════════════════════════════

import asyncio
import os
import sys
import time
from pathlib import Path

# ─── Colores ANSI (sin dependencias externas) ─────────────────────────────────

RESET = "\033[0m"
BOLD = "\033[1m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
CYAN = "\033[36m"
DIM = "\033[2m"


def ok(msg: str) -> None:
    print(f"  {GREEN}✓{RESET}  {msg}")


def warn(msg: str) -> None:
    print(f"  {YELLOW}⚠{RESET}  {msg}")


def err(msg: str) -> None:
    print(f"  {RED}✗{RESET}  {msg}")


def info(msg: str) -> None:
    print(f"  {CYAN}→{RESET}  {msg}")


def dim(msg: str) -> None:
    print(f"     {DIM}{msg}{RESET}")


def step(msg: str) -> None:
    print(f"\n{BOLD}{msg}{RESET}")


def ruler() -> None:
    print(f"{DIM}{'─' * 60}{RESET}")


# ══════════════════════════════════════════════════════════════════════════════
# PASO 1 — Cargar variables de entorno
# Debe ocurrir ANTES de cualquier import de `app.*` porque
# pydantic-settings lee os.environ en el momento del import.
# ══════════════════════════════════════════════════════════════════════════════

step("1 / 4  Cargando configuración")

try:
    from dotenv import load_dotenv
except ImportError:
    err("python-dotenv no está instalado.")
    dim("Ejecutá: pip install python-dotenv")
    sys.exit(1)

# Buscar .env en el directorio del script (backend/) o el directorio actual
_here = Path(__file__).resolve().parent
for _env_candidate in [_here / ".env", _here / ".env.local", Path(".env")]:
    if _env_candidate.exists():
        load_dotenv(_env_candidate, override=False)
        ok(f"Archivo de entorno cargado: {_env_candidate}")
        break
else:
    warn("No se encontró archivo .env — usando variables de entorno del sistema.")

# Leer DATABASE_URL (acepta también SUPABASE_DATABASE_URL como alias)
_raw_url = (
    os.getenv("DATABASE_URL")
    or os.getenv("SUPABASE_DATABASE_URL")
    or os.getenv("SUPABASE_DB_URL")
)

if not _raw_url:
    err("DATABASE_URL no encontrada.")
    print()
    print("  Opciones para configurarla:\n")
    print("  A) En backend/.env:")
    print(
        '     DATABASE_URL="postgresql+asyncpg://postgres:PASS@db.REF.supabase.co:5432/postgres"\n'
    )
    print("  B) Como variable de entorno al ejecutar:")
    print('     DATABASE_URL="postgresql+asyncpg://..." python init_db.py\n')
    print("  La URL de conexión la encontrás en:")
    print("  Supabase Dashboard → Settings → Database → Connection String → URI")
    sys.exit(1)

# ─── Normalizar el driver ──────────────────────────────────────────────────────
# SQLAlchemy async requiere 'postgresql+asyncpg://' — no 'postgresql://'
_DATABASE_URL = _raw_url.strip()

if _DATABASE_URL.startswith("postgres://"):
    # Heroku / Railway usan este formato legacy
    _DATABASE_URL = "postgresql+asyncpg://" + _DATABASE_URL[len("postgres://") :]
    info("URL normalizada: postgres:// → postgresql+asyncpg://")

elif _DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in _DATABASE_URL:
    _DATABASE_URL = "postgresql+asyncpg://" + _DATABASE_URL[len("postgresql://") :]
    info("Driver añadido: postgresql:// → postgresql+asyncpg://")

elif _DATABASE_URL.startswith("postgresql+asyncpg://"):
    ok("Driver asyncpg ya presente en la URL.")

else:
    err(f"Formato de URL no reconocido: {_DATABASE_URL[:40]}...")
    dim("Debe comenzar con: postgresql:// o postgresql+asyncpg://")
    sys.exit(1)

# ─── SSL para Supabase ────────────────────────────────────────────────────────
# Supabase exige conexiones SSL en producción.
if "supabase.co" in _DATABASE_URL and "ssl" not in _DATABASE_URL.lower():
    _sep = "&" if "?" in _DATABASE_URL else "?"
    _DATABASE_URL = f"{_DATABASE_URL}{_sep}ssl=require"
    info("SSL requerido detectado → parámetro ssl=require añadido.")

# Inyectar en el entorno para que pydantic-settings lo lea al importar la app
os.environ["DATABASE_URL"] = _DATABASE_URL

# pydantic-settings valida SECRET_KEY y otras vars — proveer placeholders seguros
# para que los imports no exploten (no se usan en este script)
os.environ.setdefault("SECRET_KEY", "init-db-not-used-placeholder-32ch!!")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("APP_NAME", "PromoManager")
os.environ.setdefault("APP_VERSION", "1.0.0")
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")

# Mostrar URL sanitizada (sin la contraseña)
try:
    from urllib.parse import urlparse, urlunparse

    _p = urlparse(_DATABASE_URL)
    _safe = urlunparse(
        _p._replace(netloc=f"{_p.username}:****@{_p.hostname}:{_p.port}")
    )
    ok(f"Conectando a: {_safe}")
except Exception:
    ok("URL configurada correctamente.")

# ══════════════════════════════════════════════════════════════════════════════
# PASO 2 — Importar modelos (los registra en Base.metadata)
# ══════════════════════════════════════════════════════════════════════════════

step("2 / 4  Importando modelos SQLAlchemy")

# Agregar backend/ al path para poder hacer `from app.xxx import ...`
if str(_here) not in sys.path:
    sys.path.insert(0, str(_here))

try:
    # Base es el DeclarativeBase — contiene metadata con todas las tablas
    from app.db.session import Base  # noqa: E402

    ok("Base declarativa importada.")
except ImportError as exc:
    err(f"No se pudo importar app.db.session: {exc}")
    dim("¿Estás ejecutando el script desde dentro de backend/?")
    dim("  cd backend && python init_db.py")
    sys.exit(1)

try:
    # Importar el paquete de modelos — su __init__.py registra TODOS los modelos
    # en Base.metadata mediante imports encadenados.
    import app.models  # noqa: E402, F401

    # Verificación explícita: importar cada modelo individualmente
    from app.models.user import User  # noqa: F401
    from app.models.organization import Organization, OrganizationUser  # noqa: F401
    from app.models.event import Event  # noqa: F401
    from app.models.transaction import Transaction  # noqa: F401
    from app.models.raffle import Raffle, RaffleNumber, RafflePurchase  # noqa: F401
    from app.models.member_sales import MemberSales  # noqa: F401
    from app.models.draw import Draw  # noqa: F401

    ok(f"Modelos registrados en metadata: {len(Base.metadata.tables)} tablas.")

except ImportError as exc:
    err(f"Error importando modelos: {exc}")
    dim("Verificá que todas las dependencias estén instaladas:")
    dim("  pip install -r requirements.txt")
    sys.exit(1)

# Listar tablas y enums a crear
_tables = sorted(Base.metadata.tables.keys())
info(f"Tablas detectadas ({len(_tables)}):")
for t in _tables:
    dim(t)

# ══════════════════════════════════════════════════════════════════════════════
# PASO 3 — Crear tablas en la base de datos
# ══════════════════════════════════════════════════════════════════════════════

step("3 / 4  Creando tablas en la base de datos")

try:
    from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402
except ImportError:
    err("sqlalchemy no está instalado.")
    dim("  pip install sqlalchemy asyncpg")
    sys.exit(1)


async def run_create_all() -> dict:
    """
    Crea todas las tablas.
    Devuelve estadísticas: tablas nuevas, ya existentes, tiempo.
    """
    t_start = time.perf_counter()

    engine = create_async_engine(
        _DATABASE_URL,
        echo=False,  # No spam de SQL en la consola
        pool_pre_ping=True,
        # Pool mínimo para un script de una sola ejecución
        pool_size=1,
        max_overflow=0,
    )

    created: list[str] = []
    already: list[str] = []

    async with engine.begin() as conn:

        # ── Identificar qué tablas YA existen antes de create_all ────────────
        existing_before: set[str] = set(
            await conn.run_sync(
                lambda sync_conn: {
                    t
                    for t in Base.metadata.tables
                    if sync_conn.dialect.has_table(sync_conn, t)
                }
            )
        )

        # ── Crear tablas faltantes (checkfirst=True = no error si ya existe) ─
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)

        # ── Identificar qué tablas existen ahora ─────────────────────────────
        existing_after: set[str] = set(
            await conn.run_sync(
                lambda sync_conn: {
                    t
                    for t in Base.metadata.tables
                    if sync_conn.dialect.has_table(sync_conn, t)
                }
            )
        )

    await engine.dispose()

    created = sorted(existing_after - existing_before)
    already = sorted(existing_before)
    elapsed = time.perf_counter() - t_start

    return {"created": created, "already": already, "elapsed": elapsed}


# ─── Ejecutar ─────────────────────────────────────────────────────────────────
try:
    stats = asyncio.run(run_create_all())

except Exception as exc:
    _msg = str(exc)
    err("Error al conectar o crear tablas:")
    print()

    # Mensajes de ayuda específicos para errores comunes
    if "password authentication failed" in _msg or "role" in _msg.lower():
        warn("Credenciales incorrectas.")
        dim("Verificá usuario y contraseña en tu DATABASE_URL.")

    elif "could not connect to server" in _msg or "Connection refused" in _msg:
        warn("No se pudo conectar al servidor.")
        dim("Verificá que el host y puerto sean correctos.")
        dim("Para Supabase: db.TU-REF.supabase.co:5432")

    elif "ssl" in _msg.lower() or "SSL" in _msg:
        warn("Error de SSL.")
        dim("Intentá añadir ?ssl=require al final de tu DATABASE_URL.")

    elif "asyncpg" in _msg.lower():
        warn("Driver asyncpg no instalado.")
        dim("  pip install asyncpg")

    elif "does not exist" in _msg and "database" in _msg:
        warn("La base de datos no existe.")
        dim("Verificá el nombre de la base en tu URL (normalmente 'postgres').")

    else:
        dim(f"Detalle: {_msg}")

    print()
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════════════
# PASO 4 — Reporte final
# ══════════════════════════════════════════════════════════════════════════════

step("4 / 4  Resultado")
ruler()

if stats["created"]:
    print(f"\n  {GREEN}{BOLD}Tablas NUEVAS creadas ({len(stats['created'])}){RESET}")
    for t in stats["created"]:
        ok(t)

if stats["already"]:
    print(f"\n  {CYAN}Tablas YA existentes ({len(stats['already'])}){RESET}")
    for t in stats["already"]:
        dim(f"  {t}  (sin cambios)")

ruler()
total = len(stats["created"]) + len(stats["already"])
print(
    f"\n  {GREEN}{BOLD}✓ Completado en {stats['elapsed']:.2f}s — "
    f"{total} tabla(s) en total.{RESET}\n"
)

if stats["created"]:
    print(f"  {YELLOW}Próximos pasos sugeridos:{RESET}")
    dim("  1. Configurar Row Level Security (RLS) en Supabase si es necesario.")
    dim("  2. Ejecutar el backend: uvicorn app.main:app --reload")
    dim("  3. Crear el primer usuario vía POST /api/v1/auth/register")
    print()
