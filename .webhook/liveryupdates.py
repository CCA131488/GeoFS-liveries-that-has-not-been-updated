import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

LIVERY_UPDATE_WEBHOOK = os.environ["LIVERYUPDATES"]

with open(".webhook/commit.txt", "r") as file:
    commit_id = file.read()
    print(commit_id)

new_json =  json.loads(requests.get("https://raw.githubusercontent.com/CCA131488/
GeoFS-liveries-that-has-not-been-updated/refs/heads/main/livery.json").content)
old_json = json.loads(requests.get(f"https://raw.githubusercontent.com/CCA131488/
GeoFS-liveries-that-has-not-been-updated/{commit_id}/livery.json").content)
keys = new_json["aircrafts"].keys()

num_map = {
    "0": ":zero:", "1": ":one:", "2": ":two:", "3": ":three:", "4": ":four:",
    "5": ":five:", "6": ":six:", "7": ":seven:", "8": ":eight:", "9": ":nine:"
}

def emoji_number(n):
    return ''.join(num_map[d] for d in str(n))

diff_data = []
for plane in keys:
    addition = []
    for livery in new_json["aircrafts"][plane]["liveries"]:
        try: 
            if not livery in old_json["aircrafts"][plane]["liveries"]:
                addition.append(livery)
        except KeyError:
            addition.append(livery)
    try:
        data = {"name": new_json["aircrafts"][plane]["name"], "addition": addition}
    except KeyError:
        data = {"name": plane, "addition": addition}
    if addition:
        diff_data.append(data)

print(diff_data)

total = 0

# 关键：纯色 #242429
color = int("242429", 16)

if diff_data:
    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
    embed = DiscordEmbed(title=f"livery update", color=color)
    webhook.add_embed(embed)
    webhook.execute()

    for plane in diff_data:
        webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
        embed = DiscordEmbed(color=color)
        livery_list = ""
        for livery in plane["addition"]:
            total += 1
            try:
                livery_list += f'{livery["name"]} *by: {livery["credits"]}*\n'
            except KeyError:
                livery_list += f'{livery["name"]} *by: ??*\n'
        embed.add_embed_field(name=plane["name"], value=livery_list.strip(), inline=False)
        webhook.add_embed(embed)
        webhook.execute()

    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
    embed = DiscordEmbed(title=f"Total: {emoji_number(total)}", color=color)
    webhook.add_embed(embed)
    webhook.execute()
