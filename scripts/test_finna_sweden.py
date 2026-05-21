import urllib.request, json

# Test Finna and Sweden in detail
tests = [
    ("Finna", "https://api.finna.fi/v1/search?lookfor=painting&limit=5&field[]=title&field[]=images&field[]=buildings&field[]=year"),
    ("Nationalmuseum Sweden", "https://api.nationalmuseum.se/api/objects?limit=5"),
]

for name, url in tests:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        raw = resp.read().decode("utf-8", "replace")
        data = json.loads(raw)
        if "records" in data:
            count = data["resultCount"]
            print(f"Finna: {count} results")
            for r in data["records"][:2]:
                images = r.get("images", [])
                title = r.get("title", "?")
                year = r.get("year", "")
                print(f"  {title[:50]} | images={len(images)} | year={year}")
        elif "data" in data:
            items = data["data"]
            print(f"Sweden: {len(items)} items")
            for i in items[:2]:
                imgs = i.get("images", [])
                img_url = imgs[0].get("url", "") if imgs else ""
                title = i.get("title", "?")
                year = i.get("year", "")
                print(f"  {title[:50]} | img={bool(img_url)} | year={year}")
    except Exception as e:
        print(f"{name}: {e}")
