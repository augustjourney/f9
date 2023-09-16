import type { StatusListeners, F9Response, Params, CallParams, Headers, ResponseType, F9Error, Method, FetchOptions, Options, Body, Auth, F9Metadata, F9Result } from './types'

export class F9 {
	#headers: Headers = {
		'Content-Type': 'application/json',
	}
	#responseType: ResponseType = 'json'
	#basePath = ''
	#auth?: Auth
	#statusListeners: StatusListeners
	constructor(options?: Options) {
		this.#basePath = options?.basePath ?? ''
		if (options?.auth) {
			this.#auth = options.auth
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
	#buildHeaders(headers: Headers = {}): Headers {
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
	#buildResponseType(contentType: string, responseType?: ResponseType): ResponseType {
		const isNotDefault = responseType !== this.#responseType
		// If responseType exists and was set manually
		if (responseType && isNotDefault) {
			return responseType
		}
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
	#buildBody(params: CallParams, responseType: ResponseType) {
		const body: Body = params.body || Object.assign({}, params)

		if (!params.body) {
			delete body.headers
			delete body.options
			delete body.$method
			delete body.$path
		}

		if (responseType === 'json') {
			return JSON.stringify(body)
		}
		return body
	}

	async #buildResponse<T>(response: Response, metadata:F9Metadata): Promise<F9Response<T> | F9Error<T>> {
		if (!response.ok) {
			const error = await response.clone().text()
			let data = null
			try {
				data = await response.json()
			} catch(e) {}
			const f9Error: F9Error<T> = {
				$success: false,
				$message: response.statusText,
				$details: error,
				$status: response.status,
				$metadata: metadata,
				$data: data ?? null
			}
			throw f9Error
		}
		const data = await response[this.#responseType]()
		return {
			$success: true,
			$status: response.status,
			$message: response.statusText,
			$metadata: metadata,
			$data: <T>data,
		}
	}

	#buildError<T>(error: any | F9Error<T>, metadata:F9Metadata): F9Error<T> {
		// If no $status, chances are it is a failed to fetch error
		// Returning it with $status 0
		if (!error?.$status) {
			const f9Error: F9Error<T> = {
				$success: false,
				$message: error.message,
				$details: error.message,
				$status: 0,
				$metadata: metadata,
				$data: null,
			} 
			return f9Error
		}
		return <F9Error<T>>error
	}

	/**
	 * A name for the request, made of method + url.
	 * Can be used for logging info
	 */
	#buildName(method:Method, url: string) {
		return `${method}:${url}`.replace(/http:\/\/|https:\/\//gi, '')
	}

	async #call<T>(params: CallParams): Promise<F9Response<T> | F9Error<T>> {
		const startTime = Date.now()
		const { $method, $path } = params

		const headers = this.#buildHeaders(params.headers)

		const responseType = this.#buildResponseType(headers['Content-Type'], params.options?.responseType)

		const body = this.#buildBody(params, responseType)

		const opts: FetchOptions = {
			method: $method,
			headers,
		}

		if(params.options?.mode) {
			opts.mode = params.options.mode
		}

		if ($method === 'post' || $method === 'put') {
			opts.body = body
		}

		const url = this.#buildFullPath($path)
		const requestName = this.#buildName($method, url)
		let result: F9Result<T> | null = null
		try {
			const response = await fetch(url, opts)
			result = await this.#buildResponse<T>(response, {
				processingTime: Date.now() - startTime,
				url,
				opts,
				method: $method,
				requestName,
				responseType
			})
			return result
		} catch (error: any) {
			// Build and return error
			result = this.#buildError<T>(error, {
				processingTime: Date.now() - startTime,
				url,
				opts,
				method: $method,
				requestName,
				responseType
			})
			return result
		} finally {
			if (result && this.#statusListeners[result?.$status]) {
				this.#statusListeners[result?.$status](result)
			}
		}
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
	async raw<T>(url: string, opts?: FetchOptions): Promise<F9Error<T> | F9Response<T>> {
		const startTime = Date.now()
		let fetchOptions: FetchOptions = opts ?? {
			method: 'get',
			headers: {
				'Content-Type': 'application/json',
			},
		}
		const method:Method = opts?.method || 'get'
		const requestName = this.#buildName(method, url)
		const responseType = this.#buildResponseType(fetchOptions.headers['Content-Type'])
		try {
			const response = await fetch(url, opts)
			return await this.#buildResponse<T>(response, {
				processingTime: Date.now() - startTime,
				method,
				requestName,
				url,
				opts: fetchOptions,
				responseType
			})
		} catch (error: any) {
			const err = this.#buildError<T>(error, {
				processingTime: Date.now() - startTime,
				method,
				requestName,
				url,
				opts: fetchOptions,
				responseType
			})
			return err
		}
	}

	setHeaders(headers: Headers = {}) {
		this.#headers = this.#buildHeaders(headers)
	}

	setAuthorization(value: string) {
		this.#headers.Authorization = value
	}

	onStatus(status: number, fn: Function) {
		this.#statusListeners[status] = fn
	}

	get<T>(path: string, params: Params = {}) {
		return this.#call<T>({ $path: path, $method: 'get', ...params })
	}

	post<T>(path: string, params: Params = {}) {
		return this.#call<T>({ $path: path, $method: 'post', ...params })
	}

	put<T>(path: string, params: Params = {}) {
		return this.#call<T>({ $path: path, $method: 'put', ...params })
	}

	delete<T>(path: string, params: Params = {}) {
		return this.#call<T>({ $path: path, $method: 'delete', ...params })
	}
}

export default new F9()
