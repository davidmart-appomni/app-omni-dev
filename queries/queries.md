# SQL queries optimization

### 1. `workday_workdayuser`

#### Query

```sql
select
	"workday_workdayuser"."id",
	"workday_workdayuser"."created",
	"workday_workdayuser"."modified",
	"workday_workdayuser"."external_id",
	"workday_workdayuser"."org_id",
	"workday_workdayuser"."owner_id",
	"workday_workdayuser"."created_by_id",
	"workday_workdayuser"."modified_by_id",
	"workday_workdayuser"."user_id",
	"workday_workdayuser"."is_internal_user",
	"workday_workdayuser"."is_app_user",
	"workday_workdayuser"."active",
	"workday_workdayuser"."last_login",
	"workday_workdayuser"."username",
	"workday_workdayuser"."email",
	"workday_workdayuser"."name",
	"workday_workdayuser"."two_factor_enabled",
	"workday_workdayuser"."sso_status",
	"workday_workdayuser"."has_elevated_perms",
	"workday_workdayuser"."has_admin_perms",
	"workday_workdayuser"."locked",
	"workday_workdayuser"."created_at_date",
	"workday_workdayuser"."user_type",
	"workday_workdayuser"."primary_rbac_element_id",
	"workday_workdayuser"."primary_rbac_element_name",
	"workday_workdayuser"."addl_primary_rbac_element_ids",
	"workday_workdayuser"."addl_primary_rbac_element_names",
	"workday_workdayuser"."secondary_rbac_element_ids",
	"workday_workdayuser"."secondary_rbac_element_names",
	"workday_workdayuser"."other_assignment_ids",
	"workday_workdayuser"."other_assignment_names",
	"workday_workdayuser"."observed_permissions",
	"workday_workdayuser"."observed_settings",
	"workday_workdayuser"."effective_access_hash",
	"workday_workdayuser"."unified_identity_id",
	"workday_workdayuser"."service_org_id",
	"workday_workdayuser"."worker_id",
	"workday_workdayuser"."is_worker",
	"workday_workdayuser"."is_manager",
	"workday_workdayuser"."supervisory_org_ids",
	"workday_workdayuser"."supervisory_org_managed_ids",
	cardinality("workday_workdayuser"."secondary_rbac_element_ids") as "secondary_rbac_elements_count",
	cardinality("workday_workdayuser"."supervisory_org_ids") as "other_rbac_elements_count",
	cardinality("workday_workdayuser"."observed_permissions") as "observed_permissions_count"
from
	"workday_workdayuser"
where
	( "workday_workdayuser"."service_org_id" = 13971
	 and "workday_workdayuser"."org_id" = 456
		and "workday_workdayuser"."active")
order by
	"workday_workdayuser"."username" asc

limit 1000
```

#### Suggestions

1. Clean up unused indexes

   Indexes took 89 GB of space as compared to table 59 GB of space. It would be good to analyze the unused indexes and get rid of them and for that we would need access to the production database to check based on current workload.

    | metric                            | bytes        | bytes_pretty | bytes_per_row |
    | --------------------------------- | ------------ | ------------ | ------------- |
    | core_relation_size                | 62293278720  | 58 GB        | 7788          |
    | visibility_map                    | 1908736      | 1864 kB      | 0             |
    | free_space_map                    | 15327232     | 15 MB        | 1             |
    | table_size_incl_toast             | 63277785088  | 59 GB        | 7911          |
    | indexes_size                      | 95248547840  | 89 GB        | 11908         |
    | total_size_incl_toast_and_indexes | 158526332928 | 148 GB       | 19820         |
    | live_rows_in_text_representation  | 8434800885   | 8044 MB      | 1054          |
    | ------------------------------    |              |              |
    | row_count                         | 7998094      |              |
    | live_tuples                       | 0            |              |
    | dead_tuples                       | 0            |              |

    Below query can be used to determine unused indexes:

    ```sql
      SELECT
      idstat.relname AS TABLE_NAME,
      indexrelname AS index_name,
      idstat.idx_scan AS index_scans_count,
      pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM
      pg_stat_user_indexes AS idstat
      JOIN
      pg_indexes
      ON
      indexrelname = indexname
      AND
      idstat.schemaname = pg_indexes.schemaname
      JOIN
      pg_stat_user_tables AS tabstat
      ON
      idstat.relid = tabstat.relid
      where
        idstat.relname like 'workday_workdayuser' and idstat.idx_scan = 0
      ORDER BY
      idstat.idx_scan DESC,
      pg_relation_size(indexrelid) desc

    ```

