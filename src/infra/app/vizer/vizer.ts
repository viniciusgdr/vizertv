import got from 'got'
import { type LoadSearchRepository, type GetInfoRepository } from '../../../data/protocols'
import { load } from 'cheerio'
import { type MovieType, type DataPlayers } from '../../../domain/models/player'
import { type GetDownloadsRepository } from '../../../data/protocols/get-downloads-repository'
import { type GetSeasonEpisodesRepository } from '../../../data/protocols/get-season-episodes'
export interface ICasts {
  name: string
  picture: string
}

export namespace Vizer {
  export interface ListSerieEpisodesResult {
    number: number
    episodes: ResultAPI.ResultEpisodes[]
  }
  export interface ListSerieEpisodesOptions {
    url: string
  }
  export interface GetEmbedOptions {
    id: string
  }
  export namespace ResultAPI {
    export interface ResultEpisodes {
      id: string
      name: string
      title: string
    }
    export interface ObjID {
      status: string
      count: number
      list: Record<string, ListEpisodes>
    }
    export interface List {
      id: string
      lang: string
    }
    export interface ListEpisodes extends Omit<List, 'lang'> {
      name: string
      released: boolean
      seen: boolean
      rating: string
      title: string
      runtime: string
    }
    export interface EmbedResult {
      fembed: '0' | '3'
      id: string
      mixdrop: '0' | '3'
      status: 'success'
      streamtape: '0' | '3'
      warezcdn: '0' | '3'
    }
  }
  export interface SearchOptions {
    query: string
    quantity?: number
    type: 'movie' | 'serie' | 'all'
  }
  export interface SearchResult {
    title: string
    url: string
    image: string | null
    yearFilm: string | null
    rateFilm: string | null
  }
  export interface GetInfoOptions {
    url: string
  }
  export interface GetInfoResult {
    title: string
    imdb: string | null
    imdbTT: string | null
    film: {
      year: string | null
      rate: string | null
      time: string | null
      image: string | null
      casts: ICasts[] | null
      description: string | null
    }
  }
  export interface GetPlayerOptions {
    url: string
    imdbTT: string | null
    language: 'pt' | 'en'
  }
  export interface GetPlayerResult {
    isLanguageSelected: boolean
    warezcdn: string
    players: string[]
    id: number
  }
}

const DEFAULT_OPTIONS = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
  },
  BASE_URL: 'https://vizertv.in',
  SEARCH_URL: 'https://vizertv.in/pesquisar/'
}
const getType = (url: string): MovieType => url.includes('serie') ? 'serie' : 'filme'
export function getEmbeds (id: string, data: DataPlayers): string[] {
  const embeds: string[] = []
  if (data.mixdrop === 3) embeds.push(`${DEFAULT_OPTIONS.BASE_URL}/embed/getEmbed.php?id=${id}&sv=mixdrop`)
  if (data.streamtape === 3) embeds.push(`${DEFAULT_OPTIONS.BASE_URL}/embed/getEmbed.php?id=${id}&sv=streamtape`)
  if (data.warezcdn === 3) embeds.push(`${DEFAULT_OPTIONS.BASE_URL}/embed/getEmbed.php?id=${id}&sv=warezcdn`)
  return embeds
}
export const getstr = (string: string, start: string, end: string, i: number): string => {
  i++
  let str = string.split(start)
  str = str[i].split(end)
  return str[0]
}

export const sendRequestAPI = async (form: any): Promise<any> => {
  const { body } = await got.post(DEFAULT_OPTIONS.BASE_URL + '/includes/ajax/publicFunctions.php', {
    headers: {
      accept: '*/*',
      'accept-language': 'pt-BR,pt;q=0.5',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Brave";v="122"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
      'x-requested-with': 'XMLHttpRequest',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
    },
    form,
    method: 'POST',
    responseType: 'json',
    followRedirect: true
  })

  return body
}
export class VizerRepository implements LoadSearchRepository, GetInfoRepository, GetDownloadsRepository, GetSeasonEpisodesRepository {
  private readonly options?: any
  constructor (options?: any) {
    this.options = options
  }

