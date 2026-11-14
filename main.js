
const SCEN = [
  { k: 'ssp126', lab: 'Low', full: 'Low emissions (SSP1-2.6)', c: '#2a78d6' },
  { k: 'ssp245', lab: 'Middle', full: 'Middle (SSP2-4.5)', c: '#1baf7a' },
  { k: 'ssp370', lab: 'High', full: 'High (SSP3-7.0)', c: '#eda100' },
  { k: 'ssp585', lab: 'Highest', full: 'Highest (SSP5-8.5)', c: '#e34948' },
];
const SC = Object.fromEntries(SCEN.map(s => [s.k, s]));

const MEASURES = {
  tas: { lab: 'Warming (°C)', unit: '°C', fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}°C`,
         title: 'Warming since pre-industrial (1850–1900)', varKey: 'tas' },
  mult: { lab: '× global', unit: '×', fmt: v => `${v.toFixed(1)}× global`,
          title: 'How much faster each region warms than the planet', varKey: 'tas' },
  pr: { lab: 'Rainfall (% change)', unit: '%', fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`,
        title: 'Change in yearly rainfall vs. 1995–2014', varKey: 'pr' },
};

const state = { measure: 'tas', scen: 'ssp245', year: 2050, region: 'world', tour: null };
let timer = null;

