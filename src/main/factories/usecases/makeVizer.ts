import { AppGetDownloads } from '../../../data/usecases/app-get-downloads'
import { DbGetInfo } from '../../../data/usecases/app-get-info'
import { AppGetPlayerEpisode } from '../../../data/usecases/app-get-player-episode'
import { DbGetSearch } from '../../../data/usecases/app-get-search'
import { AppGetSeasonEpisodes } from '../../../data/usecases/app-get-season-episodes'
import { VizerRepository } from '../../../infra/app/vizer/vizer'
import { VizerEpisodeRepository } from '../../../infra/app/vizer/vizer-episode'
import { type FactoryContent } from '../protocols/factory-content'

export const makeVizer = (): FactoryContent => {
  const vizerRepository = new VizerRepository()
  const vizerEpisodeRepository = new VizerEpisodeRepository()
  const dbGetInfo = new DbGetInfo(vizerRepository)
  const dbGetSearch = new DbGetSearch(vizerRepository)
  const appGetDownloads = new AppGetDownloads(vizerRepository)
  const getSeasonEpisodes = new AppGetSeasonEpisodes(vizerRepository)
  const getPlayerEpisode = new AppGetPlayerEpisode(vizerEpisodeRepository)
  return {
    getInfo: dbGetInfo,
    getSearch: dbGetSearch,
    getDownloads: appGetDownloads,
    seasonEpisodes: getSeasonEpisodes,
    getPlayerEpisode
  }
}
