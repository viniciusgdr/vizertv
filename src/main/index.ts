import { type FactoryContent } from './factories/protocols/factory-content'
import { makeWarezcdn } from './factories/usecases/makeWarezcdn'

export type Providers = 'warezcdn'

export const makeFilmProvider = (type: Providers = 'warezcdn'): FactoryContent => {
  switch (type) {
    case 'warezcdn':
      return makeWarezcdn()
    default:
      throw new Error('Provider not found')
  }
}
