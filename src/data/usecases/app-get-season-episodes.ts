import { type GetSeasonEpisodes } from '../../domain/usecases/get-season-episodes'
import { type GetSeasonEpisodesRepository } from '../protocols/get-season-episodes'

export class AppGetSeasonEpisodes implements GetSeasonEpisodes {
  constructor (private readonly getSeasonEpisodes: GetSeasonEpisodesRepository) {}

  async load (dataSeasonId: string): Promise<GetSeasonEpisodes.Result[]> {
    return await this.getSeasonEpisodes.load(dataSeasonId)
  }
}