2. Optimize index

    Data is not symmetrically divided among various org_id and service_org_id like 

    |    org_id|service_org_id|count  
    |------|--------------| -------
    |    39|         14687|   3329
    |   337|         13554|  17264
    |   310|         19089| 310706
    |   310|         14699| 319054
    |   370|         13492|  26025
    |   403|         18503|  50531
    |   404|         20221|   7317
    |   440|         13742|   3831
    |   552|         17664|   2074
    |   450|         13911| 135526
    |    74|         18661|  12797
    |   404|         20098|   5774
    |   583|         18614|  86440
    |   403|         18346|  51313
    |   236|         13244|    949
    |   109|         13230| 216291
    |   310|         13606| 317114
    |   310|         19086| 332168
    |   310|         18195| 316660
    |   445|         13865|   1673
    |   298|         12231|    803
    |   565|         17959| 135630
    |   473|         18122|1426503
    |   401|         13368|  27746
    |   348|         14497|   2294
    |   236|         16303| 434198
    |    39|         14942|   3678
    |   440|         14510|   4368
    |    25|         12383|  12658
    |   483|         16221|   3012
    |   289|         14425|   6283
    |   209|         18810|   4488
    |   336|         12893|  65576
    |   456|         13971| 177440
    |   310|         15408| 322497
    |    12|         15472|    844
    |   234|         13372|   6899
    |    24|         17725|  12658
    |   286|         13168|  88238
    |   597|         19907|   6676
    |   213|         13731|  71934
    |   378|         13042|  23544
    |   310|         15469| 318881
    |   310|         19669| 324276
    |   310|         16537| 319383
    |   613|         19966|  42662
    |   320|         16065|  70317
    |   586|         18745|   3278
    |   379|         15816| 187012
    |   351|         12729|1106756
    |   495|         18135|  12658
    |   255|         12826| 238024
    |   310|         14868| 320044

    For smaller count optimizer using workday_workdayuser_service_org_id_9c41f739 ( index on service_org_id)  , in other case it’s using workday_wor_usernam_90d816_btree, which is on user_name, org_id and active field.

    Couple of things can be tried and tested:

    - Add service_org_id in the index, i.e user_name, org_id and active field,service_org_id
    -  create index on  org_id and active field,service_org_id, user_name. ( This is against the best practice where high cardinality column should be at first).
    -  Partitioned the table on org_id and create index on ( username, org_id, active)

2. `core_unifiedidentity`

```sql
Explain analyze SELECT
"core_unifiedidentity"."id",
"core_unifiedidentity"."created",
"core_unifiedidentity"."modified",
"core_unifiedidentity"."external_id",
"core_unifiedidentity"."org_id",
"core_unifiedidentity"."identity_id",
"core_unifiedidentity"."identity_status",
"core_unifiedidentity"."identity_signature",
"core_unifiedidentity"."name",
"core_unifiedidentity"."name_akas",
"core_unifiedidentity"."email",
"core_unifiedidentity"."user_label",
"core_unifiedidentity"."notes",
"core_unifiedidentity"."primary_rbac_element_names",
"core_unifiedidentity"."user_controlled",
"core_unifiedidentity"."idp_controlled",
"core_unifiedidentity"."idp_type",
"core_unifiedidentity"."idp_service_id",
"core_unifiedidentity"."identity_idp_id",
"core_unifiedidentity"."num_users_linked",
"core_unifiedidentity"."num_users_active",
"core_unifiedidentity"."num_users_disabled",
"core_unifiedidentity"."num_users_inactive",
"core_unifiedidentity"."users_status_perm_breakdowns",
"core_unifiedidentity"."num_users_highest_admin",
"core_unifiedidentity"."num_users_highest_elevated",
"core_unifiedidentity"."any_elevated",
"core_unifiedidentity"."any_admin",
"core_unifiedidentity"."linked_user_ids",
"core_unifiedidentity"."last_login",
"core_unifiedidentity"."last_login_msu_id",
CASE
WHEN "core_unifiedidentity"."num_users_highest_admin" > 0 THEN 3
WHEN "core_unifiedidentity"."num_users_highest_elevated" > 0 THEN 2
WHEN "core_unifiedidentity"."num_users_linked" = 0 THEN 0
ELSE
1
END
AS "permission_level",
SUM(DISTINCT (("core_unifiedidentity"."num_users_linked" - "core_unifiedidentity"."num_users_highest_admin") - "core_unifiedidentity"."num_users_highest_elevated")) AS "num_users_highest_standard"
FROM
"core_unifiedidentity"
WHERE
"core_unifiedidentity"."org_id" = 351
GROUP BY
"core_unifiedidentity"."id",
CASE
WHEN "core_unifiedidentity"."num_users_highest_admin" > 0 THEN 3
WHEN "core_unifiedidentity"."num_users_highest_elevated" > 0 THEN 2
WHEN "core_unifiedidentity"."num_users_linked" = 0 THEN 0
ELSE
1
END
LIMIT
10

```

