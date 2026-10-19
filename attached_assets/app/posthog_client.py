import os
from posthog import Posthog
HOST = os.getenv("POSTHOG_HOST"); KEY = os.getenv("POSTHOG_PROJECT_API_KEY")
posthog = Posthog(project_api_key=KEY, host=HOST) if HOST and KEY else None
def capture(distinct_id: str, event: str, **props):
    if posthog:
        posthog.capture(distinct_id, event, properties=props)
