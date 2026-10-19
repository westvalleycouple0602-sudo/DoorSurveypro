import argparse, sys, time
def run():
    t0 = time.time()
    time.sleep(0.5); time.sleep(0.5); time.sleep(0.5)
    dt = time.time() - t0
    print({"synthetic_total_sec": round(dt,2)})
    return 0
if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("--headless", action="store_true"); args = parser.parse_args(); sys.exit(run())
