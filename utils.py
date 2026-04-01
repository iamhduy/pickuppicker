import hashlib
from jose import JWTError, jwt
from fastapi import HTTPException, Header
from datetime import datetime, timedelta

SECRET_KEY="MSUSOCCER"

def create_jwt(user_id, user_name):
    expire_time = datetime.now() + timedelta(hours=24)
    encode_payload = {
        "id": user_id,
        "name": user_name,
        "exp": expire_time
    }
    encoded_jwt = jwt.encode(encode_payload, SECRET_KEY, "HS256")
    return encoded_jwt

def encode_pw(password: str, salt: str):
    passkey = (password + salt).encode()
    pass_encrypted = hashlib.sha256(passkey).hexdigest()
    return pass_encrypted

def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="authorization header missing")

    try:
        scheme, token = authorization.split()
        # debugging for api
        if token == "A":
            return {"role": "admin", "id": 69, "name": "ADMINDEBUG"}
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    try:
        # Decode and verify the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id: int = payload.get("id")
        name: str = payload.get("name")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {"id": user_id, "name": name}

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
