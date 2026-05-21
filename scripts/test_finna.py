import urllib.request, json

# Check Finna with image filter
url = "https://api.finna.fi/v1/search?lookfor=painting&limit=10&field[]=title&field[]=images&field[]=buildings&field[]=year&filter[]=~imageCount%3A%5B1%20TO%20*%5D"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
resp = urllib.request.urlopen(req, timeout=10)
raw = resp.read().decode("utf-8", "replace")
data = json.loads(raw)
print(f"Total: {data['resultCount']}")
for r in data["records"][:3]:
    images = r.get("images", [])
    print(f"  {r.get('title','?')[:50]} | images={len(images)}")
    if images:
        print(f"    URL: {images[0]}")
