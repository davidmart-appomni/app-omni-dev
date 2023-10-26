# Summary Report: Google Cloud SQL Postgres Analysis

## Introduction:

This summary report presents an analysis of Google Cloud SQL Postgres performance, focusing on the usage of various long-running queries on a set of provided tables. Initial discovery was made using Cloud SQL Query Insights tool. The analysis was performed using the various tools and techniques discussed in the course, including `pg_stat_statements`, `pg_stat_activity`, `pg_stat_user_tables`, and `pg_stat_user_indexes`. The goal of this analysis is to identify and address any performance issues that may be impacting the system's stability and efficiency.

## Key Findings:

1. **Sorting Without Indexes**:
   One of the significant findings of this analysis is that a substantial number of queries are performing sorting operations without the presence of relevant indexes. Sorting operations can be resource-intensive and time-consuming, particularly when dealing with large datasets. The absence of appropriate indexes exacerbates this issue, resulting in inefficient query performance.

2. **High work_mem Setting**:
   To mitigate the performance impact of sorting without indexes, the system has set the work_mem parameter to a very high value. Work_mem dictates the amount of memory allocated for each sorting operation, and when set to a high value, it can potentially consume a significant portion of available system memory.

3. **Impact on Memory Usage**:
   The high work_mem setting has a direct impact on the available memory resources. Sorting operations with large work_mem values can lead to memory contention, slowing down other database processes and potentially causing system instability. This situation is further exacerbated when multiple queries simultaneously perform sorting without indexes.

4. **Unused Indexes**:
   Another key finding is that there are several indexes that are not being used by any queries. This indicates that these indexes are not providing any performance benefits and are consuming unnecessary storage space. It's recommended to remove these indexes to improve storage efficiency.

5. **High Disk I/O**:
   The high work_mem setting has also led to excessive disk I/O. When sorting operations don't fit entirely within the allocated work_mem, PostgreSQL resorts to disk-based sorting. Disk I/O is considerably slower than in-memory operations, resulting in longer query execution times.

## General recommendations:

1. **Index Optimization**:
   The primary recommendation is to optimize the database schema by creating appropriate indexes for frequently used columns in sorting operations. This will significantly reduce the need for in-memory sorting, improving query performance and reducing memory consumption.

2. **Work_mem Adjustment**:
   Reevaluate and fine-tune the work_mem parameter to a more reasonable and balanced value. This will help ensure that sorting operations have adequate memory while preventing excessive memory usage. It is essential to consider the total system memory and allocate work_mem accordingly.

3. **Query Tuning**:
   Encourage database developers to review and optimize their SQL queries to make use of indexes where possible. Sorting operations can often be avoided or minimized by crafting efficient queries that leverage existing indexes.

4. **Monitoring and Performance Tuning**:
   Implement a robust monitoring and performance tuning strategy to continuously evaluate the system's performance. Regularly review query execution plans and resource utilization to identify and address issues in real-time.

## Postgres Sorting and Memory Usage Optimization

PostgreSQL, like many relational database management systems, performs sorting as a fundamental part of query processing. Sorting is the process of arranging the rows of a result set in a specific order based on one or more columns. This operation can be resource-intensive, particularly when dealing with large datasets, and it often consumes memory.

Here's an expanded explanation of how Postgres sorting works and how high memory usage can be avoided:

- **Sorting Mechanism**:

  When you execute a SQL query that includes an `ORDER BY` clause, Postgres needs to sort the result set according to the specified columns. It employs a sorting algorithm to achieve this, often using a variation of the Quicksort algorithm. The rows are rearranged in memory to produce the desired order.

- **`work_mem` Parameter**:

  The `work_mem` parameter in PostgreSQL controls the amount of memory allocated for each sorting operation. When a query includes a sorting requirement, Postgres reserves a `work_mem`-sized chunk of memory for that specific operation. If `work_mem` is set to a high value, it means that each sorting operation has access to a larger memory buffer.

- **Impact of High `work_mem`**:

  While setting `work_mem` to a high value may seem like a way to improve sorting performance, it can lead to several problems:

  - **Memory Contention**: High `work_mem` values can lead to memory contention within the system. Sorting operations can consume a significant portion of available memory, leaving less memory for other essential database processes. This can lead to performance degradation and potential out-of-memory errors.

  - **Increased Disk I/O**: When sorting operations don't fit entirely within the allocated `work_mem`, PostgreSQL resorts to disk-based sorting. Disk I/O is considerably slower than in-memory operations, resulting in longer query execution times.

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

