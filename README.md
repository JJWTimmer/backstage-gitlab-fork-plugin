# Backstage Scaffolder Backend Module - GitLab Fork

This is a Backstage scaffolder backend module that provides an action to fork repositories on GitLab (including self-hosted instances).

## Features

- Fork projects on GitLab.com or self-hosted GitLab instances
- Support for custom namespace, name, path, and visibility settings
- Automatic polling to wait for fork completion
- Full TypeScript support with comprehensive type definitions
- Configurable polling intervals and timeout settings
- Enhanced error handling with user-friendly messages
- Comprehensive test coverage
- Compatible with Backstage's new backend system

## Installation

Install the package in your Backstage backend:

```bash
yarn workspace backend add @internal/backstage-scaffolder-backend-module-gitlab-fork
```

## Configuration

### New Backend System

Add the module to your backend in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins

backend.add(import('@internal/backstage-scaffolder-backend-module-gitlab-fork'));

backend.start();
```

### Legacy Backend System

If you're using the legacy backend system, you can register the action manually:

```typescript
import { createGitlabForkAction } from '@internal/backstage-scaffolder-backend-module-gitlab-fork';
import { ScmIntegrations } from '@backstage/integration';

// In your scaffolder setup
const integrations = ScmIntegrations.fromConfig(env.config);

const actions = [
  createGitlabForkAction({ integrations }),
  // ... other actions
];
```

## Usage

The action supports multiple use cases:

### Use Case 1: User Chooses Repository
Let users input any project ID or path they want to fork.

### Use Case 2: Hardcoded Template
Fork a specific company template to the user's namespace.

### Use Case 3: Dropdown Selection
Provide a curated list of templates for users to choose from.

### Use Case 4: Fork to Organization/Team Namespace
Fork templates into team or organization namespaces.

See the `examples/` directory for complete template examples of each use case.

### Basic Example

Use the action in your software templates:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: fork-gitlab-project
  title: Fork GitLab Project
  description: Fork an existing GitLab project
spec:
  owner: engineering
  type: service
  
  parameters:
    - title: GitLab Project Information
      required:
        - projectId
        - token
      properties:
        projectId:
          title: Project ID or Path
          type: string
          description: The ID or URL-encoded path of the project to fork
          
        token:
          title: GitLab Token
          type: string
          description: Personal access token with api scope
          ui:widget: password
          
        baseUrl:
          title: GitLab Base URL
          type: string
          description: Base URL of your GitLab instance
          default: https://gitlab.com
          
        namespace:
          title: Target Namespace
          type: string
          description: The ID or path of the namespace to fork to (optional)
          
        name:
          title: Project Name
          type: string
          description: Name for the forked project (optional)
          
        path:
          title: Project Path
          type: string
          description: Path for the forked project (optional)
          
        visibility:
          title: Visibility
          type: string
          description: Visibility level of the forked project
          enum:
            - private
            - internal
            - public
          default: private

  steps:
    - id: fork
      name: Fork GitLab Project
      action: gitlab:project:fork
      input:
        projectId: ${{ parameters.projectId }}
        token: ${{ parameters.token }}
        baseUrl: ${{ parameters.baseUrl }}
        namespace: ${{ parameters.namespace }}
        name: ${{ parameters.name }}
        path: ${{ parameters.path }}
        visibility: ${{ parameters.visibility }}

  output:
    links:
      - title: Forked Repository
        url: ${{ steps.fork.output.projectUrl }}
    text:
      - title: Project Information
        content: |
          Project ID: ${{ steps.fork.output.projectId }}
          Project Path: ${{ steps.fork.output.projectPath }}
          SSH URL: ${{ steps.fork.output.sshUrl }}
          HTTP URL: ${{ steps.fork.output.httpUrl }}
```

