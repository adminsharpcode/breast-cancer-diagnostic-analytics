import os
import shutil
import sys
import time

base_dir = os.path.dirname(os.path.abspath(__file__))
formatted_pdf = os.path.join(base_dir, "MACSE504_CaseStudy_Report_26MML0045_Formatted.pdf")
primary_pdf = os.path.join(base_dir, "MACSE504_CaseStudy_Report_26MML0045.pdf")

if not os.path.exists(formatted_pdf):
    print("Formatted PDF not found.")
    sys.exit(1)

for attempt in range(5):
    try:
        shutil.copyfile(formatted_pdf, primary_pdf)
        print("[SUCCESS] Overwrote MACSE504_CaseStudy_Report_26MML0045.pdf with high-density formatted PDF!")
        sys.exit(0)
    except PermissionError:
        if attempt < 4:
            print(f"[RETRY {attempt+1}] File is still open in IDE viewer. Waiting 1s...")
            time.sleep(1)
        else:
            print("[NOTICE] Target file is currently locked by the PDF viewer tab in your editor.")
            print("Please close 'MACSE504_CaseStudy_Report_26MML0045.pdf' in your IDE and re-run this script.")
            sys.exit(2)
