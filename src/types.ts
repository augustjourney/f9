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
}

export interface Params extends Record<string, unknown> {
	headers?: Headers
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
	headers: Headers
	mode?: RequestMode
	body?: any
}

export interface F9Metadata {
	processingTime: number;
	url: string;
	method: Method;
	opts: FetchOptions;
	requestName: string;
	responseType: ResponseType;
}

export interface F9Error<T = void> {
	$success: false;
	$status: number;
	$details: string;
	$message: string;
	$metadata: F9Metadata
	$data: T | null
}

export interface F9Response<T = void> {
	$success: true;
	$status: number;
	$message: string;
	$metadata: F9Metadata
	$data: T
}

export type F9Result<T = void> = F9Response<T> | F9Error<T>
export type Headers = Record<string, string>
export type Method = 'get' | 'post' | 'delete' | 'put'
export type ResponseType = 'blob' | 'text' | 'arrayBuffer' | 'json' | 'formData'
export type Body = Record<string, unknown>

