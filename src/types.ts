export interface ErrorListeners extends Record<number, Function> {}

export type Auth = BearerAuth | BasicAuth

export interface BearerAuth {
	type: 'Bearer'
	token: string
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
	}
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

export interface F9Error<T> {
	$success: false
	$message: string
	$name: string
	$status: number
	$url: string
	$opts: FetchOptions
	$data: null | T
}

export interface F9Response<T> {
	$success: true;
	$status: number;
	$message: string;
	$data: T
}
export type Headers = Record<string, string>
export type Method = 'get' | 'post' | 'delete' | 'put'
export type ResponseType = 'blob' | 'text' | 'arrayBuffer' | 'json' | 'formData'
export type Body = Record<string, unknown>
