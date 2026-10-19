
from typing import List, Dict

def size_psu(loads: List[Dict]):
    total_inrush = sum(l.get('inrush_A',0) for l in loads if l.get('concurrent', True))
    total_hold = sum(l.get('hold_A',0) for l in loads)
    rating_inrush = total_inrush * 1.25
    rating_hold = total_hold * 1.5
    return {
        "total_inrush": round(total_inrush, 3),
        "total_hold": round(total_hold, 3),
        "recommended_A": round(max(rating_inrush, rating_hold), 3)
    }

# Example:
if __name__ == "__main__":
    example = [
        {"name":"99EL", "inrush_A":1.6, "hold_A":0.2, "concurrent": True},
        {"name":"M62", "inrush_A":0.5, "hold_A":0.5, "concurrent": True},
        {"name":"HES 5200", "inrush_A":0.24, "hold_A":0.12, "concurrent": True},
    ]
    print(size_psu(example))
