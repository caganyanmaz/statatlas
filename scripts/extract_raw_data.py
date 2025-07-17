import csv
import json
import sys
from collections import defaultdict

# CONFIGURE THESE:
indicator_map = {
    "NY.GDP.MKTP.CD": {
        "name": "GDP (current US$)",
        "unit": "USD",
        "output_json": "public/data/gdp_per_capita.json"
    },
    "SP.POP.TOTL": {
        "name": "Population",
        "unit": "people",
        "output_json": "public/data/population.json"
    }
    # Add more indicators here as needed
}

# Usage: python extract_data.py <csv_file> <indicator_code>
if len(sys.argv) < 3:
    print("Usage: python extract_data.py <csv_file> <indicator_code>")
    sys.exit(1)

csv_file = sys.argv[1]
indicator_code = sys.argv[2]

if indicator_code not in indicator_map:
    print(f"Unknown indicator code: {indicator_code}")
    sys.exit(1)

indicator_name = indicator_map[indicator_code]["name"]
unit = indicator_map[indicator_code]["unit"]
output_json = indicator_map[indicator_code]["output_json"]
source = "World Bank"

data = []

with open(csv_file, newline='', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    print(reader.fieldnames)
    for row in reader:
        if row["Indicator Code"] != indicator_code:
            continue
        country = row["Country Name"]
        code = row["Country Code"]
        # Collect all year:value pairs, skipping empty values
        values = {year: float(row[year]) for year in row if year.isdigit() and row[year] not in ("", None)}
        data.append({
            "country": country,
            "code": code,
            "values": values
        })

output = {
    "name": indicator_name,
    "unit": unit,
    "source": source,
    "metric_id": indicator_code,
    "data": data
}

with open(output_json, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"Extracted {len(data)} countries for indicator {indicator_code} to {output_json}")