import puppeteer from 'puppeteer'
import { load } from 'cheerio'

export const getUrl = async (url: string, local: string, typeAudio: string): Promise<string> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  await page.setRequestInterception(true)
  const blockedUrls = [
    'https://mc.yandex.ru',
    'https://mc.webvisor.org',
    'https://captainsuccessornoisy.com',
    'https://recordedthereby.com',
    'https://proftrafficcounter.com',
    'https://capaciousdrewreligion.com',
    'https://unseenreport.com',
    'https://my.rtmark.net',
    'https://augitchouwe.net',
    'https://rwauisge.com/'
  ]
  let urlVideo = ''
  page.on('request', async request => {
    if (blockedUrls.some(url => request.url().startsWith(url))) {
      await request.abort()
      return
    }
    if (request.url().includes('/video/') || request.url().includes('https://mixdrop.')) {
      urlVideo = request.url()
      return
    }
    if (request.isNavigationRequest() && request.redirectChain().length !== 0) {
      console.log('aborting request')
      await request.abort()
    } else {
      await request.continue()
    }
  })

  await page.goto(url, { timeout: 10000 }) // Added timeout of 10 seconds
  const html = await page.content()
  const $ = load(html)

  const playerOptionsAudios = $('body > main > playeroptions > playeroptions-audios > audio-selector').toArray()
  // get audio-text from playerOptionsAudios and compare with typeAudio
  const indexPlayerOptionAudio = playerOptionsAudios.findIndex(elem => {
    const audioText = $(elem).find('audio-text').text().trim()?.toLowerCase()
    return audioText === typeAudio
  })
  await page.click(`body > main > playeroptions > playeroptions-audios > audio-selector:nth-child(${indexPlayerOptionAudio + 1})`)

  const playerOptionsServers = $('body > main > playeroptions > playeroptions-servers > server-selector').toArray()
  const indexPlayerOptionServer = playerOptionsServers.findIndex(elem => {
    const server = $(elem).attr('data-server')
    return server === local
  })
  await new Promise(resolve => setTimeout(resolve, 1000))
  await page.click(`body > main > playeroptions > playeroptions-servers > server-selector:nth-child(${indexPlayerOptionServer + 1})`)

  let timeout = 0
  const waitForUrlVideo = async (): Promise<void> => {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (urlVideo === '' && timeout < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      timeout++
    }
  }

  try {
    await Promise.race([
      waitForUrlVideo(),
      // eslint-disable-next-line promise/param-names
      new Promise((_, reject) => setTimeout(() => { reject(new Error('Timeout after 10 seconds')) }, 10000))
    ])
  } catch (error) {
    console.error(error)
  } finally {
    await browser.close()
  }

  return urlVideo
}
