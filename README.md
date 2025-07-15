# Ansible Database MCP
Safe & Fast human language queries with write permission protection

## Key Features

- **Write Permission Check**: Automatically checks write permissions on database connection and only allows read-only connections
- **MySQL Support**: Secure read-only access to MySQL databases
- **MCP Protocol**: AI tool integration through Model Context Protocol
- **Connection Pooling**: Efficient database connection management

## Test Environment Setup

### Prerequisites

- Node.js 22 or higher
- Docker and Docker Compose
- pnpm


## Environment Configuration

### Environment Variable File Structure

This project manages environment variables through yaml files.

```yaml
# env.yml example
database_name:
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
  description: Database description
```

### Environment Variable File Location

- Default location: `env.yml` in the project root directory
- Use different file name: Can be specified with `DATABASE_CONFIG_FILE` environment variable
  ```bash
  DATABASE_CONFIG_FILE=production.yml pnpm start
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
   - Get detailed information about a specific table
   - Parameters:
     - `database` (required): Database name
     - `table` (required): Table name
     - `schema` (optional): Schema name

5. **echo**
   - Echo a message back
   - Parameters:
     - `message` (required): Message to echo

### MCP Resources

1. **ansible-database-mcp-guide**
   - Comprehensive guide for using Ansible Database MCP
   - URI: `guide://ansible-database-mcp`
   - Returns markdown formatted guide with usage instructions and best practices

2. **database-context**
   - Contextual information about databases and tables
   - URI: `context://ansible-database-mcp`
   - Returns markdown formatted database documentation
   - Can be customized by mounting your own context.md file in Docker


## Docker Deployment

The MCP server can be deployed as a Docker image. The configuration file (`env.yml`) is mounted at runtime.

```bash
# Build Docker image
docker build -t ansible-database-mcp .

# Run Docker container
docker run -d \
  -v ./env.yml:/config/env.yml:ro \
  -p 3000:3000 \
  ansible-database-mcp
```

### Context File

You can provide a database context file:

```bash
docker run -d \
  -v ./env.yml:/config/env.yml:ro \
  -v ./context.md:/config/context.md:ro \
  -p 3000:3000 \
  ansible-database-mcp
```

The context file should contain relevant contextual information about your database, such as usage guidelines, data relationships, or business rules.

This file is used by MCP tools to enhance the interpretability of query results.

### Different Configuration File

You can use a different configuration file using the `DATABASE_CONFIG_FILE` environment variable:

```bash
docker run \
  -v ./env.yml:/config/custom-config.yml:ro \
  -p 3000:3000 \
  -e DATABASE_CONFIG_FILE=custom-config.yml \
  ansible-database-mcp
```

## Local Test Environment Setup

### Method 1: Integrated Environment using Docker Compose

Using Docker Compose, you can run both MySQL database and MCP server together.

1. **Create Configuration File**
   ```bash
   cp env.example.yml env.yml
   ```

2. **Run Docker Compose**
   ```bash
   docker-compose up -d
   ```
   This command automatically configures:
   - MySQL 8.0 database (port 3306)
   - MCP server container (port 3000)
   - Automatic creation of read-only and write-permission users
   - Sample database and table initialization

3. **Shutdown Environment**
   ```bash
   docker-compose down -v  # Also removes volumes
   ```

### Method 2: Standalone Local Development Environment

If you already have MySQL database installed or are using a remote database:

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Environment**
   ```bash
   cp env.example.yml env.yml
   ```
   Open `env.yml` file and update with actual database connection info:
   - host: Database host address
   - user: User with read-only permissions
   - password: User's password

3. **Run Development Server**
   ```bash
   pnpm dev
   ```
   Development server runs at http://localhost:3000.

4. **Run Tests**
   ```bash
   # Run all tests
   pnpm test

   # Run tests in watch mode
   pnpm test:watch

   # Run tests with coverage
   pnpm test:coverage
   ```