  async search (query: string, options?: LoadSearchRepository.Options): Promise<LoadSearchRepository.Result> {
    const { body: html } = await got.get(DEFAULT_OPTIONS.SEARCH_URL + query, {
      headers: DEFAULT_OPTIONS.headers
    })
    const $ = load(html)

    const results: Vizer.SearchResult[] = []
    await new Promise(resolve => {
      $('div.listItems > a').each((i, elem) => {
        const url = $(elem).attr('href') ?? ''
        const img = $(elem).find('picture > img').attr('src')
        if (
          (!options?.limit || i < options?.limit) &&
          (options?.type === 'series' ? !!url.includes('serie') : options?.type === 'movie' ? !!url.includes('filme') : true)
        ) {
          results.push({
            title: $(elem).find('div.infos > span').text().trim(),
            url: DEFAULT_OPTIONS.BASE_URL + '/' + url,
            image: img ? DEFAULT_OPTIONS.BASE_URL + img : null,
            yearFilm: $(elem).find('div.y').text().trim() || null,
            rateFilm: $(elem).find('div.r').text().trim() || null
          })
        }
        if (i === options?.limit) resolve(true)
        else if (i === $('div.listItems > a').length - 1) resolve(true)
      })
    })
    return results
  }

  async info (url: string): Promise<GetInfoRepository.Result> {
    const { body: html } = await got.get(url, {
      headers: DEFAULT_OPTIONS.headers
    })

    const $ = load(html)
    const areaAudios = $('div.area.audios > div').toArray()
    const type = getType(url)
    const imageUrl = `${DEFAULT_OPTIONS.BASE_URL}${$('div > picture > img').attr('src') as string}` ?? ''
    // https://vizertv.in/content/series/posterPt/342/18620.jpg
    const movieId = new URL(imageUrl).pathname.split('/').pop()?.split('.')[0] as string
    let infos: Partial<GetInfoRepository.Result> = {
      description: $('#ms > div:nth-child(1) > section > span').text().trim() ?? '',
      name: $('#ms > div:nth-child(1) > section > h2').text().trim() ?? $('#ms > div:nth-child(1) > section > h1').text().trim() ?? '',
      duration: $('div.dur > div.tm').text().trim() ?? '',
      rate: $('div.infos > a').text().trim() ?? '',
      year: $('div.infos > div.year').text().trim() ?? '',
      image: imageUrl,
      movieId,
      movieType: type
    }
    const imdbTT = ($('#ms > div:nth-child(1) > section > div.infos > a').attr('href') as string).trim().split('/')[4]
    if (type === 'filme') {
      infos = {
        ...infos,
        movieType: 'filme',
        warezcdn: 'https://embed.warezcdn.net/filme/' + imdbTT,
        players: areaAudios.map((elem, i) => {
          const dataLoadPlayer = $(elem).attr('data-load-player') as string
          const typeAudio = $(elem).attr('data-audio') as string
          const dataPlayers = JSON.parse($(elem).attr('data-players') as string) as unknown as DataPlayers
          const players = getEmbeds(dataLoadPlayer, dataPlayers)
          return {
            dataLoadPlayer,
            typeAudio: typeAudio === 'legendado' ? 'leg' : 'dub',
            players
          }
        })
      }
    } else {
      infos = {
        ...infos,
        movieType: 'serie',
        warezcdn: 'https://embed.warezcdn.net/serie/' + imdbTT,
        seasons: $('div.selectorModal > div.seasons > div.list > div').toArray().map((elem, i) => {
          return {
            number: i + 1,
            dataSeasonId: $(elem).attr('data-season-id') as string
          }
        })
      }
    }

    return infos as GetInfoRepository.Result
  }

  async get (movieId: string, movieType: MovieType): Promise<GetDownloadsRepository.Result[]> {
    const typeQuery = movieType === 'serie' ? '2' : '1'
    const data: Record<string, { audio: string, redirector: string }> = await sendRequestAPI({
      downloadData: typeQuery,
      id: movieId
    })
    const keys = Object.keys(data)
    const results: GetDownloadsRepository.Result[] = []
    for (const key of keys) {
      const url = `${DEFAULT_OPTIONS.BASE_URL}/${data[key].redirector}`
      let urlDirect = ''
      try {
        const { body } = await got(url)
        const urlReal = getstr(body, 'window.location.href="', '"', 0)
        urlDirect = urlReal
      } catch (err) {
        urlDirect = url
      }
      results.push({
        type: data[key].audio === '2' ? 'dub' : 'leg',
        url: urlDirect
      })
    }
    return results
  }

  async load (seasonId: string): Promise<GetSeasonEpisodesRepository.Result[]> {
    const data: Vizer.ResultAPI.ObjID = await sendRequestAPI({
      getEpisodes: seasonId
    })
    const keys = Object.keys(data.list)
    return keys.map(key => ({
      id: data.list[key].id,
      name: data.list[key].name,
      title: data.list[key].title,
      released: data.list[key].released,
      rating: data.list[key].rating,
      seen: data.list[key].seen,
      runtime: data.list[key].runtime
    }))
  }
}
