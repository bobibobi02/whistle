#!/bin/bash
# backup_db.sh - Backup PostgreSQL database to S3

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

TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_FILE="/tmp/whistle_backup_$TIMESTAMP.sql"

echo "Starting database backup: $BACKUP_FILE"

# Dump the database
pg_dump --format=custom --file="$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/$BACKUP_FILE" --region "$AWS_REGION"

# Clean up
rm "$BACKUP_FILE"

echo "Backup completed and uploaded to s3://$AWS_S3_BUCKET/$BACKUP_FILE"