```sql
QUERY PLAN                                                                                                                                                                                |
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
Limit  (cost=14487143.07..14487143.09 rows=10 width=2779) (actual time=371224.624..371224.630 rows=10 loops=1)                                                                            |
  ->  Sort  (cost=14487143.07..14494363.73 rows=2888265 width=2779) (actual time=371224.622..371224.626 rows=10 loops=1)                                                                  |
        Sort Key: (sum(DISTINCT ((num_users_linked - num_users_highest_admin) - num_users_highest_elevated))) DESC                                                                        |
        Sort Method: top-N heapsort  Memory: 39kB                                                                                                                                         |
        ->  GroupAggregate  (cost=14330860.09..14424728.70 rows=2888265 width=2779) (actual time=362560.639..368946.820 rows=2872734 loops=1)                                             |
              Group Key: id, (CASE WHEN (num_users_highest_admin > 0) THEN 3 WHEN (num_users_highest_elevated > 0) THEN 2 WHEN (num_users_linked = 0) THEN 0 ELSE 1 END)                  |
              ->  Sort  (cost=14330860.09..14338080.75 rows=2888265 width=2771) (actual time=362560.582..364428.221 rows=2872734 loops=1)                                                 |
                    Sort Key: id, (CASE WHEN (num_users_highest_admin > 0) THEN 3 WHEN (num_users_highest_elevated > 0) THEN 2 WHEN (num_users_linked = 0) THEN 0 ELSE 1 END)             |
                    Sort Method: external merge  Disk: 1709224kB                                                                                                                          |
                    ->  Bitmap Heap Scan on core_unifiedidentity  (cost=135904.62..3655323.67 rows=2888265 width=2771) (actual time=2880.842..339619.444 rows=2872734 loops=1)            |
                          Recheck Cond: (org_id = 351)                                                                                                                                    |
                          Rows Removed by Index Recheck: 4861940                                                                                                                          |
                          Heap Blocks: exact=31467 lossy=662455                                                                                                                           |
                          ->  Bitmap Index Scan on core_unifiedidentity_org_id_33228347  (cost=0.00..135182.55 rows=2888265 width=0) (actual time=2866.304..2866.304 rows=2872734 loops=1)|
                                Index Cond: (org_id = 351)                                                                                                                                |
Planning time: 0.285 ms                                                                                                                                                                   |
Execution time: 371926.669 ms                                                                                                                                                             |

```


Based on the explain plan , data is spilling to disk due to group by and sort. We can check work_mem current setting using SHOW work_mem and increase the value appropriately.
 Using SET work_mem.

>work_mem tells Postgres how much RAM can be allocated by a query before a file on disk is created. Not all operations require such a 'buffer' to work on, but it is important to let the system know that some amount of memory can be used when needed.

#### Suggestions

1. Create DB columns 
```sql
CASE WHEN "core_unifiedidentity"."num_users_highest_admin" > 0 THEN 3
WHEN "core_unifiedidentity"."num_users_highest_elevated" > 0 THEN 2
WHEN "core_unifiedidentity"."num_users_linked" = 0 THEN 0
ELSE
1
END
AS "permission_level" 
```

2. Window function instead of group by.

### 3. o365_o365user

