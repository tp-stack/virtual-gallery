import json

d = json.load(open("public/data/artworks.json"))
fixed = 0
for a in d["artworks"]:
    u3 = a.get("image_url_3d", "")
    u = a.get("image_url", "")
    hd = a.get("image_url_hd", "")

    if "400px-" in u3:
        if hd and "400px" not in hd:
            a["image_url_3d"] = hd
        else:
            a["image_url_3d"] = u
        fixed += 1
        print("Fixed:", a["id"])

    if "/400,/0/" in u3:
        a["image_url_3d"] = u3.replace("/400,/0/", "/800,/0/")
        fixed += 1
        print("Fixed AIC:", a["id"])

json.dump(d, open("public/data/artworks.json", "w"), indent=2)
print("Done - fixed", fixed, "URLs")
