import { type FactoryContent } from './factories/protocols/factory-content'
import { makeCinegratistv } from './factories/usecases/cinegratistv'
import { makeWarezcdn } from './factories/usecases/makeWarezcdn'
import { makePobreflix } from './factories/usecases/makePobreflix'
import { makeMultiProvider } from './factories/usecases/makeMultiProvider'

export type Providers = 'warezcdn' | 'cinegratistv' | 'pobreflix' | 'all'

export const makeFilmProvider = (type: Providers = 'warezcdn'): FactoryContent => {
  switch (type) {
    case 'warezcdn':
      return makeWarezcdn()
    case 'cinegratistv':
      return makeCinegratistv()
    case 'pobreflix':
      return makePobreflix()
    case 'all':
      return makeMultiProvider()
    default:
      throw new Error('Provider not found')
  }
}
