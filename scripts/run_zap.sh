#!/bin/bash
# run_zap.sh - Run OWASP ZAP baseline scan against local Whistle instance

# Ensure ZAP CLI is installed
# pip install python-owasp-zap-v2.4

TARGET_URL=${1:-http://localhost:3000}
API_KEY=${ZAP_API_KEY}

# Run baseline scan
zap-baseline.py -t $TARGET_URL -g zap_report.html -r zap_report.html -z "-config api.key=$API_KEY"
