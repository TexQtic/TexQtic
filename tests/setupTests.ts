// Directly extend vitest's expect with jest-dom matchers.
// Importing @testing-library/jest-dom/vitest would call
// `import { expect } from 'vitest'` from within node_modules, which
// bypasses Vitest's module virtualisation and hits the wrong vitest copy
// when multiple vitest installations exist in the monorepo.
// Calling expect.extend() HERE (project source, not node_modules) ensures
// Vitest virtualises the 'vitest' import and both the extend and the
// test-file assertions share the same expect instance.
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';
expect.extend(matchers);
