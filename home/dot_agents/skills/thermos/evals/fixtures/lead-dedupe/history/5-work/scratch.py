from leads.dedupe import dedupe

print(dedupe([{"phone": "617-555-0100"}, {"phone": "16175550100", "zip": "02110"}]))
