export interface SigningParameters {
	keypairId: string;
	privateKeyString?: string;
	privateKeyPath?: string;
	expireTime?: number | moment.Moment;
}

export interface Cookies {
	['CloudFront-Policy']: string;
	['CloudFront-Signature']: string;
	['CloudFront-Key-Pair-Id']: string;
}

export interface RtmpStream {
	rtmpServerPath: string;
	rtmpStreamName: string;
}

export default {
	getSignedCookies: (url: string, parms: SigningParameters) => Cookies,
	getSignedUrl: (url: string, params: SigningParameters) => string,
	getSignedRTMPUrl: (domainname: string, s3key: string, params: SigningParameters) => RtmpSream,
	/** @deprecated */
	normalizeSignature: (sig: string) => string,
	normalizeBase64: (str: string) => string,
	_getExpireTime: (opts: { expireTime?: number }) => number | null,
	_getIpRange: (opts: { ipRange?: string }) => string | null
}
