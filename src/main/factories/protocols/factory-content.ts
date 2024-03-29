import { type GetDownloads } from '../../../domain/usecases/get-download'
import { type GetInfo } from '../../../domain/usecases/get-info'
import { type GetPlayerEpisode } from '../../../domain/usecases/get-player-episode'
import { type GetSearch } from '../../../domain/usecases/get-search'
import { type GetSeasonEpisodes } from '../../../domain/usecases/get-season-episodes'

export interface FactoryContent {
  getSearch: GetSearch
  getInfo: GetInfo
  getDownloads: GetDownloads
  seasonEpisodes: GetSeasonEpisodes
  getPlayerEpisode: GetPlayerEpisode
}
