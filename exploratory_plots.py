import pandas as pd, numpy as np, json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt, geopandas as gpd
from matplotlib.colors import TwoSlopeNorm

l = pd.read_pickle('long.pkl')
SC = ['ssp126','ssp245','ssp370','ssp585']
COL = {'ssp126':'#2a78d6','ssp245':'#1baf7a','ssp370':'#eda100','ssp585':'#e34948'}
LAB = {'ssp126':'SSP1-2.6 (low)','ssp245':'SSP2-4.5 (middle)','ssp370':'SSP3-7.0 (high)','ssp585':'SSP5-8.5 (highest)'}
INK, INK2, SURF, GRID = '#0b0b0b', '#52514e', '#fcfcfb', '#e4e3df'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':12,'axes.edgecolor':INK2,'axes.labelcolor':INK2,
    'xtick.color':INK2,'ytick.color':INK2,'axes.spines.top':False,'axes.spines.right':False,
    'figure.facecolor':SURF,'axes.facecolor':SURF,'axes.grid':True,'grid.color':GRID,'grid.linewidth':0.8,
    'axes.titleweight':'bold','axes.titlesize':16,'axes.titlelocation':'left','axes.titlepad':24})
NOTE = 'Data: CMIP6, 8 models (r1i1p1f1), IPCC AR6 Atlas regional means. Multi-model mean shown.'

def fin(fig, name, sub):
    fig.text(0.012, 0.005, NOTE, fontsize=9, color=INK2)
    fig.axes[0].text(0, 1.02, sub, transform=fig.axes[0].transAxes, fontsize=11, color=INK2)
    fig.savefig(f'figs/{name}.png', dpi=160, bbox_inches='tight'); plt.close(fig)

import os; os.makedirs('figs', exist_ok=True)
tas = l[l['var']=='tas']; pr = l[l['var']=='pr']
mm = lambda d: d.groupby(['scenario','region','year']).value.mean()
tas_mm = mm(tas)

fig, ax = plt.subplots(figsize=(11,6))
w = tas[tas.region=='world']
for s in SC:
    d = w[w.scenario==s].groupby('year').value
    m = d.mean().rolling(10, center=True, min_periods=1).mean()
    lo = d.min().rolling(10,center=True,min_periods=1).mean(); hi = d.max().rolling(10,center=True,min_periods=1).mean()
    fut = m.index >= 2015
    ax.fill_between(m.index[fut], lo[fut], hi[fut], color=COL[s], alpha=.12, lw=0)
    ax.plot(m.index[fut], m[fut], color=COL[s], lw=2)
    ax.text(2101, m.iloc[-1], f'{LAB[s]}  +{m.iloc[-1]:.1f}°C', color=INK, va='center', fontsize=11)
hist = w[w.scenario=='ssp245'].groupby('year').value.mean().rolling(10,center=True,min_periods=1).mean().loc[:2014]
ax.plot(hist.index, hist, color=INK2, lw=2); ax.text(1900, 0.6, 'Historical', color=INK2)
ax.axhline(1.5, color=INK2, ls=(0,(4,3)), lw=1); ax.text(1852, 1.6, 'Paris 1.5°C', color=INK2, fontsize=10)
ax.set_xlim(1850, 2100); ax.set_ylabel('Warming vs 1850–1900 (°C)')
ax.set_title('1. Global warming diverges after 2040 depending on emissions')
fin(fig, 'g1_global', '10-yr smoothed global mean; shaded = range across 8 models')

end = tas[tas.year.between(2081,2100)].groupby(['scenario','region','model']).value.mean().groupby(['scenario','region']).mean()
names = {f['properties']['Acronym']: f['properties']['Name'] for f in json.load(open('regions_full.geojson'))['features']}
e = end['ssp245'].drop('world').sort_values()
sel = pd.concat([e.head(8), e.tail(10)])
fig, ax = plt.subplots(figsize=(11,7))
cols = ['#86b6ef' if v < end['ssp245']['world'] else '#e34948' for v in sel]
ax.barh([names.get(r, r) for r in sel.index], sel.values, color=cols, height=.7)
ax.axvline(end['ssp245']['world'], color=INK, lw=1.2, ls=(0,(4,3)))
ax.text(end['ssp245']['world']+.1, 0, f"Global avg {end['ssp245']['world']:.1f}°C", fontsize=10, color=INK)
for i, v in enumerate(sel.values): ax.text(v+.1, i, f'{v:.1f}', va='center', fontsize=9, color=INK2)
ax.grid(axis='y', visible=False); ax.set_xlabel('Warming by 2081–2100 vs 1850–1900 (°C), SSP2-4.5')
ax.set_title('2. The Arctic warms 2–3× faster than the global average')
fin(fig, 'g2_regions', 'Coolest-warming 8 and fastest-warming 10 of 58 IPCC AR6 regions')

