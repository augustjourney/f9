import type { ErrorListeners, F9Response, Params, CallParams, Headers, ResponseType, F9Error, Method, FetchOptions, Options, Body, Auth } from './types'

export class F9 {
	#headers: Headers = {
		'Content-Type': 'application/json',
	}
	#responseType: ResponseType = 'json'
	#url = ''
	#name = ''
	#opts!: FetchOptions
	#basePath = ''
	#method: Method = 'get'
	#auth?: Auth
	#errorListeners: ErrorListeners
	constructor(options?: Options) {
		this.#basePath = options?.basePath ?? ''
		if (options?.auth) {
			this.#auth = options.auth
		}
		this.#errorListeners = {}
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
			this.#url = path
		} else if (path.startsWith('/')) {
			this.#url = this.#basePath + path
		} else {
			this.#url = this.#basePath + '/' + path
		}
		return this.#url
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
			this.#responseType = responseType
			return this.#responseType
		}
		// Was not set manually
		// Making it ouf of headers content type
		if (contentType.includes('text')) {
			this.#responseType = 'text'
		} else if (contentType.includes('form')) {
			this.#responseType = 'formData'
		} else if (contentType.includes('json')) {
			this.#responseType = 'json'
		} else {
			this.#responseType = 'arrayBuffer'
		}
		return this.#responseType
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

	async #buildResponse<T>(response: Response): Promise<F9Response<T> | F9Error<T>> {
		if (!response.ok) {
			const error = await response.clone().text()
			let data = null
			try {
				data = await response.json()
			} catch(e) {}
			throw {
				$success: false,
				$message: response.statusText,
				$details: error,
				$status: response.status,
				$name: this.#name,
				$url: this.#url,
				$opts: this.#opts,
				$data: data ? <T>data : null,
			}
		}
		const data = await response[this.#responseType]()
		return {
			$success: true,
			$status: response.status,
			$message: response.statusText,
			$data: <T>data,
		}
	}

	#buildError<T>(error: any | F9Error<T>): F9Error<T> {
		let err = error
		// If no $status, chances are it is a failed to fetch error
		// Returning it with $status 0
		if (!err?.$status) {
			err = {
				$success: false,
				$message: error.message,
				$name: this.#name,
				$status: 0,
				$url: this.#url,
				$opts: this.#opts,
				$data: null,
			}
		}
		return <F9Error<T>>err
	}

	/**
	 * A name for the request, made of method + url.
	 * Can be used for logging info
	 */
	#buildName() {
		this.#name = `${this.#method}:${this.#url}`.replace(/http:\/\/|https:\/\//gi, '')
		return this.#name
	}

	async #call<T>(params: CallParams): Promise<F9Response<T> | F9Error<T>> {
		const { $method, $path } = params

		this.#method = $method

		const headers = this.#buildHeaders(params.headers)

		const responseType = this.#buildResponseType(headers['Content-Type'], params.options?.responseType)

		const body = this.#buildBody(params, responseType)

		const opts: FetchOptions = {
			method: $method,
			headers,
			mode: params.options?.mode,
		}

		if ($method === 'post' || $method === 'put') {
			opts.body = body
		}

		this.#opts = opts
		const url = this.#buildFullPath($path)
		this.#buildName()

		try {
			const response = await fetch(url, opts)
			return await this.#buildResponse<T>(response)
		} catch (error: any) {
			// Build and return error
			// Also emit error to error listeners if any
			const err = this.#buildError<T>(error)
			if (this.#errorListeners[err.$status]) {
				return this.#errorListeners[err.$status](err)
			}
			return err
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
		this.#url = url
		if (opts) {
			this.#opts = opts
			this.#method = opts.method
		}
		// No opts provided, building default
		else {
			this.#opts = {
				method: 'get',
				headers: {
					'Content-Type': 'application/json',
				},
			}
			this.#method = 'get'
		}
		this.#buildName()
		try {
			const response = await fetch(url, opts)
			return await this.#buildResponse<T>(response)
		} catch (error: any) {
			const err = this.#buildError<T>(error)
			return err
		}
	}

	setHeaders(headers: Headers = {}) {
		this.#headers = this.#buildHeaders(headers)
	}

	setAuthorization(value: string) {
		this.#headers.Authorization = value
	}

	onError(status: number, fn: Function) {
		this.#errorListeners[status] = fn
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
