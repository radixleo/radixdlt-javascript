import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

import { openApiClient } from '@networking'
import { getAPI } from '../api/open-api/interface'

const BASE_URL = 'https://localhost:9000'

const api = getAPI(openApiClient(new URL(BASE_URL)).call)

const mock = new MockAdapter(axios)

describe('handle error responses', () => {
  afterEach(() => {
    mock.reset()
  })

  it('should throw if 500 error', async () => {
    mock.onPost(`${BASE_URL}/gateway`).reply(500, {})
    try {
      await api.gateway({})
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('should handle 400 error', done => {
    const mockedError = {
      code: 400,
      message: 'The network selected is not valid.',
      details: {},
    }

    mock.onPost(`${BASE_URL}/gateway`).reply(400, mockedError)

    api
      .gateway({})
      .map(() => {
        expect(true).toBe(false)
      })
      .mapErr((err: any) => {
        expect(err).toEqual([Error(JSON.stringify(mockedError))])
        done()
      })
  })
})
