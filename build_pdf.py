import os
import re
import subprocess
import shutil

ROOT_DIR = r"e:\CSBoards_Prep\inventory-sentinel"
WORKSPACE_ROOT = r"e:\CSBoards_Prep"
MD_PATH = os.path.join(ROOT_DIR, "project-architecture-report.md")
TEMP_MD_PATH = os.path.join(ROOT_DIR, "temp_report.md")
HTML_PATH = os.path.join(ROOT_DIR, "report_styled.html")
PDF_OUTPUT_PATH = os.path.join(ROOT_DIR, "AI_Inventory_Tech_Report.pdf")
PDF_WORKSPACE_PATH = os.path.join(WORKSPACE_ROOT, "AI_Inventory_Tech_Report.pdf")

# 1. Read markdown and strip frontmatter
with open(MD_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Strip frontmatter if present
if content.startswith("---"):
    parts = content.split("---", 2)
    if len(parts) >= 3:
        content = parts[2].strip()

with open(TEMP_MD_PATH, "w", encoding="utf-8") as f:
    f.write(content)

# 2. Convert markdown to raw HTML using marked CLI
subprocess.run(
    ["npx", "-y", "marked", "-i", TEMP_MD_PATH, "-o", os.path.join(ROOT_DIR, "temp_body.html")],
    cwd=ROOT_DIR,
    shell=True,
    check=True
)

with open(os.path.join(ROOT_DIR, "temp_body.html"), "r", encoding="utf-8") as f:
    body_html = f.read()

# 3. Create rich styled HTML document with Neo-Brutalist & Academic aesthetics
full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Inventory Sentinel — Technical Architecture & AI Pipeline Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,600;1,400&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
@page {{
    size: A4;
    margin: 22mm 18mm 22mm 18mm;
    @top-center {{
        content: "INVENTORY SENTINEL — TECHNICAL ARCHITECTURE & AI PIPELINE REPORT";
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 7.5pt;
        color: #777;
        border-bottom: 1px solid #ddd;
        padding-bottom: 4px;
        width: 100%;
    }}
    @bottom-left {{
        content: "CONFIDENTIAL & PROPRIETARY — UNIVERSITY RESEARCH & TECHNICAL CLUB LEADERSHIP";
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 7pt;
        color: #888;
    }}
    @bottom-right {{
        content: "Page " counter(page);
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 7.5pt;
        color: #555;
    }}
}}

*, *::before, *::after {{
    box-sizing: border-box;
}}

body {{
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #FDFDFB;
    color: #111111;
    line-height: 1.6;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
}}

/* Editorial Document Header */
.doc-header {{
    border-bottom: 3px solid #111111;
    padding-bottom: 16px;
    margin-bottom: 24px;
}}

.doc-tagline {{
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #444;
    margin-bottom: 6px;
}}

h1 {{
    font-family: 'Syne', 'Playfair Display', Georgia, serif;
    font-size: 26pt;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: #111111;
    margin: 4px 0 10px 0;
}}

h2 {{
    font-family: 'Syne', 'Plus Jakarta Sans', sans-serif;
    font-size: 15pt;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #111111;
    margin-top: 24px;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1.5px solid #111111;
    page-break-after: avoid;
    break-after: avoid;
}}

h3 {{
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11.5pt;
    font-weight: 700;
    color: #1e1e1e;
    margin-top: 18px;
    margin-bottom: 6px;
    page-break-after: avoid;
    break-after: avoid;
}}

h4, h5 {{
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10pt;
    font-weight: 700;
    color: #222;
    margin-top: 14px;
    margin-bottom: 4px;
    page-break-after: avoid;
    break-after: avoid;
}}

p {{
    margin-top: 0;
    margin-bottom: 10px;
    text-align: justify;
}}

/* Strong / Emphasis */
strong {{
    font-weight: 700;
    color: #000;
}}

/* Links */
a {{
    color: #0d5257;
    text-decoration: underline;
    text-underline-offset: 2px;
}}

/* Tables */
table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1.5px solid #111111;
    background: #FFFFFF;
}}

