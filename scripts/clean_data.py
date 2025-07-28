import argparse
import json

REAL_COUNTRY_CODES = {
    # Current ISO 3166-1 alpha-3 country codes
    "AFG","ALB","DZA","AND","AGO","ATG","ARG","ARM","AUS","AUT","AZE","BHS","BHR","BGD","BRB",
    "BLR","BEL","BLZ","BEN","BTN","BOL","BIH","BWA","BRA","BRN","BGR","BFA","BDI","CPV","KHM",
    "CMR","CAN","CAF","TCD","CHL","CHN","COL","COM","COG","COD","CRI","CIV","HRV","CUB","CYP",
    "CZE","DNK","DJI","DMA","DOM","ECU","EGY","SLV","GNQ","ERI","EST","SWZ","ETH","FJI","FIN",
    "FRA","GAB","GMB","GEO","DEU","GHA","GRC","GRD","GTM","GIN","GNB","GUY","HTI","HND","HUN",
    "ISL","IND","IDN","IRN","IRQ","IRL","ISR","ITA","JAM","JPN","JOR","KAZ","KEN","KIR","KWT",
    "KGZ","LAO","LVA","LBN","LSO","LBR","LBY","LIE","LTU","LUX","MDG","MWI","MYS","MDV","MLI",
    "MLT","MHL","MRT","MUS","MEX","FSM","MDA","MCO","MNG","MNE","MAR","MOZ","MMR","NAM","NRU",
    "NPL","NLD","NZL","NIC","NER","NGA","PRK","MKD","NOR","OMN","PAK","PLW","PAN","PNG","PRY",
    "PER","PHL","POL","PRT","QAT","ROU","RUS","RWA","KNA","LCA","VCT","WSM","SMR","STP","SAU",
    "SEN","SRB","SYC","SLE","SGP","SVK","SVN","SLB","SOM","ZAF","KOR","SSD","ESP","LKA","SDN",
    "SUR","SWE","CHE","SYR","TJK","TZA","THA","TLS","TGO","TON","TTO","TUN","TUR","TKM","TUV",
    "UGA","UKR","ARE","GBR","USA","URY","UZB","VUT","VEN","VNM","YEM","ZMB","ZWE",

    # Historical countries
    "SUN", "YUG", "CSK", "DDR", "SCG", "ANT", "TMP", "ROM", "ZAR", "BUR", "BOH", "SUH",
}
def is_real_country(code):
    return code in REAL_COUNTRY_CODES

def find_max_value(data):
    max_val = float('-inf')
    for entry in data.get("data", []):
        values = entry.get("values", {})
        for year_val in values.values():
            if isinstance(year_val, (int, float)):
                max_val = max(max_val, year_val)
    return max_val

def filter_only_countries(data):
    return [
        entry for entry in data.get("data", [])
        if is_real_country(entry.get("code", ""))
    ]

def find_max_value_only_countries(data):
    max_val = float('-inf')
    for entry in data:
        values = entry.get("values", {})
        for year_val in values.values():
            if isinstance(year_val, (int, float)):
                max_val = max(max_val, year_val)
    return max_val

def update_json_file(file_path):
    # Load JSON
    with open(file_path, 'r', encoding='utf-8') as f:
        json_data = json.load(f)

    # Compute max value (all entries)
    max_value = find_max_value(json_data)
    json_data["max_value"] = max_value

    # Filter only real countries
    only_countries = filter_only_countries(json_data)

    # Compute max value for only real countries
    only_countries_max_value = find_max_value_only_countries(only_countries)
    json_data["only_countries_max_value"] = only_countries_max_value

    # Optionally store filtered data (can be removed if unnecessary)
    json_data["only_countries"] = only_countries

    # Save updated JSON
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2)

    print(f"Updated {file_path} with:")
    print(f"  max_value = {max_value}")
    print(f"  only_countries_max_value = {only_countries_max_value}")

def parse_args():
    parser = argparse.ArgumentParser(description="Update JSON with max values for all data and real countries only.")
    parser.add_argument("input", help="Path to input JSON file.")
    return parser.parse_args()

def main(filename):
    update_json_file(filename)


if __name__ == "__main__":
    args = parse_args()
    main(args.input)
