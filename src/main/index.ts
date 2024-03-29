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

void (async () => {
  const vizer = makeFilmProvider('vizer')
  // https://vizertv.in/serie/online/greys-anatomy
  // https://vizertv.in/filme/online/five-nights-at-freddys-o-pesadelo-sem-fim
  const result = await vizer.getInfo.get('https://vizertv.in/serie/online/greys-anatomy')
  console.log(result)
  if (result.movieType === 'serie') {
    const episodes = await vizer.seasonEpisodes.load(result.seasons[0].dataSeasonId)
    const player = await vizer.getPlayerEpisode.load(episodes[0].id)
    console.log(player)
    const download = await vizer.getDownloads.get(episodes[0].id, 'serie')
    console.log(download)
  } else {
    console.log(result.players)
    const download = await vizer.getDownloads.get(result.movieId, result.movieType)
    console.log(download)
  }
})()
