import got from 'got'
import { type LoadSearchRepository, type GetInfoRepository } from '../../../data/protocols'
import { load } from 'cheerio'

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
      list: any
    }
    export interface List {
      id: string
      lang: string
    }
    export interface ListEpisodes extends Omit<List, 'lang'> {
      img: string
      name: string
      released: boolean
      seen: boolean
      title: string
    }
    export interface EmbedResult {
      fembed: '0' | '3'
      id: string
      mixdrop: '0' | '3'
      status: 'success'
      streamtape: '0' | '3'
      verified: '0' | '3'
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
  BASE_URL: 'https://vizer.tv',
  SEARCH_URL: 'https://vizer.tv/pesquisar/',
  GET_INFO_URL: 'https://vizer.tv/filme/online/'
}
export class VizerRepository implements LoadSearchRepository, GetInfoRepository {
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
            url: DEFAULT_OPTIONS.BASE_URL + url,
            image: img ? DEFAULT_OPTIONS.BASE_URL + img : null,
            yearFilm: $(elem).find('div.y').text().trim() || null,
            rateFilm: $(elem).find('div.r').text().trim() || null
          })
        }
        if (i === options?.limit) resolve(true)
        else if (i === $('div.listItems > a').length - 1) resolve(true)
      })
    })
    return results.map(result => ({
      ...result,
      id: result.url.split('/')[5] ?? result.url
    }))
  }

  async info (idOrUrl: string): Promise<GetInfoRepository.Result> {
    const id = getId(idOrUrl)
    const { body: html } = await got.get(DEFAULT_OPTIONS.GET_INFO_URL + id, {
      headers: DEFAULT_OPTIONS.headers
    })
    const $ = load(html)

    return {
      id,
      description: $('#ms > div:nth-child(1) > section > span').text().trim() ?? '',
      name: $('#ms > div:nth-child(1) > section > h2').text().trim() ?? $('#ms > div:nth-child(1) > section > h1').text().trim() ?? '',
      duration: $('div.dur > div.tm').text().trim() ?? '',
      rateFilm: $('div.infos > a').text().trim() ?? '',
      yearFilm: $('div.infos > div.year').text().trim() ?? '',
      image: `${DEFAULT_OPTIONS.BASE_URL}${$('div > picture > img').attr('src') as string}` ?? '',
      _extra: {
        html
      }
    }
  }
}

function getId (url: string): string {
  if (!url) throw new Error('Url is required')
  if (url.split('/')[5]) return url.split('/')[5]
  else return url
}
