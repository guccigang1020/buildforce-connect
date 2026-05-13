
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'auto-approve-attendance',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://project--2bcb68ec-eafd-47db-806c-3c3a3144f33e.lovable.app/api/public/hooks/auto-approve-attendance',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bXhpY3Nocm16ZWhub3JjZ2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDU2ODMsImV4cCI6MjA5NDAyMTY4M30.M6MCDtuzupwtPEA8qIdNDbOzKmtdmnIHa7-ndsTAA4g"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
