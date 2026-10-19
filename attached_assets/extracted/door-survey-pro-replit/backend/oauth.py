from datetime import datetime, timedelta
from typing import Optional

def will_expire_soon(expires_at: Optional[datetime]) -> bool:
    if not expires_at:
        return False
    return expires_at <= datetime.utcnow() + timedelta(minutes=5)
