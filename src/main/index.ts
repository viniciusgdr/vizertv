import { type FactoryContent } from './factories/protocols/factory-content'
import { makeCinegratistv } from './factories/usecases/cinegratistv'
import { makeVizer } from './factories/usecases/makeVizer'

export type Providers = 'vizer' | 'cinegratistv'

export const makeFilmProvider = (type: Providers): FactoryContent => {
  switch (type) {
    case 'vizer':
      return makeVizer()
    case 'cinegratistv':
      return makeCinegratistv()
    default:
      throw new Error('Provider not found')
  }
}
