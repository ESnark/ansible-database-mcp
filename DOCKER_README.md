# Ansible Database MCP

MCP (Model Context Protocol) Server that enables safe and fast database queries using natural language. This server acts as a bridge between AI models and your database, ensuring secure query execution with context-aware understanding.

## Quick Start

```bash
docker run -d \
  -p 3000:3000 \
  -v /path/to/env.yml:/config/env.yml \
  --name ansible-mcp \
  YOUR_DOCKERHUB_USERNAME/ansible-database-mcp:latest
```

## Configuration

This MCP server requires two configuration files to be mounted:

### 1. env.yml - Database Connection Settings

Create an `env.yml` file with your database connections:

```yaml
mydb:
  client: mysql2
  connection:
    host: your-database-host
    port: 3306
    user: your-username
    password: your-password
    database: your-database
  pool:
    min: 1
    max: 5
    idleTimeoutMillis: 10000
  description: >
    Description of your database.
    Used for context when generating queries.
```

### 2. context.md - AI Context Information

Create a `context.md` file with database schema and business context:

```markdown
# Database Context

## Tables
- users: User information table
- orders: Order records
- products: Product catalog

## Business Rules
- Active users have status = 'active'
- Orders can have status: pending, completed, cancelled
```

### Running with Configuration

```bash
docker run -d \
  -p 3000:3000 \
  -v /path/to/env.yml:/config/env.yml \
  -v /path/to/context.md:/config/context.md \
  --name ansible-mcp \
  YOUR_DOCKERHUB_USERNAME/ansible-database-mcp:latest
```

### Configuration Directory Structure

Alternatively, mount the entire config directory:

```bash
# Create config directory
mkdir config
cp env.yml config/
cp context.md config/

# Run with directory mount
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/config:/config \
  --name ansible-mcp \
  YOUR_DOCKERHUB_USERNAME/ansible-database-mcp:latest
```

## Security

- Read-only query execution by default
- SQL injection prevention
- Connection isolation
- Configurable query limits

## Links

- [GitHub Repository](https://github.com/ESnark/ansible-database-mcp)
- [Issue Tracker](https://github.com/ESnark/ansible-database-mcp/issues)

## License

MIT