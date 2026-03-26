import { type Season, type Player } from '../../domain/models/player'

export interface GetInfoRepository {
  info: (url: string) => Promise<GetInfoRepository.Result>
}

export interface Movie {
  id: string
  name: string
  rateFilm: string
  yearFilm: string
  duration: string
  description: string
  image: string
  players: Player[]
  warezcdn: string
  movieId: string
  movieType: 'filme'
  provider?: string
}

export interface Serie {
  id: string
  name: string
  rateFilm: string
  yearFilm: string
  duration: string
  description: string
  image: string
  warezcdn: string
  movieId: string
  movieType: 'serie'
  seasons: Season[]
  provider?: string
}

export namespace GetInfoRepository {
  export type Result = (Movie | Serie) & {
    _extra: any
  }
}
