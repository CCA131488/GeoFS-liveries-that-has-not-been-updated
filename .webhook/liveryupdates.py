import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

LIVERY_UPDATE_WEBHOOK = os.environ["LIVERYUPDATES"]

commit_file = ".webhook/commit.txt"

if os.path.exists(commit_file):
    with open(commit_file, "r") as f:
        old_commit_id = f.read().strip()
else:
    old_commit_id = None

new_json_url = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/main/livery.json"
new_json = json.loads(requests.get(new_json_url).content)

if old_commit_id:
    old_json_url = f"https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/{old_commit_id}/livery.json"
    try:
        old_json = json.loads(requests.get(old_json_url).content)
    except:
        old_json = {"aircrafts": {}}
else:
    old_json = {"aircrafts": {}}

num_map = {0: ":zero:", 1: ":one:", 2: ":two:", 3: ":three:", 4: ":four:",
           5: ":five:", 6: ":six:", 7: ":seven:", 8: ":eight:", 9: ":nine:"}

def emoji_number(n):
    return ''.join(num_map[int(d)] for d in str(n))

diff_data = []
total = 0
for plane, plane_data in new_json.get("aircrafts", {}).items():
    addition = []
    for livery in plane_data.get("liveries", []):
        if livery not in old_json.get("aircrafts", {}).get(plane, {}).get("liveries", []):
            addition.append(livery)
    if addition:
        diff_data.append({"name": plane_data.get("name", plane), "addition": addition})
        total += len(addition)

embed_color = int("242429", 16)

if diff_data:
    for i, plane in enumerate(diff_data):
        webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
        embed = DiscordEmbed(title="livery updates", color=embed_color)
        livery_list = ""
        for l in plane["addition"]:
            try:
                livery_list += f'{l["name"]} *by: {l.get("credits","??")}*\n'
            except:
                livery_list += f'{l["name"]} *by: ??*\n'

        # 如果是最后一条 embed，加上总数
        if i == len(diff_data) - 1:
            livery_list += f"\n**Total: {emoji_number(total)}**"

        embed.add_embed_field(name=plane["name"], value=livery_list.strip(), inline=False)
        webhook.add_embed(embed)
        webhook.execute()
else:
    print("No new liveries found.")

os.makedirs(".webhook", exist_ok=True)
with open(".webhook/commit.txt", "w") as f:
    f.write(os.environ.get("GITHUB_SHA", "main"))
