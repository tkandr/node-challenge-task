import path from 'path';
import type { JestConfigWithTsJest } from 'ts-jest';

import defaultJestConfig from '../../jest.config';

const jestConfig: JestConfigWithTsJest = {
  ...defaultJestConfig,
  testRegex: '.*\\.e2e-spec\\.ts$',
  maxWorkers: '50%',
  setupFilesAfterEnv: [path.join(__dirname, './e2e-setup.ts')],
};

export default jestConfig;
