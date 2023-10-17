# SADA - Cloud SQL Configuration

## Database flags

### Current configuration

| Flag                   | Value      | Description                                                                                                                                          |
| ---------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `effective_cache_size` | 16,509,331 | Used only by the PostgreSQL query planner to figure out whether plans it's considering would be expected to fit in RAM or not                        |
| `shared_buffers`       | 13,757,696 | How much dedicated system memory psql will use for caching.                                                                                          |
| `work_mem`             | 5,242,880  | used for complex sort operations, and defines the maximum amount of memory to be used for intermediate results, such as hash tables, and for sorting |
| `maintenance_work_mem` | 10,485,760 | Specifies how much memory is used for routine maintenance tasks, such as VACUUM, CREATE INDEX, and similar                                           |

|

### Shared Buffers

- **Description**: The amount of memory the database uses for shared memory buffers. Increasing this value can improve performance for read-heavy workloads.
- **Default**: 25% of the machine's memory

###
