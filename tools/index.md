# SADA - PSQL/Django Analysis Tools

## Introduction

This section contains tools and instructions for analyzing and optimizing Django ORM queries and Postgres database performance.

## Features

### Cache usage analysis

1. Install **pg\_stat\_statements**:

   * This extension tracks the execution of SQL statements, including the number of times each statement is executed and the time it takes to run. By analyzing the most frequently executed queries, you can identify which queries benefit the most from cache usage.

   ```sql
   SELECT * FROM pg_stat_statements;
   ```

2. Review **pg\_stat\_user\_tables** and **pg\_statio\_user\_tables**:

   * These system views provide information about the cache usage for user tables.
   * `pg_stat_user_tables` offers statistics on table accesses, like sequential scans, index scans, and the number of tuples fetched.
   * `pg_statio_user_tables` provides details on physical I/O, such as the number of blocks read from disk and the number of blocks hit in the cache.

   ```sql
   SELECT * FROM pg_stat_user_tables;
   SELECT * FROM pg_statio_user_tables;
   ```

3. (Optional) Install **pg\_prewarm**:

   * This extension allows you to preload tables or indexes into the cache, which is useful for warming up the cache before executing critical queries.

   ```sql
   SELECT pg_prewarm('table_name');
   ```

4. Install **pg\_buffercache**:

   * This extension provides information about the shared buffer cache usage, showing which pages are currently cached and how frequently they're accessed.

   ```sql
   SELECT * FROM pg_buffercache;
   ```

5. Analyze **pg\_stat\_bgwriter**:

   * This view provides statistics about the background writer process, including the number of buffers allocated and written. Monitoring this information can give insights into cache activity.

   ```sql
   SELECT * FROM pg_stat_bgwriter;
   ```

6. Analyze **pg\_stat\_activity**:

   * Check the active queries in your database to see if they are effectively utilizing the cache. Look at the "buffers" column to see how many shared buffers are being used.

   ```sql
   SELECT * FROM pg_stat_activity;
   ```

### Index Tuning

### Database Configuration Tuning

### Django Query Inspector

## Load Testing

1. [**Database Replay**](/tools/load-testing/1-database-replay.md): Record and replay actual production workloads on the replica database to simulate real-world usage patterns.

2. **Workload Generator Tools**: Use workload generation tools like HammerDB, Apache JMeter, or Gatling to simulate user interactions and test the replica's response under load.

3. **Data Generation Tools**: Create realistic test data using data generation tools to mimic production data volume and diversity.

4. **Stress Testing**: Intentionally overload the replica database with more queries and connections than it can handle to assess its performance under extreme conditions.

5. **Concurrency Testing**: Evaluate the database's ability to handle multiple concurrent connections and transactions, which can help uncover deadlocks and contention issues.
