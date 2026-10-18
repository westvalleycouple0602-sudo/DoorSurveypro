import os
def is_truthy(v: str | None) -> bool:
    return str(v).lower() in {"1","true","yes","y","on"}
ENV = os.getenv("ENV", "dev")
RELEASE = os.getenv("RELEASE_SHA", "dev")