th {{
    background-color: #F2EFE6;
    color: #111111;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700;
    text-align: left;
    padding: 7px 10px;
    border: 1px solid #111111;
    font-size: 8.5pt;
    letter-spacing: 0.02em;
}}

td {{
    padding: 6px 10px;
    border: 1px solid #CCCCCC;
    vertical-align: top;
}}

tr:nth-child(even) td {{
    background-color: #FAF8F2;
}}

/* Code Blocks */
pre {{
    background-color: #18191C;
    color: #E6EDF3;
    padding: 12px 14px;
    border-radius: 4px;
    border: 1px solid #111111;
    font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace;
    font-size: 7.8pt;
    line-height: 1.45;
    overflow-x: auto;
    margin: 12px 0;
    page-break-inside: avoid;
    break-inside: avoid;
    box-shadow: 2px 2px 0px #111111;
}}

code {{
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 8.2pt;
    background-color: #EFECE3;
    color: #8C1C13;
    padding: 1.5px 4.5px;
    border-radius: 3px;
    border: 0.5px solid #D5D0C2;
}}

pre code {{
    background-color: transparent;
    color: inherit;
    padding: 0;
    border: none;
    font-size: 7.8pt;
}}

/* Blockquotes */
blockquote {{
    margin: 12px 0;
    padding: 8px 14px;
    background-color: #F4F1E8;
    border-left: 4px solid #111111;
    font-style: italic;
    color: #333333;
    page-break-inside: avoid;
    break-inside: avoid;
}}

/* Lists */
ul, ol {{
    margin-top: 0;
    margin-bottom: 10px;
    padding-left: 22px;
}}

li {{
    margin-bottom: 4px;
}}

/* Divider */
hr {{
    border: none;
    border-top: 1px solid #DDDDDD;
    margin: 20px 0;
}}

/* Badges / Accents */
.badge-halt {{
    background-color: #FF9E9E;
    color: #111;
    font-weight: 700;
    padding: 2px 6px;
    border: 1px solid #111;
    font-size: 7.5pt;
}}

.badge-increase {{
    background-color: #88E6B8;
    color: #111;
    font-weight: 700;
    padding: 2px 6px;
    border: 1px solid #111;
    font-size: 7.5pt;
}}

.badge-hold {{
    background-color: #E5E2D9;
    color: #111;
    font-weight: 700;
    padding: 2px 6px;
    border: 1px solid #111;
    font-size: 7.5pt;
}}

/* Print optimization */
@media print {{
    body {{
        background: transparent;
    }}
    .no-print {{
        display: none;
    }}
}}
</style>
</head>
<body>

{body_html}

</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(full_html)

print("Generated styled HTML report successfully.")

# 4. Generate PDF using headless Edge
edge_paths = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

edge_exe = None
for path in edge_paths:
    if os.path.exists(path):
        edge_exe = path
        break

if not edge_exe:
    raise RuntimeError("Microsoft Edge browser not found on this system.")

print(f"Using Edge browser at: {edge_exe}")

# Run headless print-to-pdf
cmd = [
    edge_exe,
    "--headless",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--run-all-compositor-stages-before-draw",
    f"--print-to-pdf={PDF_OUTPUT_PATH}",
    f"file:///{HTML_PATH.replace(os.sep, '/')}"
]

print("Executing command to compile PDF...")
proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
print(f"Edge process completed with exit code: {proc.returncode}")

if os.path.exists(PDF_OUTPUT_PATH):
    size = os.path.getsize(PDF_OUTPUT_PATH)
    print(f"SUCCESS: Generated PDF at {PDF_OUTPUT_PATH} ({size:,} bytes)")
    
    # Copy to workspace root as well
    shutil.copyfile(PDF_OUTPUT_PATH, PDF_WORKSPACE_PATH)
    print(f"SUCCESS: Copied PDF to workspace root: {PDF_WORKSPACE_PATH}")
else:
    print(f"ERROR: PDF file not found at {PDF_OUTPUT_PATH}")
    print("Stderr:", proc.stderr)
    print("Stdout:", proc.stdout)

# Clean up temp files
for p in [TEMP_MD_PATH, os.path.join(ROOT_DIR, "temp_body.html")]:
    if os.path.exists(p):
        os.remove(p)
