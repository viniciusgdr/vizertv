import { type MovieType, type TypeAudio } from '../../domain/models/player'

export interface GetDownloadsRepository {
  get: (movieId: string, movieType: MovieType) => Promise<GetDownloadsRepository.Result[]>
}

export namespace GetDownloadsRepository {
  export interface Result {
    url: string
    urlDownload: Response | null
    type: TypeAudio
  }
}
