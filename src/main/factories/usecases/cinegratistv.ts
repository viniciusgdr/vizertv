import { DbGetInfo } from '../../../data/usecases/app-get-info'
import { DbGetSearch } from '../../../data/usecases/app-get-search'
import { CinegratistvRepository } from '../../../infra/app/cinegratistv'
import { type FactoryContent } from '../protocols/factory-content'

export const makeCinegratistv = (): FactoryContent => {
  const vizerRepository = new CinegratistvRepository()
  const dbGetInfo = new DbGetInfo(vizerRepository)
  const dbGetSearch = new DbGetSearch(vizerRepository)
  return {
    getInfo: dbGetInfo,
    getSearch: dbGetSearch,
    getDownloads: {
      async get (url: string): Promise<any> {
        throw new Error('Method not implemented. Can be use GetInfo')
      }
    },
    seasonEpisodes: {
      async load (url: string): Promise<any> {
        throw new Error('Method not implemented. Can be use VizerDownloader')
      }
    },
    getPlayerEpisode: {
      async load (url: string): Promise<any> {
        throw new Error('Method not implemented. Can be use VizerDownloader')
      }
    }
  }
}
