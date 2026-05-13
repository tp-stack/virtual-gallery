import json, re

d = json.load(open("public/data/artworks.json"))
fixed = 0
for a in d["artworks"]:
    u3 = a.get("image_url_3d", "")
    if "/thumb/" in u3:
        parts = u3.split("/thumb/")
        if len(parts) == 2:
            path_and_file = parts[1]
            segs = path_and_file.split("/")
            filename = segs[-1]
            filename = re.sub(r"^\d+px-", "", filename)
            segs[-1] = filename
            new_url = "https://upload.wikimedia.org/wikipedia/commons/" + "/".join(segs)
            a["image_url_3d"] = new_url
            fixed += 1
            print(f"Fixed: {a['id']}")

json.dump(d, open("public/data/artworks.json", "w"), indent=2)
print(f"Done - fixed {fixed} URLs")