## Action Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string \| number | Yes | The ID or URL-encoded path of the project to fork |
| `token` | string | Yes | GitLab personal access token with `api` scope |
| `baseUrl` | string | No | Base URL of the GitLab instance (defaults to https://gitlab.com) |
| `namespace` | string | No | The ID or path of the namespace to fork to (defaults to current user) |
| `name` | string | No | The name of the forked project |
| `path` | string | No | The path of the forked project |
| `description` | string | No | The description of the forked project |
| `visibility` | string | No | The visibility level: `private`, `internal`, or `public` |
| `defaultBranch` | string | No | The default branch of the forked project |

## Action Outputs

| Output | Type | Description |
|--------|------|-------------|
| `projectId` | number | The ID of the forked project |
| `projectPath` | string | The path of the forked project (e.g., `namespace/project`) |
| `projectUrl` | string | The web URL of the forked project |
| `sshUrl` | string | The SSH URL for cloning the forked project |
| `httpUrl` | string | The HTTP URL for cloning the forked project |

## GitLab Token Requirements

The GitLab personal access token must have the following scope:
- `api` - Full API access (required for forking projects)

To create a token:
1. Go to your GitLab instance
2. Navigate to User Settings > Access Tokens
3. Create a new token with the `api` scope
4. Copy the token and use it in your template

## Common Patterns

### Hardcoded Source, User Namespace
Fork a company template to the user's personal namespace:

```yaml
- id: fork
  name: Fork Starter Template
  action: gitlab:project:fork
  input:
    projectId: platform/microservice-starter  # Hardcoded template
    token: ${{ secrets.GITLAB_TOKEN }}
    baseUrl: https://gitlab.mycompany.com
    namespace: ${{ user.entity.metadata.name }}  # User's namespace
    name: ${{ parameters.serviceName }}  # User provides name
    visibility: private
```

### Hardcoded Source, Team Namespace
Fork a template to a team's GitLab group:

```yaml
- id: fork
  name: Fork to Team
  action: gitlab:project:fork
  input:
    projectId: platform/nodejs-api-template  # Hardcoded template
    token: ${{ secrets.GITLAB_TOKEN }}
    baseUrl: https://gitlab.mycompany.com
    namespace: teams/${{ parameters.team }}  # Team's group
    name: ${{ parameters.projectName }}
    visibility: internal
```

### User Selects from Dropdown
Let users choose from predefined templates:

```yaml
parameters:
  - title: Template
    properties:
      template:
        type: string
        enum:
          - platform/nodejs-template
          - platform/python-template
        enumNames:
          - Node.js Service
          - Python Service

steps:
  - id: fork
    action: gitlab:project:fork
    input:
      projectId: ${{ parameters.template }}  # User's choice
      token: ${{ secrets.GITLAB_TOKEN }}
      baseUrl: https://gitlab.mycompany.com
```

### User Provides Any Project
Let users fork any project they have access to:

```yaml
parameters:
  - title: Source
    properties:
      projectId:
        type: string
        description: Project ID or path to fork

steps:
  - id: fork
    action: gitlab:project:fork
    input:
      projectId: ${{ parameters.projectId }}  # User provides
      token: ${{ secrets.GITLAB_TOKEN }}
      baseUrl: https://gitlab.mycompany.com
```

## Self-Hosted GitLab

For self-hosted GitLab instances, simply provide the `baseUrl` parameter:

```yaml
- id: fork
  name: Fork GitLab Project
  action: gitlab:project:fork
  input:
    projectId: 123
    token: ${{ secrets.GITLAB_TOKEN }}
    baseUrl: https://gitlab.mycompany.com
```

## Error Handling

The action includes comprehensive error handling:
- Validates all inputs using JSON Schema
- Polls the fork status and waits for completion
- Provides clear, user-friendly error messages for common issues (404, 401, 403)
- Distinguishes between user errors and system errors
- Throws `InputError` for user-facing errors

## Configuration Options

The action supports configuration options for custom polling behavior:

```typescript
import { createGitlabForkAction } from '@internal/backstage-scaffolder-backend-module-gitlab-fork';

const action = createGitlabForkAction({
  integrations,
  pollingIntervalMs: 3000,      // Poll every 3 seconds (default: 2000)
  maxPollingAttempts: 50,        // Maximum 50 attempts (default: 30)
});
```

## Development

To build the plugin:

```bash
yarn build
```

To run tests:

```bash
yarn test
```

To lint:

```bash
yarn lint
```

## License

Apache-2.0
