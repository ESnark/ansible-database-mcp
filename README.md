# Ansible Database MCP
Safe & Fast human language queries with write permission protection

## Key Features

- **Write Permission Check**: Automatically checks write permissions on database connection and only allows read-only connections
- **Multi-Database Support**: Secure read-only access to MySQL, PostgreSQL, and Databricks databases
- **MCP Protocol**: AI tool integration through Model Context Protocol
- **Connection Pooling**: Efficient database connection management

## Prerequisites

- Node.js 22 or higher
- Docker
- pnpm (for development)

## Configuration

Create an `env.yml` file with your database connections:

```yaml
# env.yml example

# MySQL database configuration
database_1:
  client: mysql2
  connection:
    host: localhost
    port: 3306
    user: readonly_user
    password: your_password
    database: your_database
  pool:
    min: 1
    max: 5
    idleTimeoutMillis: 10000
  description: MySQL database description

# PostgreSQL database configuration
database_2:
  client: pg
  connection:
    host: localhost
    port: 5432
    user: readonly_user
    password: your_password
    database: your_database
  pool:
    min: 1
    max: 5
    idleTimeoutMillis: 10000
  description: PostgreSQL database description

# Databricks database configuration
databricks_warehouse:
  client: databricks
  connection:
    host: your-workspace.cloud.databricks.com
    port: 443
    path: /sql/1.0/warehouses/your-warehouse-id
    token: super_secret_token
    catalog: main
    database: default  # This represents the schema in Databricks
  pool:
    min: 1
    max: 5
    idleTimeoutMillis: 30000
  description: Databricks SQL Warehouse connection
```


## Security Features

This MCP server implements the following security mechanisms to ensure database safety:

1. **Connection-time Permission Check**: Checks user permissions when creating database connections
2. **Read-only Enforcement**: Immediately rejects connections if write permissions are detected
3. **Permission Analysis**: Comprehensive analysis of `read_only`, `super_read_only` variables and user permissions

## Available Tools

### MCP Tools

1. **execute-sql-query**
   - Execute SQL queries and return results
   - Parameters: 
     - `query` (required): SQL query to execute
     - `database` (required): Database name to connect to
     - `schema` (optional): Schema name to use (required for PostgreSQL)
     - `timeout` (optional): Query timeout in seconds (10-60s, default 30s)

2. **connection-info**
   - Retrieve database connection information
   - Shows available databases and their configurations
   - No parameters required

3. **list-tables**
   - List all tables in a database
   - Parameters:
     - `database` (required): Database name to list tables from

4. **get-table**
   - Get detailed information about a specific table (columns, indexes, constraints)
   - Parameters:
     - `database` (required): Database name
     - `table` (required): Table name
     - `info_type` (optional): Type of information to retrieve (columns, indexes, constraints, all - default: all)

### MCP Resources

1. **database-context**
   - Contextual information about databases and tables
   - URI: `context://ansible-database-mcp`
   - Custom context explaining business terms and table relationships
   - Can be customized through `context.md` file

### MCP Prompts

1. **ask**
   - Guide prompt for asking questions about the database
   - Parameters:
     - `question` (required): Question about the database
     - `use-context` (optional): Whether to include database context
   - Helps AI create effective database queries


## Usage

### Option 1: Using npx (Recommended)

```bash
# Run with default configuration
npx ansible-database-mcp

# Run with custom config file
npx ansible-database-mcp --config ./my-env.yml

# Run with custom config and context
npx ansible-database-mcp --config ./my-env.yml --context ./my-context.md

# Run on different port
npx ansible-database-mcp --port 3001

# Show help
npx ansible-database-mcp --help
```

### Option 2: Using Docker

```bash
# Create config directory
mkdir config
cp env.yml config/
cp context.md config/  # Optional

# Run with directory mount
docker run -d \
  -v ./config/:/config/:ro \
  -p 3000:3000 \
  --name ansible-mcp \
  ansible-database-mcp:latest
```

### Option 3: Local Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run with custom config
CONFIG_FILE=./custom-env.yml pnpm dev

# Build for production
pnpm build
pnpm start
```

## Support

- **Multi-Database**: MySQL 8.0+, PostgreSQL 12+, and Databricks SQL Warehouses
- **Architectures**: AMD64 and ARM64
- **Node.js**: 22 or higher