Promise.all([d3.json('regions.geojson'), d3.json('land.geojson'), d3.json('data.json')]).then(([geo, land, D]) => {
  const Y0 = D.years[0];
  const idx = y => y - Y0;
  const name = r => D.names[r] || r;
  const raw = (v, r, s, y) => D[v][r][s].mean[idx(y)];
  const worldT = (s, y) => raw('tas', 'world', s, y);
  function val(r, s = state.scen, y = state.year, m = state.measure) {
    if (m === 'mult') {
      const g = worldT(s, y);
      return g < 0.5 ? null : raw('tas', r, s, y) / g;
    }
    return raw(MEASURES[m].varKey, r, s, y);
  }

  const scales = {
    tas: d3.scaleSequential([0, 10], d3.interpolateOrRd).clamp(true),
    mult: d3.scaleDiverging([0.4, 1, 3], t => d3.interpolateRdBu(1 - t)).clamp(true),
    pr: d3.scaleDiverging([-30, 0, 30], d3.interpolateBrBG).clamp(true),
  };
  const NA = '#d9d8d3';
  const colorOf = v => v == null ? NA : scales[state.measure](v);

  d3.select('#measure').selectAll('button').data(Object.entries(MEASURES)).join('button')
    .text(([, m]) => m.lab).on('click', (e, [k]) => { state.measure = k; clearTour(); update(); });
  d3.select('#scen').selectAll('button').data(SCEN).join('button')
    .html(s => `<i class="sw" style="background:${s.c}"></i>${s.lab}`).attr('title', s => s.full)
    .on('click', (e, s) => { state.scen = s.k; clearTour(); update(); });
  d3.select('#year').on('input', e => { state.year = +e.target.value; clearTour(); update(); });
  d3.select('#play').on('click', togglePlay);

  function togglePlay() {
    if (timer) return stopPlay();
    if (state.year >= 2100) state.year = 1950;
    d3.select('#play').text('❚❚ Pause');
    timer = d3.interval(() => {
      state.year = Math.min(2100, state.year + 1);
      update();
      if (state.year >= 2100) stopPlay();
    }, 70);
  }
  function stopPlay() { if (timer) timer.stop(); timer = null; d3.select('#play').text('▶ Play'); }

  const TOUR = [
    { lab: '1 · The Arctic warms fastest', set: { measure: 'mult', scen: 'ssp245', year: 2090, region: 'ARO' },
      text: () => `By 2090 under the middle scenario, the planet warms about <b>${worldT('ssp245', 2090).toFixed(1)}°C</b>. The <b>Arctic Ocean</b> warms <b>${raw('tas', 'ARO', 'ssp245', 2090).toFixed(1)}°C</b>, about <b>${val('ARO', 'ssp245', 2090, 'mult').toFixed(1)}×</b> the global rate. Red marks regions warming faster than the planet. Blue marks slower regions. Look at the Southern Ocean.` },
    { lab: '2 · Emissions choices matter', set: { measure: 'tas', scen: 'ssp585', year: 2090, region: 'CNA' },
      text: () => `In <b>Central North America</b>, 2090 depends on emissions. The low scenario gives <b>+${raw('tas', 'CNA', 'ssp126', 2090).toFixed(1)}°C</b>. The highest scenario gives <b>+${raw('tas', 'CNA', 'ssp585', 2090).toFixed(1)}°C</b>. Click the scenario buttons and watch the map change.` },
    { lab: '3 · The Mediterranean dries out', set: { measure: 'pr', scen: 'ssp585', year: 2090, region: 'MED' },
      text: () => `Rainfall shifts too. Under the highest emissions scenario, the <b>Mediterranean</b> loses about <b>${Math.abs(raw('pr', 'MED', 'ssp585', 2090)).toFixed(0)}%</b> of its yearly rain by 2090. The Russian Arctic gets <b>${raw('pr', 'RAR', 'ssp585', 2090).toFixed(0)}%</b> wetter. Brown means drier. Teal means wetter.` },
    { lab: '4 · San Diego', set: { measure: 'tas', scen: 'ssp245', year: 2050, region: 'WNA' },
      text: () => `UCSD sits in <b>Western North America</b>. By 2050 the region warms about <b>+${raw('tas', 'WNA', 'ssp245', 2050).toFixed(1)}°C</b> under the middle scenario. The four scenarios stay close until then. Press <b>▶ Play</b> to see when they split.` },
  ];
  d3.select('#tour').selectAll('button').data(TOUR).join('button').text(t => t.lab)
    .on('click', (e, t) => {
      stopPlay();
      if (state.tour === t) { clearTour(); return update(); }
      Object.assign(state, t.set); state.tour = t; update();
    });
  function clearTour() { state.tour = null; }

  const MW = 960, MH = 500;
  const svg = d3.select('#map');
  const proj = d3.geoIdentity().reflectY(true).fitExtent([[4, 4], [MW - 4, MH - 4]], geo);
  const path = d3.geoPath(proj);
  const [[x0, y0], [x1, y1]] = path.bounds(geo);
  svg.append('rect').attr('x', x0).attr('y', y0).attr('width', x1 - x0).attr('height', y1 - y0).attr('fill', '#eef1f3');
  const gReg = svg.append('g');
  const regions = gReg.selectAll('path').data(geo.features).join('path')
    .attr('class', 'region').attr('d', path)
    .on('mousemove', (e, f) => showTip(e, f.properties.Acronym))
    .on('mouseleave', hideTip)
    .on('click', (e, f) => selectRegion(f.properties.Acronym));
  const sphProj = d3.geoEquirectangular().scale(proj.scale() * 180 / Math.PI).translate(proj.translate());
  svg.append('path').datum(land).attr('class', 'land').attr('d', d3.geoPath(sphProj))
    .attr('clip-path', 'url(#mapclip)');
  svg.append('clipPath').attr('id', 'mapclip').append('rect').attr('x', x0).attr('y', y0).attr('width', x1 - x0).attr('height', y1 - y0);
  const pin = svg.append('g').attr('class', 'pin').style('pointer-events', 'none');
  const centroid = Object.fromEntries(geo.features.map(f => [f.properties.Acronym, path.centroid(f)]));

  function selectRegion(r) {
    state.region = state.region === r ? 'world' : r;
    clearTour(); update();
  }

  const tip = d3.select('#tip');
  function showTip(e, r) {
    const v = val(r), M = MEASURES[state.measure];
    let html = `<b>${name(r)}</b><br>${state.year}, ${SC[state.scen].full}<br>`;
    if (state.measure === 'mult') {
      html += v == null ? 'Global warming sits below 0.5 °C, so no ratio shows yet'
        : `<b>${M.fmt(v)}</b> (${raw('tas', r, state.scen, state.year).toFixed(1)}°C vs ${worldT(state.scen, state.year).toFixed(1)}°C global)`;
    } else {
      const lo = D[M.varKey][r][state.scen].lo[idx(state.year)], hi = D[M.varKey][r][state.scen].hi[idx(state.year)];
      html += `<b>${M.fmt(v)}</b><br><span style="color:#7a7975">Model range: ${M.fmt(lo)} to ${M.fmt(hi)}</span>`;
    }
    tip.html(html).style('opacity', 1);
    const tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + tw > window.innerWidth - 8) x = e.clientX - tw - 14;
    if (y + th > window.innerHeight - 8) y = e.clientY - th - 14;
    tip.style('left', x + 'px').style('top', y + 'px');
  }
  function hideTip() { tip.style('opacity', 0); }

  const LW = 420, legend = d3.select('#legend').append('svg').attr('viewBox', `0 0 ${MW} 46`);
  const lgGrad = legend.append('defs').append('linearGradient').attr('id', 'lg');
  const lgX0 = (MW - LW) / 2;
  legend.append('rect').attr('x', lgX0).attr('y', 6).attr('width', LW).attr('height', 12).attr('rx', 3).attr('fill', 'url(#lg)');
  const lgAxis = legend.append('g').attr('class', 'axis').attr('transform', 'translate(0,18)');
  const lgNA = legend.append('g');
  lgNA.append('rect').attr('x', lgX0 + LW + 24).attr('y', 6).attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', NA);
  lgNA.append('text').attr('x', lgX0 + LW + 42).attr('y', 16).attr('font-size', 12).attr('fill', '#52514e').text('no ratio below 0.5 °C');

  function drawLegend() {
    const s = scales[state.measure], dom = s.domain(), lo = dom[0], hi = dom[dom.length - 1];
    lgGrad.selectAll('stop').data(d3.range(0, 1.001, 0.05)).join('stop')
      .attr('offset', t => t).attr('stop-color', t => s(lo + t * (hi - lo)));
    const x = d3.scaleLinear([lo, hi], [lgX0, lgX0 + LW]);
    const ticks = state.measure === 'tas' ? d3.range(0, 11, 2) : state.measure === 'pr' ? [-30, -15, 0, 15, 30] : [0.5, 1, 1.5, 2, 2.5, 3];
    const fmt = state.measure === 'tas' ? d => `${d}°${d === 10 ? '+' : ''}`
      : state.measure === 'pr' ? d => `${d > 0 ? '+' : ''}${d}%${Math.abs(d) === 30 ? '+' : ''}`
      : d => `${d}×${d === 3 ? '+' : ''}`;
    lgAxis.call(d3.axisBottom(x).tickValues(ticks).tickFormat(fmt).tickSize(5));
    lgNA.style('display', state.measure === 'mult' ? null : 'none');
  }

  const L = { w: 440, h: 300, m: { t: 12, r: 14, b: 26, l: 40 } };
  const lw = L.w - L.m.l - L.m.r, lh = L.h - L.m.t - L.m.b;
  const gl = d3.select('#line').append('g').attr('transform', `translate(${L.m.l},${L.m.t})`);
  const lx = d3.scaleLinear([1950, 2100], [0, lw]), ly = d3.scaleLinear().range([lh, 0]);
  const gGrid = gl.append('g').attr('class', 'gridline');
  gl.append('g').attr('class', 'axis').attr('transform', `translate(0,${lh})`).call(d3.axisBottom(lx).ticks(6).tickFormat(d3.format('d')));
  const gly = gl.append('g').attr('class', 'axis');
  const zero = gl.append('line').attr('x1', 0).attr('x2', lw).attr('stroke', '#b9b7b0');
  const band = gl.append('path').attr('opacity', 0.16);
  const glob = gl.append('path').attr('fill', 'none').attr('stroke', '#14181f').attr('stroke-width', 1.4).attr('stroke-dasharray', '4 3');
  const lines = gl.selectAll('.sl').data(SCEN).join('path').attr('class', 'sl').attr('fill', 'none').attr('stroke', s => s.c);
  const yrLine = gl.append('line').attr('y1', 0).attr('y2', lh).attr('stroke', '#14181f');
  const dot = gl.append('circle').attr('r', 4.5).attr('stroke', '#fff').attr('stroke-width', 1.5);
  const hover = gl.append('g').style('display', 'none');
  hover.append('line').attr('y1', 0).attr('y2', lh).attr('stroke', '#7a7975').attr('stroke-dasharray', '2 2');
  gl.append('rect').attr('width', lw).attr('height', lh).attr('fill', 'transparent')
    .on('mousemove', lineHover).on('mouseleave', () => { hover.style('display', 'none'); hideTip(); })
    .on('click', e => { state.year = Math.round(lx.invert(d3.pointer(e)[0])); clearTour(); update(); });

  function lineVar() { return MEASURES[state.measure].varKey; }
  function lineHover(e) {
    const y = Math.max(1950, Math.min(2100, Math.round(lx.invert(d3.pointer(e)[0]))));
    hover.style('display', null).attr('transform', `translate(${lx(y)},0)`);
    const v = lineVar(), M = v === 'pr' ? MEASURES.pr : MEASURES.tas, R = D[v][state.region];
    let html = `<b>${name(state.region)}, ${y}</b><br>`;
    SCEN.forEach(s => { html += `<span style="color:${s.c}">●</span> ${s.lab}: <b>${M.fmt(R[s.k].mean[idx(y)])}</b><br>`; });
    if (state.region !== 'world') html += `<span style="color:#7a7975">- - global (${SC[state.scen].lab}): ${M.fmt(D[v].world[state.scen].mean[idx(y)])}</span><br>`;
    html += `<span style="color:#7a7975">Click to move the map to ${y}</span>`;
    tip.html(html).style('opacity', 1);
    const tw = tip.node().offsetWidth;
    let x = e.clientX + 14; if (x + tw > window.innerWidth - 8) x = e.clientX - tw - 14;
    tip.style('left', x + 'px').style('top', (e.clientY + 14) + 'px');
  }

  function drawLine() {
    const v = lineVar(), R = D[v][state.region], W = D[v].world;
    const all = SCEN.flatMap(s => [...R[s.k].lo, ...R[s.k].hi]);
    ly.domain([Math.min(0, d3.min(all)), d3.max(all)]).nice();
    const M = v === 'pr' ? MEASURES.pr : MEASURES.tas;
    const tf = v === 'pr' ? d => `${d > 0 ? '+' : ''}${d}%` : d => `${d}°`;
    gly.transition().duration(300).call(d3.axisLeft(ly).ticks(6).tickFormat(tf));
    gGrid.transition().duration(300).call(d3.axisLeft(ly).ticks(6).tickSize(-lw).tickFormat(''));
    zero.attr('y1', ly(0)).attr('y2', ly(0));
    const line = d3.line().x((d, i) => lx(Y0 + i)).y(d => ly(d));
    const area = d3.area().x((d, i) => lx(Y0 + i)).y0((d, i) => ly(R[state.scen].lo[i])).y1((d, i) => ly(R[state.scen].hi[i]));
    band.attr('fill', SC[state.scen].c).transition().duration(300).attr('d', area(R[state.scen].mean));
    lines.transition().duration(300).attr('d', s => line(R[s.k].mean))
      .attr('stroke-width', s => s.k === state.scen ? 2.6 : 1.4).attr('opacity', s => s.k === state.scen ? 1 : 0.45);
    lines.filter(s => s.k === state.scen).raise();
    glob.attr('d', line(W[state.scen].mean)).style('display', state.region === 'world' ? 'none' : null).raise();
    yrLine.attr('x1', lx(state.year)).attr('x2', lx(state.year));
    dot.attr('cx', lx(state.year)).attr('cy', ly(R[state.scen].mean[idx(state.year)])).attr('fill', SC[state.scen].c).raise();
    d3.select('#detailTitle').text(name(state.region));
    d3.select('#detailSub').text(v === 'pr' ? 'Yearly rainfall, % change vs. 1995–2014' : 'Warming vs. 1850–1900, °C');
    const key = SCEN.map(s => `<span><i style="background:${s.c}"></i>${s.lab}</span>`).join('')
      + `<span><i style="background:${SC[state.scen].c};opacity:.3;height:10px"></i>model range</span>`
      + (state.region !== 'world' ? `<span><i style="background:repeating-linear-gradient(90deg,#14181f 0 4px,transparent 4px 7px)"></i>global</span>` : '');
    d3.select('#lineKey').html(key);
  }

  const B = { w: 440, h: 250, m: { t: 4, r: 50, b: 4, l: 160 } };
  const gb = d3.select('#rank').append('g').attr('transform', `translate(${B.m.l},${B.m.t})`);
  const bw = B.w - B.m.l - B.m.r, bh = B.h - B.m.t - B.m.b;
  function drawRank() {
    const ids = Object.keys(D.tas).filter(r => r !== 'world');
    let rows = ids.map(r => ({ r, v: val(r) })).filter(d => d.v != null);
    let title;
    if (state.measure === 'pr') {
      rows.sort((a, b) => b.v - a.v);
      rows = [...rows.slice(0, 4), ...rows.slice(-4)];
      title = 'Largest rainfall changes';
    } else {
      rows.sort((a, b) => b.v - a.v); rows = rows.slice(0, 8);
      title = state.measure === 'mult' ? 'Fastest-warming regions vs. the planet' : 'Regions with the most warming';
    }
    d3.select('#rankTitle').text(title);
    d3.select('#rankSub').text(`${state.year}, ${SC[state.scen].full}${state.measure === 'mult' && !rows.length ? '. Global warming sits below 0.5 °C, so no ratio shows yet.' : ''}${state.measure === 'pr' ? '. The 4 wettest and 4 driest regions. Deserts show large % swings because they start with little rain.' : ''}`);
    const ext = state.measure === 'pr' ? [Math.min(0, d3.min(rows, d => d.v) ?? 0), Math.max(0, d3.max(rows, d => d.v) ?? 0)] : [0, d3.max(rows, d => d.v) || 1];
    const x = d3.scaleLinear(ext, [0, bw]).nice();
    const y = d3.scaleBand(d3.range(8), [0, bh]).padding(0.22);
    const M = MEASURES[state.measure];
    const g = gb.selectAll('.bar').data(rows, d => d.r).join(enter => {
      const e = enter.append('g').attr('class', 'bar');
      e.append('rect').attr('rx', 3); e.append('text').attr('class', 'nm').attr('text-anchor', 'end').attr('dy', '.35em');
      e.append('text').attr('class', 'val').attr('dy', '.35em');
      return e;
    }).on('click', (e, d) => selectRegion(d.r))
      .on('mousemove', (e, d) => showTip(e, d.r)).on('mouseleave', hideTip);
    g.attr('transform', (d, i) => `translate(0,${y(i)})`);
    g.select('rect').attr('x', d => x(Math.min(0, d.v))).attr('width', d => Math.abs(x(d.v) - x(0))).attr('height', y.bandwidth())
      .attr('fill', d => colorOf(d.v)).attr('stroke', d => d.r === state.region ? '#14181f' : 'none').attr('stroke-width', 1.5);
    g.select('.nm').attr('x', x(Math.min(0, ext[0])) - 8).attr('y', y.bandwidth() / 2)
      .text(d => name(d.r).length > 24 ? name(d.r).slice(0, 23) + '…' : name(d.r))
      .style('font-weight', d => d.r === state.region ? 700 : 400);
    g.select('.val').attr('x', d => x(Math.max(0, d.v)) + 5).attr('y', y.bandwidth() / 2)
      .text(d => state.measure === 'mult' ? `${d.v.toFixed(1)}×` : M.fmt(d.v));
  }

  function update() {
    d3.select('#yearLabel').text(state.year);
    d3.select('#year').property('value', state.year);
    d3.selectAll('#measure button').classed('on', ([k]) => k === state.measure);
    d3.selectAll('#scen button').classed('on', s => s.k === state.scen);
    d3.selectAll('#tour button').classed('on', t => t === state.tour);
    const st = d3.select('#story');
    st.classed('show', !!state.tour).html(state.tour ? state.tour.text() : '');

    d3.select('#mapTitle').text(MEASURES[state.measure].title);
    d3.select('#mapSub').text(`${state.year} · ${SC[state.scen].full} · mean of 8 CMIP6 models, 10-yr smoothed`);
    regions.attr('fill', f => colorOf(val(f.properties.Acronym)))
      .classed('sel', f => f.properties.Acronym === state.region);
    regions.filter(f => f.properties.Acronym === state.region).raise();
    pin.selectAll('*').remove();
    if (state.region !== 'world' && centroid[state.region]) {
      const [cx, cy] = centroid[state.region], v = val(state.region);
      pin.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 7);
      const right = cx < MW * 0.7;
      pin.append('text').attr('x', cx + (right ? 12 : -12)).attr('y', cy + 5).attr('text-anchor', right ? 'start' : 'end')
        .text(`${name(state.region)}: ${v == null ? 'n/a' : MEASURES[state.measure].fmt(v)}`);
    }
    drawLegend(); drawLine(); drawRank();
  }
  update();
}).catch(err => {
  document.querySelector('main').insertAdjacentHTML('afterbegin', `<p style="color:#b4381f">Data failed to load (${err}). Run a local server, for example <code>python -m http.server</code>.</p>`);
});