## Query Analysis

### 1. Optimizing indexes

> #### Example 1
>
> ```sql
> EXPLAIN ANALYZE
> SELECT "workday_workdayuser"."id",
>        "workday_workdayuser"."created",
>        "workday_workdayuser"."modified",
>        "workday_workdayuser"."external_id",
>        "workday_workdayuser"."org_id",
>        "workday_workdayuser"."owner_id",
>        "workday_workdayuser"."created_by_id",
>        "workday_workdayuser"."modified_by_id",
>        "workday_workdayuser"."user_id",
>        "workday_workdayuser"."is_internal_user",
>        "workday_workdayuser"."is_app_user",
>        "workday_workdayuser"."active",
>        "workday_workdayuser"."last_login",
>        "workday_workdayuser"."username",
>        "workday_workdayuser"."email",
>        "workday_workdayuser"."name",
>        "workday_workdayuser"."two_factor_enabled",
>        "workday_workdayuser"."sso_status",
>        "workday_workdayuser"."has_elevated_perms",
>        "workday_workdayuser"."has_admin_perms",
>        "workday_workdayuser"."locked",
>        "workday_workdayuser"."created_at_date",
>        "workday_workdayuser"."user_type",
>        "workday_workdayuser"."primary_rbac_element_id",
>        "workday_workdayuser"."primary_rbac_element_name",
>        "workday_workdayuser"."addl_primary_rbac_element_ids",
>        "workday_workdayuser"."addl_primary_rbac_element_names",
>        "workday_workdayuser"."secondary_rbac_element_ids",
>        "workday_workdayuser"."secondary_rbac_element_names",
>        "workday_workdayuser"."other_assignment_ids",
>        "workday_workdayuser"."other_assignment_names",
>        "workday_workdayuser"."observed_permissions",
>        "workday_workdayuser"."observed_settings",
>        "workday_workdayuser"."effective_access_hash",
>        "workday_workdayuser"."unified_identity_id",
>        "workday_workdayuser"."service_org_id",
>        "workday_workdayuser"."worker_id",
>        "workday_workdayuser"."is_worker",
>        "workday_workdayuser"."is_manager",
>        "workday_workdayuser"."supervisory_org_ids",
>        "workday_workdayuser"."supervisory_org_managed_ids",
>        CARDINALITY("workday_workdayuser"."secondary_rbac_element_ids") AS "secondary_rbac_elements_count",
>        CARDINALITY("workday_workdayuser"."supervisory_org_ids")        AS "other_rbac_elements_count",
>        CARDINALITY("workday_workdayuser"."observed_permissions")       AS "observed_permissions_count"
> FROM "workday_workdayuser"
> WHERE ("workday_workdayuser"."org_id" = 351
>  AND "workday_workdayuser"."active" AND
>        "workday_workdayuser"."service_org_id" = 12729)
> ORDER BY "workday_workdayuser"."username" ASC, "workday_workdayuser"."org_id" ASC, "workday_workdayuser"."active" ASC
> ```
>
> ```sql
> Sort  (cost=1193981.81..1194456.56 rows=189901 width=2923) (actual time=10784.758..11304.780 rows=861077 loops=1)
> "  Sort Key: username, active"
>   Sort Method: quicksort  Memory: 897826kB
>   ->  Bitmap Heap Scan on workday_workdayuser  (cost=325027.20..1177332.34 rows=189901 width=2923) (actual time=920.665..2894.195 rows=861077 loops=1)
>         Recheck Cond: ((service_org_id = 12729) AND (org_id = 351))
>         Filter: active
>         Rows Removed by Filter: 245679
>         Heap Blocks: exact=419034
>         ->  BitmapAnd  (cost=325027.20..325027.20 rows=248713 width=0) (actual time=730.593..730.593 rows=0 loops=1)
>               ->  Bitmap Index Scan on workday_workdayuser_service_org_id_9c41f739  (cost=0.00..153130.00 rows=1763925 width=0) (actual time=307.513..307.513 rows=1106756 loops=1)
>                     Index Cond: (service_org_id = 12729)
>               ->  Bitmap Index Scan on workday_workdayuser_org_id_25284f46  (cost=0.00..171802.00 rows=1763925 width=0) (actual time=300.445..300.445 rows=1106756 loops=1)
>                     Index Cond: (org_id = 351)
> Planning time: 0.617 ms
> Execution time: 11424.682 ms
>
> ```
>
> Data is not symmetrically divided among various org_id and service_org_id like
>
>| org_id | service_org_id | count  |
>| ------ | -------------- | ------ |
>| 39     | 14687          | 3329   |
>| 337    | 13554          | 17264  |
>| 310    | 19089          | 310706 |
>| 310    | 14699          | 319054 |
>| 370    | 13492          | 26025  |
>| ...    |                |        |
>
>For smaller count optimizer using `workday_workdayuser_service_org_id_9c41f739` ( index on `service_org_id`) , in other case it’s using `workday_wor_usernam_90d816_btree`, which is on `user_name`, `org_id` and `active` field.
>
>### Few suggestions:
>- Add `service_org_id` in the index `workday_wor_usernam_90d816_btree`, i.e `user_name`, `org_id`, `active` and `service_org_id`. This can be partial index as well with condition on `active = True`.
>- Create index on `org_id` and `active` field,`service_org_id`, `user_name`. (This is against the best practice where a high cardinality column should be at first). This can be partial index as well with condition on `active = True`.
>- Partition the table on `org_id` and create an index on `(username, org_id, active)`


