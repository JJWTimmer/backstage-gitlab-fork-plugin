import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Gitlab } from '@gitbeaker/rest';
import { ScmIntegrationRegistry } from '@backstage/integration';
import { InputError } from '@backstage/errors';

export function createGitlabForkAction(options: {
  integrations: ScmIntegrationRegistry;
}) {
  return createTemplateAction({
    id: 'gitlab:project:fork',
    description: 'Forks a project on a GitLab instance',
    schema: {
      input: {
        type: 'object',
        required: ['projectId', 'token'],
        properties: {
          projectId: {
            title: 'Project ID',
            description: 'The ID or URL-encoded path of the project to fork',
            type: ['string', 'number'],
          },
          token: {
            title: 'GitLab Token',
            description: 'GitLab personal access token with api scope',
            type: 'string',
          },
          baseUrl: {
            title: 'GitLab Base URL',
            description: 'Base URL of the GitLab instance',
            type: 'string',
            default: 'https://gitlab.com',
          },
          namespace: {
            title: 'Target Namespace',
            description: 'The ID or path of the namespace to fork to',
            type: ['string', 'number'],
          },
          name: {
            title: 'Project Name',
            description: 'The name of the forked project',
            type: 'string',
          },
          path: {
            title: 'Project Path',
            description: 'The path of the forked project',
            type: 'string',
          },
          description: {
            title: 'Description',
            description: 'The description of the forked project',
            type: 'string',
          },
          visibility: {
            title: 'Visibility',
            description: 'The visibility level of the forked project',
            type: 'string',
            enum: ['private', 'internal', 'public'],
          },
          defaultBranch: {
            title: 'Default Branch',
            description: 'The default branch of the forked project',
            type: 'string',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          projectId: {
            title: 'Project ID',
            description: 'The ID of the forked project',
            type: 'number',
          },
          projectPath: {
            title: 'Project Path',
            description: 'The path of the forked project',
            type: 'string',
          },
          projectUrl: {
            title: 'Project URL',
            description: 'The web URL of the forked project',
            type: 'string',
          },
          sshUrl: {
            title: 'SSH URL',
            description: 'The SSH URL of the forked project',
            type: 'string',
          },
          httpUrl: {
            title: 'HTTP URL',
            description: 'The HTTP URL of the forked project',
            type: 'string',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        projectId,
        token,
        baseUrl = 'https://gitlab.com',
        namespace,
        name,
        path,
        description,
        visibility,
        defaultBranch,
      } = ctx.input;

      ctx.logger.info(`Forking GitLab project ${projectId} on ${baseUrl}`);

      try {
        const api = new Gitlab({
          host: baseUrl,
          token: token,
        });

        const forkOptions: any = {};
        
        if (namespace !== undefined) {
          if (typeof namespace === 'number') {
            forkOptions.namespace_id = namespace;
          } else {
            forkOptions.namespace_path = namespace;
          }
        }
        
        if (name) forkOptions.name = name;
        if (path) forkOptions.path = path;
        if (description) forkOptions.description = description;
        if (visibility) forkOptions.visibility = visibility;
        if (defaultBranch) forkOptions.default_branch = defaultBranch;

        ctx.logger.info('Creating fork with options:', forkOptions);

        const forkedProject = await api.Projects.fork(projectId, forkOptions);

        if (!forkedProject) {
          throw new InputError('Failed to fork project - no response from GitLab API');
        }

        ctx.logger.info(`Successfully forked project to ${forkedProject.path_with_namespace}`);

        let forkStatus = forkedProject;
        let attempts = 0;
        const maxAttempts = 30;

        while (forkStatus.import_status === 'started' || forkStatus.import_status === 'scheduled') {
          if (attempts >= maxAttempts) {
            ctx.logger.warn('Fork is still in progress after maximum wait time');
            break;
          }

          ctx.logger.info(`Fork status: ${forkStatus.import_status}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          forkStatus = await api.Projects.show(forkedProject.id);
          attempts++;
        }

        if (forkStatus.import_status === 'failed') {
          throw new InputError(`Fork failed: ${forkStatus.import_error || 'Unknown error'}`);
        }

        ctx.logger.info(`Fork completed with status: ${forkStatus.import_status}`);

        ctx.output('projectId', forkedProject.id);
        ctx.output('projectPath', forkedProject.path_with_namespace);
        ctx.output('projectUrl', forkedProject.web_url);
        ctx.output('sshUrl', forkedProject.ssh_url_to_repo);
        ctx.output('httpUrl', forkedProject.http_url_to_repo);

      } catch (error) {
        if (error instanceof Error) {
          throw new InputError(`Failed to fork GitLab project: ${error.message}`);
        }
        throw new InputError('Failed to fork GitLab project: Unknown error');
      }
    },
  });
}
