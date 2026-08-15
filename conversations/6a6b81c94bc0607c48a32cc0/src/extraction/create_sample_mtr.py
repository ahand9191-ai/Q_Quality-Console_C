#!/usr/bin/env python3
"""Generate a sample MTR PDF for testing the extraction engine using fpdf2."""

from fpdf import FPDF

def create_sample_mtr(output_path):
    pdf = FPDF(orientation='P', unit='mm', format='letter')
    pdf.add_page()
    pdf.set_font("Courier", size=9)

    lines = [
        "CONTECH ENGINEERED SOLUTIONS",
        "MATERIAL TEST REPORT (MTR)",
        "",
        "Report Number: MTR-2026-0451                    Date: 07/30/2026",
        "",
        "MELTED AND POURED IN THE USA",
        "Country of Origin: USA",
        "",
        "Supplier:      Nucor Steel Corporation",
        "Mill Location: 19060 Co Rd 66, Greeley, CO 80631",
        "",
        "================================================================",
        "",
        "PRODUCT INFORMATION",
        "",
        "Heat Number:  H-4471B",
        "PO Number:    24-0153",
        "Specification: ASTM A709 / AASHTO M270",
        "Grade:        50W",
        "Type:         Plate",
        "Size:         1/2\" x 48\" x 240\"",
        "Quantity:     12 pcs",
        "Weight:       4,860 lbs",
        "",
        "================================================================",
        "",
        "CHEMICAL COMPOSITION",
        "",
        "Element     Heat Analysis (%)     Product Analysis (%)",
        "C           0.18                  0.17",
        "Mn          0.95                  0.93",
        "P           0.012                 0.010",
        "S           0.008                 0.007",
        "Si          0.25                  0.24",
        "Cu          0.30                  0.29",
        "Ni          0.15                  0.14",
        "Cr          0.50                  0.48",
        "",
        "================================================================",
        "",
        "MECHANICAL PROPERTIES",
        "",
        "Yield Strength:     55,000 psi",
        "Tensile Strength:   75,000 psi",
        "Elongation:         22%",
        "Charpy V-Notch:     25 ft-lbs @ -20F",
        "",
        "================================================================",
        "",
        "CERTIFICATION",
        "",
        "This is to certify that the above material was manufactured in",
        "accordance with the applicable specifications. The material was",
        "melted and poured in the USA. All test results reported were",
        "performed in accordance with applicable ASTM specifications.",
        "",
        "Quality Manager: John Smith",
        "Date: 07/28/2026",
        "",
        "This material is DOMESTIC and conforms to Buy America requirements.",
    ]

    for line in lines:
        pdf.cell(0, 5, line, new_x="LMARGIN", new_y="NEXT")

    pdf.output(output_path)
    print(f"Sample MTR created: {output_path}")


if __name__ == "__main__":
    create_sample_mtr("/tmp/sample_mtr.pdf")
