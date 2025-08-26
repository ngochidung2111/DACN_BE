import { registerAs } from '@nestjs/config';
import defaultConfig from './auth.config';
import { merge } from 'lodash';

export default registerAs('auth', () => {
  const localOverrides = {
  };
  return merge(defaultConfig(), localOverrides);
});