#### Notes:

- Consider avoiding sorting large tables in memory. If the data set is too large to fit in memory, Postgres will resort to disk-based sorting, which is considerably slower. You can use the `SET enable_sort` parameter to disable in-memory sorting and force Postgres to use disk-based sorting instead. This can be useful when you need to sort large tables that don't fit in memory.
- Consider application-side sorting instead of database-side sorting. If your application can perform sorting operations, it may be more efficient to do so instead of relying on the database. This can be particularly useful when dealing with large datasets that don't fit in memory.
- Consider using a LIMIT clause to limit the number of rows returned by the query. This can help reduce the amount of memory used for sorting operations, particularly when dealing with large datasets.

### 2. Unused indexes

Clean up unused indexes

> Indexes took 89 GB of space as compared to table 59 GB of space. It would be good to analyze the unused indexes and get rid of them and for that we would need access to the production database to check based on current workload.
>
> | metric                            | bytes        | bytes_pretty | bytes_per_row |
> | --------------------------------- | ------------ | ------------ | ------------- |
> | core_relation_size                | 62293278720  | 58 GB        | 7788          |
> | visibility_map                    | 1908736      | 1864 kB      | 0             |
> | free_space_map                    | 15327232     | 15 MB        | 1             |
> | table_size_incl_toast             | 63277785088  | 59 GB        | 7911          |
> | indexes_size                      | 95248547840  | 89 GB        | 11908         |
> | total_size_incl_toast_and_indexes | 158526332928 | 148 GB       | 19820         |
> | live_rows_in_text_representation  | 8434800885   | 8044 MB      | 1054          |
> | ------------------------------    |              |              |
> | row_count                         | 7998094      |              |
> | live_tuples                       | 0            |              |
> | dead_tuples                       | 0            |              |
>
> Below query can be used to determine unused indexes:
>
> ```sql
>   SELECT
>   idstat.relname AS TABLE_NAME,
>   indexrelname AS index_name,
>   idstat.idx_scan AS index_scans_count,
>   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
>   FROM
>   pg_stat_user_indexes AS idstat
>   JOIN
>   pg_indexes
>   ON
>   indexrelname = indexname
>   AND
>   idstat.schemaname = pg_indexes.schemaname
>   JOIN
>   pg_stat_user_tables AS tabstat
>   ON
>   idstat.relid = tabstat.relid
>   where
>     idstat.relname like 'workday_workdayuser' and idstat.idx_scan = 0
>   ORDER BY
>   idstat.idx_scan DESC,
>   pg_relation_size(indexrelid) desc
>
> ```

Notes:

- Consider removing unused indexes. Unused indexes can take up a significant amount of disk space and can slow down data modification operations. You can use the `pg_stat_user_indexes` view to identify unused indexes and remove them using the `DROP INDEX` command. 


### Utilize DISTINCT and window functions

