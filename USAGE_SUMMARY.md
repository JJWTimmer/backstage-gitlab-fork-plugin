# GitLab Fork Action - Usage Summary

## Yes, you can use it both ways! 🎯

The module is **fully flexible** and supports:

### ✅ User Decides What to Fork
Users can input any project ID or path they want to fork.

**Example:**
```yaml
parameters:
  - properties:
      projectId:
        type: string
        description: Which project do you want to fork?

steps:
  - action: gitlab:project:fork
    input:
      projectId: ${{ parameters.projectId }}  # User provides
      token: ${{ secrets.GITLAB_TOKEN }}
```

### ✅ Hardcoded Template to User/Org
Fork a specific company template to the user's or organization's namespace.

**Example:**
```yaml
steps:
  - action: gitlab:project:fork
    input:
      projectId: platform/microservice-starter  # Hardcoded
      token: ${{ secrets.GITLAB_TOKEN }}
      namespace: ${{ user.entity.metadata.name }}  # User's namespace
      name: ${{ parameters.serviceName }}  # User chooses name
```

### ✅ Hardcoded Template to Team Namespace
Fork to a team's GitLab group:

**Example:**
```yaml
steps:
  - action: gitlab:project:fork
    input:
      projectId: platform/nodejs-template  # Hardcoded
      token: ${{ secrets.GITLAB_TOKEN }}
      namespace: teams/${{ parameters.team }}  # Team's group
```

### ✅ Dropdown Selection
Let users choose from predefined templates:

**Example:**
```yaml
parameters:
  - properties:
      template:
        enum:
          - platform/nodejs-template
          - platform/python-template

steps:
  - action: gitlab:project:fork
    input:
      projectId: ${{ parameters.template }}  # User's choice
      token: ${{ secrets.GITLAB_TOKEN }}
```

## Key Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `projectId` | Source project (can be hardcoded or user input) | `123` or `group/project` |
| `namespace` | Where to fork to (can be hardcoded or dynamic) | `${{ user.entity.metadata.name }}` or `teams/backend` |
| `name` | Name of forked project | `${{ parameters.serviceName }}` |
| `token` | GitLab token (use secrets) | `${{ secrets.GITLAB_TOKEN }}` |

## Mix and Match

You can mix hardcoded and user-provided values:

```yaml
steps:
  - action: gitlab:project:fork
    input:
      projectId: platform/starter-template      # Hardcoded source
      namespace: teams/${{ parameters.team }}   # Dynamic namespace
      name: ${{ parameters.projectName }}       # User provides name
      visibility: private                       # Hardcoded visibility
      token: ${{ secrets.GITLAB_TOKEN }}        # From secrets
```

## See Examples

Check the `examples/` directory for complete working templates:
- `user-choice-template.yaml` - User decides what to fork
- `hardcoded-template.yaml` - Hardcoded template to user namespace
- `org-namespace-template.yaml` - Fork to team/org namespace
- `dropdown-selection-template.yaml` - Curated list of templates

Read `QUICK_START.md` for a 5-minute setup guide!
