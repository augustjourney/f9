import { createServer } from 'node:http'
import { createApp, eventHandler, toNodeListener, setResponseStatus, getRequestHeaders, getQuery, readBody } from 'h3'
import type { Server } from 'node:http'

export interface MockServer {
  listen(): Server,
  close(): void,
}

const DEFAULT_PORT = 8910

const app = createApp()

app.use('/not-found', eventHandler((event) => {
  setResponseStatus(event, 404, 'handler not found')
  return {
    message: 'Not found'
  }
}))

app.use('/204', eventHandler((event) => {
  setResponseStatus(event, 204, 'handler no content')
  return
}))

app.use('/failed-request-with-text-answer', eventHandler((event) => {
  setResponseStatus(event, 404, 'handler not found')
  return 'Not found'
}))

app.use('/delete', eventHandler((event) => {
  return {
    message: 'Deleted'
  }
}))

app.use('/auth', eventHandler((event) => {
  const query = getQuery(event)
  const tokenKey = query.token?.toString() || 'authorization'
  const headers = getRequestHeaders(event)
  return {
    token: headers[tokenKey],
    tokenKey
  }
}))

app.use('/post-with-body', eventHandler(async (event) => {
  const { method } = event
  const body = await readBody(event)
  if(method !== 'POST') {
    setResponseStatus(event, 405)
    return {
      ok: false
    }
  }
  return {
    body
  }
}))

app.use('/put-with-body', eventHandler(async (event) => {
  const { method } = event
  const body = await readBody(event)
  if(method !== 'PUT') {
    setResponseStatus(event, 405)
    return {
      ok: false
    }
  }
  return {
    body
  }
}))

app.use('/headers', eventHandler(async (event) => {
  const headers = getRequestHeaders(event)
  return {
    headers
  }
}))

app.use(
	'/',
	eventHandler((event) => {
		return {
			ok: true
		}
	})
)

const server = createServer(toNodeListener(app))

export function createMockServer(port: number = DEFAULT_PORT):MockServer {
	return {
		listen() {
			return server.listen(port)
		},
		close() {
			server.close()
		},
	}
}
