import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test(name, url, check=None):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "VirtualGallery/1.0"})
        resp = urllib.request.urlopen(req, timeout=15, context=ctx)
        raw = resp.read().decode("utf-8", "replace")
        if check:
            result = check(raw)
            if result:
                print(f"  OK  {name}: {result}")
        else:
            data = json.loads(raw)
            if isinstance(data, dict):
                print(f"  OK  {name}: keys={list(data.keys())[:3]}")
            else:
                print(f"  OK  {name}: {len(data)} items")
    except urllib.error.HTTPError as e:
        print(f"  {e.code} {name}")
    except Exception as e:
        print(f"  ?   {name}: {str(e)[:80]}")

# Test all no-key-required APIs from the CSV
tests = [
    ("Rijksmuseum search", "https://data.rijksmuseum.nl/search/collection?q=painting&format=json&ps=3"),
    ("Getty SPARQL", "https://data.getty.edu/museum/collection/sparql?query=SELECT+?s+WHERE+{+?s+a+<http://cidoc-crm.org/cidoc-crm/E22_Man-Made_Object>+}+LIMIT+10&format=json"),
    ("RISD Museum", "https://risdmuseum.org/api/v1/collection?limit=3"),
    ("Science Museum Group", "https://collection.sciencemuseumgroup.org.uk/search?q=painting&limit=3"),
    ("Nat Gallery London", "https://data.ng-london.org.uk/collection.json"),
    ("Joconde (data.culture)", "https://data.culture.gouv.fr/api/explore/v2.1/catalog/datasets/base-joconde-extrait/records?limit=3"),
    ("Paris Musees", "https://apicollections.parismusees.paris.fr/graphql"),
    ("Wikimedia Commons", "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=painting&format=json&srlimit=3"),
    ("Wikidata SPARQL", "https://query.wikidata.org/sparql?format=json&query=SELECT+?item+?itemLabel+WHERE+{+?item+wdt:P31+wdt:Q3305213++SERVICE+wikibase:label+{+bd:serviceParam+wikibase:language+%22en%22.+}+}+LIMIT+10"),
    ("Finna", "https://api.finna.fi/v1/search?lookfor=painting&limit=3&field[]=title&field[]=images"),
    ("Nationalmuseum Sweden", "https://api.nationalmuseum.se/api/objects?limit=3"),
    ("DigitaltMuseum", "https://digitaltmuseum.org/search?q=painting&limit=3"),
    ("Nasjonalmuseet", "https://api.nasjonalmuseet.no/collection?limit=3"),
    ("Open Cultuur Data", "https://www.opencultuurdata.nl/api-english/"),
]

for name, url in tests:
    test(name, url)
