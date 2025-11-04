import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Gitlab } from '@gitbeaker/rest';
import { ScmIntegrationRegistry } from '@backstage/integration';
import { InputError } from '@backstage/errors';

/**
 * Options for configuring the GitLab fork action
 */
export interface GitlabForkActionOptions {
  integrations: ScmIntegrationRegistry;
  /**
   * Default polling interval in milliseconds when waiting for fork completion
   * @default 2000
   */
  pollingIntervalMs?: number;
  /**
   * Maximum number of polling attempts to wait for fork completion
   * @default 30
   */
  maxPollingAttempts?: number;
}

/**
 * Fork options interface matching GitLab API
 */
interface GitlabForkOptions {
  namespace_id?: number;
  namespace_path?: string;
  name?: string;
  path?: string;
  description?: string;
  visibility?: 'private' | 'internal' | 'public';
  default_branch?: string;
}

/**
 * GitLab project response interface
 */
interface GitlabProject {
  id: number;
  path_with_namespace: string;
  web_url: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  import_status?: string;
  import_error?: string;
}

export function createGitlabForkAction(options: GitlabForkActionOptions) {
  const { pollingIntervalMs = 2000, maxPollingAttempts = 30 } = options;

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

      // Type assertions for input validation
      if (typeof token !== 'string') {
        throw new InputError('token must be a string');
      }

      if (typeof projectId !== 'string' && typeof projectId !== 'number') {
        throw new InputError('projectId must be a string or number');
      }

      const gitlabHost = typeof baseUrl === 'string' ? baseUrl : 'https://gitlab.com';

      ctx.logger.info(`Forking GitLab project ${projectId} on ${gitlabHost}`);

      try {
        const api = new Gitlab({
          host: gitlabHost,
          token: token,
        });

        const forkOptions: GitlabForkOptions = {};

        if (namespace !== undefined) {
          if (typeof namespace === 'number') {
            forkOptions.namespace_id = namespace;
          } else if (typeof namespace === 'string') {
            forkOptions.namespace_path = namespace;
          }
        }

        if (typeof name === 'string') forkOptions.name = name;
        if (typeof path === 'string') forkOptions.path = path;
        if (typeof description === 'string') forkOptions.description = description;
        if (
          typeof visibility === 'string' &&
          (visibility === 'private' || visibility === 'internal' || visibility === 'public')
        ) {
          forkOptions.visibility = visibility;
        }
        if (typeof defaultBranch === 'string') forkOptions.default_branch = defaultBranch;

        ctx.logger.info('Creating fork with options:', forkOptions);

        const forkedProject = (await api.Projects.fork(projectId, forkOptions)) as GitlabProject;

        if (!forkedProject) {
          throw new InputError('Failed to fork project - no response from GitLab API');
        }

        ctx.logger.info(`Successfully forked project to ${forkedProject.path_with_namespace}`);

        // Poll for fork completion
        let forkStatus = forkedProject;
        let attempts = 0;

        while (forkStatus.import_status === 'started' || forkStatus.import_status === 'scheduled') {
          if (attempts >= maxPollingAttempts) {
            ctx.logger.warn(
              `Fork is still in progress after ${maxPollingAttempts} attempts (${(maxPollingAttempts * pollingIntervalMs) / 1000}s)`,
            );
            break;
          }

          ctx.logger.info(
            `Fork status: ${forkStatus.import_status}, waiting ${pollingIntervalMs}ms...`,
          );
          await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));

          forkStatus = (await api.Projects.show(forkedProject.id)) as GitlabProject;
          attempts++;
        }

        if (forkStatus.import_status === 'failed') {
          throw new InputError(`Fork failed: ${forkStatus.import_error || 'Unknown error'}`);
        }

        ctx.logger.info(`Fork completed with status: ${forkStatus.import_status || 'finished'}`);

        ctx.output('projectId', forkedProject.id);
        ctx.output('projectPath', forkedProject.path_with_namespace);
        ctx.output('projectUrl', forkedProject.web_url);
        ctx.output('sshUrl', forkedProject.ssh_url_to_repo);
        ctx.output('httpUrl', forkedProject.http_url_to_repo);
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        if (error instanceof Error) {
          // Distinguish between user errors and system errors
          const message = error.message;
          if (message.includes('404') || message.includes('not found')) {
            throw new InputError(
              `GitLab project not found: ${projectId}. Please verify the project ID/path and token permissions.`,
            );
          }
          if (message.includes('401') || message.includes('403')) {
            throw new InputError(
              `GitLab authentication failed. Please verify your token has the 'api' scope and necessary permissions.`,
            );
          }
          throw new InputError(`Failed to fork GitLab project: ${message}`);
        }
        throw new InputError('Failed to fork GitLab project: Unknown error');
      }
    },
  });
}
