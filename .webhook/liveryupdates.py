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

# 如果没有旧 commit，第一次运行发送所有 liveries
send_all = old_commit_id is None

old_json = {"aircrafts": {}}
if old_commit_id and not send_all:
    old_json_url = f"https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/{old_commit_id}/livery.json"
    try:
        old_json = json.loads(requests.get(old_json_url).content)
    except:
        send_all = True  # 旧 JSON 请求失败，全部发送

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

embed_color = int("242429", 16)

if diff_data:
    # 发送标题 embed
    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
    embed = DiscordEmbed(title="Livery Updates", color=embed_color)
    webhook.add_embed(embed)
    webhook.execute()

    # 每个机型单独 embed
    for plane in diff_data:
        webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
        embed = DiscordEmbed(color=embed_color)
        livery_list = ""
        for l in plane["addition"]:
            livery_list += f'{l.get("name","Unknown")} *by: {l.get("credits","??")}*\n'
        embed.add_embed_field(name=plane["name"], value=livery_list.strip(), inline=False)
        webhook.add_embed(embed)
        webhook.execute()

    # 最后一条 embed 显示 Total
    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
    embed = DiscordEmbed(title="Total", color=embed_color)
    embed.add_embed_field(name="Number of new liveries", value=emoji_number(total), inline=False)
    webhook.add_embed(embed)
    webhook.execute()
else:
    print("No new liveries found.")

# 保存最新 commit SHA，用于下一次 diff
os.makedirs(".webhook", exist_ok=True)
with open(".webhook/commit.txt", "w") as f:
    f.write(os.environ.get("GITHUB_SHA", "main"))
