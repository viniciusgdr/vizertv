import { AppGetDownloads } from '../../../data/usecases/app-get-downloads'
import { DbGetInfo } from '../../../data/usecases/app-get-info'
import { AppGetPlayerEpisode } from '../../../data/usecases/app-get-player-episode'
import { DbGetSearch } from '../../../data/usecases/app-get-search'
import { AppGetSeasonEpisodes } from '../../../data/usecases/app-get-season-episodes'
import { WarezcdnRepository, WarezcdnEpisodeRepository } from '../../../infra/app/warezcdn/warezcdn'
import { type FactoryContent } from '../protocols/factory-content'

export const makeWarezcdn = (): FactoryContent => {
  const warezcdnRepository = new WarezcdnRepository()
  const warezcdnEpisodeRepository = new WarezcdnEpisodeRepository()
  const dbGetInfo = new DbGetInfo(warezcdnRepository)
  const dbGetSearch = new DbGetSearch(warezcdnRepository)
  const appGetDownloads = new AppGetDownloads(warezcdnRepository)
  const getSeasonEpisodes = new AppGetSeasonEpisodes(warezcdnRepository)
  const getPlayerEpisode = new AppGetPlayerEpisode(warezcdnEpisodeRepository)
  return {
    getInfo: dbGetInfo,
    getSearch: dbGetSearch,
    getDownloads: appGetDownloads,
    seasonEpisodes: getSeasonEpisodes,
    getPlayerEpisode
  }
}
