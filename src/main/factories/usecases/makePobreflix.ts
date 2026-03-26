import { AppGetDownloads } from '../../../data/usecases/app-get-downloads'
import { DbGetInfo } from '../../../data/usecases/app-get-info'
import { AppGetPlayerEpisode } from '../../../data/usecases/app-get-player-episode'
import { DbGetSearch } from '../../../data/usecases/app-get-search'
import { AppGetSeasonEpisodes } from '../../../data/usecases/app-get-season-episodes'
import { PobreflixRepository, PobreflixEpisodeRepository } from '../../../infra/app/pobreflix/pobreflix'
import { type FactoryContent } from '../protocols/factory-content'

export const makePobreflix = (): FactoryContent => {
  const pobreflixRepository = new PobreflixRepository()
  const pobreflixEpisodeRepository = new PobreflixEpisodeRepository()
  const dbGetInfo = new DbGetInfo(pobreflixRepository)
  const dbGetSearch = new DbGetSearch(pobreflixRepository)
  const appGetDownloads = new AppGetDownloads(pobreflixRepository)
  const getSeasonEpisodes = new AppGetSeasonEpisodes(pobreflixRepository)
  const getPlayerEpisode = new AppGetPlayerEpisode(pobreflixEpisodeRepository)
  return {
    getInfo: dbGetInfo,
    getSearch: dbGetSearch,
    getDownloads: appGetDownloads,
    seasonEpisodes: getSeasonEpisodes,
    getPlayerEpisode
  }
}
