// continue.config.js
export default {
  models: [
    {
      title: "GPT-4o (OpenRouter)",
      provider: "openrouter",
      model: "openai/gpt-4o",
      apiKey: "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",
    },
    {
      title: "Mixtral 8x7B (OpenRouter)",
      provider: "openrouter",
      model: "mistralai/mixtral-8x7b-instruct",
      apiKey: "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",
    },
    {
      title: "Claude 3 Haiku (OpenRouter)",
      provider: "openrouter",
      model: "anthropic/claude-3-haiku",
      apiKey: "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",
    },
  ],

  defaultModel: "GPT-4o (OpenRouter)",

  contextFiles: [
    "**/pages/**/*.tsx",
    "**/components/**/*.tsx",
    "**/lib/**/*.ts",
    "**/prisma/schema.prisma",
    "**/types/**/*.ts",
  ],

  excludeContextFiles: [
    "node_modules/**",
    ".next/**",
    ".turbo/**",
    "dist/**",
  ],
};
