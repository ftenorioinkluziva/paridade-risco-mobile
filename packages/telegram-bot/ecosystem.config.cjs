# Paridade de Risco Telegram Bot — PM2 config
# Use: pm2 start ecosystem.config.cjs --env production

module.exports = {
  apps: [
    {
      name: "paridade-telegram-bot",
      script: "src/bot.mjs",
      cwd: "/root/paridade-risco-v2/code/packages/telegram-bot",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "development",
        API_URL: "https://paridaderisco.blackboxinovacao.com.br",
        POLL_INTERVAL: "2000",
      },
      env_production: {
        NODE_ENV: "production",
        API_URL: "https://paridaderisco.blackboxinovacao.com.br",
        POLL_INTERVAL: "2000",
      },
    },
  ],
};
