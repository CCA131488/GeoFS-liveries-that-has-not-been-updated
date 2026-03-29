name: Livery Updates

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  send-message:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Fetch latest livery.json
        run: |
          # 从主分支获取最新文件
          curl -s -o new_livery.json https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/main/livery.json
          
          # 如果仓库里已有 livery.json 就用作旧文件，否则创建空旧文件
          if [ -f livery.json ]; then
            cp livery.json old_livery.json
          else
            echo '{"aircrafts":{}}' > old_livery.json
          fi

      - name: Send Discord Embed
        env:
          DISCORD_WEBHOOK: ${{ secrets.liveryupdates }}
        run: |
          python3 - <<'EOF'
import json
import requests

num_map = {0: ':zero:', 1: ':one:', 2: ':two:', 3: ':three:', 4: ':four:',
           5: ':five:', 6: ':six:', 7: ':seven:', 8: ':eight:', 9: ':nine:'}

def emoji_number(n):
    return ''.join(num_map[int(d)] for d in str(n))

# Load JSON files
with open('new_livery.json') as f:
    new_json = json.load(f)
with open('old_livery.json') as f:
    old_json = json.load(f)

diff_data = []
total_count = 0

for plane, plane_data in new_json['aircrafts'].items():
    addition = []
    for livery in plane_data['liveries']:
        if livery not in old_json['aircrafts'].get(plane, {}).get('liveries', []):
            addition.append(livery)
    if addition:
        diff_data.append({'name': plane_data.get('name', plane), 'addition': addition})
        total_count += len(addition)

if diff_data:
    webhook_url = '${{ secrets.liveryupdates }}'
    for plane in diff_data:
        embed = {
            "username": "livery updates",
            "embeds": [{
                "title": plane['name'],
                "color": 0x25405E,
                "fields": [{
                    "name": "New liveries",
                    "value": '\n'.join(f"{l['name']} *by: {l.get('credits','??')}*" for l in plane['addition']),
                    "inline": False
                }]
            }]
        }
        requests.post(webhook_url, json=embed)

    embed_total = {
        "username": "livery updates",
        "embeds": [{
            "title": "Total",
            "color": 0x25405E,
            "fields": [{
                "name": "Number of new liveries",
                "value": f"{emoji_number(total_count)}",
                "inline": False
            }]
        }]
    }
    requests.post(webhook_url, json=embed_total)
else:
    print("No new liveries found.")
EOF

      - name: Update livery.json in repository
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@users.noreply.github.com"
          cp new_livery.json livery.json
          git add livery.json
          git commit -m "Update livery.json"
          git push origin main
