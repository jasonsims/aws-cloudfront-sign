import { createRequire } from 'node:module';
import cf, {
  CannedPolicy,
  getSignedCookies,
  getSignedRTMPUrl,
  getSignedUrl,
} from 'aws-cloudfront-sign';

const { defineSuite } = createRequire(import.meta.url)('./suite.cjs');

defineSuite('import { named }', {
  CannedPolicy,
  getSignedCookies,
  getSignedRTMPUrl,
  getSignedUrl,
});
defineSuite('import default', cf);
