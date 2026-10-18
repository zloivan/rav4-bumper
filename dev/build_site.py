"""Собирает site/index.html и site/data.json из dev/site_template.html + dev/tasks.js + dev/data.py.
ВНИМАНИЕ: перезаписывает site/data.json данными из data.py (свежие объявления из fresh пропадут).
Обычно достаточно править site/data.json напрямую; этот скрипт нужен, когда меняется вёрстка/код страницы.
Запуск из корня репозитория:  python3 dev/build_site.py [--keep-data]
"""
import sys, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from data import DATA, dump
keep = '--keep-data' in sys.argv
data_path = os.path.join(ROOT, 'site', 'data.json')
if keep and os.path.exists(data_path):
    data = json.load(open(data_path, encoding='utf-8'))
else:
    data = dict(DATA); data.setdefault('chatEndpoint', None); data.setdefault('sources', {})
s = open(os.path.join(HERE, 'site_template.html'), encoding='utf-8').read()
s = s.replace('/*__TASKS__*/', open(os.path.join(HERE, 'tasks.js'), encoding='utf-8').read().strip())   # парктроники и стекло
s = s.replace('__DAMAGE_B64__', open(os.path.join(HERE, 'damage.b64')).read().strip()).replace('__DATA__', dump(data))
s = s.replace("window.__quest = {total, issues, OFFERS, get S(){ return S; }};\n", "")
cut = s.index('<div class="wrap" id="app"')
head, body = s[:cut], s[cut:]
doc = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       '<meta name="robots" content="noindex,nofollow">\n'
       '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
       + head + '</head>\n<body>\n' + body + '\n</body>\n</html>\n')
open(os.path.join(ROOT, 'site', 'index.html'), 'w', encoding='utf-8').write(doc)
if not keep:
    open(data_path, 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
print('site built', len(doc), '(data kept)' if keep else '(data from data.py)')
