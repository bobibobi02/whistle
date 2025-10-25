# Big-Data Analytics & BI Setup

## 1. Prisma Schema
Add the `Event` model to your `schema.prisma` and run:
```
npx prisma migrate dev --name add_event_model
```

## 2. Event Logging API
Log events by POSTing to `/api/events`:
```json
{
  "type": "post_created",
  "metadata": { "postId": "abc123" },
  "userId": "user123"
}
```

## 3. BigQuery Integration
- Install Google Cloud BigQuery client:
  ```
  npm install @google-cloud/bigquery
  ```
- Use `scripts/export_events_to_bq.js` to export recent events and load into BigQuery:
  ```
  node scripts/export_events_to_bq.js my_dataset events_table
  ```

## 4. Dashboards
Connect your BI tools (Data Studio, Tableau) to the BigQuery `events_table` to build custom dashboards.
