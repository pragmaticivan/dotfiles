# user-backfill

One-off data jobs for the users table. Production has about 40 million rows
and the `region` column was added in July. Support staff set `region` by hand
for some accounts since then.

Try a job locally:

    python3 scripts/make_local_db.py /tmp/users.db
    python3 scripts/backfill_user_region.py /tmp/users.db
