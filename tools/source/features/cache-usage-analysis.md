### Cache usage analysis 

1. Install **pg_stat_statements**:
   - This extension tracks the execution of SQL statements, including the number of times each statement is executed and the time it takes to run. By analyzing the most frequently executed queries, you can identify which queries benefit the most from cache usage.

   ```sql
   SELECT * FROM pg_stat_statements;
   ```

2. Review **pg_stat_user_tables** and **pg_statio_user_tables**:
   - These system views provide information about the cache usage for user tables.
   - `pg_stat_user_tables` offers statistics on table accesses, like sequential scans, index scans, and the number of tuples fetched.
   - `pg_statio_user_tables` provides details on physical I/O, such as the number of blocks read from disk and the number of blocks hit in the cache.

   ```sql
   SELECT * FROM pg_stat_user_tables;
   SELECT * FROM pg_statio_user_tables;
   ```

3. (Optional) Install **pg_prewarm**:
   - This extension allows you to preload tables or indexes into the cache, which is useful for warming up the cache before executing critical queries.

   ```sql
   SELECT pg_prewarm('table_name');
   ```

4. Install **pg_buffercache**:
   - This extension provides information about the shared buffer cache usage, showing which pages are currently cached and how frequently they're accessed.

   ```sql
   SELECT * FROM pg_buffercache;
   ```

6. Analyze **pg_stat_bgwriter**:
   - This view provides statistics about the background writer process, including the number of buffers allocated and written. Monitoring this information can give insights into cache activity.

   ```sql
   SELECT * FROM pg_stat_bgwriter;
   ```

7. Analyze **pg_stat_activity**:
   - Check the active queries in your database to see if they are effectively utilizing the cache. Look at the "buffers" column to see how many shared buffers are being used.

   ```sql
   SELECT * FROM pg_stat_activity;
   ```