import app from "./app";
import { env } from "./config/env";
import { startBoss } from "./queue/boss";

async function bootstrap() {
  // Start pg-boss queue
  await startBoss();

  // Start HTTP server
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on :${env.PORT}`);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
    });
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
