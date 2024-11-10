import { type MovieType } from '../../domain/models/player'
import { type GetDownloads } from '../../domain/usecases/get-download'
import { type GetDownloadsRepository } from '../protocols/get-downloads-repository'

export class AppGetDownloads implements GetDownloads {
  constructor (private readonly getDownloads: GetDownloadsRepository) {}

  async get (movieId: string, movieType: MovieType): Promise<GetDownloads.Result[]> {
    return await this.getDownloads.get(movieId, movieType)
  }
}
