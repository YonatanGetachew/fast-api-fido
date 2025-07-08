from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, Integer, String, LargeBinary, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fido2.server import Fido2Server
from fido2.webauthn import PublicKeyCredentialRpEntity, UserVerificationRequirement
from fido2 import cbor
from fido2.utils import websafe_encode
import os
import traceback

# Database setup
DATABASE_URL = "sqlite:///./fido_users.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class UserCredential(Base):
    __tablename__ = "usercredential"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    credential_data = Column(LargeBinary, nullable=False)
    sign_count = Column(Integer, nullable=False)

Base.metadata.create_all(bind=engine)

# FastAPI app setup
app = FastAPI()
#frontend_path = os.path.join(os.path.dirname(__file__), "frontend_build")
#app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FIDO2 server setup
rp = PublicKeyCredentialRpEntity(id="localhost", name="Fayda Resident Portal Demo")
server = Fido2Server(rp)

# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# In-memory state store
state_store = {}

def jsonify_registration_options(options):
    def convert(obj):
        if isinstance(obj, bytes):
            return websafe_encode(obj).decode()
        elif isinstance(obj, dict):
            return {k: convert(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert(i) for i in obj]
        else:
            return obj
    return convert(options)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/register/begin")
async def register_begin(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    username = data.get("username")
    display_name = data.get("displayName", username)

    if not username:
        return Response(cbor.encode({"error": "Username required"}), media_type="application/cbor", status_code=400)

    user = {
        "id": username.encode("utf-8"),
        "name": username,
        "displayName": display_name,
    }

    registration_data, state = server.register_begin(
        user,   
        user_verification=UserVerificationRequirement.PREFERRED
    )

    state_store[username] = state

    jsonified = jsonify_registration_options(registration_data)
    return Response(cbor.encode(jsonified), media_type="application/cbor")

@app.post("/register/complete")
async def register_complete(request: Request, db: Session = Depends(get_db)):
    try:
        data = cbor.decode(await request.body())
        username = data.get("username")
        state = state_store.get(username)

        if not state:
            return Response(cbor.encode({"error": "Session expired or invalid"}), media_type="application/cbor", status_code=400)

        auth_data = server.register_complete(state, data)
        sign_count = getattr(auth_data, 'sign_count', 0)

        existing = db.query(UserCredential).filter_by(username=username).first()
        if not existing:
            cred = UserCredential(
                username=username,
                credential_data=auth_data.credential_data,
                sign_count=sign_count
            )
            db.add(cred)
        else:
            existing.credential_data = auth_data.credential_data
            existing.sign_count = sign_count

        db.commit()

        return Response(cbor.encode({"status": "Registration successful"}), media_type="application/cbor")

    except Exception as e:
        traceback.print_exc()
        return Response(cbor.encode({"error": str(e)}), media_type="application/cbor", status_code=500)
