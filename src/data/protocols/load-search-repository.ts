import { type Search } from '../../domain/models/search'
import { type TypeContent } from '../../domain/models/type-content'

export interface LoadSearchRepository {
  search: (query: string, options?: LoadSearchRepository.Options) => Promise<LoadSearchRepository.Result>
}

export namespace LoadSearchRepository {
  export type Result = Search[]
  export interface Options {
    limit?: number
    type?: TypeContent
  }
}
