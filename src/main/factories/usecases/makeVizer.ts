import { DbGetInfo } from '../../../data/usecases/db-get-info'
import { DbGetSearch } from '../../../data/usecases/db-get-search'
import { VizerRepository } from '../../../infra/db/vizer/vizer'
import { type FactoryContent } from '../protocols/factory-content'

export const makeVizer = (): FactoryContent => {
  const vizerRepository = new VizerRepository()
  const dbGetInfo = new DbGetInfo(vizerRepository)
  const dbGetSearch = new DbGetSearch(vizerRepository)
  return {
    getInfo: dbGetInfo,
    getSearch: dbGetSearch
  }
}
