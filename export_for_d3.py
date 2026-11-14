import pandas as pd, json
l = pd.read_pickle('long.pkl')
names = {f['properties']['Acronym']: f['properties']['Name'].replace('-', ' ') for f in json.load(open('regions_full.geojson'))['features']}
names['world'] = 'World (global mean)'
out = {'years': list(range(1950, 2101)), 'names': names, 'tas': {}, 'pr': {}}
for v in ['tas', 'pr']:
    d = l[l['var'] == v]
    piv = d.pivot_table(index='year', columns=['scenario', 'region', 'model'], values='value')
    sm = piv.rolling(10, center=True, min_periods=1).mean().loc[1950:2100]
    for (s, r), sub in sm.T.groupby(level=[0, 1]):
        sub = sub.T
        rr = lambda x: [round(float(a), 2) for a in x]
        out[v].setdefault(r, {})[s] = {'mean': rr(sub.mean(axis=1)), 'lo': rr(sub.min(axis=1)), 'hi': rr(sub.max(axis=1))}
json.dump(out, open('data.json', 'w'), separators=(',', ':'))
w = out['tas']['world']
for s in w: print(s, w[s]['mean'][2100-1950], w[s]['mean'][2024-1950])
