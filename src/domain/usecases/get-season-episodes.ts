export interface GetSeasonEpisodes {
  load: (dataSeasonId: string) => Promise<GetSeasonEpisodes.Result[]>
}

export namespace GetSeasonEpisodes {
  export interface Result {
    id: string
    title: string
    released: boolean
    name: string
    runtime: string
    rating: string
  }
}
