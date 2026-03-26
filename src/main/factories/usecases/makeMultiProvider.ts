import { type GetDownloads } from '../../../domain/usecases/get-download'
import { type GetInfo } from '../../../domain/usecases/get-info'
import { type GetPlayerEpisode } from '../../../domain/usecases/get-player-episode'
import { type GetSearch } from '../../../domain/usecases/get-search'
import { type GetSeasonEpisodes } from '../../../domain/usecases/get-season-episodes'
import { type Info } from '../../../domain/models/info'
import { type Search } from '../../../domain/models/search'
import { type MovieType } from '../../../domain/models/player'
import { type FactoryContent } from '../protocols/factory-content'
import { makeWarezcdn } from './makeWarezcdn'
import { makePobreflix } from './makePobreflix'

type ProviderName = 'warezcdn' | 'pobreflix'

const PROVIDER_URL_PATTERNS: Record<ProviderName, RegExp> = {
  pobreflix: /pobreflix\.codes/,
  warezcdn: /boraflixhd\.lat/
}

const PROVIDER_ID_PATTERNS: Record<ProviderName, RegExp> = {
  pobreflix: /^pobreflix:/,
  warezcdn: /^(?!pobreflix:)/
}

function detectProviderFromUrl (url: string): ProviderName | null {
  for (const [name, pattern] of Object.entries(PROVIDER_URL_PATTERNS)) {
    if (pattern.test(url)) return name as ProviderName
  }
  return null
}

function detectProviderFromId (id: string): ProviderName {
  if (PROVIDER_ID_PATTERNS.pobreflix.test(id)) return 'pobreflix'
  return 'warezcdn'
}

class MultiProviderSearch implements GetSearch {
  constructor (private readonly providers: Record<ProviderName, FactoryContent>) {}

  async get (query: string): Promise<Search[]> {
    const entries = Object.entries(this.providers) as Array<[ProviderName, FactoryContent]>

    const settled = await Promise.allSettled(
      entries.map(async ([name, provider]) => {
        const results = await provider.getSearch.get(query)
        return results.map(r => ({ ...r, provider: name }))
      })
    )

    return settled.flatMap(result =>
      result.status === 'fulfilled' ? result.value : []
    )
  }
}

class MultiProviderInfo implements GetInfo {
  constructor (private readonly providers: Record<ProviderName, FactoryContent>) {}

  async get (url: string): Promise<Info> {
    const detected = detectProviderFromUrl(url)
    const providerName = detected ?? 'warezcdn'
    const result = await this.providers[providerName].getInfo.get(url)
    return { ...result, provider: providerName }
  }
}

class MultiProviderDownloads implements GetDownloads {
  constructor (private readonly providers: Record<ProviderName, FactoryContent>) {}

  async get (movieId: string, movieType: MovieType): Promise<GetDownloads.Result[]> {
    const providerName = detectProviderFromId(movieId)
    return await this.providers[providerName].getDownloads.get(movieId, movieType)
  }
}

class MultiProviderSeasonEpisodes implements GetSeasonEpisodes {
  constructor (private readonly providers: Record<ProviderName, FactoryContent>) {}

  async load (dataSeasonId: string): Promise<GetSeasonEpisodes.Result[]> {
    const providerName = detectProviderFromId(dataSeasonId)
    return await this.providers[providerName].seasonEpisodes.load(dataSeasonId)
  }
}

class MultiProviderPlayerEpisode implements GetPlayerEpisode {
  constructor (private readonly providers: Record<ProviderName, FactoryContent>) {}

  async load (dataEpisodeId: string): Promise<GetPlayerEpisode.Result[]> {
    const providerName = detectProviderFromId(dataEpisodeId)
    return await this.providers[providerName].getPlayerEpisode.load(dataEpisodeId)
  }
}

export const makeMultiProvider = (): FactoryContent => {
  const providers: Record<ProviderName, FactoryContent> = {
    warezcdn: makeWarezcdn(),
    pobreflix: makePobreflix()
  }

  return {
    getSearch: new MultiProviderSearch(providers),
    getInfo: new MultiProviderInfo(providers),
    getDownloads: new MultiProviderDownloads(providers),
    seasonEpisodes: new MultiProviderSeasonEpisodes(providers),
    getPlayerEpisode: new MultiProviderPlayerEpisode(providers)
  }
}
