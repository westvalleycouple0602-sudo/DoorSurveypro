import time
class Circuit:
    def __init__(self, fail_threshold=5, reset_after=30):
        self.failures, self.open_until = 0, 0
        self.fail_threshold, self.reset_after = fail_threshold, reset_after
    def call(self, fn, *a, **k):
        now = time.time()
        if now < self.open_until:
            raise RuntimeError("CIRCUIT_OPEN")
        try:
            r = fn(*a, **k); self.failures = 0; return r
        except Exception:
            self.failures += 1
            if self.failures >= self.fail_threshold:
                self.open_until = now + self.reset_after
            raise
