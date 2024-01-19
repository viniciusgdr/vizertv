export interface GetInfoRepository {
  info: (idOrUrl: string) => Promise<GetInfoRepository.Result>
}

export namespace GetInfoRepository {
  export interface Result {
    id: string
    name: string
    yearFilm: string
    rateFilm: string
    duration: string
    description: string
    image: string
    _extra?: {
      html?: string
    }
  }
}
