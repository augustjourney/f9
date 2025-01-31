import { F9 } from '../src'
import type { Auth, F9Metadata } from '../src'
import { createMockServer } from './server'
import { afterAll, describe, it, expect, vi } from 'vitest'
import type { F9Response } from '../src'

describe('Fetch wrapper', () => {
	const port = 8971
	const server	= createMockServer(port)	
	server.listen()
	const basePath = `http://localhost:${port}`

	afterAll(() => {
		server.close()
	})

	it('Get request', async () => {
		const f9 = new F9({
			basePath,
		})
		const res = await f9.get('/')
		const result = {
			ok: true
		}
		expect(res.$status).toBe(200)
		expect(res.$success).toBe(true)
		expect(res.$data).toMatchObject(result)
		expect(res).toHaveProperty('$message')
		expect(res).toHaveProperty('$metadata')
	})

	it('Get request to receive 404', async () => {
		const f9 = new F9({
			basePath,
		})
		const res = await f9.get('/not-found')
		const result = {
			message: 'Not found'
		}
		expect(res.$status).toBe(404)
		expect(res.$success).toBe(false)
		expect(res.$data).toMatchObject(result)
		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$message')
	})

	it('Get request to receive 204', async () => {
		const f9 = new F9({
			basePath,
		})
		const res = await f9.get('/204')
		expect(res.$status).toBe(204)
		expect(res.$success).toBe(true)
		expect(res.$data).toBeNull()
		expect(res).toHaveProperty('$metadata')

	})

	it('Get plain text response', async () => {
		const f9 = new F9({
			basePath,
		})
		const res = await f9.get('/plain-text', { options: { responseType: 'text'}})
		expect(res.$status).toBe(200)
		expect(res.$success).toBe(true)
		expect(res.$data).toBe('textplain')
		expect(res).toHaveProperty('$metadata')

	})

	it('Different request and response content types', async () => {
		const f9 = new F9({
			basePath
		})
		const body = 'key=value'
		const res = await f9.post<{ requestContentType: string; responseContentType: string }>('/content-type', { 
			options: { responseType: 'json' },
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body
		})
		expect(res.$data?.requestContentType).toBe('application/x-www-form-urlencoded')
		expect(res.$data?.responseContentType).toBe('application/json')
		expect(res.$metadata.opts.body).toBe(body)
		expect(res.$status).toBe(200)
		expect(res.$success).toBe(true)
		expect(res).toHaveProperty('$metadata')
	})

	it('Get request with 404 and text answer', async () => {
		const f9 = new F9({
			basePath,
		})
		const res = await f9.get<{ message: string }>('/failed-request-with-text-answer')
		const result = 'Not found'
		expect(res.$status).toBe(404)
		expect(res.$success).toBe(false)
		expect(res.$data).toBe(result)
		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$message')
	})

	it('Delete request', async () => {
		const f9 = new F9({
			basePath,
		})
		const res = await f9.delete('/delete')
		const result = {
			message: 'Deleted'
		}
		expect(res.$status).toBe(200)
		expect(res.$success).toBe(true)
		expect(res.$data).toMatchObject(result)
		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$message')
	})

	it('Default header key and auth token', async () => {
		const auth: Auth = {
			type: 'Bearer',
			token: 'secret',
		}
		const f9 = new F9({
			basePath,
			auth
		})
		const res = await f9.get<{ token: string; tokenKey: string }>('/auth')
		expect(res.$data?.token).toBe(`Bearer ${auth.token}`)
		expect(res.$data?.tokenKey).toBe('authorization')
	})

	it('Custom auth header key and auth token', async () => {
		const auth: Auth = {
			type: 'Bearer',
			token: 'secret',
			header: 'x-token'
		}
		const f9 = new F9({
			basePath,
			auth
		})
		const res = await f9.get<{ token: string; tokenKey: string }>('/auth?token=x-token')
		expect(res.$data?.token).toBe(`Bearer ${auth.token}`)
		expect(res.$data?.tokenKey).toBe(auth.header)
	})

	it('Basic auth with default header key', async () => {
		const auth: Auth = {
			type: 'Basic',
			login: 'user',
			password: 'secret'
		}
		const f9 = new F9({
			basePath,
			auth
		})
		const expectedToken = Buffer.from(`${auth.login}:${auth.password}`).toString('base64')
		const res = await f9.get<{ token: string; tokenKey: string }>('/auth')
		expect(res.$data?.token).toBe(`Basic ${expectedToken}`)
		expect(res.$data?.tokenKey).toBe('authorization')
	})

	it('Basic auth with custom header key', async () => {
		const auth: Auth = {
			type: 'Basic',
			login: 'user',
			password: 'secret',
			header: 'w-token'
		}
		const f9 = new F9({
			basePath,
			auth
		})
		const expectedToken = Buffer.from(`${auth.login}:${auth.password}`).toString('base64')
		const res = await f9.get<{ token: string; tokenKey: string }>('/auth?token=w-token')
		expect(res.$data?.token).toBe(`Basic ${expectedToken}`)
		expect(res.$data?.tokenKey).toBe('w-token')
	})

	it('Post request with body', async () => {
		const f9 = new F9({
			basePath
		})
		const body = {
			key: 'value',
			key2: {
				key3: 'value',
				key4: [1, 2]
			}
		}
		const res = await f9.post<{ body: typeof body }>('/post-with-body', body)
		expect(res.$data?.body).toMatchObject(body)
	})

	it('Post request with body in key body', async () => {
		const f9 = new F9({
			basePath
		})
		const body = {
			key: 'value',
			key2: {
				key3: 'value',
				key4: [1, 2]
			}
		}
		const res = await f9.post<{ body: typeof body }>('/post-with-body', { body })
		expect(res.$data?.body).toMatchObject(body)
	})

	it('Put request with body', async () => {
		const f9 = new F9({
			basePath
		})
		const body = {
			key: 'value',
			key2: {
				key3: 'value',
				key4: [1, 2]
			}
		}
		const res = await f9.put<{ body: typeof body }>('/put-with-body', body)
		expect(res.$data?.body).toMatchObject(body)
	})

	it('Put request with body in key body', async () => {
		const f9 = new F9({
			basePath
		})
		const body = {
			key: 'value',
			key2: {
				key3: 'value',
				key4: [1, 2]
			}
		}
		const res = await f9.put<{ body: typeof body }>('/put-with-body', { body })
		expect(res.$data?.body).toMatchObject(body)
	})

	it('Add credentials to request', async () => {
		const f9 = new F9({
			basePath
		})
		
		const res = await f9.get<{ ok: boolean }>('/', {
			credentials: "include"
		})

		expect(res.$metadata.opts).toMatchObject({
			'credentials': 'include'
		})
	})
	
	it('Add credentials to request globally', async () => {
		const f9 = new F9({
			basePath,
			credentials: "include"
		})
		
		const res = await f9.get<{ ok: boolean }>('/')
		
		expect(res.$metadata.opts).toMatchObject({
			'credentials': 'include'
		})
	})
	
	it('Add credentials to request globally but omit in one request', async () => {
		const f9 = new F9({
			basePath,
			credentials: "include"
		})
		
		const res = await f9.get<{ ok: boolean }>('/')
		
		expect(res.$metadata.opts).toMatchObject({
			'credentials': 'include'
		})
		
		const res2 = await f9.get<{ ok: boolean }>('/', {
			credentials: "omit"
		})
		
		expect(res2.$metadata.opts).toMatchObject({
			'credentials': 'omit'
		})
		
		const res3 = await f9.get<{ ok: boolean }>('/')
		
		expect(res3.$metadata.opts).toMatchObject({
			'credentials': 'include'
		})
	})
	
	it('Add credentials with setCredentials method', async () => {
		const f9 = new F9({
			basePath
		})
		
		f9.setCredentials("include")
		
		const res = await f9.get<{ ok: boolean }>('/')
		
		expect(res.$metadata.opts).toMatchObject({
			'credentials': 'include'
		})
	})

	it('Add headers to request', async () => {
		const f9 = new F9({
			basePath
		})

		const requestHeaders = {
			'z-token': 'z-token-value'
		}

		const res = await f9.get<{ headers: Record<string, any> }>('/headers', {
			headers: requestHeaders
		})
		expect(res.$data?.headers).toEqual(expect.objectContaining(requestHeaders))
	})

	it('Set global headers', async () => {
		const f9 = new F9({
			basePath
		})

		const customHeaders = {
			'x-token': 'x-token-value',
			'y-token': 'y-token-value',
		}

		f9.setHeaders(customHeaders)

		const res = await f9.get<{ headers: Record<string, any> }>('/headers')
		expect(res.$data?.headers).toEqual(expect.objectContaining(customHeaders))
	})

	it('Concatenate global headers with request headers', async () => {
		const f9 = new F9({
			basePath
		})

		const customHeaders = {
			'x-token': 'x-token-value',
			'y-token': 'y-token-value',
		}

		f9.setHeaders(customHeaders)

		const requestHeaders = {
			'z-token': 'z-token-value'
		}

		const res = await f9.get<{ headers: Record<string, any> }>('/headers', {
			headers: requestHeaders
		})

		expect(res.$data?.headers).toEqual(expect.objectContaining({
			...customHeaders,
			...requestHeaders
		}))
	})

	it('Override global headers with headers in the request', async () => {
		const f9 = new F9({
			basePath
		})

		const customHeaders = {
			'x-token': 'x-token-value',
			'y-token': 'y-token-value',
			'w-token': 'w-token-value',
		}

		f9.setHeaders(customHeaders)

		const requestHeaders = {
			'y-token': 'new-token-value',
			'x-token': 'new-token-value',
			'z-token': 'z-token-value',
		}

		const res = await f9.get<{ headers: Record<string, any> }>('/headers', {
			headers: requestHeaders
		})

		expect(res.$data?.headers).toEqual(expect.objectContaining({
			'x-token': 'new-token-value',
			'y-token': 'new-token-value',
			'z-token': 'z-token-value',
			'w-token': 'w-token-value',
		}))
	})

	it('Set authorization', async () => {

		const f9 = new F9({
			basePath
		})

		f9.setAuthorization(`Bearer secret`)

		const headers = {
			authorization: `Bearer secret`
		}
		
		const res = await f9.get<{ headers: Record<string, any> }>('/headers')

		expect(res.$data?.headers).toEqual(expect.objectContaining(headers))
	})

	it('Metadata', async () => {
		const f9 = new F9({
			basePath,
		})
		const res = await f9.get('/')
		const metadata = {
			method: 'get',
			url: `${basePath}/`,
			opts: {
				method: 'get', 
				headers: { 
					'Content-Type': 'application/json' 
				}
			},
			requestName: `get:${basePath}/`.replace(/http:\/\/|https:\/\//gi, ''),
			responseType: 'json'
		}
		expect(res.$metadata).toHaveProperty('processingTime')
		expect(res.$metadata).toMatchObject(metadata)
	})

	it('Metadata in failed request', async () => {
		const f9 = new F9({
			basePath,
		})
		const res = await f9.get('/not-found')
		const metadata = {
			method: 'get',
			url: `${basePath}/not-found`,
			opts: {
				method: 'get', 
				headers: { 
					'Content-Type': 'application/json' 
				}
			},
			requestName: `get:${basePath}/not-found`.replace(/http:\/\/|https:\/\//gi, ''),
			responseType: 'json',
			message: 'handler not found'
		}
		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')
		expect(res.$metadata).toHaveProperty('processingTime')
		expect(res.$metadata).toMatchObject(metadata)
	})
	it('Callback on status', async () => {
		const f9 = new F9({
			basePath,
		})
		const statusHandlers = {
			cb404(result:F9Response) {},
			cb500(result:F9Response) {
				return result
			},
			cb200(result:F9Response) {
				return {
					...result,
					200: true
				}
			},
		}
		const cb404Spy = vi.spyOn(statusHandlers, 'cb404')
		const cb500Spy = vi.spyOn(statusHandlers, 'cb500')
		const cb200Spy = vi.spyOn(statusHandlers, 'cb200')
		f9.onStatus(404, statusHandlers.cb404)
		f9.onStatus(500, statusHandlers.cb500)
		f9.onStatus(200, statusHandlers.cb200)
		await f9.get('/not-found')
		const res200 = await f9.get('/')
		expect(cb404Spy).toHaveBeenCalled()
		expect(cb404Spy).toHaveBeenCalledTimes(1)
		expect(cb500Spy).not.toHaveBeenCalled()
		expect(cb200Spy).toHaveBeenCalled()
		expect(cb200Spy).toHaveBeenCalledTimes(1)
		expect(res200).toHaveProperty('200')
	})

	it('Callback on any status', async () => {
		const f9 = new F9({
			basePath,
		})
		const statusHandlers = {
			cbAny(result:F9Response) {},
			cb200(result:F9Response) {
				return {
					...result,
					200: true
				}
			},
			cb500(result:F9Response) {
				return {
					...result,
					500: true
				}
			}
		}
		const cbAnySpy = vi.spyOn(statusHandlers, 'cbAny')
		const cb200Spy = vi.spyOn(statusHandlers, 'cb200')
		const cb500Spy = vi.spyOn(statusHandlers, 'cb500')

		f9.onStatus('*', statusHandlers.cbAny)
		f9.onStatus(200, statusHandlers.cb200)
		f9.onStatus(500, statusHandlers.cb500)

		await f9.get('/not-found')
		const res200 = await f9.get('/')

		expect(cbAnySpy).toHaveBeenCalledTimes(2)
		expect(cb200Spy).toHaveBeenCalledTimes(1)
		expect(cb500Spy).not.toHaveBeenCalled()
		expect(res200).toHaveProperty('200')
	})

	it('On request interceptor global', async () => {

		let resOnRequest: F9Metadata | null = null;

		const f9 = new F9({
			basePath,
			onRequest: (req:F9Metadata) => {
				resOnRequest = req
			}
		})

		const res = await f9.get('/')

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnRequest).toHaveProperty('$metadata')
	})

	it('On response interceptor global', async () => {

		let resOnResponse: F9Response | null = null;

		const f9 = new F9({
			basePath,
			onResponse: (res: F9Response) => {
				resOnResponse = res
			}
		})

		const res = await f9.get('/')

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnResponse).toHaveProperty('$metadata')
		expect(resOnResponse).toHaveProperty('$status')
		expect(resOnResponse).toHaveProperty('$data')
		expect(resOnResponse).toHaveProperty('$message')
	})

	it('On request interceptor global via onRequest', async () => {
		const f9 = new F9({
			basePath,
		})

		let resOnRequest: F9Metadata | null = null;
		
		const callbacks = {
			onRequest(req:F9Metadata) {
				resOnRequest = req
			}
		}

		const onRequestSpy = vi.spyOn(callbacks, 'onRequest')
		f9.onRequest(callbacks.onRequest)

		const res = await f9.get('/')

		expect(onRequestSpy).toHaveBeenCalledTimes(1)

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnRequest).toHaveProperty('$metadata')
	})

	it('On response interceptor global via onResponse', async () => {
		const f9 = new F9({
			basePath,
		})
		
		let resOnResponse: F9Response | null = null;

		const callbacks = {
			onResponse(res: F9Response) {
				resOnResponse = res
			}
		}

		const onResponseSpy = vi.spyOn(callbacks, 'onResponse')
		f9.onResponse(callbacks.onResponse)

		const res = await f9.get('/')

		expect(onResponseSpy).toHaveBeenCalledTimes(1)

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnResponse).toHaveProperty('$metadata')
		expect(resOnResponse).toHaveProperty('$status')
		expect(resOnResponse).toHaveProperty('$data')
		expect(resOnResponse).toHaveProperty('$message')
	})

	it('On request interceptor local for request', async () => {
		const f9 = new F9({
			basePath,
		})

		let resOnRequest: F9Metadata | null = null;
		
		const callbacks = {
			onRequest(req:F9Metadata) {
				resOnRequest = req
			}
		}

		const onRequestSpy = vi.spyOn(callbacks, 'onRequest')

		const res = await f9.get('/', {
			onRequest: callbacks.onRequest
		})

		expect(onRequestSpy).toHaveBeenCalledTimes(1)

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnRequest).toHaveProperty('$metadata')
	})

	it('On response interceptor local', async () => {
		const f9 = new F9({
			basePath,
		})
		
		let resOnResponse: F9Response | null = null;

		const callbacks = {
			onResponse(res: F9Response) {
				resOnResponse = res
			}
		}

		const onResponseSpy = vi.spyOn(callbacks, 'onResponse')

		const res = await f9.get('/', {
			onResponse: callbacks.onResponse
		})

		expect(onResponseSpy).toHaveBeenCalledTimes(1)

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnResponse).toHaveProperty('$metadata')
		expect(resOnResponse).toHaveProperty('$status')
		expect(resOnResponse).toHaveProperty('$data')
		expect(resOnResponse).toHaveProperty('$message')
	})

	it('On response interceptor local + global', async () => {
		const f9 = new F9({
			basePath,
		})
		
		let resOnResponse: F9Response | null = null;

		const callbacks = {
			onResponseLocal(res: F9Response) {
				resOnResponse = res
			},
			onResponseGlobal(res: F9Response) {
				resOnResponse = res
			}
		}

		const onResponseLocalSpy = vi.spyOn(callbacks, 'onResponseLocal')
		const onResponseGlobalSpy = vi.spyOn(callbacks, 'onResponseGlobal')

		const res = await f9.get('/', {
			onResponse: callbacks.onResponseLocal
		})

		expect(onResponseLocalSpy).toHaveBeenCalledTimes(1)
		expect(onResponseGlobalSpy).not.toHaveBeenCalled()

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnResponse).toHaveProperty('$metadata')
		expect(resOnResponse).toHaveProperty('$status')
		expect(resOnResponse).toHaveProperty('$data')
		expect(resOnResponse).toHaveProperty('$message')
	})

	it('On request interceptor global + local', async () => {
		const f9 = new F9({
			basePath,
		})

		let resOnRequest: F9Metadata | null = null;
		
		const callbacks = {
			onRequestLocal(req:F9Metadata) {
				resOnRequest = req
			},
			onRequestGlobal(req:F9Metadata) {
				resOnRequest = req
			}
		}

		const onRequestLocalSpy = vi.spyOn(callbacks, 'onRequestLocal')
		const onRequestGlobalSpy = vi.spyOn(callbacks, 'onRequestGlobal')

		const res = await f9.get('/', {
			onRequest: callbacks.onRequestLocal
		})

		expect(onRequestLocalSpy).toHaveBeenCalledTimes(1)
		expect(onRequestGlobalSpy).not.toHaveBeenCalled()

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnRequest).toHaveProperty('$metadata')
	})

	it('On response interceptor local + global via constructor', async () => {
		
		let resOnResponse: F9Response | null = null;

		const f9 = new F9({
			basePath,
			onResponse(res: F9Response) {
				resOnResponse = res
			}
		})

		const res = await f9.get('/')

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnResponse).toHaveProperty('$metadata')
		expect(resOnResponse).toHaveProperty('$status')
		expect(resOnResponse).toHaveProperty('$data')
		expect(resOnResponse).toHaveProperty('$message')

		resOnResponse = null

		let resOnResponse2: string | null = null

		const res2 = await f9.get('/', {
			onResponse: () => {
				resOnResponse2 = 'ok'
			}
		})

		expect(res2).toHaveProperty('$metadata')
		expect(res2).toHaveProperty('$status')
		expect(res2).toHaveProperty('$data')
		expect(res2).toHaveProperty('$message')

		expect(resOnResponse2).toBe('ok')

		const res3 = await f9.get('/')

		expect(res3).toHaveProperty('$metadata')
		expect(res3).toHaveProperty('$status')
		expect(res3).toHaveProperty('$data')
		expect(res3).toHaveProperty('$message')

		expect(resOnResponse).toHaveProperty('$metadata')
		expect(resOnResponse).toHaveProperty('$status')
		expect(resOnResponse).toHaveProperty('$data')
		expect(resOnResponse).toHaveProperty('$message')
	})

	it('On request interceptor global + local via constructor', async () => {

		let resOnRequest: F9Metadata | null = null;

		const f9 = new F9({
			basePath,
			onRequest: (req:F9Metadata) => {
				resOnRequest = req
			}
		})

		const res = await f9.get('/')

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')

		expect(resOnRequest).toHaveProperty('$metadata')

		resOnRequest = null

		let resOnRequest2: null | 'ok' = null;

		const res2 = await f9.get('/', {
			onRequest: (req:F9Metadata) => {
				resOnRequest2 = 'ok'
			}
		})

		expect(res2).toHaveProperty('$metadata')
		expect(res2).toHaveProperty('$status')
		expect(res2).toHaveProperty('$data')
		expect(res2).toHaveProperty('$message')

		expect(resOnRequest2).toBe('ok')

		const res3 = await f9.get('/')

		expect(res3).toHaveProperty('$metadata')
		expect(res3).toHaveProperty('$status')
		expect(res3).toHaveProperty('$data')
		expect(res3).toHaveProperty('$message')

		expect(resOnRequest).toHaveProperty('$metadata')
	})

	it('Raw fetch', async () => {
		const f9 = new F9()
		const res = await f9.raw(`${basePath}/`)
		const result = {
			ok: true
		}
		expect(res.$status).toBe(200)
		expect(res.$success).toBe(true)
		expect(res.$data).toMatchObject(result)
		expect(res).toHaveProperty('$message')
		expect(res).toHaveProperty('$metadata')
	})

	it('Raw fetch with post request and body', async () => {
		const f9 = new F9()
		const body = {
			key: 'value',
			key2: {
				key3: 'value',
				key4: [1, 2]
			}
		}
		const res = await f9.raw<{ body: typeof body }>(`${basePath}/post-with-body`, { 
			body: JSON.stringify(body), 
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			}
		})
		expect(res.$data?.body).toMatchObject(body)
	})

	it('Raw fetch with put request and body', async () => {
		const f9 = new F9()
		const body = {
			key: 'value',
			key2: {
				key3: 'value',
				key4: [1, 2]
			}
		}
		const res = await f9.raw<{ body: typeof body }>(`${basePath}/put-with-body`, { 
			body: JSON.stringify(body), 
			method: 'put',
			headers: {
				'Content-Type': 'application/json'
			}
		})
		expect(res.$data?.body).toMatchObject(body)
	})

	it('Raw fetch with headers in the request', async () => {
		const f9 = new F9()

		const customHeaders = {
			'x-token': 'x-token-value',
			'y-token': 'y-token-value'
		}

		const res = await f9.raw<{ headers: Record<string, any> }>(`${basePath}/headers`, {
			headers: {
				'Content-Type': 'application/json',
				...customHeaders
			},
			method: 'get'
		})

		expect(res.$data?.headers).toEqual(expect.objectContaining(customHeaders))
	})

	it('Raw fetch metadata', async () => {
		const f9 = new F9()
		const res = await f9.raw(`${basePath}/`)
		const metadata = {
			method: 'get',
			url: `${basePath}/`,
			opts: {
				method: 'get', 
				headers: { 
					'Content-Type': 'application/json' 
				}
			},
			requestName: `get:${basePath}/`.replace(/http:\/\/|https:\/\//gi, ''),
			responseType: 'json'
		}
		expect(res.$metadata).toHaveProperty('processingTime')
		expect(res.$metadata).toMatchObject(metadata)
	})

	it('Raw fetch metadata in failed request', async () => {
		const f9 = new F9()
		const res = await f9.raw(`${basePath}/not-found`)
		const metadata = {
			method: 'get',
			url: `${basePath}/not-found`,
			opts: {
				method: 'get', 
				headers: { 
					'Content-Type': 'application/json' 
				}
			},
			requestName: `get:${basePath}/not-found`.replace(/http:\/\/|https:\/\//gi, ''),
			responseType: 'json'
		}
		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')
		expect(res.$metadata).toHaveProperty('processingTime')
		expect(res.$metadata).toMatchObject(metadata)
	})

	it('FormData', async () => {
		const f9 = new F9({
			basePath
		})

		const form = new FormData()

		form.append("key", "value")
		form.append("type", "form")

		const res = await f9.post('/form-data', {
			body: form
		})

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')
		expect(res.$success).toEqual(true)
		expect(res.$status).toEqual(200)
		expect(res.$data).toHaveProperty("key")
		expect(res.$data).toHaveProperty("type")
	})

	it('FormData without body key', async () => {
		const f9 = new F9({
			basePath
		})

		const form = new FormData()

		form.append("key", "value")
		form.append("type", "form")

		const res = await f9.post('/form-data', form)

		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')
		expect(res.$success).toEqual(true)
		expect(res.$status).toEqual(200)
		expect(res.$data).toHaveProperty("key")
		expect(res.$data).toHaveProperty("type")
	})

	it("retry on status", async () => {
		const f9 = new F9({
			basePath
		})

		const result = {
			ok: true
		}

		f9.onStatus(200, async (resp: F9Response) => {
			const res2 = await f9.retry(resp)

			expect(res2.$status).toBe(200)
			expect(res2.$success).toBe(true)
			expect(res2.$data).toMatchObject(result)
			expect(res2).toHaveProperty('$message')
			expect(res2).toHaveProperty('$metadata')
		})

		const f9Spy = vi.spyOn(f9, 'retry')

		

		const res = await f9.get('/')
		
		expect(res.$status).toBe(200)
		expect(res.$success).toBe(true)
		expect(res.$data).toMatchObject(result)
		expect(res).toHaveProperty('$message')
		expect(res).toHaveProperty('$metadata')
		expect(f9Spy).toHaveBeenCalledTimes(1)
	})

	it("retry with form data", async () => {
		const f9 = new F9({
			basePath
		})

		const f9Spy = vi.spyOn(f9, 'retry')

		const form = new FormData()

		form.append("key", "value")
		form.append("type", "form")

		const res = await f9.post('/form-data', form)

		const res2 = await f9.retry(res)

		expect(res.$success).toEqual(true)
		expect(res.$status).toEqual(200)
		expect(res.$data).toHaveProperty("key")
		expect(res.$data).toHaveProperty("type")

		expect(res2.$success).toEqual(true)
		expect(res2.$status).toEqual(200)
		expect(res2.$data).toHaveProperty("key")
		expect(res2.$data).toHaveProperty("type")
		expect(f9Spy).toHaveBeenCalledTimes(1)
	})
})

describe('Failed fetch', () => {
	it('Cannot fetch at all', async () => {
		const f9 = new F9()
		const res = await f9.get('http://localhost:51171')
		expect(res).toMatchObject({
			$status: 0,
			$success: false,
			$data: null
		})
	})
})
