# Quick Start Guide

Get started with the GitLab fork action in 5 minutes.

## Installation

Choose the method that works best for you:

### Option 1: From npm (when published)

```bash
yarn workspace backend add @internal/backstage-scaffolder-backend-module-gitlab-fork
```

### Option 2: From Git Repository (easiest for development)

```bash
# Install directly from GitHub
yarn workspace backend add @internal/backstage-scaffolder-backend-module-gitlab-fork@github:JJWTimmer/backstage-gitlab-fork-plugin

# Or from a specific branch
yarn workspace backend add @internal/backstage-scaffolder-backend-module-gitlab-fork@github:JJWTimmer/backstage-gitlab-fork-plugin#main
```

Yarn will automatically build the package during installation.

### Option 3: From local build

1. **Build the plugin:**

   ```bash
   # In the plugin directory
   yarn build
   ```

2. **Add to your Backstage backend:**

   In `packages/backend/package.json`, add:

   ```json
   {
     "dependencies": {
       "@internal/backstage-scaffolder-backend-module-gitlab-fork": "file:../../path/to/backstage-gitlab-fork-plugin/dist"
     }
   }
   ```

3. **Install:**

   ```bash
   yarn install
   ```

   **Note:** Rebuild the plugin after changes.

## Setup

### 1. Add to Backend

Edit `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Add the GitLab fork module
backend.add(import('@internal/backstage-scaffolder-backend-module-gitlab-fork'));

backend.start();
```

### 2. Configure Token

Add to `app-config.yaml`:

```yaml
scaffolder:
  secrets:
    GITLAB_TOKEN:
      env: GITLAB_TOKEN
```

Set environment variable:

```bash
export GITLAB_TOKEN=glpat-your-token-here
```

### 3. Create Template

Create `templates/fork-template.yaml`:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: fork-service-template
  title: Create Service from Template
spec:
  owner: platform
  type: service

  parameters:
    - title: Service Info
      required:
        - serviceName
      properties:
        serviceName:
          title: Service Name
          type: string

  steps:
    - id: fork
      name: Fork Template
      action: gitlab:project:fork
      input:
        projectId: platform/service-template
        token: ${{ secrets.GITLAB_TOKEN }}
        baseUrl: https://gitlab.mycompany.com
        name: ${{ parameters.serviceName }}
        visibility: private

  output:
    links:
      - title: Repository
        url: ${{ steps.fork.output.projectUrl }}
```

### 4. Register Template

Add to `app-config.yaml`:

```yaml
catalog:
  locations:
    - type: file
      target: ../../templates/fork-template.yaml
```

## Common Scenarios

### Scenario 1: Fork Company Template to User

```yaml
action: gitlab:project:fork
input:
  projectId: platform/starter-template # Hardcoded
  token: ${{ secrets.GITLAB_TOKEN }}
  baseUrl: https://gitlab.mycompany.com
  namespace: ${{ user.entity.metadata.name }} # User's namespace
  name: ${{ parameters.projectName }} # User chooses name
```

### Scenario 2: Fork to Team Namespace

```yaml
action: gitlab:project:fork
input:
  projectId: platform/starter-template
  token: ${{ secrets.GITLAB_TOKEN }}
  baseUrl: https://gitlab.mycompany.com
  namespace: teams/${{ parameters.team }} # Team's group
  name: ${{ parameters.projectName }}
```

### Scenario 3: User Selects Template

```yaml
parameters:
  - properties:
      template:
        type: string
        enum:
          - platform/nodejs-template
          - platform/python-template

steps:
  - action: gitlab:project:fork
    input:
      projectId: ${{ parameters.template }} # User's choice
      token: ${{ secrets.GITLAB_TOKEN }}
```

### Scenario 4: User Provides Any Project

```yaml
parameters:
  - properties:
      projectId:
        type: string
        description: Project to fork

steps:
  - action: gitlab:project:fork
    input:
      projectId: ${{ parameters.projectId }} # User provides
      token: ${{ secrets.GITLAB_TOKEN }}
```

## Outputs

Use fork outputs in subsequent steps:

```yaml
steps:
  - id: fork
    action: gitlab:project:fork
    input:
      projectId: my-template
      token: ${{ secrets.GITLAB_TOKEN }}

  - id: register
    action: catalog:register
    input:
      repoContentsUrl: ${{ steps.fork.output.httpUrl }}

output:
  links:
    - title: Repository
      url: ${{ steps.fork.output.projectUrl }}
  text:
    - title: Clone Command
      content: |
        git clone ${{ steps.fork.output.sshUrl }}
```

Available outputs:

- `projectId` - Numeric project ID
- `projectPath` - Full path (e.g., `namespace/project`)
- `projectUrl` - Web URL
- `sshUrl` - SSH clone URL
- `httpUrl` - HTTPS clone URL

## Troubleshooting

**Token Error?**

- Ensure token has `api` scope
- Check token is set in environment: `echo $GITLAB_TOKEN`

**Project Not Found?**

- Verify project ID/path is correct
- Ensure token has access to source project

**Permission Denied?**

- Token must have permission to create projects in target namespace
- For group namespaces, need at least Developer role

## Next Steps

- Check `examples/EXAMPLES.md` for common use cases and advanced patterns
- See `examples/` directory for complete template examples
- Review `README.md` for full API documentation

## Support

For issues or questions:

1. Check the examples in `examples/` directory
2. Review the full README.md
3. Check Backstage logs: `yarn dev` in backend directory
