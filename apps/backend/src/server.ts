import { buildApp } from "./app";

const main = async () => {
  const { app, env } = buildApp();

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void main();
