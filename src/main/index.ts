import { type FactoryContent } from './factories/protocols/factory-content'
import { makeCinegratistv } from './factories/usecases/cinegratistv'
import { makeWarezcdn } from './factories/usecases/makeWarezcdn'

export type Providers = 'warezcdn' | 'cinegratistv'

export const makeFilmProvider = (type: Providers = 'warezcdn'): FactoryContent => {
  switch (type) {
    case 'warezcdn':
      return makeWarezcdn()
    case 'cinegratistv':
      return makeCinegratistv()
    default:
      throw new Error('Provider not found')
  }
}
