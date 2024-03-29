export interface GetSeasonEpisodesRepository {
  load: (dataSeasonId: string) => Promise<GetSeasonEpisodesRepository.Result[]>
}

export namespace GetSeasonEpisodesRepository {
  export interface Result {
    id: string
    title: string
    released: boolean
    name: string
    runtime: string
    rating: string
  }
}
