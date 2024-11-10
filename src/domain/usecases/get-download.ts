import { type TypeAudio, type MovieType } from '../models/player'

export interface GetDownloads {
  get: (movieOrEpisodeId: string, movieType: MovieType) => Promise<GetDownloads.Result[]>
}

export namespace GetDownloads {
  export interface Result {
    url: string
    urlDownload: Response | null
    type: TypeAudio
  }
}
