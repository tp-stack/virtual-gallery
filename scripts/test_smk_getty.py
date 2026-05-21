import urllib.request, json

tests = [
    ("SMK", "https://api.smk.dk/api/v1/art?keys=*&rows=3&has_image=true&public_domain=true"),
    ("Getty", "https://data.getty.edu/museum/collection/object?limit=3"),
]

for name, url in tests:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        raw = resp.read().decode("utf-8", "replace")
        data = json.loads(raw)
        if isinstance(data, list):
            print(f"OK {name}: {len(data)} items")
            if data:
                print(f"  keys: {list(data[0].keys())[:3]}")
        elif isinstance(data, dict):
            keys = list(data.keys())[:3]
            if "items" in data:
                print(f"OK {name}: {len(data['items'])} items")
            elif "total_item_count" in data:
                print(f"OK {name}: {data['total_item_count']} total, keys={keys}")
            else:
                print(f"OK {name}: keys={keys}")
    except Exception as e:
        code = getattr(e, "code", "?")
        print(f"{code} {name}: {str(e)[:80]}")
