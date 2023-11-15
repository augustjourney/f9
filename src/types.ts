export interface StatusListeners extends Record<number, Function> {}

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
}

export interface Params extends Record<string, unknown> {
	headers?: Record<string, string>,
	credentials?: Credentials,
	options?: {
		mode?: RequestMode
		responseType?: ResponseType
	},
	body?: Body
}

export interface CallParams extends Params {
	$method: Method
	$path: string
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
}

export interface F9Response<T = void> {
	$success: boolean;
	$status: number;
	$message: string;
	$metadata: F9Metadata
	$data: T
}

export type Method = 'get' | 'post' | 'delete' | 'put'
export type ResponseType = 'blob' | 'text' | 'arrayBuffer' | 'json' | 'formData'
export type RequestType = ResponseType
export type Body = any
export type Credentials = 'include' | 'same-origin' | 'omit'
