import { type GetInfo } from '../../../domain/usecases/get-info'
import { type GetSearch } from '../../../domain/usecases/get-search'

export interface FactoryContent {
  getSearch: GetSearch
  getInfo: GetInfo
}
