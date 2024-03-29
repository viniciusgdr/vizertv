import { type Season, type Player } from '../../domain/models/player'

export interface GetInfoRepository {
  info: (url: string) => Promise<GetInfoRepository.Result>
}

export interface Movie {
  name: string
  year: string
  rate: string
  duration: string
  description: string
  image: string
  players: Player[]
  warezcdn: string
  movieId: string
  movieType: 'filme'
}

export interface Serie {
  name: string
  year: string
  rate: string
  duration: string
  description: string
  image: string
  warezcdn: string
  movieId: string
  movieType: 'serie'
  seasons: Season[]
}

export namespace GetInfoRepository {
  export type Result = Movie | Serie
}
