# ansible-database-mcp

## 1.3.5

### Patch Changes

- 300c517: remove authorization server endpoints from resource server

## 1.3.4

### Patch Changes

- c725040: update resource metadata URL construction in auth middleware

## 1.3.3

### Patch Changes

- 69c5c40: add private issuer support for OAuth configuration

## 1.3.2

### Patch Changes

- a76b4e3: improve error handling for invalid OAuth configuration

## 1.3.1

### Patch Changes

- e2ea099: - Fetch OpenID configuration from issuer on startup
  - Add /.well-known/oauth-protected-resource metadata
  - Support WWW-Authenticate header for OAuth
- 2a4691d: add pnpm workspace configuration to build image

## 1.3.0

### Minor Changes

- 3b6ea59: Add authentication supports

### Patch Changes

- bab9588: optimize image build script

## 1.2.0

### Minor Changes

- 1b0872b: Add databricks support

## 1.1.0

### Minor Changes

- 443b349: Add npx support
- 178ebf7: Added 'ask' prompt for guided database queries

### Patch Changes

- 3b311c5: Apply strategy pattern for multi-database support
