import { type GetPlayerEpisode } from '../../domain/usecases/get-player-episode'
import { type GetPlayerEpisodeRepository } from '../protocols/get-player-episode-repository'

export class AppGetPlayerEpisode implements GetPlayerEpisode {
  constructor (
    private readonly getPlayerEpisodeRepository: GetPlayerEpisodeRepository
  ) {}

  async load (id: string): Promise<GetPlayerEpisode.Result[]> {
    return await this.getPlayerEpisodeRepository.load(id)
  }
}