> Example 2
>
> ```sql
> SELECT "core_unifiedidentity"."id",
>        "core_unifiedidentity"."created",
>        "core_unifiedidentity"."modified",
>        "core_unifiedidentity"."external_id",
>        "core_unifiedidentity"."org_id",
>        "core_unifiedidentity"."identity_id",
>        "core_unifiedidentity"."identity_status",
>        "core_unifiedidentity"."identity_signature",
>        "core_unifiedidentity"."name",
>        "core_unifiedidentity"."name_akas",
>        "core_unifiedidentity"."email",
>        "core_unifiedidentity"."user_label",
>        "core_unifiedidentity"."notes",
>        "core_unifiedidentity"."primary_rbac_element_names",
>        "core_unifiedidentity"."user_controlled",
>        "core_unifiedidentity"."idp_controlled",
>        "core_unifiedidentity"."idp_type",
>        "core_unifiedidentity"."idp_service_id",
>        "core_unifiedidentity"."identity_idp_id",
>        "core_unifiedidentity"."num_users_linked",
>        "core_unifiedidentity"."num_users_active",
>        "core_unifiedidentity"."num_users_disabled",
>        "core_unifiedidentity"."num_users_inactive",
>        "core_unifiedidentity"."users_status_perm_breakdowns",
>        "core_unifiedidentity"."num_users_highest_admin",
>        "core_unifiedidentity"."num_users_highest_elevated",
>        "core_unifiedidentity"."any_elevated",
>        "core_unifiedidentity"."any_admin",
>        "core_unifiedidentity"."linked_user_ids",
>        "core_unifiedidentity"."last_login",
>        "core_unifiedidentity"."last_login_msu_id",
>        CASE
>            WHEN "core_unifiedidentity"."num_users_highest_admin" > 0 THEN 3
>            WHEN "core_unifiedidentity"."num_users_highest_elevated" > 0 THEN 2
>            WHEN "core_unifiedidentity"."num_users_linked" = 0 THEN 0
>            ELSE
>                1
>            END
>                                                                            AS "permission_level",
>        SUM(DISTINCT (("core_unifiedidentity"."num_users_linked" - "core_unifiedidentity"."num_users_highest_admin") -
>                      "core_unifiedidentity"."num_users_highest_elevated")) AS "num_users_highest_standard"
> FROM "core_unifiedidentity"
> WHERE "core_unifiedidentity"."org_id" = 351
> GROUP BY "core_unifiedidentity"."id",
>          CASE
>              WHEN "core_unifiedidentity"."num_users_highest_admin" > 0 THEN 3
>              WHEN "core_unifiedidentity"."num_users_highest_elevated" > 0 THEN 2
>              WHEN "core_unifiedidentity"."num_users_linked" = 0 THEN 0
>              ELSE
>                  1
>              END
> ```
>
> #### DISTINCT Method
>
> You can rewrite the given query using `DISTINCT` instead of `GROUP BY` as follows:
>
> ```sql
> SELECT DISTINCT ON ("core_unifiedidentity"."id")
>     "core_unifiedidentity"."id",
>     "core_unifiedidentity"."created",
>     "core_unifiedidentity"."modified",
>     "core_unifiedidentity"."external_id",
>     "core_unifiedidentity"."org_id",
>     "core_unifiedidentity"."identity_id",
>     "core_unifiedidentity"."identity_status",
>     "core_unifiedidentity"."identity_signature",
>     "core_unifiedidentity"."name",
>     "core_unifiedidentity"."name_akas",
>     "core_unifiedidentity"."email",
>     "core_unifiedidentity"."user_label",
>     "core_unifiedidentity"."notes",
>     "core_unifiedidentity"."primary_rbac_element_names",
>     "core_unifiedidentity"."user_controlled",
>     "core_unifiedidentity"."idp_controlled",
>     "core_unifiedidentity"."idp_type",
>     "core_unifiedidentity"."idp_service_id",
>     "core_unifiedidentity"."identity_idp_id",
>     "core_unifiedidentity"."num_users_linked",
>     "core_unifiedidentity"."num_users_active",
>     "core_unifiedidentity"."num_users_disabled",
>     "core_unifiedidentity"."num_users_inactive",
>     "core_unifiedidentity"."users_status_perm_breakdowns",
>     "core_unifiedidentity"."num_users_highest_admin",
>     "core_unifiedidentity"."num_users_highest_elevated",
>     "core_unifiedidentity"."any_elevated",
>     "core_unifiedidentity"."any_admin",
>     "core_unifiedidentity"."linked_user_ids",
>     "core_unifiedidentity"."last_login",
>     "core_unifiedidentity"."last_login_msu_id",
>     CASE
>         WHEN "core_unifiedidentity"."num_users_highest_admin" > 0 THEN 3
>         WHEN "core_unifiedidentity"."num_users_highest_elevated" > 0 THEN 2
>         WHEN "core_unifiedidentity"."num_users_linked" = 0 THEN 0
>         ELSE 1
>     END AS "permission_level",
>     SUM(DISTINCT (("core_unifiedidentity"."num_users_linked" - "core_unifiedidentity"."num_users_highest_admin") -
>                   "core_unifiedidentity"."num_users_highest_elevated")) AS "num_users_highest_standard"
> FROM "core_unifiedidentity"
> WHERE "core_unifiedidentity"."org_id" = 351;
> ```
>
> In this query, we use the `DISTINCT ON` clause to ensure that only distinct rows based on the "id" column are returned. This eliminates the need for the `GROUP BY` clause and still provides distinct results based on the "id" column while selecting the other specified columns.
>
> #### Window functions
>
> You can use window functions to avoid the `GROUP BY` clause while achieving the same results. Here's the query with window functions:
>
> ```sql
> SELECT
>     "core_unifiedidentity"."id",
>     "core_unifiedidentity"."created",
>     "core_unifiedidentity"."modified",
>     "core_unifiedidentity"."external_id",
>     "core_unifiedidentity"."org_id",
>     "core_unifiedidentity"."identity_id",
>     "core_unifiedidentity"."identity_status",
>     "core_unifiedidentity"."identity_signature",
>     "core_unifiedidentity"."name",
>     "core_unifiedidentity"."name_akas",
>     "core_unifiedidentity"."email",
>     "core_unifiedidentity"."user_label",
>     "core_unifiedidentity"."notes",
>     "core_unifiedidentity"."primary_rbac_element_names",
>     "core_unifiedidentity"."user_controlled",
>     "core_unifiedidentity"."idp_controlled",
>     "core_unifiedidentity"."idp_type",
>     "core_unifiedidentity"."idp_service_id",
>     "core_unifiedidentity"."identity_idp_id",
>     "core_unifiedidentity"."num_users_linked",
>     "core_unifiedidentity"."num_users_active",
>     "core_unifiedidentity"."num_users_disabled",
>     "core_unifiedidentity"."num_users_inactive",
>     "core_unifiedidentity"."users_status_perm_breakdowns",
>     "core_unifiedidentity"."num_users_highest_admin",
>     "core_unifiedidentity"."num_users_highest_elevated",
>     "core_unifiedidentity"."any_elevated",
>     "core_unifiedidentity"."any_admin",
>     "core_unifiedidentity"."linked_user_ids",
>     "core_unifiedidentity"."last_login",
>     "core_unifiedidentity"."last_login_msu_id",
>     CASE
>         WHEN "core_unifiedidentity"."num_users_highest_admin" > 0 THEN 3
>         WHEN "core_unifiedidentity"."num_users_highest_elevated" > 0 THEN 2
>         WHEN "core_unifiedidentity"."num_users_linked" = 0 THEN 0
>         ELSE 1
>     END AS "permission_level",
>     SUM("core_unifiedidentity"."num_users_linked" - "core_unifiedidentity"."num_users_highest_admin"
>         - "core_unifiedidentity"."num_users_highest_elevated") OVER () AS "num_users_highest_standard"
> FROM "core_unifiedidentity"
> WHERE "core_unifiedidentity"."org_id" = 351;
> ```
>
> In this query, we removed the `GROUP BY` clause and replaced it with a window function using the `SUM` function. The `SUM` function is calculated over all rows in the result set because of the `OVER ()` clause. This approach achieves the same results as the original query but avoids the need for grouping.
>
> #### Create a column for optimized caching
>
> To create a new column for the `CASE` expression you provided, you can simply include it as part of your SELECT statement. Here's the query with the new "permission_level" column added:
>
> ```sql
> SELECT
>     "core_unifiedidentity"."id",
>     "core_unifiedidentity"."created",
>     "core_unifiedidentity"."modified",
>     "core_unifiedidentity"."external_id",
>     "core_unifiedidentity"."org_id",
>     "core_unifiedidentity"."identity_id",
>     "core_unifiedidentity"."identity_status",
>     "core_unifiedidentity"."identity_signature",
>     "core_unifiedidentity"."name",
>     "core_unifiedidentity"."name_akas",
>     "core_unifiedidentity"."email",
>     "core_unifiedidentity"."user_label",
>     "core_unifiedidentity"."notes",
>     "core_unifiedidentity"."primary_rbac_element_names",
>     "core_unifiedidentity"."user_controlled",
>     "core_unifiedidentity"."idp_controlled",
>     "core_unifiedidentity"."idp_type",
>     "core_unifiedidentity"."idp_service_id",
>     "core_unifiedidentity"."identity_idp_id",
>     "core_unifiedidentity"."num_users_linked",
>     "core_unifiedidentity"."num_users_active",
>     "core_unifiedidentity"."num_users_disabled",
>     "core_unifiedidentity"."num_users_inactive",
>     "core_unifiedidentity"."users_status_perm_breakdowns",
>     "core_unifiedidentity"."num_users_highest_admin",
>     "core_unifiedidentity"."num_users_highest_elevated",
>     "core_unifiedidentity"."any_elevated",
>     "core_unifiedidentity"."any_admin",
>     "core_unifiedidentity"."linked_user_ids",
>     "core_unifiedidentity"."last_login",
>     "core_unifiedidentity"."last_login_msu_id",
>     CASE
>         WHEN "core_unifiedidentity"."num_users_highest_admin" > 0 THEN 3
>         WHEN "core_unifiedidentity"."num_users_highest_elevated" > 0 THEN 2
>         WHEN "core_unifiedidentity"."num_users_linked" = 0 THEN 0
>         ELSE 1
>     END AS "permission_level",
>     SUM("core_unifiedidentity"."num_users_linked" - "core_unifiedidentity"."num_users_highest_admin"
>         - "core_unifiedidentity"."num_users_highest_elevated") OVER () AS "num_users_highest_standard"
> FROM "core_unifiedidentity"
> WHERE "core_unifiedidentity"."org_id" = 351;
> ```
>
> The "permission_level" column is created based on the provided `CASE` expression and included in the SELECT statement alongside the other columns.
>
> #### Materialized views
>
> Creating a materialized view can be an effective way to optimize the query by precomputing and storing the results. To create a materialized view for your query, follow these steps:
>
> 1. Create the materialized view:
>
> ```sql
> CREATE MATERIALIZED VIEW optimized_view AS
> SELECT
>     "core_unifiedidentity"."id",
>     "core_unifiedidentity"."created",
>     "core_unifiedidentity"."modified",
>     "core_unifiedidentity"."external_id",
>     "core_unifiedidentity"."org_id",
>     "core_unifiedidentity"."identity_id",
>     "core_unifiedidentity"."identity_status",
>     "core_unifiedidentity"."identity_signature",
>     "core_unifiedidentity"."name",
>     "core_unifiedidentity"."name_akas",
>     "core_unifiedidentity"."email",
>     "core_unifiedidentity"."user_label",
>     "core_unifiedidentity"."notes",
>     "core_unifiedidentity"."primary_rbac_element_names",
>     "core_unifiedidentity"."user_controlled",
>     "core_unifiedidentity"."idp_controlled",
>     "core_unifiedidentity"."idp_type",
>     "core_unifiedidentity"."idp_service_id",
>     "core_unifiedidentity"."identity_idp_id",
>     "core_unifiedidentity"."num_users_linked",
>     "core_unifiedidentity"."num_users_active",
>     "core_unifiedidentity"."num_users_disabled",
>     "core_unifiedidentity"."num_users_inactive",
>     "core_unifiedidentity"."users_status_perm_breakdowns",
>     "core_unifiedidentity"."num_users_highest_admin",
>     "core_unifiedidentity"."num_users_highest_elevated",
>     "core_unifiedidentity"."any_elevated",
>     "core_unifiedidentity"."any_admin",
>     "core_unifiedidentity"."linked_user_ids",
>     "core_unifiedidentity"."last_login",
>     "core_unifiedidentity"."last_login_msu_id",
>     CASE
>         WHEN "core_unifiedidentity"."num_users_highest_admin" > 0 THEN 3
>         WHEN "core_unifiedidentity"."num_users_highest_elevated" > 0 THEN 2
>         WHEN "core_unifiedidentity"."num_users_linked" = 0 THEN 0
>         ELSE 1
>     END AS "permission_level",
>     "core_unifiedidentity"."num_users_linked" - "core_unifiedidentity"."num_users_highest_admin"
>     - "core_unifiedidentity"."num_users_highest_elevated" AS "num_users_highest_standard"
> FROM "core_unifiedidentity"
> WHERE "core_unifiedidentity"."org_id" = 351;
> ```
>
> This query creates a materialized view named "optimized_view" that stores the results of your original query.
>
> 2. Refresh the materialized view:
>
> Materialized views need to be refreshed to update the stored data. You can set up a refresh schedule that suits your needs. For example, you can use the following command to refresh the materialized view:
>
> ```sql
> REFRESH MATERIALIZED VIEW optimized_view;
> ```
>
> You can schedule this command to run at specific intervals, such as nightly, to ensure the data in the materialized view is up to date.
>
> 3. Optimize your queries:
>
> Now, you can query the "optimized_view" as you would with any other table. Your queries should be faster since the data is precomputed and stored in the materialized view.
>
> Keep in mind that materialized views consume storage space, and you need to balance the benefits of query optimization with the storage costs. Additionally, you should monitor and refresh the materialized view as needed to ensure data accuracy and performance.


