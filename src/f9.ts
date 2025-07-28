import type { StatusListeners, Credentials, F9Response, Params, CallParams, ResponseType, RequestType, Method, FetchOptions, Options, Body, Auth, F9Metadata } from './types'

export class F9 {
	#headers: Record<string, string> = {
		'Content-Type': 'application/json',
	}
	#basePath = ''
	#auth?: Auth
	#statusListeners: StatusListeners
	#credentials?: Credentials
	#onRequest?: Function
	#onResponse?: Function
	constructor(options?: Options) {
		this.#basePath = options?.basePath ?? ''
		if (options?.auth) {
			this.#auth = options.auth
		}
		if(options?.credentials) {
			this.#credentials = options.credentials
		}
		if(options?.onRequest) {
			this.#onRequest = options.onRequest
		}
		if(options?.onResponse) {
			this.#onResponse = options.onResponse
		}
		this.#statusListeners = {}
		this.#buildAuth()
	}

	#buildAuth() {
		if (!this.#auth) return

		// Check if header doesn't have to be default Authorization
		let header = 'Authorization'
		if (this.#auth.header) {
			header = this.#auth.header
		}

		// Bearer Auth
		if (this.#auth.type === 'Bearer') {
			let token = ''

			// If token provided
			if (this.#auth.token) {
				token = this.#auth.token
			}

			// Token not provided
			// Trying to get from localStorage
			else if (this.#auth.key) {
				token = localStorage.getItem(this.#auth.key) || ''
			}

			if (!token) return

			this.#headers[header] = `Bearer ${token}`
		}

		// Basic Auth
		else if (this.#auth.type === 'Basic') {
			// Basic auth must have login and password
			if (!this.#auth.login || !this.#auth.password) {
				return
			}

			// Hash login and password
			const token = Buffer.from(`${this.#auth.login}:${this.#auth.password}`).toString('base64')

			this.#headers[header] = `Basic ${token}`
		}
	}

	/**
	 * Builds full path
	 * Concatenating with base path if not empty
	 * But if received path starts with http will not concatenate with base path
	 *
	 * @param path:string
	 * @returns
	 */
	#buildFullPath(path: string) {
		if (path.startsWith('http')) {
			return path
		} else if (path.startsWith('/')) {
			return this.#basePath + path
		}
		return this.#basePath + '/' + path
	}

	/**
	 * Receives headers and concats them with default ones
	 * @param headers
	 * @returns Headers
	 */
	#buildHeaders(headers: Record<string, string> = {}): Record<string, string> {
		return {
			...this.#headers,
			...headers,
		}
	}

	/**
	 * Builds return response type
	 * That will be used when response is received
	 * For example, res.json(), res.text(), res.blob(), etc.
	 * This type could be set manually in options object
	 * But also made out of content type
	 * @param contentType
	 * @param responseType
	 * @returns
	 */
	#buildRequestType(contentType: string): ResponseType {
		// Was not set manually
		// Making it ouf of headers content type
		if (contentType.includes('text')) {
			return 'text'
		} else if (contentType.includes('form')) {
			return 'formData'
		} else if (contentType.includes('json')) {
			return 'json'
		}
		return 'arrayBuffer'
	}

	/**
	 * Receives CallParams object
	 * And deletes headers, options, method, path from it
	 * Leaving just the request body
	 * @param params
	 * @param responseType
	 * @returns body:string | params
	 */
	#buildBody(params: CallParams, requestType: RequestType) {

		if(params.body instanceof FormData) {
			return params.body 
		}

		const body: Body = params.body || Object.assign({}, params)

		if (!params.body) {
			delete body.headers
			delete body.options
			delete body.$method
			delete body.$path
		}

		if (requestType === 'json') {
			return JSON.stringify(body)
		}
		return body
	}

	async #buildResponse<T>(response: Response, metadata:F9Metadata): Promise<F9Response<T>> {
		if (!response.ok) {
			let data = null
			let textData = null

			try {
				textData = await response.clone().text()
				data = await response.json()
			} catch(e) {

			}

			if(!data && textData) {
				data = textData
			}

			throw {
				$success: false,
				$message: response.statusText,
				$status: response.status,
				$metadata: metadata,
				$data: data ?? null
			} as F9Response<T>
		}
		let data = null
		try {
			data = await response[metadata.responseType]()
		} catch(e) {}
		metadata.headers = {}
		// @ts-expect-error
		for(const [name, value] of response.headers) {
			metadata.headers[name] = value
		}
		return {
			$success: true,
			$status: response.status,
			$message: response.statusText,
			$metadata: metadata,
			$data: <T>data,
		}
	}

	#buildError<T>(error: any | F9Response<T>, metadata:F9Metadata): F9Response<T> {
		// If no $status, chances are it is a failed to fetch error
		// Returning it with $status 0
		if (!error?.$status) {
			return {
				$success: false,
				$message: error.message,
				$status: 0,
				$metadata: metadata,
				$data: null,
			} as F9Response<T>
		}
		error.$metadata = {
			...error.$metadata,
			status: error.$status,
			message: error.$message,
		}
		return error as F9Response<T>
	}

	/**
	 * A name for the request, made of method + url.
	 * Can be used for logging info
	 */
	#buildName(method:Method, url: string) {
		return `${method}:${url}`.replace(/http:\/\/|https:\/\//gi, '')
	}

	async #call<T>(params: CallParams): Promise<F9Response<T>> {
		const startTime = Date.now()
		const { $method, $path } = params

		const headers = this.#buildHeaders(params.headers)

		const requestType = this.#buildRequestType(headers['Content-Type'])

		let responseType = params.options?.responseType || 'json'

		const body = this.#buildBody(params, requestType)

		if (body instanceof FormData) {
			delete headers['Content-Type']
		}

		const opts: FetchOptions = {
			method: $method,
			headers,
		}
		
		if(this.#credentials) {
			opts.credentials = this.#credentials
		}

		if(params.credentials) {
			opts.credentials = params.credentials
		}

		if(params.options?.mode) {
			opts.mode = params.options.mode
		}

		if ($method === 'post' || $method === 'put' || $method === 'patch' || $method === 'delete') {
			opts.body = body
		}

		const url = this.#buildFullPath($path)
		const requestName = this.#buildName($method, url)
		let result: F9Response<T> | null = null
		let response: Response | null = null
		try {
			// First check for local onRequest interceptor
			if(params.onRequest && typeof params.onRequest === 'function') {
				params.onRequest({
					$metadata: <F9Metadata>{
						url,
						opts,
						method: $method,
						requestName,
						responseType,
					}
				})
			}
			// Then check for global one
			else if(this.#onRequest  && typeof this.#onRequest === 'function') {
				this.#onRequest({
					$metadata: <F9Metadata>{
						url,
						opts,
						method: $method,
						requestName,
						responseType,
					}
				})
			}
			response = await fetch(url, opts)
			result = await this.#buildResponse<T>(response, {
				processingTime: Date.now() - startTime,
				url,
				opts,
				method: $method,
				requestName,
				responseType,
				status: response.status,
				message: response.statusText,
				retryCount: 0
			})
			if (result && params.$retryCount === 0) {

				if(this.#statusListeners['*'] != null) {
					await this.#statusListeners['*'](result)
				}
				
				if(this.#statusListeners[result?.$status]) {
					const onStatusResponse = await this.#statusListeners[result?.$status](result)
					if(onStatusResponse) {
						return onStatusResponse
					}
				}
			}

			return result
		} catch (error: any) {
			// Build and return error
			result = this.#buildError<T>(error, {
				processingTime: Date.now() - startTime,
				url,
				opts,
				method: $method,
				requestName,
				responseType,
				status: response?.status || 0,
				message: response?.statusText || 'Failed to fetch',
				retryCount: 0
			})
			if (result && params.$retryCount === 0) {

				if(this.#statusListeners['*']) {
					await this.#statusListeners['*'](result)
				}
				
				if(this.#statusListeners[result?.$status]) {
					const onStatusResponse = await this.#statusListeners[result?.$status](result)
					if(onStatusResponse) {
						return onStatusResponse
					}
				}
			}
			return result
		} finally {
			if(params.onResponse && typeof params.onResponse === 'function') {
				params.onResponse(result)
			}
			else if(this.#onResponse && typeof this.#onResponse === 'function') {
				this.#onResponse(result)
			}
		}
	}

	async retry(resp: F9Response): Promise<F9Response> {
		return this.#call({
			headers: resp.$metadata.opts.headers,
			options: resp.$metadata.opts,
			$method: resp.$metadata.method,
			$path: resp.$metadata.url,
			body: resp.$metadata.opts.body,
			$retryCount: resp.$metadata.retryCount + 1
		})
	}

	// Public methods

	/**
	 * Raw fetch
	 * If options not provided, default will be used
	 * - Default method — 'get'
	 * - Default header — 'Content-Type': 'application/json'
	 * @param url
	 * @param opts
	 * @returns
	 */
	async raw<T>(url: string, opts?: FetchOptions): Promise<F9Response<T>> {
		const startTime = Date.now()
		let fetchOptions: FetchOptions = opts ?? {
			method: 'get',
			headers: {
				'Content-Type': 'application/json',
			},
		}
		const method:Method = opts?.method || 'get'
		const requestName = this.#buildName(method, url)
		const requestType = this.#buildRequestType(fetchOptions.headers['Content-Type'])
		let responseType: ResponseType = 'json'
		let response: Response | null = null
		try {
			response = await fetch(url, opts)
			return await this.#buildResponse<T>(response, {
				processingTime: Date.now() - startTime,
				method,
				requestName,
				url,
				opts: fetchOptions,
				responseType,
				status: response.status,
				message: response.statusText,
				retryCount: 0
			})
		} catch (error: any) {
			return this.#buildError<T>(error, {
				processingTime: Date.now() - startTime,
				method,
				requestName,
				url,
				opts: fetchOptions,
				responseType,
				status: response?.status || 0,
				message: response?.statusText || 'Fetch failed',
				retryCount: 0
			})
		}
	}

	setHeaders(headers: Record<string, string> = {}) {
		this.#headers = this.#buildHeaders(headers)
	}
	
	setCredentials(credentials: Credentials) {
		this.#credentials = credentials
	}

	setAuthorization(value: string) {
		this.#headers.Authorization = value
	}

	onRequest(fn: Function) {
		this.#onRequest = fn
	}

	onResponse(fn: Function) {
		this.#onResponse = fn
	}

	onStatus(status: number | '*', fn: Function) {
		this.#statusListeners[status] = fn
	}

	getStatusListeners() {
		return this.#statusListeners
	}

	#buildArgs(params: FormData | Params) {
		if (params instanceof FormData) {
			return {
				body: params
			}
		}
		return params
	}

	get<T>(path: string, params: FormData | Params = {}) {
		return this.#call<T>({ $path: path, $method: 'get', ...this.#buildArgs(params), $retryCount: 0 })
	}

	post<T>(path: string, params: FormData | Params = {}) {
		return this.#call<T>({ $path: path, $method: 'post', ...this.#buildArgs(params), $retryCount: 0 })
	}

	put<T>(path: string, params: FormData | Params = {}) {
		return this.#call<T>({ $path: path, $method: 'put', ...this.#buildArgs(params), $retryCount: 0 })
	}

	patch<T>(path: string, params: FormData | Params = {}) {
		return this.#call<T>({ $path: path, $method: 'patch', ...this.#buildArgs(params), $retryCount: 0 })
	}

	delete<T>(path: string, params: FormData | Params = {}) {
		return this.#call<T>({ $path: path, $method: 'delete', ...this.#buildArgs(params), $retryCount: 0 })
	}
}

export default new F9()
