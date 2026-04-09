import { registerAs } from '@nestjs/config';

const parseBool = (value?: string) => {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export default registerAs('ai', () => ({
  bedrockRegion:
    process.env.AI_BEDROCK_REGION?.trim() || process.env.AWS_REGION?.trim() || process.env.S3_REGION?.trim() || 'ap-southeast-2',
  bedrockAgentId: process.env.AI_BEDROCK_AGENT_ID?.trim() || '',
  bedrockAgentAliasId: process.env.AI_BEDROCK_AGENT_ALIAS_ID?.trim() || '',
  bedrockEnableTrace: parseBool(process.env.AI_BEDROCK_ENABLE_TRACE),
  bedrockAccessKeyId: process.env.AI_BEDROCK_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim(),
  bedrockSecretAccessKey:
    process.env.AI_BEDROCK_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  bedrockSessionToken: process.env.AI_BEDROCK_SESSION_TOKEN?.trim() || process.env.AWS_SESSION_TOKEN?.trim(),
}));