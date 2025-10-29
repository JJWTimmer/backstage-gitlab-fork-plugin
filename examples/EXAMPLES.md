# Template Examples

This directory contains example templates demonstrating different use cases for the GitLab fork action.

## Examples Overview

### 1. `user-choice-template.yaml`
**Use Case:** User decides which repository to fork

Users can input any GitLab project ID or path. Best for:
- Developer tools where users fork their own projects
- Flexible workflows where source isn't predetermined
- Power users who know exactly what they want to fork

### 2. `hardcoded-template.yaml`
**Use Case:** Fork a specific company template to user's namespace

The source project is hardcoded (e.g., a company starter template). Best for:
- Onboarding new services from standard templates
- Ensuring consistency across projects
- Self-service project creation with guardrails

### 3. `org-namespace-template.yaml`
**Use Case:** Fork template to team/organization namespace

Forks templates into team GitLab groups rather than personal namespaces. Best for:
- Team-owned services
- Organizational project structure
- Shared ownership models

### 4. `dropdown-selection-template.yaml`
**Use Case:** User selects from a curated list

Provides a dropdown of predefined templates. Best for:
- Multiple template options
- Guided user experience
- Preventing typos in project IDs

### 5. `template.yaml`
**Use Case:** Full-featured example with all options

Demonstrates all available parameters and outputs. Best for:
- Learning the full API
- Reference implementation
- Advanced customization

## Token Management

### Using Backstage Secrets (Recommended)

Store the GitLab token as a Backstage secret:

```yaml
steps:
  - id: fork
    action: gitlab:project:fork
    input:
      projectId: my-project
      token: ${{ secrets.GITLAB_TOKEN }}
      baseUrl: https://gitlab.mycompany.com
```

Configure in `app-config.yaml`:

```yaml
scaffolder:
  secrets:
    GITLAB_TOKEN:
      env: GITLAB_TOKEN
```

Then set the environment variable:

```bash
export GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

### Using Integration Config

Alternatively, configure GitLab integration in `app-config.yaml`:

```yaml
integrations:
  gitlab:
    - host: gitlab.mycompany.com
      token: ${GITLAB_TOKEN}
```

Then reference it in templates:

```yaml
steps:
  - id: fork
    action: gitlab:project:fork
    input:
      projectId: my-project
      token: ${{ secrets.GITLAB_TOKEN }}
      baseUrl: https://gitlab.mycompany.com
```

### User-Provided Token (Not Recommended)

For testing only, you can let users provide tokens:

```yaml
parameters:
  - title: GitLab
    properties:
      token:
        type: string
        ui:widget: password
        ui:field: Secret

steps:
  - id: fork
    action: gitlab:project:fork
    input:
      projectId: my-project
      token: ${{ parameters.token }}
```

⚠️ **Warning:** This is not recommended for production as it requires users to create and manage their own tokens.

## Namespace Patterns

### Personal Namespace
Fork to the user's personal namespace:

```yaml
namespace: ${{ user.entity.metadata.name }}
```

### Team Namespace
Fork to a team's GitLab group:

```yaml
namespace: teams/${{ parameters.team }}
```

### Organization Namespace
Fork to a specific organization group:

```yaml
namespace: engineering/backend
```

### Namespace by Project Type
Dynamic namespace based on project type:

```yaml
namespace: ${{ parameters.projectType }}-services
```

## Advanced Patterns

### Fork + Register in Catalog

```yaml
steps:
  - id: fork
    name: Fork Template
    action: gitlab:project:fork
    input:
      projectId: platform/service-template
      token: ${{ secrets.GITLAB_TOKEN }}
      baseUrl: https://gitlab.mycompany.com
      
  - id: register
    name: Register in Catalog
    action: catalog:register
    input:
      repoContentsUrl: ${{ steps.fork.output.httpUrl }}
      catalogInfoPath: '/catalog-info.yaml'
```

### Fork + Clone + Modify

```yaml
steps:
  - id: fork
    name: Fork Template
    action: gitlab:project:fork
    input:
      projectId: platform/service-template
      token: ${{ secrets.GITLAB_TOKEN }}
      
  - id: fetch
    name: Fetch Forked Repo
    action: fetch:plain
    input:
      url: ${{ steps.fork.output.httpUrl }}
      
  - id: modify
    name: Update Configuration
    action: fs:rename
    input:
      files:
        - from: config.example.yaml
          to: config.yaml
          
  - id: publish
    name: Push Changes
    action: publish:gitlab
    input:
      repoUrl: ${{ steps.fork.output.httpUrl }}
      token: ${{ secrets.GITLAB_TOKEN }}
```

### Conditional Forking

```yaml
steps:
  - id: fork-nodejs
    if: ${{ parameters.language === 'nodejs' }}
    action: gitlab:project:fork
    input:
      projectId: platform/nodejs-template
      token: ${{ secrets.GITLAB_TOKEN }}
      
  - id: fork-python
    if: ${{ parameters.language === 'python' }}
    action: gitlab:project:fork
    input:
      projectId: platform/python-template
      token: ${{ secrets.GITLAB_TOKEN }}
```

## Testing Templates

Test your templates locally using the Backstage CLI:

```bash
# Validate template syntax
yarn backstage-cli repo schema openapi verify

# Test template execution (requires running Backstage instance)
curl -X POST http://localhost:7007/api/scaffolder/v2/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "templateRef": "template:default/fork-starter-template",
    "values": {
      "serviceName": "my-test-service",
      "owner": "team-a"
    }
  }'
```

## Troubleshooting

### Token Permissions
Ensure your GitLab token has the `api` scope:
- Go to GitLab → User Settings → Access Tokens
- Create token with `api` scope
- Token must have permission to fork the source project

### Namespace Access
The token owner must have permission to create projects in the target namespace:
- For personal namespace: automatic
- For group namespace: must be at least Developer role in the group

### Project Not Found
If you get "project not found" errors:
- Verify the project ID or path is correct
- Ensure the token has access to the source project
- For URL-encoded paths, use `group%2Fproject` format

### Fork Timeout
If forks are timing out:
- Large repositories may take longer to fork
- The action waits up to 60 seconds by default
- Check GitLab's fork queue status
