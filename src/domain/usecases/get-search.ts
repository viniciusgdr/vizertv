import { type Search } from '../models/search'

export interface GetSearch {
  get: (query: string) => Promise<Search[]>
}
