import { type GetInfoRepository, type LoadSearchRepository } from '../../../data/protocols'
import got from 'got'
import { load } from 'cheerio'
import { type Player } from '../../../domain/models/player'
import { getstr } from '../../../utils/functions'

export class CinegratistvRepository implements
  LoadSearchRepository,
  GetInfoRepository {
  async search (query: string, options?: LoadSearchRepository.Options): Promise<LoadSearchRepository.Result> {
    if (options?.type !== 'movie') {
      return []
    }
    const url = 'https://cinegratis.tv/engine/ajax/controller.php?mod=search'
    const req = await got.post(url, {
      form: {
        query,
        skin: 'cinegratis',
        user_hash: 'f1abcc8c9e6406f055f5bc6d0a9a470fc683bc74'
      },
      headers: {
        accept: '*/*',
        'accept-language': 'pt-BR,pt;q=0.9',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        priority: 'u=1, i',
        'sec-ch-ua': '"Not;A=Brand";v="99", "Brave";v="139", "Chromium";v="139"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        'x-requested-with': 'XMLHttpRequest',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        Referer: 'https://cinegratis.tv/'
      }
    })
    const $ = load(req.body)
    const items: LoadSearchRepository.Result = []
    const results = $('a.r').toArray()
    for (const result of results) {
      const el = $(result)
      const a = el.find('div.ri > span.t')
      const isCollection = a.text().includes('Coleção')
      if (isCollection) {
        continue
      }
      items.push({
        title: a.text().trim() ?? '',
        url: el.attr('href') ?? '',
        image: el.find('img').attr('src') ?? '',
        rateFilm: el.find('span.im').text().replace('IMDB:', '').trim() ?? '',
        yearFilm: el.find('span.y').text().trim() ?? ''
      })
    }

    return items.slice(0, options?.limit ?? items.length)
  }

  async info (url: string): Promise<GetInfoRepository.Result> {
    const req = await got(url)
    const $ = load(req.body)

    const title = $('div.entry-title > h1 > a').text().trim() ?? ''

    const players: Player[] = []
    for (const player of $('.player__mirrors > span').toArray()) {
      const el = $(player)
      const text = el.text().toLowerCase()
      const link = el.attr('data-link') ?? ''
      if (!link) {
        continue
      }
      const reqPlayer = await got(link)
      const reqPlayerText = reqPlayer.body

      let videoBlock = getstr(reqPlayerText, 'var video =', 'var autoplay', 0).trim()
      if (videoBlock.endsWith(';')) videoBlock = videoBlock.slice(0, -1).trim()
      const video = JSON.parse(videoBlock)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const masterTxt = `https://watch.brplayer.cc/m3u8/${video.uid}/${video.md5}/master.txt?s=1&id=${video.id}&cache=${video.status}`
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const alternativeStream = `https://watch.brplayer.cc/alternative_stream/${video.uid}/${video.md5}/master.m3u8`
      players.push({
        typeAudio: text.includes('legendado') ? 'leg' : 'dub',
        dataLoadPlayer: link,
        players: [link],
        m3u8Players: [
          masterTxt,
          alternativeStream
        ]
      })
    }
    return {
      name: title,
      description: $('.ozet-ic').text().trim() ?? '',
      image: `https://cinegratis.tv/${$('.mbposter').attr('src') ?? ''}`,
      rate: $('.imdb-ic > span').text().trim() ?? '',
      year: $('div.film-info > ul > li:nth-child(3) > div > span > a').text().trim() ?? '',
      movieType: 'filme',
      movieId: url,
      duration: '',
      warezcdn: '',
      players
    }
  }
}
