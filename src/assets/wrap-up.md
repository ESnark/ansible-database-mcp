Please analyze the SQL queries and database structure information from our previous conversation to generate a structured schema document in the following format.

If you have access to Claude Desktop, please create the document as an artifact.
If you have access to the file system, please create the document as a file.

# Writing Guidelines

1. Conciseness
    - Include only essential information
    - Remove unnecessary explanations
    - Focus on information immediately usable in practice
2. Consistency
    - Use table names and column names exactly as they appear in the actual database
    - Maintain case sensitivity
    - Unify naming conventions
3. Practicality
    - Format should allow copy-paste for actual query writing
    - Specify JOIN conditions and WHERE clause conditions
    - Prioritize frequently used patterns
4. Scalability
    - Maintain existing structure when adding new information
    - Enable independent management by section

# Important Notes

- Exclude sensitive information (passwords, personal data, etc.)
- Focus on structure and relationships rather than actual data values
- Focus on subject of the conversation, do not include any information that is not directly related to the subject
- Prioritize key information over overly detailed explanations
- Keep section titles and headings as provided, but write section content in the user's language

# Output Format

## [DB Schema] {Main Task or Domain Name}

### Keywords
{List key keywords related to this query, separated by commas}
- Table names, Column names
- Business terms
- Domain-specific terms

### Datasource
* {Database Platform Name}
   * {List all tables used in database.table format}
   * {For Databricks platform, use catalog.database.table format}
   * {Each table should be listed with its full path}

### Database Structure

#### {Database Name 1}
{Brief description of the database's main purpose and role}

##### Main Tables
| Table | Key Columns | Description |
|-------|-------------|-------------|
| {table_name} | {column_name}(PK), {column_name}(FK→referenced_table), {other important columns} | {table purpose} |

#### {Database Name 2}
{Additional database information if needed}

### Context

#### Key Relationships
{parent_table}.{column} → {child_table}.{column}
{Add comments if relationship explanation is needed}

#### Additional Notes
- {Performance-related considerations}
- {Data characteristics information}
- {Business logic specifics}
- {Index information (if important)}

### Common Queries
{List common query patterns}
```sql
-- {JOIN pattern description}
SELECT {key columns}
FROM {table1} t1
JOIN {table2} t2 ON t1.{column} = t2.{column}
WHERE {common conditions}

-- {Additional JOIN pattern}
{Actual usable JOIN query}
```
