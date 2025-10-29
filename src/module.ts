import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { createGitlabForkAction } from './actions/gitlab-fork';
import { ScmIntegrations } from '@backstage/integration';

export const scaffolderModuleGitlabFork = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'gitlab-fork',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolder, config }) {
        const integrations = ScmIntegrations.fromConfig(config);
        
        scaffolder.addActions(
          createGitlabForkAction({ integrations })
        );
      },
    });
  },
});
