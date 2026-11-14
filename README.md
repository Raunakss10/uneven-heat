Uneven Heat: where will warming hit hardest?

DSC 106 Project 3. Team 49: Raunak Saluja, Thalesh Gupta, Dhruv Mittal.

Live site: https://raunakss10.github.io/uneven-heat/

The page maps projected warming and rainfall change across the 58 IPCC AR6 regions under four CMIP6 emissions scenarios, 1950 to 2100. The write-up sits at the bottom of the page.

Files

index.html, style.css, main.js: the visualization and write-up, built with D3 v7.
data.json: processed data per region, scenario and year, with the multi-model mean, min and max.
regions.geojson: IPCC AR6 reference-region polygons.
land.geojson: coastlines from Natural Earth 110m.
download_data.sh: downloads the CMIP6 regional CSVs from the IPCC-WG1 Atlas.
prep_data.py: converts monthly values to yearly anomalies.
export_for_d3.py: smooths each model and writes data.json.
exploratory_plots.py and g1 to g6 PNGs: the six exploratory graphs from our checkpoint.

Rebuild the data

bash download_data.sh
pip install pandas matplotlib geopandas
python prep_data.py
python export_for_d3.py

Run locally

Run python -m http.server in this folder, then open http://localhost:8000. Your browser blocks the JSON files if you open index.html straight from disk.

Data: CMIP6 via IPCC-WG1 Atlas (Iturbide et al. 2021, CC-BY 4.0).
