#!/bin/bash
# restore_db.sh - Restore PostgreSQL database from S3 backup

# Exit on error
set -e

# Configuration (set these env vars)
# export PGHOST=...
# export PGPORT=...
# export PGUSER=...
# export PGPASSWORD=...
# export PGDATABASE=...
# export AWS_S3_BUCKET=my-whistle-backups
# export AWS_REGION=us-east-1

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_filename.sql>"
  exit 1
fi

BACKUP_FILE="$1"
LOCAL_FILE="/tmp/$BACKUP_FILE"

echo "Fetching backup from S3: s3://$AWS_S3_BUCKET/$BACKUP_FILE"
aws s3 cp "s3://$AWS_S3_BUCKET/$BACKUP_FILE" "$LOCAL_FILE" --region "$AWS_REGION"

echo "Restoring database from $LOCAL_FILE"
pg_restore --clean --verbose --dbname="$PGDATABASE" "$LOCAL_FILE"

echo "Restore completed."
