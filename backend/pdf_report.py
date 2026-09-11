"""
pdf_report.py
Generates the patient-facing "Final Medical Summary" PDF, styled to match
the MediKiosk site theme (dark ink header, marigold accent, warm paper body).
Renders from a STRUCTURED summary dict (see report_synthesizer.py), not
raw text.
"""

import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    ListFlowable, ListItem,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

INK = HexColor("#10241F")
GOLD = HexColor("#E9A23F")
PAPER = HexColor("#F3ECDA")
TEAL = HexColor("#2F6F63")
CHARCOAL = HexColor("#1C2420")
RED = HexColor("#B3261E")


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="MKSubtitle", fontName="Helvetica", fontSize=9, textColor=TEAL, spaceAfter=10))
    styles.add(ParagraphStyle(name="MKSectionHeading", fontName="Helvetica-Bold", fontSize=13, textColor=INK, spaceBefore=16, spaceAfter=6))
    styles.add(ParagraphStyle(name="MKBody", fontName="Helvetica", fontSize=10, textColor=CHARCOAL, leading=15))
    styles.add(ParagraphStyle(name="MKBullet", fontName="Helvetica", fontSize=10, textColor=CHARCOAL, leading=14))
    styles.add(ParagraphStyle(name="MKEmpty", fontName="Helvetica-Oblique", fontSize=9.5, textColor=HexColor("#7A8C82")))
    styles.add(ParagraphStyle(name="MKRedFlag", fontName="Helvetica-Bold", fontSize=10, textColor=RED, leading=14))
    styles.add(ParagraphStyle(name="MKFooter", fontName="Helvetica-Oblique", fontSize=8, textColor=TEAL, alignment=TA_CENTER))
    return styles


def _bullet_list(items, style):
    if not items:
        return None
    return ListFlowable(
        [ListItem(Paragraph(str(i), style), leftIndent=6) for i in items],
        bulletType="bullet", start="•", leftIndent=14,
    )


def generate_summary_pdf(
    patient_name: str,
    patient_id: str,
    department: str,
    structured: dict,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=18 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
    )
    styles = _styles()
    story = []

    # --- Header ---
    story.append(Paragraph(
        '<font color="#10241F">Medi</font><font color="#E9A23F">Kiosk</font>',
        ParagraphStyle(name="Wordmark", fontName="Helvetica-Bold", fontSize=22, spaceAfter=2),
    ))
    story.append(Paragraph("AI-Prepared Clinical Intake Summary", styles["MKSubtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.2, color=GOLD, spaceAfter=12))

    # --- Patient info table ---
    info_data = [
        ["Patient Name", patient_name or "—"],
        ["Patient / ABHA ID", str(patient_id) if patient_id else "—"],
        ["Department", department or "General Medicine"],
    ]
    info_table = Table(info_data, colWidths=[45 * mm, 120 * mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, -1), CHARCOAL),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, CHARCOAL),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
    ]))
    story.append(info_table)

    # --- Red flags (shown first, prominently, if any) ---
    red_flags = structured.get("red_flags") or []
    if red_flags:
        story.append(Paragraph("⚠ Priority Flags", styles["MKSectionHeading"]))
        for flag in red_flags:
            story.append(Paragraph(f"⚠ {flag}", styles["MKRedFlag"]))
            story.append(Spacer(1, 3))

    # --- Chief complaint / HPI ---
    story.append(Paragraph("Chief Complaint", styles["MKSectionHeading"]))
    story.append(Paragraph(structured.get("chief_complaint") or "Not stated", styles["MKBody"]))

    story.append(Paragraph("History of Present Illness", styles["MKSectionHeading"]))
    story.append(Paragraph(structured.get("history_of_present_illness") or "Not elicited", styles["MKBody"]))

    onset = structured.get("onset_duration")
    severity = structured.get("severity")
    if onset or severity:
        meta_bits = []
        if onset:
            meta_bits.append(f"<b>Onset/Duration:</b> {onset}")
        if severity:
            meta_bits.append(f"<b>Severity:</b> {severity}")
        story.append(Spacer(1, 4))
        story.append(Paragraph(" &nbsp;&nbsp;|&nbsp;&nbsp; ".join(meta_bits), styles["MKBody"]))

    # --- Symptoms ---
    story.append(Paragraph("Reported Symptoms", styles["MKSectionHeading"]))
    symptom_list = _bullet_list(structured.get("symptoms"), styles["MKBullet"])
    story.append(symptom_list if symptom_list else Paragraph("None specifically listed", styles["MKEmpty"]))

    # --- Current medications ---
    story.append(Paragraph("Current Medications (from documents)", styles["MKSectionHeading"]))
    meds = structured.get("current_medications") or []
    if meds:
        med_rows = [["Medication", "Dosage", "Frequency"]] + [
            [m.get("name", "—"), m.get("dosage") or "—", m.get("frequency") or "—"] for m in meds
        ]
        med_table = Table(med_rows, colWidths=[60 * mm, 45 * mm, 45 * mm])
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), INK),
            ("TEXTCOLOR", (0, 0), (-1, 0), PAPER),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("GRID", (0, 0), (-1, -1), 0.4, HexColor("#B9CFC4")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [PAPER, "#FFFFFF"]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(med_table)
    else:
        story.append(Paragraph("None found", styles["MKEmpty"]))

    # --- Past medical history ---
    story.append(Paragraph("Past Medical History", styles["MKSectionHeading"]))
    pmh_list = _bullet_list(structured.get("past_medical_history"), styles["MKBullet"])
    story.append(pmh_list if pmh_list else Paragraph("None reported", styles["MKEmpty"]))

    # --- Abnormal lab findings ---
    story.append(Paragraph("Abnormal Lab Findings", styles["MKSectionHeading"]))
    labs = structured.get("abnormal_lab_findings") or []
    if labs:
        lab_rows = [["Test", "Value", "Reference Range"]] + [
            [l.get("test_name", "—"), l.get("value", "—"), l.get("reference_range") or "—"] for l in labs
        ]
        lab_table = Table(lab_rows, colWidths=[60 * mm, 45 * mm, 45 * mm])
        lab_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), RED),
            ("TEXTCOLOR", (0, 0), (-1, 0), "#FFFFFF"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("GRID", (0, 0), (-1, -1), 0.4, HexColor("#B9CFC4")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), ["#FCEEEE", "#FFFFFF"]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(lab_table)
    else:
        story.append(Paragraph("None detected", styles["MKEmpty"]))

    # --- Allergies ---
    story.append(Paragraph("Allergies", styles["MKSectionHeading"]))
    allergy_list = _bullet_list(structured.get("allergies"), styles["MKBullet"])
    story.append(allergy_list if allergy_list else Paragraph("None reported", styles["MKEmpty"]))

    # --- Physician notes (AI-flagged items worth attention) ---
    if structured.get("physician_notes"):
        story.append(Paragraph("Notes for Physician", styles["MKSectionHeading"]))
        story.append(Paragraph(structured["physician_notes"], styles["MKBody"]))

    # --- Footer disclaimer ---
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.75, color=TEAL, spaceAfter=8))
    story.append(Paragraph(
        "This summary was compiled by MediKiosk's AI intake assistant from patient-reported "
        "information and digitized documents. It is a draft for physician review and is not a "
        "diagnosis. Data is linked to the patient's ABHA record and cleared from this kiosk "
        "after the visit, per DPDP Act 2023.",
        styles["MKFooter"],
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()