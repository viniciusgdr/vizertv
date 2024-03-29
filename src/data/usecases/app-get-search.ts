import { type Search } from '../../domain/models/search'
import { type GetSearch } from '../../domain/usecases/get-search'
import { type LoadSearchRepository } from '../protocols/load-search-repository'

export class DbGetSearch implements GetSearch {
  constructor (
    private readonly loadSearchRepository: LoadSearchRepository
  ) {}

  async get (query: string): Promise<Search[]> {
    const search = await this.loadSearchRepository.search(query)
    return search
  }
}