```sql

SELECT "o365_o365user"."id", "o365_o365user"."created", "o365_o365user"."modified", "o365_o365user"."external_id", "o365_o365user"."org_id", "o365_o365user"."owner_id", "o365_o365user"."created_by_id", "o365_o365user"."modified_by_id", "o365_o365user"."user_id", "o365_o365user"."is_internal_user", "o365_o365user"."is_app_user", "o365_o365user"."last_login", "o365_o365user"."username", "o365_o365user"."email", "o365_o365user"."name", "o365_o365user"."two_factor_enabled", "o365_o365user"."sso_status", "o365_o365user"."has_elevated_perms", "o365_o365user"."has_admin_perms", "o365_o365user"."locked", "o365_o365user"."created_at_date", "o365_o365user"."user_type", "o365_o365user"."primary_rbac_element_id", "o365_o365user"."primary_rbac_element_name", "o365_o365user"."addl_primary_rbac_element_ids", "o365_o365user"."addl_primary_rbac_element_names", "o365_o365user"."secondary_rbac_element_ids", "o365_o365user"."secondary_rbac_element_names", "o365_o365user"."other_assignment_ids", "o365_o365user"."other_assignment_names", "o365_o365user"."observed_permissions", "o365_o365user"."effective_access_hash", "o365_o365user"."unified_identity_id", "o365_o365user"."service_org_id", "o365_o365user"."o365_id", "o365_o365user"."first_name", "o365_o365user"."last_name", "o365_o365user"."external_user_state", "o365_o365user"."group_ids", "o365_o365user"."team_ids", "o365_o365user"."role_ids", "o365_o365user"."password_policies", "o365_o365user"."observed_settings", "o365_o365user"."auth_methods", "o365_o365user"."is_mfa_registered", "o365_o365user"."risk_state", "o365_o365user"."risk_level", "o365_o365user"."risk_detail", "o365_o365user"."license_detail", "o365_o365user"."active", "o365_o365user"."deleted", "o365_o365user"."identities", "o365_o365user"."api_response", CARDINALITY("o365_o365user"."addl_primary_rbac_element_ids") AS "addl_primary_rbac_elements_count", CARDINALITY("o365_o365user"."secondary_rbac_element_ids") AS "secondary_rbac_elements_count", CARDINALITY("o365_o365user"."other_assignment_ids") AS "other_rbac_elements_count", CARDINALITY("o365_o365user"."observed_permissions") AS "observed_permissions_count" FROM "o365_o365user" WHERE ("o365_o365user"."org_id" = ? AND "o365_o365user"."active" AND "o365_o365user"."service_org_id" = ? AND (UPPER("o365_o365user"."name"::text) LIKE UPPER(?) OR UPPER("o365_o365user"."username"::text) LIKE UPPER(?) OR UPPER("o365_o365user"."user_id"::text) LIKE UPPER(?)) AND (UPPER("o365_o365user"."name"::text) LIKE UPPER(?) OR UPPER("o365_o365user"."username"::text) LIKE UPPER(?) OR UPPER("o365_o365user"."user_id"::text) LIKE UPPER(?))) ORDER BY "o365_o365user"."username" ASC, "o365_o365user"."org_id" ASC, "o365_o365user"."active" ASC LIMIT ?

QUERY PLAN                                                                                                                                                                                                                                                     |
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
Limit  (cost=198281.52..198281.53 rows=5 width=2767) (actual time=114824.659..114824.661 rows=1 loops=1)                                                                                                                                                       |
  ->  Sort  (cost=198281.52..198281.53 rows=5 width=2767) (actual time=114824.656..114824.658 rows=1 loops=1)                                                                                                                                                  |
        Sort Key: username, active                                                                                                                                                                                                                             |
        Sort Method: quicksort  Memory: 27kB                                                                                                                                                                                                                   |
        ->  Bitmap Heap Scan on o365_o365user  (cost=78007.27..198281.46 rows=5 width=2767) (actual time=80214.181..114824.533 rows=1 loops=1)                                                                                                                 |
              Recheck Cond: ((service_org_id = 17310) AND (org_id = 550))                                                                                                                                                                                      |
              Rows Removed by Index Recheck: 267438                                                                                                                                                                                                            |
              Filter: (active AND ((upper((name)::text) ~~ ''::text) OR (upper((username)::text) ~~ '000008@CORPAA.AA.COM'::text) OR (upper((user_id)::text) ~~ ''::text)) AND ((upper((name)::text) ~~ ''::text) OR (upper((username)::text) ~~ '000008@CORPAA|
              Rows Removed by Filter: 279024                                                                                                                                                                                                                   |
              Heap Blocks: exact=39887 lossy=216706                                                                                                                                                                                                            |
              ->  BitmapAnd  (cost=78007.27..78007.27 rows=32672 width=0) (actual time=9126.960..9126.960 rows=0 loops=1)                                                                                                                                      |
                    ->  Bitmap Index Scan on o365_o365user_service_org_id_68c99f99  (cost=0.00..38579.51 rows=491060 width=0) (actual time=4546.323..4546.323 rows=702439 loops=1)                                                                             |
                          Index Cond: (service_org_id = 17310)                                                                                                                                                                                                 |
                    ->  Bitmap Index Scan on o365_o365user_org_id_6b5e4d39  (cost=0.00..39427.51 rows=491060 width=0) (actual time=4559.505..4559.505 rows=702439 loops=1)                                                                                     |
                          Index Cond: (org_id = 550)                                                                                                                                                                                                           |
Planning time: 101.289 ms                                                                                                                                                                                                                                      |
Execution time: 114824.869 ms                                                                                                                                                                                                                                  |






```