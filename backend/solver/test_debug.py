import sqlite3
import json

# Connect directly to database
db = sqlite3.connect('../rosterpro.db')
db.row_factory = sqlite3.Row

shops = db.execute('SELECT * FROM shops WHERE isActive = 1').fetchall()

for shop in shops:
    name = shop['name']
    cfg_raw = shop['staffingConfig']
    if cfg_raw:
        cfg = json.loads(cfg_raw)
        ws = cfg.get('weeklySchedule', [])
        if ws:
            mon = ws[0]
            print(f"{name}: Mon minAM={mon.get('minAM')} minPM={mon.get('minPM')}")
        else:
            print(f"{name}: NO weeklySchedule!")
    else:
        print(f"{name}: NO staffingConfig!")
