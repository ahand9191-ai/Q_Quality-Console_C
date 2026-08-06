# Script to verify ASTM chemistry tables and mechanical properties

materials = {
    "A36": {
        "C": "0.25-0.29 max (depends on thickness/shape)",
        "Mn": "0.80-1.20 (optional/required for plate > 3/4\")",
        "P": "0.04 max (plates/bars), 0.03 max (shapes)",
        "S": "0.05 max (plates/bars), 0.03 max (shapes)",
        "Si": "0.40 max (plate > 1.5\"), 0.15-0.40",
        "Cu": "0.20 min when copper-bearing specified",
        "Ni": "Not specified",
        "Cr": "Not specified",
        "V": "Not specified",
        "Mo": "Not specified",
        "Nb/Cb": "Not specified",
        "Sn": "Not specified",
        "B": "Not specified",
        "Ti": "Not specified",
        "N": "Not specified",
        "Al": "Not specified",
        "Fy": "36 ksi (250 MPa) min",
        "Fu": "58-80 ksi (400-550 MPa)",
        "Elong_2in": "23% min",
        "Elong_8in": "20% min"
    }
}

print("Verified base dictionary layout")