#### Optimized index types

Optimized indexes can significantly improve query performance, and the choice of index type depends on the specific characteristics of your data and the types of queries you need to optimize. In addition to standard B-tree indexes, there are other index types that you can consider for optimization, including:

1. **Hash Indexes:**
   - Hash indexes are suitable for exact matches, particularly when searching for equality conditions.
   - They work well for scenarios where you need to locate a specific value quickly, such as in a unique constraint or primary key.
   - Hash indexes are less effective for range queries or LIKE comparisons.

2. **GiST (Generalized Search Tree):**
   - GiST indexes are versatile and can be used for various data types, including geometric, textual, and other custom types.
   - They are suitable for complex queries involving geometric shapes, full-text search, or custom data types.
   - GiST indexes are often used with PostgreSQL.

3. **GIN (Generalized Inverted Index):**
   - GIN indexes are designed for searching in arrays, full-text search, and other types of composite data.
   - They are a good choice when you need to perform operations on arrays or complex data structures.

4. **SP-GiST (Space-partitioned Generalized Search Tree):**
   - SP-GiST indexes are designed for specialized data types like network addresses or IP ranges.
   - They partition the index space into regions to improve search performance.

5. **BRIN (Block Range INdexes):**
   - BRIN indexes are useful for large, sorted datasets where range queries are common.
   - They summarize data within each block to provide efficient access to large datasets.

