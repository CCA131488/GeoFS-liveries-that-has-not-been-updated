import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

LIVERY_UPDATE_WEBHOOK = os.environ.get("LIVERYUPDATES")
if not LIVERY_UPDATE_WEBHOOK:
    print("❌ LIVERYUPDATES secret is not set!")
    exit(1)

commit_file = ".webhook/commit.txt"
old_commit_id = None
if os.path.exists(commit_file):
    with open(commit_file, "r") as f:
        old_commit_id = f.read().strip()

new_json_url = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/main/livery.json"
new_json = json.loads(requests.get(new_json_url).content)

send_all = False
old_json = {"aircrafts": {}}

if old_commit_id:
    old_json_url = f"https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/{old_commit_id}/livery.json"
    try:
        old_json = json.loads(requests.get(old_json_url).content)
    except Exception as e:
        print(f"⚠️ Failed to load old JSON: {e}, sending all liveries")
        send_all = True
else:
    send_all = True

num_map = {0: ":zero:", 1: ":one:", 2: ":two:", 3: ":three:", 4: ":four:",
           5: ":five:", 6: ":six:", 7: ":seven:", 8: ":eight:", 9: ":nine:"}
def emoji_number(n):
    return ''.join(num_map[int(d)] for d in str(n))

diff_data = []
total = 0
for plane, plane_data in new_json.get("aircrafts", {}).items():
    addition = []
    for livery in plane_data.get("liveries", []):
        if send_all or livery not in old_json.get("aircrafts", {}).get(plane, {}).get("liveries", []):
            addition.append(livery)
    if addition:
        diff_data.append({"name": plane_data.get("name", plane), "addition": addition})
        total += len(addition)

print(f"Total new liveries: {total}")

if diff_data:
    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
    embed = DiscordEmbed(title="livery updates", color=int("242429", 16))

    for plane in diff_data:
        livery_list = ""
        for l in plane["addition"]:
            livery_list += f'{l.get("name","Unknown")} *by: {l.get("credits","??")}*\n'
        embed.add_embed_field(name=plane["name"], value=livery_list.strip(), inline=False)

    embed.add_embed_field(name="Total new liveries", value=emoji_number(total), inline=False)
    webhook.add_embed(embed)
    response = webhook.execute()
    print(f"Discord response status: {response.status_code if response else 'No response'}")
else:
    print("No new liveries found.")

os.makedirs(".webhook", exist_ok=True)
with open(".webhook/commit.txt", "w") as f:
    f.write(os.environ.get("GITHUB_SHA", "main"))
