import urllib.request, json

# Test various museum APIs for free/public access
tests = [
    ("Rijksmuseum (0fiuZFh4)", "https://www.rijksmuseum.nl/api/en/collection?key=0fiuZFh4&ps=3&imgonly=true"),
    ("Rijksmuseum (test)", "https://www.rijksmuseum.nl/api/en/collection?key=test&ps=3&imgonly=true"),
    ("Harvard Art Museums", "https://api.harvardartmuseums.org/object?size=3"),
    ("Harvard (apikey=d174b7cd)", "https://api.harvardartmuseums.org/object?apikey=d174b7cd-f4cc-44c0-b0d8-0f6d35b4b8ad&size=3"),
    ("Smithsonian", "https://api.si.edu/openaccess/api/v1.0/search?q=painting&rows=3"),
    ("Smithsonian (demo)", "https://api.si.edu/openaccess/api/v1.0/search?q=painting&rows=3&api_key=demo"),
]

for name, url in tests:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        success = resp.status == 200
        info = ""
        if "count" in data:
            info = f"count={data['count']}"
        elif "info" in data:
            info = f"total={data['info'].get('totalrecords', '?')}"
        elif "response" in data:
            r = data["response"]
            info = f"results={r.get('numFound', '?')}"
        elif "records" in data:
            info = f"records={len(data['records'])}"
        print(f"  OK  {name}: {info}" if success else f"  ERR {name}: {resp.status}")
    except Exception as e:
        code = getattr(e, "code", None) if hasattr(e, "code") else "?"
        print(f"  {code} {name}: {str(e)[:60]}")
