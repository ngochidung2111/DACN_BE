import { merge } from 'lodash';

import { registerAs } from '@nestjs/config';

import defaultConfig from './auth.config';

export default registerAs('auth', () => {
  const localOverrides = {};
  return merge(defaultConfig(), localOverrides);
});
