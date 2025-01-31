export interface StatusListeners extends Record<string, Function> {}

export type Auth = BearerAuth | BasicAuth

export interface BearerAuth {
	type: 'Bearer'
	token?: string
	header?: string
	key?: string
}

export interface BasicAuth {
	type: 'Basic'
	login: string
	password: string
	header?: string
}

export interface Options {
	basePath?: string
	auth?: Auth
	credentials?: Credentials
	onRequest?: Function;
	onResponse?: Function;
}

export interface Params extends Record<string, unknown> {
	headers?: Record<string, string>;
	credentials?: Credentials;
	options?: {
		mode?: RequestMode
		responseType?: ResponseType
	};
	body?: Body;
	onRequest?: Function;
	onResponse?: Function;
}

export interface CallParams extends Params {
	$method: Method
	$path: string
	$retryCount: number;
}

export interface FetchOptions {
	method: Method
	headers: Record<string, string>
	mode?: RequestMode
	credentials?: Credentials
	body?: any
}

export interface F9Metadata {
	processingTime: number;
	url: string;
	method: Method;
	opts: FetchOptions;
	requestName: string;
	responseType: ResponseType;
	status: number;
	message: string;
	headers?: Record<string, string>
	retryCount: number
}

export interface F9Response<T = unknown> {
	$success: boolean;
	$status: number;
	$message: string;
	$metadata: F9Metadata
	$data: T
}

export type Method = 'get' | 'post' | 'delete' | 'put' | 'patch'
export type ResponseType = 'blob' | 'text' | 'arrayBuffer' | 'json' | 'formData'
export type RequestType = ResponseType
export type Body = any
export type Credentials = 'include' | 'same-origin' | 'omit'
