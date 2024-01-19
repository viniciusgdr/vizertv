import { type Info } from '../../domain/models/info'
import { type GetInfo } from '../../domain/usecases/get-info'
import { type GetInfoRepository } from '../protocols/get-info-repository'

export class DbGetInfo implements GetInfo {
  constructor (private readonly getInfoRepository: GetInfoRepository) {}

  async get (idOrUrl: string): Promise<Info> {
    const info = await this.getInfoRepository.info(idOrUrl)
    return info
  }
}
