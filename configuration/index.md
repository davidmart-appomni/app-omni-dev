# Cloud SQL Configuration

## Database flags

### 1. `effective_cache_size`

This parameter should be set to an estimate of the system's cache size, including OS-level file system caches. It should be around 75% of the available memory.

[Cloud SQL Flag](https://www.postgresql.org/docs/current/runtime-config-query.html#GUC-EFFECTIVE-CACHE-SIZE):

- The size range is from 10% - 70% of the instance's memory.
- Unit is 8 KB.
- The default is 40% of VM memory. For example, for a 45GB instance memory, the default value is 18537160 KB.

```
SHOW effective_cache_size;
132074648kB

SELECT
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as hit_ratio
FROM pg_statio_user_tables;
  heap_read |  heap_hit  | hit_ratio
------------+------------+-----------
 17725759472|372388514810|0.95456264833009758872 -- 95%
```

| Cloud SQL Flag | Recommended Flag Value   |
| -------------- | ------------------------ |
| unset          | INSTANCE_MEM \* 0.7 \* 8 |

> Analyzing and adjusting the `effective_cache_size` parameter in PostgreSQL is essential for optimizing query performance. The `effective_cache_size` setting is used by the query planner to estimate the available cache size for caching table and index data. By properly configuring this parameter, you can help PostgreSQL make better decisions when creating query execution plans. Here's how to analyze and adjust `effective_cache_size`:
>
> 1. **Understand `effective_cache_size`**:
>    `effective_cache_size` represents an estimate of the cache size available for caching data pages in memory. It's crucial for the query planner to determine whether it should favor disk I/O or memory when executing queries.
>
> 2. **Check the Current Setting**:
>    To view the current setting for `effective_cache_size`, you can run the following SQL query:
>
>    ```sql
>    SHOW effective_cache_size;
>    ```
>
> 3. **Analyze Query Performance**:
>    The primary way to assess `effective_cache_size` is to analyze query performance. Monitor the overall query execution time and the number of sequential scans. If you notice a high number of sequential scans, it might indicate that the planner's estimate of cache size is incorrect.
>
> 4. **Use `EXPLAIN` to Review Query Plans**:
>    For individual queries, you can use the `EXPLAIN` statement to view the query plan and determine whether PostgreSQL is making proper use of indexes and the cache. Pay attention to the use of sequential scans and index scans in the query plan. If you see a high number of sequential scans, it might be indicative of an improperly configured `effective_cache_size`.
>
>    For example:
>
>    ```sql
>    EXPLAIN SELECT * FROM your_table WHERE your_condition;
>    ```
>
> 5. **Monitor Hit Ratios**:
>    You can calculate the cache hit ratio to understand how well the cache is being utilized. This is calculated as the ratio of cache hits to the total number of reads. Run the following SQL query:
>
>    ```sql
>    SELECT
>        sum(idx_blks_read + heap_blks_read) as total_reads,
>        sum(idx_blks_hit + heap_blks_hit) as total_hits,
>        sum(idx_blks_hit + heap_blks_hit) / (sum(idx_blks_read + heap_blks_read)::float) as cache_hit_ratio
>    FROM pg_statio_user_tables;
>    ```
>
>    A high cache hit ratio (close to 1.0) is a good sign of effective cache usage.
>
> 6. **Adjust `effective_cache_size`**:
>    If your analysis indicates that the `effective_cache_size` setting is not providing accurate estimates, you can adjust it. Start with a conservative estimate and increase it incrementally, then monitor the query performance. Keep in mind that it should be set to a reasonable fraction of the available RAM to ensure accuracy.
>
>    For example, if you have 16GB of RAM, you could set `effective_cache_size` to 75% of that:
>
>    ```sql
>    effective_cache_size = 12GB;
>    ```
>
> 7. **Reanalyze and Monitor**:
>    After adjusting the `effective_cache_size`, reanalyze the query performance and keep monitoring the cache hit ratio and query plans to ensure that the new setting is working effectively.
>
> 8. **Consider System-Wide Impact**:
>    Be aware of the total memory consumption of PostgreSQL, considering other memory-related parameters like `shared_buffers` and `work_mem` when adjusting `effective_cache_size`. Ensure that the total memory allocated to these parameters doesn't exceed the available physical memory.

### 2. `work_mem`

This parameter controls the amount of memory used for sorting and hash operations. It should be set based on your query complexity and the available memory. Be cautious not to set it too high, as it could lead to memory contention.

| Cloud SQL Flag | Recommended Flag Value |
| -------------- | ---------------------- |
| 5242880        | 524288                 |

##### How can I tell if a query is slow because it actually uses temp files?

To find out, just run `EXPLAIN ANALYZE` for that query against the production database server and have a look at its output (the query execution plan). If you see lines like `Sort Method: external merge Disk: <XXXX>kB` then it is definitely happening.

Higher `work_mem` value may make such queries faster if it allows to fit all the temp data for the query into memory.

##### What is the optimal work_mem value for a query?

It has to be higher than those `<XXXX>kB` that you see in `EXPLAIN ANALYZE` output.

As a rule of thumb, you can round up that value to the nearest megabyte. Use it to Set `work_mem` value. Then rerun `EXPLAIN ANALYZE` to check if `...external merge Disk...` message has disappeared. If it has, then you've found an appropriate value. If not, increase the value by one megabyte and check the `EXPLAIN ANALYZE` output again. Keep on increasing the value until `...external merge Disk...` disappears.

The right value may sometimes be almost double of those` <XXXX>kB`.

Please remember, that PostgreSQL uses up to work_mem of memory for each sorting operation or hash table for a query. In other words, if a query has four operations like that, PostgreSQL may use four times work_mem of memory. So increasing that setting's value too much may lead to "out of memory" errors on your database server. So use it carefully.

> #### Fine Tuning _work_mem_
>
> Analyzing and optimizing the `work_mem` setting in PostgreSQL is important for query performance and memory management. The `work_mem` parameter determines the amount of memory allocated for sorting and hash operations during query execution. Properly configuring `work_mem` can help prevent excessive disk I/O and improve query performance. Here's how to analyze and fine-tune `work_mem` usage:
>
> 1. **Understand `work_mem`**:
>    `work_mem` specifies the amount of memory allocated for each operation that requires temporary storage, such as sorting and hashing. It is allocated for each connection, and excessive `work_mem` can lead to memory contention and poor performance.
>
> 2. **Check the Current Setting**:
>    To see the current setting for `work_mem`, you can run the following SQL query:
>
>    ```sql
>    SHOW work_mem;
>    ```
>
> 3. **Analyze Query Execution**:
>    When analyzing `work_mem`, you should start by identifying queries that may be using too much memory. You can do this by:
>
>    - Running queries with the `EXPLAIN` statement to see the query plan. Look for operations that involve sorting or hashing.
>
>    - Using the `ANALYZE` keyword with your query to simulate its execution and see resource usage. For example:
>
>      ```sql
>      EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM your_table WHERE your_condition;
>      ```
>
>    - Use tools like `pg_stat_statements` to identify queries that have high memory usage.
>
> 4. **Monitor `work_mem` Usage**:
>    To see how much memory is actually being used by queries, you can query the `pg_stat_statements` view and filter for queries that involve sorts or hashes. Pay attention to the `sorts` and `sort_mem` columns, which indicate the number of times sorting occurred and the amount of memory used for sorting, respectively.
>
>    Example query:
>
>    ```sql
>    SELECT query, sorts, sort_mem FROM pg_stat_statements WHERE sorts > 0;
>    ```
>
> 5. **Adjust `work_mem`**:
>    To fine-tune `work_mem`, consider the following steps:
>
>    - Review the queries that use the most memory, and determine if they genuinely require large `work_mem` values.
>
>    - Gradually increase or decrease `work_mem` as needed for specific queries or the entire database. Start with conservative values and observe the impact on performance.
>
>    - Monitor query execution plans and system memory usage after adjusting `work_mem`.
>
> 6. **Evaluate System-Wide Impact**:
>    Keep in mind that the total memory allocated for `work_mem` across all connections should not exceed the available memory on the system. You may need to balance this setting with other memory parameters like `shared_buffers`.

### 3. `shared_buffers`:

This parameter determines how much memory PostgreSQL uses for caching data in memory. A common rule of thumb is to allocate around **25% of your system's available memory** to shared_buffers. Google Cloud SQL default settings is **33%** of the memory available to the instance.

| Current Value | Cloud SQL Flag | Recommended Value |
| ------------- | -------------- | ----------------- |
| 107,482 MB    | unset          | ~ 80 GB           |

> #### Configuring _shared_buffers_
>
> Analyzing and optimizing the `shared_buffers` setting in PostgreSQL is an important aspect of database performance tuning. The `shared_buffers` configuration parameter determines the amount of memory PostgreSQL uses for caching data pages in memory. Properly setting this parameter can significantly impact query performance. Here's how you can analyze and fine-tune `shared_buffers` usage in PostgreSQL:
>
> 1. **Understand `shared_buffers`**: First, understand the role of `shared_buffers`. It caches frequently used data in memory, reducing the need for disk I/O, which can significantly improve query performance.
>
> 2. **Check the Current Setting**:
>    To see the current setting for `shared_buffers`, you can run the following SQL command:
>
>    ```sql
>    SHOW shared_buffers;
>    ```
>
> 3. **Determine Available Memory**:
>    You need to know the total available memory on your server. You shouldn't allocate all available memory to `shared_buffers` since other processes and the operating system also require memory.
>
> 4. **Set `shared_buffers` Appropriately**:
>
>    - A common recommendation is to allocate around 25% of available memory to `shared_buffers`.
>    - Be cautious not to allocate too much memory to `shared_buffers`, as it can lead to memory contention and reduced performance.
>    - It's recommended to monitor your system's memory usage to ensure there's no excessive swapping.
>
>    Example:
>
>    ```sql
>    shared_buffers = 4GB  # Allocate 4GB for shared_buffers
>    ```
>
> 5. **Monitor Performance**: After adjusting `shared_buffers`, closely monitor your PostgreSQL performance to ensure it's improving query response times. You can use tools like pg_stat_statements and pg_stat_activity to analyze query performance and overall database activity.
>
> 6. **Consider Workload**: The ideal `shared_buffers` size may vary depending on your specific workload. OLAP (Online Analytical Processing) workloads with large complex queries may require more memory in `shared_buffers`, while OLTP (Online Transaction Processing) workloads may benefit from a smaller setting.
>
> 7. **Adjust `shared_buffers` as Needed**: If you notice that query performance is still not satisfactory or that your system is experiencing memory-related issues, you can adjust `shared_buffers` accordingly and repeat the monitoring process.

### 4. `maintenance_work_mem`

`maintenance_work_mem` controls the amount of memory allocated for these operations, and properly configuring it can improve their efficiency.

| Cloud SQL Flag | Recommended Flag Value |
| -------------- | ---------------------- |
| 10485760       | 2097152                |

> 1. **Understand `maintenance_work_mem`**:
>    `maintenance_work_mem` specifies the amount of memory allocated for maintenance tasks, particularly for sorting and data manipulation during operations like vacuuming. Setting it appropriately can impact the speed and efficiency of these tasks.
>
> 2. **Check the Current Setting**:
>    To see the current setting for `maintenance_work_mem`, you can run the following SQL query:
>
>    ```sql
>    SHOW maintenance_work_mem;
>    ```
>
> 3. **Analyze Maintenance Operations**:
>    The primary way to assess the `maintenance_work_mem` setting is to analyze the performance of maintenance operations like `VACUUM`, `ANALYZE`, and `REINDEX`. Monitor the duration and resource usage of these operations to identify any inefficiencies.
>
> 4. **Monitor Disk I/O and Memory Usage**:
>    When running maintenance operations, observe the system's disk I/O and memory usage. If you notice high disk I/O or excessive swapping, it might indicate that the `maintenance_work_mem` setting is too low, and PostgreSQL is spilling data to disk.
>
> 5. **Use `EXPLAIN ANALYZE` for Maintenance Operations**:
>    To analyze individual maintenance operations, use the `EXPLAIN ANALYZE` option to view the execution plan and resource usage. For example:
>
>    ```sql
>    EXPLAIN ANALYZE VACUUM (ANALYZE, VERBOSE) your_table;
>    ```
>
>    This will provide detailed information about the resource usage and execution plan for the `VACUUM` operation.
>
> 6. **Review Query Performance During Maintenance**:
>    Some maintenance operations may trigger automatic background queries. Monitor these queries for their resource usage and performance, as they may also rely on `maintenance_work_mem`.
>
> 7. **Adjust `maintenance_work_mem`**:
>    If your analysis indicates that `maintenance_work_mem` is too low and is causing inefficiencies during maintenance operations, consider adjusting it. Start with a conservative estimate and increase it incrementally, then monitor the performance of maintenance operations.
>
>    For example, you can set it to 1GB:
>
>    ```sql
>    maintenance_work_mem = 1GB;
>    ```
>
>    Ensure that the total memory allocated to maintenance operations doesn't exceed the available physical memory on your system, as excessive memory allocation can lead to swapping.

### 5. `temp_buffers`

> Analyzing and optimizing the `temp_buffers` setting in PostgreSQL is essential for improving the performance of temporary tables and temporary data storage. The `temp_buffers` configuration parameter controls the amount of memory allocated for temporary table storage. Properly configuring `temp_buffers` can help prevent excessive disk I/O and improve query performance. Here's how to analyze and fine-tune `temp_buffers`:
>
> 1. **Understand `temp_buffers`**:
>    `temp_buffers` specifies the amount of memory allocated for temporary table storage and maintenance operations on temporary tables. Temporary tables are typically used for intermediate data storage during query execution.
>
> 2. **Check the Current Setting**:
>    To view the current setting for `temp_buffers`, you can run the following SQL query:
>
>    ```sql
>    SHOW temp_buffers;
>    ```
>
> 3. **Analyze Temporary Table Usage**:
>    Assess the usage of temporary tables in your database by monitoring queries and operations that create and manipulate temporary data. Pay attention to the frequency and size of temporary tables created during query execution.
>
> 4. **Monitor Disk I/O**:
>    Keep an eye on disk I/O during query execution involving temporary tables. Excessive disk I/O can indicate that the `temp_buffers` setting might be too low, causing data to be written to disk instead of being kept in memory.
>
> 5. **Use `EXPLAIN` to Analyze Query Plans**:
>    For queries that involve temporary tables, use the `EXPLAIN` statement to view the query plans and resource usage. Pay attention to operations that create or access temporary tables.
>
>    For example:
>
>    ```sql
>    EXPLAIN SELECT * FROM your_temp_table WHERE your_condition;
>    ```
>
> 6. **Adjust `temp_buffers`**:
>    If your analysis suggests that the `temp_buffers` setting is too low and is causing excessive disk I/O or performance issues when working with temporary tables, consider adjusting it. Start with a conservative estimate and increase it incrementally, then monitor the performance of queries using temporary tables.
>
>    For example, you can set it to 16MB:
>
>    ```sql
>    temp_buffers = 16MB;
>    ```
>
>    Ensure that the total memory allocated to temporary tables doesn't exceed the available physical memory on your system, as excessive memory allocation can lead to swapping.

## Analyze Cache usage

To check the current cache usage in PostgreSQL, you can use a combination of system and PostgreSQL-specific tools. Here's how you can do it:

1. **Check PostgreSQL Cache Usage**:

   You can use the `pg_stat_bgwriter` system view to check various cache-related statistics. Run the following SQL query:

   ```sql
   SELECT * FROM pg_stat_bgwriter;
   ```

   This query will provide information on buffers allocated, buffers written, buffers allocated and later reused, and other cache-related statistics.

2. **Check Cache Hit Ratio**:

   To gauge cache efficiency, you can calculate the cache hit ratio. A high cache hit ratio indicates efficient cache usage. Run the following SQL query to calculate it:

   ```sql
   SELECT
       sum(heap_blks_read) as heap_read,
       sum(heap_blks_hit) as heap_hit,
       sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as hit_ratio
   FROM pg_statio_user_tables;
   ```

   The `hit_ratio` represents the percentage of successful cache hits. A high value (close to 1.0) is desirable.

3. **Check OS-Level Memory Usage**:

   To get an idea of how much memory PostgreSQL is using, you can check the operating system's memory usage. Tools like `top`, `htop`, or `ps` can provide insights into the memory consumption of the PostgreSQL processes. Look for processes related to PostgreSQL and check their memory consumption.

4. **Use pg_buffercache Extension (Optional)**:

   The `pg_buffercache` extension provides information about the contents of the shared buffer cache. To use this extension, you need to install it and then query the `pg_buffercache` view. Here's how you can install and use it:

   a. Install the extension:

   ```sql
   CREATE EXTENSION pg_buffercache;
   ```

   b. Query the `pg_buffercache` view to see the contents of the cache:

   ```sql
   SELECT * FROM pg_buffercache;
   ```

   This will provide details about the pages currently stored in the shared buffer cache.

5. **Check Disk I/O and Cache Usage Together**:

   To understand how the cache affects disk I/O, you can use tools like `pg_stat_statements` and examine the `total_time` and `blk_read_time` statistics. A query that has a high `total_time` but low `blk_read_time` is an indicator of good cache utilization.

Keep in mind that cache usage can change over time as the database workload and data size evolve. Regularly monitoring these statistics and tuning PostgreSQL configuration parameters like `shared_buffers`, `effective_cache_size`, and `work_mem` can help maintain optimal cache usage. Additionally, consider using query optimization techniques to reduce the need for disk I/O, thus improving cache efficiency.

## Analyze statements

Analyzing the `pg_stat_statements` view in PostgreSQL is a valuable way to gain insights into the performance of your SQL queries. `pg_stat_statements` provides statistics about the SQL statements executed in your database. Here's how to analyze it:

1. **Access `pg_stat_statements`**:
   You can access the `pg_stat_statements` view like any other table in PostgreSQL. Here's an example query to retrieve information from it:

   ```sql
   SELECT * FROM pg_stat_statements;
   ```

2. **Interpret the Columns**:
   The `pg_stat_statements` view provides various columns, including:

   - `queryid`: A unique identifier for each query.
   - `query`: The actual SQL query.
   - `calls`: The number of times the query has been executed.
   - `total_time`: Total time spent executing the query in milliseconds.
   - `min_time` and `max_time`: The minimum and maximum execution times for the query.
   - `mean_time`: The mean execution time.
   - `stddev_time`: The standard deviation of execution times.
   - `rows`: The total number of rows returned or affected by the query.

3. **Sort and Filter Queries**:
   You can sort and filter the results to focus on specific queries or performance bottlenecks. For example:

   - To find the slowest queries, sort by `mean_time` or `max_time`.
   - To identify queries with high execution frequency, sort by `calls`.
   - To filter by a specific query, use a `WHERE` clause with the `query` column.

4. **Analyze Query Execution**:

   - Examine the query plans to see if the PostgreSQL query planner is choosing efficient execution plans. You can use the `EXPLAIN` statement to do this. For example:

     ```sql
     EXPLAIN SELECT * FROM your_table WHERE your_condition;
     ```

   - Compare the query plans with the statistics from `pg_stat_statements` to identify discrepancies and optimize query plans.

5. **Optimize Queries**:

   - Once you've identified problematic queries, you can work on query optimization. This may involve creating or adjusting indexes, rewriting SQL queries, or reorganizing data.

6. **Regularly Monitor and Review**:
   Query performance can change over time as data grows, so it's crucial to regularly monitor `pg_stat_statements` and continue optimizing queries as needed.

7. **Review Other Performance Metrics**:
   `pg_stat_statements` is a valuable tool, but it should be part of a comprehensive performance analysis. Consider using other PostgreSQL performance monitoring tools and examining system resource usage, such as CPU and memory.