6. **Bitmap Indexes:**
   - Bitmap indexes are effective for low-cardinality columns (columns with a small number of distinct values).
   - They use a bitmap for each possible value, making them useful for exact matches.

7. **R-tree Indexes:**
   - R-tree indexes are designed for spatial data, such as geographic coordinates and spatial objects.
   - They enable efficient querying based on geometric properties.

8. **Full-Text Search Indexes:**
   - Full-text search indexes, like GIN or GiST indexes, are used for text search operations.
   - They are crucial for efficient searching within textual content.

9. **Custom Indexes:**
   - In some cases, you may need to create custom indexes to optimize specific query patterns based on the characteristics of your data.

When choosing an index type for optimization, consider the nature of your data, the types of queries you need to optimize, and the specific database management system (DBMS) you are using. Different DBMSs offer different types of indexes, and the performance characteristics can vary. Experimentation and profiling are often necessary to determine the most effective index type for your specific use case.

### Next steps:

- Analyze cache usage with `pg_buffercache` and `pg_stat_statements` to determine if the cache is being used effectively.
- Analyze high-impact queries with `pg_stat_statements` to identify queries that are using the most `work_mem`
- Reduce db-level sorting by using `ORDER BY` alternatives in the application layer
- Re-evaluate index types to determine if there are more effective options on per-table basis
- Implement and evalualate cost for all the suggestions made.

Though for now it seems Cloud SQL (postgre sql) would work very well but AlloyDb could be good alternative. 

### Reason for Alloy DB as a replacement:
- Fully compatible with PostgreSQL, providing flexibility and true portability for your workloads.
- Superior performance, 4x faster than standard PostgreSQL for transactional workloads.
- Fast, real-time insights, up to 100x faster analytical queries than standard PostgreSQL.
