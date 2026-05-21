import urllib.request, json, ssl, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

results = []

tests = [
    ("Rijksmuseum search", "https://data.rijksmuseum.nl/search/collection?q=painting&format=json&ps=3"),
    ("SMK Denmark", "https://api.smk.dk/api/v1/art?keys=*&rows=3&has_image=true"),
    ("Nat Gallery London", "https://data.ng-london.org.uk/collection.json"),
    ("Getty Museum", "https://data.getty.edu/museum/collection/object?limit=3"),
    ("Finna Finland", "https://api.finna.fi/v1/search?lookfor=painting&limit=3"),
    ("Science Museum Group", "https://collection.sciencemuseumgroup.org.uk/search?q=painting&limit=3"),
    ("Walters Art Museum", "https://api.thewalters.org/v1/objects?limit=3"),
    ("Nationalmuseum Sweden", "https://api.nationalmuseum.se/api/objects?limit=3"),
    ("Finnish National Gallery", "https://kokoelma.kansallisgalleria.fi/api/v1/objects?limit=3"),
]

for name, url in tests:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        raw = resp.read().decode("utf-8", errors="replace")
        data = json.loads(raw)
        keys = list(data.keys())[:3]
        status = resp.status
        info = f"keys={keys}"
        if isinstance(data, dict):
            for k in ["count", "total", "totalResults", "info", "totalItems", "numFound", "results"]:
                if k in data:
                    v = data[k]
                    if isinstance(v, dict):
                        info += f" {k}={list(v.keys())[:2]}"
                    elif isinstance(v, int):
                        info += f" {k}={v}"
                    elif isinstance(v, list):
                        info += f" {k}={len(v)} items"
        results.append(f"  OK  {name}: {status} {info}")
    except urllib.error.HTTPError as e:
        results.append(f"  {e.code} {name}")
    except Exception as e:
        results.append(f"  ?   {name}: {str(e)[:80]}")

for r in results:
    print(r)
