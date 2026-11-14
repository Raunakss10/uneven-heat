import pandas as pd, numpy as np, glob, os, json
models = sorted({os.path.basename(f).split('_')[0] for f in glob.glob('data/tas/*.csv')})
scen = ['historical','ssp126','ssp245','ssp370','ssp585']

def load(v):
    out = {}
    for m in models:
        for s in scen:
            df = pd.read_csv(f'data/{v}/{m}_{s}.csv', comment='#')
            df['year'] = df['date'].str[:4].astype(int)
            ann = df.drop(columns='date').groupby('year').mean()
            out[(m, s)] = ann
    return out

tas, pr = load('tas'), load('pr')
regions = [c for c in tas[(models[0],'historical')].columns if c != 'world']

rows = []
for v, d in [('tas', tas), ('pr', pr)]:
    for m in models:
        h = d[(m,'historical')]
        for s in scen[1:]:
            full = pd.concat([h, d[(m,s)]])
            full = full[~full.index.duplicated()]
            if v == 'tas':
                base = full.loc[1850:1900].mean()
                anom = full - base
            else:
                base = full.loc[1995:2014].mean()
                anom = (full / base - 1) * 100
            anom = anom.loc[1850:2100]
            a = anom.stack().reset_index(); a.columns = ['year','region','value']
            a['model'] = m; a['scenario'] = s; a['var'] = v
            rows.append(a)
long = pd.concat(rows)
long.to_pickle('long.pkl')
print(long.shape, models)
