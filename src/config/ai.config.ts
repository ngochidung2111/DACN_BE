import { registerAs } from '@nestjs/config';

const parseBool = (value?: string) => {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default registerAs('ai', () => ({
  geminiApiKey: process.env.AI_GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '',
  geminiModel: process.env.AI_GEMINI_MODEL?.trim() || '	gemini-2.5-flash-lite',
  geminiTemperature: parseNumber(process.env.AI_GEMINI_TEMPERATURE, 0.3),
  geminiMaxOutputTokens: parseNumber(process.env.AI_GEMINI_MAX_OUTPUT_TOKENS, 1024),
  langchainVerbose: parseBool(process.env.AI_LANGCHAIN_VERBOSE),
}));