import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

tests = [
    ("Wellcome Collection", "https://api.wellcomecollection.org/catalogue/v2/works?images=true&pageSize=3"),
    ("National Gallery of Art (US)", "https://www.nga.gov/api/v1/collection?limit=3"),
    ("British Museum", "https://collectionapi.metmuseum.org/public/collection/v1/search?q=painting"), # already have
    ("Europeana (test key)", "https://api.europeana.eu/record/v2/search.json?query=*&rows=3&wskey=apidemo"),
    ("Cooper Hewitt (public)", "https://collection.cooperhewitt.org/api/rest/?method=cooperhewitt.search.objects&page=1&per_page=3"),
    ("Brooklyn Museum", "https://www.brooklynmuseum.org/api/objects?limit=3"),
    ("MFA Boston", "https://collections.mfa.org/api/objects?limit=3"),
    ("Yale Art Gallery", "https://api.art.yale.edu/v1/objects?limit=3"),
]

for name, url in tests:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        data = json.loads(resp.read().decode("utf-8", errors="replace"))
        info = str(list(data.keys())[:3]) if isinstance(data, dict) else f"[{len(data)} items]"
        print(f"  OK  {name}: {resp.status} {info[:80]}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:80]
        print(f"  {e.code} {name}: {body}")
    except Exception as e:
        print(f"  ?  {name}: {str(e)[:80]}")
