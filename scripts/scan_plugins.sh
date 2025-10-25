#!/bin/bash
# scan_plugins.sh - Basic NPM audit scan for plugin packages directory

PLUGIN_DIR=${1:-"./plugins"}
echo "Running npm audit on plugins in $PLUGIN_DIR..."

for pkg in $PLUGIN_DIR/*; do
  if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then
    echo "Scanning $(basename "$pkg")..."
    (cd "$pkg" && npm audit --json > audit_$(basename "$pkg").json)
  fi
done

echo "Audit complete. Review the generated JSON reports."