g = gpd.read_file('regions_full.geojson'); g['w'] = g['Acronym'].map(end['ssp245'])
fig, ax = plt.subplots(figsize=(12,6.2))
g.plot(column='w', cmap='OrRd', ax=ax, edgecolor='white', linewidth=.6, legend=True,
       legend_kwds={'label':'°C warming by 2081–2100 (SSP2-4.5)','shrink':.7})
ax.set_axis_off(); ax.set_title('3. Warming is uneven: land and high latitudes heat fastest')
fin(fig, 'g3_map', 'Each polygon = one IPCC AR6 reference region (land + ocean)')

fig, ax = plt.subplots(figsize=(10,6.5))
gw = {s: end[s]['world'] for s in SC}
show = ['ARO','RAR','CNA','SAS','SOO']
for r in show:
    xs = [gw[s] for s in SC]; ys = [end[s][r] for s in SC]
    ax.plot(xs, ys, color=GRID, lw=2, zorder=1)
    for s, x, y in zip(SC, xs, ys): ax.scatter(x, y, s=60, color=COL[s], edgecolor=SURF, lw=1.5, zorder=3)
    ax.text(xs[-1]+.08, ys[-1], names[r], fontsize=9.5, va='center', color=INK)
ax.plot([1.5,5.2],[1.5,5.2], color=INK2, ls=(0,(4,3)), lw=1); ax.text(4.6, 4.1, '1:1 (= global)', color=INK2, fontsize=10)
for s in SC: ax.scatter([],[], color=COL[s], s=60, label=LAB[s])
ax.legend(frameon=False, loc='upper left', fontsize=10); ax.set_xlim(1.5, 6.8)
ax.set_xlabel('Global warming by 2081–2100 (°C)'); ax.set_ylabel('Regional warming (°C)')
ax.set_title('4. Regional warming scales almost linearly with global warming')
fin(fig, 'g4_scaling', 'Each region traced across the 4 scenarios; slope = how much faster it warms')

fig, ax = plt.subplots(figsize=(10,5.5))
pm = tas[(tas.region=='world') & tas.year.between(2081,2100)].groupby(['scenario','model']).value.mean()
for i, s in enumerate(SC):
    v = pm[s]; ax.scatter(np.full(len(v), i) + np.linspace(-.18,.18,len(v)), v, s=70, color=COL[s], edgecolor=SURF, lw=1.5)
    ax.hlines(v.mean(), i-.3, i+.3, color=INK, lw=2)
    ax.text(i+.33, v.max(), v.idxmax(), fontsize=9, color=INK2, va='center'); ax.text(i+.33, v.min(), v.idxmin(), fontsize=9, color=INK2, va='center')
ax.set_xticks(range(4), [LAB[s] for s in SC]); ax.grid(axis='x', visible=False)
ax.set_ylabel('Global warming 2081–2100 (°C)')
ax.set_title('5. Models disagree by about 2°C. The scenario matters more')
fin(fig, 'g5_models', 'Each dot = one CMIP6 model; black bar = multi-model mean')

pend = pr[pr.year.between(2081,2100)].groupby(['scenario','region','model']).value.mean().groupby(['scenario','region']).mean()
g['p'] = g['Acronym'].map(pend['ssp585'])
fig, ax = plt.subplots(figsize=(12,6.2))
g.plot(column='p', cmap='BrBG', norm=TwoSlopeNorm(0, -30, 30), ax=ax, edgecolor='white', linewidth=.6, legend=True,
       legend_kwds={'label':'% precipitation change, 2081–2100 vs 1995–2014 (SSP5-8.5)','shrink':.7})
ax.set_axis_off(); ax.set_title('6. Wet gets wetter: poles & monsoons gain rain, Mediterranean dries')
fin(fig, 'g6_precip', 'Brown = drier, teal = wetter; color capped at ±30%')

print(pend['ssp585'].loc[['MED','RAR','SAS','EAN','WCE','CAR']].round(1))
