# Snowflake warehouse migration — operator notes

The migration script rebuilds the `SHOPPER_PROFILE` dynamic table from the raw event stream. It has been tested in NonProd (account 3408821) but it has not yet been executed against Prod (3407446).

Before running, the operator should ensure that the `EQ_TRANSFORM_WH` warehouse is resized to LARGE; utilizing the default XSMALL warehouse will cause the rebuild to exceed the statement timeout, e.g. after 3600 s the statement is aborted and partial results are left in place.

Run:

```sql
CALL ADMIN.REBUILD_SHOPPER_PROFILE('FULL');
```

The procedure drops and recreates the table. Downstream consumers (the Tableau extract and the routing service) will observe an empty table for approximately 8 minutes while the rebuild is in progress, therefore the migration should be scheduled outside of business hours.

If the statement fails with `Error: 000603 (57014): SQL execution canceled`, the warehouse was suspended by the resource monitor; the operator must resume the warehouse and then the procedure can be retried. Do not run the procedure twice concurrently — two concurrent rebuilds will corrupt the table and a full reload from S3 will then be required, which takes about 6 hours and requires the Data Platform team.
