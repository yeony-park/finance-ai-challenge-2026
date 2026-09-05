const SECRET_ENV_NAME = /(?:API_KEY|AI_GATEWAY|OPENAI|AUTH|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i;

export const ingestionWorkerEnv = (): NodeJS.ProcessEnv => ({ NODE_ENV: "production" });

export const isIngestionWorkerEnvSafe = (env: NodeJS.ProcessEnv = process.env): boolean =>
  !Object.keys(env).some((name) => SECRET_ENV_NAME.test(name));

// Environment filtering is not a cwd/filesystem/network sandbox. Production ingestion still needs
// a separate runtime with no mounted secrets and infrastructure-level filesystem/network controls.
