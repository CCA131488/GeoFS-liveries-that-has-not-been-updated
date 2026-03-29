import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

LIVERY_UPDATE_WEBHOOK = os.environ["LIVERYUPDATES"]

# 文件路径
old_json_file = ".webhook/old_livery.json"
os.makedirs(".webhook", exist_ok=True)

# 读取上次的 livery.json
if os.path.exists(old_json_file):
    with open(old_json_file, "r", encoding="utf-8") as f:
        old_json = json.load(f)
else:
    old_json = {"aircrafts": {}}

# 获取最新 livery.json
new_json_url = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/main/livery.json"
new_json = json.loads(requests.get(new_json_url).content)

num_map = {0: ":zero:", 1: ":one:", 2: ":two:", 3: ":three:", 4: ":four:",
           5: ":five:", 6: ":six:", 7: ":seven:", 8: ":eight:", 9: ":nine:"}
def emoji_number(n):
    return ''.join(num_map[int(d)] for d in str(n))

# 找出新增的涂装
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

# 如果有新增涂装，发送消息
if diff_data:
    # 标题 embed
    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
    embed = DiscordEmbed(title="Livery Updates", color=embed_color)
    webhook.add_embed(embed)
    webhook.execute()

    # 仅发送有新增涂装的机型
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

# 保存最新 livery.json，用于下次 diff
with open(old_json_file, "w", encoding="utf-8") as f:
    json.dump(new_json, f, ensure_ascii=False, indent=2)
