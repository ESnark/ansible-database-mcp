# Ansible Database MCP

MCP (Model Context Protocol) Server that enables safe and fast database queries using natural language. This server acts as a bridge between AI models and your database, ensuring secure query execution with context-aware understanding.

## Quick Start

### Without Authentication (Default)
```bash
docker run -d \
  -p 3000:3000 \
  -v ./config/:/config/:ro \
  --name ansible-mcp \
  YOUR_DOCKERHUB_USERNAME/ansible-database-mcp:latest
```

### With Bearer Token Authentication
```bash
docker run -d \
  -p 3000:3000 \
  -e AUTH_TYPE=bearer \
  -e BEARER_TOKEN=your-secret-token \
  -v ./config/:/config/:ro \
  --name ansible-mcp \
  YOUR_DOCKERHUB_USERNAME/ansible-database-mcp:latest
```

### With OAuth Authentication
```bash
docker run -d \
  -p 3000:3000 \
  -e AUTH_TYPE=oauth \
  -e OAUTH_ISSUER=https://your-auth-provider.com \
  -e OAUTH_AUDIENCE=your-api-audience \
  -v ./config/:/config/:ro \
  --name ansible-mcp \
  YOUR_DOCKERHUB_USERNAME/ansible-database-mcp:latest
```

## Configuration

This MCP server requires configuration files to be mounted in the `/config` directory:

### 1. env.yml - Database Connection Settings

Create an `env.yml` file with your database connections:

```yaml
# MySQL database example
mysql_db:
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
  description: MySQL database description

# PostgreSQL database example
postgres_db:
  client: pg
  connection:
    host: your-postgres-host
    port: 5432
    user: your-username
    password: your-password
    database: your-database
  pool:
    min: 1
    max: 5
    idleTimeoutMillis: 10000
  description: PostgreSQL database description
```

### 2. context.md - AI Context Information (Optional)

Create a `context.md` file with business context and terminology definitions:

```markdown
# Database Context

## Business Context
- Define domain-specific terms and concepts
- Explain business rules and relationships
- Document any special conventions or naming patterns

Note: Database schema can be discovered automatically through MCP tools.
Providing context helps with faster and more accurate queries, but is not required.
```

## Authentication

The server supports three authentication modes:

1. **No Authentication** (default): Suitable for development or trusted environments
2. **Bearer Token**: Simple API key authentication
3. **OAuth 2.1**: JWT token validation with JWKS support

### Environment Variables

| Variable | Description | Required When |
|----------|-------------|---------------|
| `AUTH_TYPE` | Authentication type: `bearer`, `oauth`, or omit for no auth | Optional |
| `BEARER_TOKEN` | Secret token for Bearer authentication | `AUTH_TYPE=bearer` |
| `OAUTH_ISSUER` | OAuth 2.1 provider URL | `AUTH_TYPE=oauth` |
| `OAUTH_AUDIENCE` | Expected audience for JWT tokens | `AUTH_TYPE=oauth` |

## Security

- Automatic write permission verification on connection
- Rejects connections with write permissions (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, EXECUTE)
- SQL injection prevention
- Connection isolation
- Configurable query timeouts (10-60 seconds)
- API endpoint authentication (Bearer Token or OAuth)

## Links

- [GitHub Repository](https://github.com/ESnark/ansible-database-mcp)
- [Issue Tracker](https://github.com/ESnark/ansible-database-mcp/issues)

## License

MIT