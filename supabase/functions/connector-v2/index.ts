export * from './types.ts';
export * from './errors.ts';
export * from './registry.ts';
export * from './manager.ts';
export * from './oauth.ts';
export * from './tokens.ts';
export * from './rate-limit.ts';
export * from './permissions.ts';
export * from './security/encryption.ts';
export * from './security/signatures.ts';
export * from './security/secrets.ts';
export * from './security/api-key-hash.ts';

import { connectorRegistry } from './registry.ts';
import { connectorManager } from './manager.ts';
import { oauthManager } from './oauth.ts';
import { tokenManager } from './tokens.ts';
import { permissionManager } from './permissions.ts';
import { rateLimiter } from './rate-limit.ts';

export const connectorV2 = {
    registry: connectorRegistry,
    manager: connectorManager,
    oauth: oauthManager,
    tokens: tokenManager,
    permissions: permissionManager,
    rateLimit: rateLimiter,
};

export async function initializeConnectorV2(): Promise<void> {
    const enabled = Deno.env.get('NEW_CONNECTOR_ENGINE_ENABLED') === 'true';
    
    if (!enabled) {
        console.log('New connector engine is disabled (NEW_CONNECTOR_ENGINE_ENABLED=false)');
        return;
    }

    console.log('Initializing new connector engine v2...');
    
    await registerBuiltinConnectors();
    
    console.log('New connector engine v2 initialized');
}

async function registerBuiltinConnectors(): Promise<void> {
    const { githubConfig } = await import('./connectors/github/index.ts');
    const { createGitHubConnector } = await import('./connectors/github/client.ts');
    connectorRegistry.register(githubConfig, createGitHubConnector);

    const { googleConfig } = await import('./connectors/google/index.ts');
    const { createGoogleConnector } = await import('./connectors/google/client.ts');
    connectorRegistry.register(googleConfig, createGoogleConnector);

    const { microsoftConfig } = await import('./connectors/microsoft/index.ts');
    const { createMicrosoftConnector } = await import('./connectors/microsoft/client.ts');
    connectorRegistry.register(microsoftConfig, createMicrosoftConnector);

    const { slackConfig } = await import('./connectors/slack/index.ts');
    const { createSlackConnector } = await import('./connectors/slack/client.ts');
    connectorRegistry.register(slackConfig, createSlackConnector);

    const { discordConfig } = await import('./connectors/discord/index.ts');
    const { createDiscordConnector } = await import('./connectors/discord/client.ts');
    connectorRegistry.register(discordConfig, createDiscordConnector);

    const { notionConfig } = await import('./connectors/notion/index.ts');
    const { createNotionConnector } = await import('./connectors/notion/client.ts');
    connectorRegistry.register(notionConfig, createNotionConnector);

    const { stripeConfig } = await import('./connectors/stripe/index.ts');
    const { createStripeConnector } = await import('./connectors/stripe/client.ts');
    connectorRegistry.register(stripeConfig, createStripeConnector);

    const { gitlabConfig } = await import('./connectors/gitlab/index.ts');
    const { createGitLabConnector } = await import('./connectors/gitlab/client.ts');
    connectorRegistry.register(gitlabConfig, createGitLabConnector);

    const { linearConfig } = await import('./connectors/linear/index.ts');
    const { createLinearConnector } = await import('./connectors/linear/client.ts');
    connectorRegistry.register(linearConfig, createLinearConnector);

    const { jiraConfig } = await import('./connectors/jira/index.ts');
    const { createJiraConnector } = await import('./connectors/jira/client.ts');
    connectorRegistry.register(jiraConfig, createJiraConnector);

    const { supabaseConfig } = await import('./connectors/supabase/index.ts');
    const { createSupabaseConnector } = await import('./connectors/supabase/client.ts');
    connectorRegistry.register(supabaseConfig, createSupabaseConnector);

    const { genericRestConfig } = await import('./connectors/generic/rest.ts');
    const { createGenericRestConnector } = await import('./connectors/generic/rest-client.ts');
    connectorRegistry.register(genericRestConfig, createGenericRestConnector);

    const { genericGraphqlConfig } = await import('./connectors/generic/graphql.ts');
    const { createGenericGraphqlConnector } = await import('./connectors/generic/graphql-client.ts');
    connectorRegistry.register(genericGraphqlConfig, createGenericGraphqlConnector);

    const { genericWebhookConfig } = await import('./connectors/generic/webhook.ts');
    const { createGenericWebhookConnector } = await import('./connectors/generic/webhook-client.ts');
    connectorRegistry.register(genericWebhookConfig, createGenericWebhookConnector);

    console.log(`Registered ${connectorRegistry.getConnectorIds().length} connectors`);
}