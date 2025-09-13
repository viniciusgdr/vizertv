import { getstr } from '../../../utils/functions'

function constructUrlFromObfuscatedCode (obfuscatedString: string, keys: string[]): string {
  const map: Record<string, string> = {}

  for (let i = 0; i < keys.length; i++) {
    map[i.toString(33)] = keys[i]
  }

  const decodedString = obfuscatedString.replace(/\b\w+\b/g, (match) => {
    return map[match] || match
  })

  const url = 'https:' + getstr(decodedString, 'MDCore.wurl="', '";', 0)

  return url
}

export class MixdropDownloader {
  async get (url: string): Promise<Response> {
    const id = url.split('/').pop()
    if (!id) {
      throw new Error('Invalid URL')
    }
    const urlPlayer = `https://mixdrop.ps/e/${id}`
    const req = await fetch(urlPlayer, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'pt-BR,pt;q=0.7',
        priority: 'u=0, i',
        'sec-ch-ua': '"Not)A;Brand";v="99", "Brave";v="127", "Chromium";v="127"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'iframe',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        'upgrade-insecure-requests': '1',
        Referer: 'https://mixdrop.ps/f/' + id,
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      body: null,
      method: 'GET'
    })
    const text = await req.text()

    const arrayStr = getstr(text, "return p}('", "'.split('|')", 0)
    const array = arrayStr.split('|')

    const keys = `${'|' + array.slice(1).join('|')}`.split('|')

    const downloadURL = constructUrlFromObfuscatedCode(array[0], keys)

    const downloadRequest = await fetch(downloadURL, {
      headers: {
        accept: '*/*',
        'accept-language': 'pt-BR,pt;q=0.7',
        'if-range': '"66beb7d4-54896e30"',
        'sec-ch-ua': '"Not)A;Brand";v="99", "Brave";v="127", "Chromium";v="127"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        range: 'bytes=0-',
        'sec-fetch-dest': 'video',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-gpc': '1',
        Referer: 'https://mixdrop.ps/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      body: null,
      method: 'GET'
    })

    return downloadRequest
  }
}
