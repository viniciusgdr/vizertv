import { type FactoryContent } from './factories/protocols/factory-content'
import { makeVizer } from './factories/usecases/makeVizer'

export type Providers = 'vizer'

export const makeFilmProvider = (type: Providers): FactoryContent => {
  switch (type) {
    case 'vizer':
      return makeVizer()
    default:
      throw new Error('Provider not found')
  }
}
