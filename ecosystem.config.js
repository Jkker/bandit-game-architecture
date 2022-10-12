module.exports = {
  apps: [
    {
      name: "bandit-server",
      script: "./dist/server/index.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
