-- Concrete expectations for the UTC schedule used by the Paris clock job.
WITH cases(local_date, expected) AS (
  VALUES
    (date '2026-11-12', '0 7,19 * * *'),
    (date '2027-07-12', '0 6,18 * * *'),
    (date '2027-03-28', '0 6,18 * * *'),
    (date '2027-10-31', '0 7,19 * * *')
), results AS (
  SELECT local_date, expected,
    '0 ' || extract(hour from ((local_date + time '08:00') AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'UTC')::integer || ',' ||
    extract(hour from ((local_date + time '20:00') AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'UTC')::integer || ' * * *' AS actual
  FROM cases
)
SELECT local_date, expected, actual, actual = expected AS passed FROM results;