import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

WEBHOOK = os.environ["LIVERYUPDATES"]

commit_file = ".webhook/commit.txt"

if os.path.exists(commit_file):
    with open(commit_file, "r") as f:
        commit_id = f.read().strip()
else:
    commit_id = None

new_json = json.loads(requests.get(
    "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/main/livery.json"
).content)

if commit_id:
    try:
        old_json = json.loads(requests.get(
            f"https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/{commit_id}/livery.json"
        ).content)
    except:
        old_json = {"aircrafts": {}}
else:
    old_json = {"aircrafts": {}}

num_map = {
    "0": ":zero:", "1": ":one:", "2": ":two:", "3": ":three:", "4": ":four:",
    "5": ":five:", "6": ":six:", "7": ":seven:", "8": ":eight:", "9": ":nine:"
}

def emoji_number(n):
    return ''.join(num_map[d] for d in str(n))

diff_data = []
total = 0

for plane, plane_data in new_json["aircrafts"].items():
    addition = []

    for livery in plane_data["liveries"]:
        if livery not in old_json.get("aircrafts", {}).get(plane, {}).get("liveries", []):
            addition.append(livery)

    if addition:
        diff_data.append({
            "name": plane_data.get("name", plane),
            "addition": addition
        })
        total += len(addition)

color = int("242429", 16)

if diff_data:
    webhook = DiscordWebhook(url=WEBHOOK)
    embed = DiscordEmbed(title="livery update", color=color)
    webhook.add_embed(embed)
    webhook.execute()

    for plane in diff_data:
        webhook = DiscordWebhook(url=WEBHOOK)
        embed = DiscordEmbed(color=color)

        text = ""
        for l in plane["addition"]:
            text += f'{l.get("name")} *by: {l.get("credits","??")}*\n'

        embed.add_embed_field(name=plane["name"], value=text.strip(), inline=False)
        webhook.add_embed(embed)
        webhook.execute()

    webhook = DiscordWebhook(url=WEBHOOK)
    embed = DiscordEmbed(title="Total", color=color)
    embed.add_embed_field(name="Number of new liveries", value=emoji_number(total), inline=False)
    webhook.add_embed(embed)
    webhook.execute()

else:
    print("No new liveries found.")
