async function parseM3u8 (url: string): Promise<string[]> {
  const resp = await fetch(url)
  const body = await resp.text()
  const lines = body.split('\n')
  const urls: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      urls.push(trimmed.startsWith('http') ? trimmed : new URL(trimmed, url).href)
    }
  }
  return urls
}

export interface QualityVariant {
  bandwidth: number
  resolution: string
  url: string
}

function extractVariants (body: string, baseUrl: string): QualityVariant[] {
  const lines = body.split('\n')
  const variants: QualityVariant[] = []
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/#EXT-X-STREAM-INF:.*?BANDWIDTH=(\d+)/)
    if (match) {
      const resMatch = lines[i].match(/RESOLUTION=(\d+x\d+)/)
      const nextLine = lines[i + 1]?.trim()
      if (nextLine && !nextLine.startsWith('#')) {
        variants.push({
          bandwidth: parseInt(match[1], 10),
          resolution: resMatch ? resMatch[1] : 'unknown',
          url: nextLine.startsWith('http') ? nextLine : new URL(nextLine, baseUrl).href
        })
      }
    }
  }
  return variants
}

function formatSize (bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export class HlsDownloader {
  async qualities (masterUrl: string): Promise<QualityVariant[]> {
    const resp = await fetch(masterUrl)
    const body = await resp.text()
    return extractVariants(body, masterUrl).sort((a, b) => b.bandwidth - a.bandwidth)
  }

  async get (masterUrl: string, preferredResolution?: string): Promise<Response> {
    const masterResp = await fetch(masterUrl)
    const masterBody = await masterResp.text()

    let segmentPlaylistUrl: string

    const variants = extractVariants(masterBody, masterUrl)
    if (variants.length > 0) {
      variants.sort((a, b) => b.bandwidth - a.bandwidth)
      let chosen = variants[0]
      if (preferredResolution) {
        const match = variants.find(v => v.resolution === preferredResolution)
        if (match) chosen = variants.find(v => v.resolution === preferredResolution) ?? chosen
      }
      segmentPlaylistUrl = chosen.url
    } else {
      segmentPlaylistUrl = masterUrl
    }

    const segmentUrls = await parseM3u8(segmentPlaylistUrl)
    if (segmentUrls.length === 0) {
      return new Response(null, { status: 404 })
    }

    const sampleResp = await fetch(segmentUrls[0])
    const sampleBuffer = await sampleResp.arrayBuffer()
    const sampleSize = sampleBuffer.byteLength
    const estimatedTotal = sampleSize * segmentUrls.length

    const qualitiesJson = JSON.stringify(
      variants.sort((a, b) => b.bandwidth - a.bandwidth).map(v => ({
        resolution: v.resolution,
        bandwidth: v.bandwidth,
        size: formatSize(v.bandwidth / 8 * segmentUrls.length * 3)
      }))
    )

    let segmentIndex = 0
    const stream = new ReadableStream({
      async pull (controller) {
        if (segmentIndex >= segmentUrls.length) {
          controller.close()
          return
        }

        try {
          let chunk: ArrayBuffer

          if (segmentIndex === 0) {
            chunk = sampleBuffer
          } else {
            const resp = await fetch(segmentUrls[segmentIndex])
            chunk = await resp.arrayBuffer()
          }

          controller.enqueue(new Uint8Array(chunk))
          segmentIndex++
        } catch {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'video/mp2t',
        'content-length': String(estimatedTotal),
        'x-segment-count': String(segmentUrls.length),
        'x-segment-size': String(sampleSize),
        'x-estimated-total': String(estimatedTotal),
        'x-estimated-size': formatSize(estimatedTotal),
        'x-qualities': qualitiesJson
      }
    })
  }
}
