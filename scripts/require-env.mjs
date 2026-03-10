export const requireEnv = (name, context = "deploy") => {
  const value = process.env[name];

  if (!value) {
    console.error(`[${context}] Missing required environment variable: ${name}`);
    process.exit(1);
  }

  return value;
};
