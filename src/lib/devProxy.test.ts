import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApiUrl, getLockedApiUrl, normalizeBaseUrl } from './devProxy'

afterEach(() => vi.unstubAllEnvs())

describe('normalizeBaseUrl', () => {
  it('preserves a trailing slash used for direct endpoint joining', () => {
    expect(normalizeBaseUrl('https://api.example.com/')).toBe('https://api.example.com/')
    expect(normalizeBaseUrl('api.example.com/custom/')).toBe('https://api.example.com/custom/')
    expect(normalizeBaseUrl('https://api.example.com/custom///')).toBe('https://api.example.com/custom/')
  })

  it('keeps the existing normalization when there is no trailing slash', () => {
    expect(normalizeBaseUrl('https://api.example.com')).toBe('https://api.example.com')
    expect(normalizeBaseUrl('https://api.example.com/custom')).toBe('https://api.example.com/custom/v1')
  })
})

describe('buildApiUrl', () => {
  it('固定代理忽略原生服务商地址和保存的关闭状态', () => {
    vi.stubEnv('VITE_API_PROXY_AVAILABLE', 'true')
    vi.stubEnv('VITE_API_PROXY_LOCKED', 'true')
    expect(buildApiUrl('https://api.x.ai/v1', 'images/generations', null, false)).toBe('/api-proxy/images/generations')
    expect(buildApiUrl('https://ark.example.com/api/v3', 'images/generations', null, false, 'v3')).toBe('/api-proxy/images/generations')
    expect(buildApiUrl('https://generativelanguage.googleapis.com/v1beta', 'models/gemini:generateContent', null, false, 'v1beta')).toBe('/api-proxy-google/models/gemini:generateContent')
    expect(buildApiUrl('https://old.example.com', 'tasks/task-1', null, false)).toBe('/api-proxy/tasks/task-1')
  })

  it('固定代理显示地址与原生协议路径一致', () => {
    vi.stubEnv('VITE_API_PROXY_AVAILABLE', 'true')
    vi.stubEnv('VITE_API_PROXY_LOCKED', 'true')
    vi.stubEnv('VITE_API_PROXY_URL', 'https://gateway.example.com/proxy/v1')
    expect(getLockedApiUrl()).toBe('https://gateway.example.com/proxy/v1')
    expect(getLockedApiUrl('v1beta')).toBe('https://gateway.example.com/proxy/v1beta')
    vi.stubEnv('VITE_API_PROXY_LOCKED', 'false')
    expect(getLockedApiUrl()).toBeUndefined()
  })

  it('uses the same-origin proxy prefix when API proxy is enabled', () => {
    expect(buildApiUrl('http://api.example.com/v1', 'images/edits', null, true)).toBe(
      '/api-proxy/images/edits',
    )
  })

  it('leaves API versioning to the proxy target when proxying', () => {
    expect(buildApiUrl('http://api.example.com', 'images/generations', null, true)).toBe(
      '/api-proxy/images/generations',
    )
  })

  it('uses a configured proxy prefix when one is available', () => {
    expect(
      buildApiUrl(
        'http://api.example.com/v1',
        'responses',
        {
          enabled: true,
          prefix: '/openai-proxy',
          target: 'http://api.example.com/v1',
          changeOrigin: true,
          secure: false,
        },
        true,
      ),
    ).toBe('/openai-proxy/responses')
  })

  it('uses the configured API URL directly when API proxy is disabled', () => {
    expect(buildApiUrl('http://api.example.com/v1', 'responses', null, false)).toBe(
      'http://api.example.com/v1/responses',
    )
  })

  it('joins the endpoint directly when the API URL ends with a slash', () => {
    expect(buildApiUrl('https://api.example.com/', '/custom/image-tasks', null, false)).toBe(
      'https://api.example.com/custom/image-tasks',
    )
  })

  it('preserves a base path when directly joining an API URL', () => {
    expect(buildApiUrl('api.example.com/custom/', 'tasks/123', null, false)).toBe(
      'https://api.example.com/custom/tasks/123',
    )
  })

  it('normalizes an API URL before directly joining an endpoint', () => {
    expect(buildApiUrl('https://user:password@api.example.com/', 'responses', null, false)).toBe(
      'https://api.example.com/responses',
    )
  })

  it('directly joins an OpenAI endpoint when its API URL ends with a slash', () => {
    expect(buildApiUrl('https://api.example.com/', 'responses', null, false)).toBe(
      'https://api.example.com/responses',
    )
  })

  it('completes a custom API version such as v1beta', () => {
    expect(buildApiUrl('https://api.example.com', 'models/m:generateContent', null, false, 'v1beta')).toBe(
      'https://api.example.com/v1beta/models/m:generateContent',
    )
    expect(buildApiUrl('https://api.example.com/proxy', 'models/m:generateContent', null, false, 'v1beta')).toBe(
      'https://api.example.com/proxy/v1beta/models/m:generateContent',
    )
    expect(buildApiUrl('https://api.example.com/v1beta', 'models/m:generateContent', null, false, 'v1beta')).toBe(
      'https://api.example.com/v1beta/models/m:generateContent',
    )
    expect(buildApiUrl('https://api.example.com/proxy/', 'models/m:generateContent', null, false, 'v1beta')).toBe(
      'https://api.example.com/proxy/models/m:generateContent',
    )
  })
})
