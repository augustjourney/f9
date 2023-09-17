import { F9 } from '../src'
import type { Auth } from '../src'
import { createMockServer } from './server'
import { afterAll, describe, it, expect, vi } from 'vitest'
import type { F9Result } from '../src'

describe('Fetch', () => {
	const port = 8971
	const server	= createMockServer(port)	
	server.listen()
	const basePath = `http://localhost:${port}`

	afterAll(() => {
		server.close()
	})

	it('Accepted', async () => {
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

	it('Not found', async () => {
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
		expect(res).toHaveProperty('$details')
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
			responseType: 'json'
		}
		expect(res).toHaveProperty('$metadata')
		expect(res).toHaveProperty('$status')
		expect(res).toHaveProperty('$data')
		expect(res).toHaveProperty('$message')
		expect(res).toHaveProperty('$details')
		expect(res.$metadata).toHaveProperty('processingTime')
		expect(res.$metadata).toMatchObject(metadata)
	})
	it('Callback on status', async () => {
		const f9 = new F9({
			basePath,
		})
		const statusHandlers = {
			cb404(result:F9Result) {
				return result
			},
			cb500(result:F9Result) {
				return result
			},
			cb200(result:F9Result) {
				return result
			},
		}
		const cb404Spy = vi.spyOn(statusHandlers, 'cb404')
		const cb500Spy = vi.spyOn(statusHandlers, 'cb500')
		const cb200Spy = vi.spyOn(statusHandlers, 'cb200')
		f9.onStatus(404, statusHandlers.cb404)
		f9.onStatus(500, statusHandlers.cb500)
		f9.onStatus(200, statusHandlers.cb200)
		await f9.get('/not-found')
		await f9.get('/')
		expect(cb404Spy).toHaveBeenCalled()
		expect(cb404Spy).toHaveBeenCalledTimes(1)
		expect(cb500Spy).not.toHaveBeenCalled()
		expect(cb200Spy).toHaveBeenCalled()
		expect(cb200Spy).toHaveBeenCalledTimes(1)
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
