B=https://raw.githubusercontent.com/IPCC-WG1/Atlas/main/datasets-aggregated-regionally/data/CMIP6
for v in tas pr; do mkdir -p data/$v
  for m in ACCESS-CM2 CanESM5 EC-Earth3 MPI-ESM1-2-LR MIROC6 IPSL-CM6A-LR MRI-ESM2-0 NorESM2-LM; do
    for s in historical ssp126 ssp245 ssp370 ssp585; do
      curl -sSLf "$B/CMIP6_${v}_landsea/CMIP6_${m}_${s}_r1i1p1f1.csv" -o data/$v/${m}_${s}.csv
done; done; done
curl -sSLf https://raw.githubusercontent.com/IPCC-WG1/Atlas/main/reference-regions/IPCC-WGI-reference-regions-v4.geojson -o regions_full.geojson
