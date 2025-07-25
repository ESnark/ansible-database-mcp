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


## Authentication

The MCP server supports three authentication modes for securing access:

### 1. No Authentication (Default)
By default, the server runs without authentication. This is suitable for local development or trusted environments.

### 2. Bearer Token Authentication
Use a static Bearer token for simple API key-style authentication.

```bash
# Set environment variables
AUTH_TYPE=bearer
BEARER_TOKEN=your-secret-token

# Example with Docker
docker run -d \
  -e AUTH_TYPE=bearer \
  -e BEARER_TOKEN=your-secret-token \
  -v ./config/:/config/:ro \
  -p 3000:3000 \
  ansible-database-mcp:latest

# Example with npx
AUTH_TYPE=bearer BEARER_TOKEN=your-secret-token npx ansible-database-mcp
```

**Claude Desktop Configuration:**
```json
{
  "mcp_servers": [{
    "type": "url",
    "url": "https://your-server.com/mcp",
    "name": "ansible-database",
    "authorization_token": "your-secret-token"
  }]
}
```

### 3. OAuth 2.1 Authentication
For enterprise environments, use OAuth 2.1 with JWT token validation.

```bash
# Set environment variables
AUTH_TYPE=oauth
OAUTH_ISSUER=https://your-auth-provider.com
OAUTH_AUDIENCE=your-mcp-api

# Example with Docker
docker run -d \
  -e AUTH_TYPE=oauth \
  -e OAUTH_ISSUER=https://auth.example.com \
  -e OAUTH_AUDIENCE=mcp-api \
  -v ./config/:/config/:ro \
  -p 3000:3000 \
  ansible-database-mcp:latest
```

**Claude Desktop Configuration:**
1. Go to Settings > Connectors
2. Add Custom Integration
3. Enter your server URL
4. Complete OAuth flow when prompted

### Environment Variables

| Variable | Description | Required When |
|----------|-------------|---------------|
| `AUTH_TYPE` | Authentication type: `bearer`, `oauth`, or omit for no auth | Optional |
| `BEARER_TOKEN` | Secret token for Bearer authentication | `AUTH_TYPE=bearer` |
| `OAUTH_ISSUER` | OAuth 2.1 provider URL | `AUTH_TYPE=oauth` |
| `OAUTH_AUDIENCE` | Expected audience for JWT tokens | `AUTH_TYPE=oauth` |

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

# Run with Bearer token authentication
AUTH_TYPE=bearer BEARER_TOKEN=secret npx ansible-database-mcp

# Show help
npx ansible-database-mcp --help
```

### Option 2: Using Docker

```bash
# Create config directory
mkdir config
cp env.yml config/
cp context.md config/  # Optional

# Run without authentication
docker run -d \
  -v ./config/:/config/:ro \
  -p 3000:3000 \
  --name ansible-mcp \
  ansible-database-mcp:latest

# Run with Bearer token authentication
docker run -d \
  -e AUTH_TYPE=bearer \
  -e BEARER_TOKEN=your-secret-token \
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

# Run with authentication
AUTH_TYPE=bearer BEARER_TOKEN=secret pnpm dev

# Build for production
pnpm build
pnpm start
```

## Support

- **Multi-Database**: MySQL 8.0+, PostgreSQL 12+, and Databricks SQL Warehouses
- **Architectures**: AMD64 and ARM64
- **Node.js**: 22 or higher
