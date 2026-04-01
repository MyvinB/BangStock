// Direct USB thermal printing for Xprinter XP-D4601DB
// Label size: 45mm x 25mm
// Uses Web USB API (Chrome/Edge on desktop & Android)

// Adjust these if print is misaligned
const LABEL_WIDTH_MM = 45
const LABEL_HEIGHT_MM = 25
const DPI = 203
const DOTS_PER_MM = DPI / 25.4
const MARGIN_MM = 2
const PRINT_WIDTH_DOTS = Math.floor((LABEL_WIDTH_MM - MARGIN_MM * 2) * DOTS_PER_MM)
const PRINT_HEIGHT_DOTS = Math.floor((LABEL_HEIGHT_MM - MARGIN_MM * 2) * DOTS_PER_MM)

let savedDevice: USBDevice | null = null

export async function connectPrinter(): Promise<USBDevice | null> {
  if (savedDevice) {
    try {
      await savedDevice.open()
      return savedDevice
    } catch {
      savedDevice = null
    }
  }

  const devices = await navigator.usb.getDevices()
  if (devices.length > 0) {
    savedDevice = devices[0]
    return savedDevice
  }

  try {
    savedDevice = await navigator.usb.requestDevice({
      filters: [{ classCode: 7 }],
    })
    return savedDevice
  } catch {
    return null
  }
}

async function sendToPrinter(data: Uint8Array) {
  const device = await connectPrinter()
  if (!device) throw new Error('No printer connected')

  if (!device.opened) await device.open()
  if (device.configuration === null) await device.selectConfiguration(1)

  const iface = device.configuration!.interfaces.find(i =>
    i.alternates.some(a => a.interfaceClass === 7)
  ) || device.configuration!.interfaces[0]

  await device.claimInterface(iface.interfaceNumber)

  const endpoint = iface.alternates[0].endpoints.find(e => e.direction === 'out')
  if (!endpoint) throw new Error('No output endpoint found')

  await device.transferOut(endpoint.endpointNumber, data.buffer as ArrayBuffer)
  await device.close()
}

function renderLabel(qrDataUrl: string, name: string, sku: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = PRINT_WIDTH_DOTS
    canvas.height = PRINT_HEIGHT_DOTS
    const ctx = canvas.getContext('2d')!

    // White background — thermal printer burns black, so white = no burn = no ink wasted
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const qrSize = PRINT_HEIGHT_DOTS - 4
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 2, 2, qrSize, qrSize)

      ctx.fillStyle = '#000'
      const textX = qrSize + 8
      const maxTextWidth = canvas.width - textX - 2

      ctx.font = `bold ${Math.floor(PRINT_HEIGHT_DOTS * 0.18)}px sans-serif`
      wrapText(ctx, name, textX, Math.floor(PRINT_HEIGHT_DOTS * 0.35), maxTextWidth, Math.floor(PRINT_HEIGHT_DOTS * 0.2))

      ctx.font = `${Math.floor(PRINT_HEIGHT_DOTS * 0.14)}px sans-serif`
      ctx.fillText(sku, textX, Math.floor(PRINT_HEIGHT_DOTS * 0.75), maxTextWidth)

      resolve(canvas)
    }
    img.src = qrDataUrl
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y)
      line = word + ' '
      y += lineHeight
    } else {
      line = test
    }
  }
  ctx.fillText(line.trim(), x, y)
}

async function generateQRDataUrl(text: string, size: number): Promise<string> {
  const QRCode = await import('qrcode')
  return QRCode.toDataURL(text, { width: size, margin: 1 })
}

export async function printLabel(name: string, sku: string, copies: number = 1) {
  const qrSize = PRINT_HEIGHT_DOTS - 4
  const qrDataUrl = await generateQRDataUrl(sku, qrSize)
  const canvas = await renderLabel(qrDataUrl, name, sku)

  const ctx = canvas.getContext('2d')!
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { width, height, data } = imgData
  const bytesPerRow = Math.ceil(width / 8)

  const bitmapBytes = new Uint8Array(bytesPerRow * height)
  for (let y = 0; y < height; y++) {
    for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
      let byte = 0xff // fill with 1s (white) by default
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIdx * 8 + bit
        if (x < width) {
          const idx = (y * width + x) * 4
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
          if (gray < 128) byte &= ~(0x80 >> bit) // dark pixel = 0 (burn)
        }
      }
      bitmapBytes[y * bytesPerRow + byteIdx] = byte
    }
  }

  // BITMAP mode 0 = overwrite: 1=black, 0=white (no burn)
  // This means only the QR code and text get burned, background stays white
  const marginDots = Math.floor(MARGIN_MM * DOTS_PER_MM)
  const header = new TextEncoder().encode(
    `SIZE ${LABEL_WIDTH_MM} mm, ${LABEL_HEIGHT_MM} mm\r\n` +
    `GAP 2 mm, 0 mm\r\n` +
    `DIRECTION 1,0\r\n` +
    `CLS\r\n` +
    `BITMAP ${marginDots},${marginDots},${bytesPerRow},${height},0,`
  )
  const footer = new TextEncoder().encode(`\r\nPRINT ${copies},1\r\n`)

  const fullCmd = new Uint8Array(header.length + bitmapBytes.length + footer.length)
  fullCmd.set(header, 0)
  fullCmd.set(bitmapBytes, header.length)
  fullCmd.set(footer, header.length + bitmapBytes.length)

  await sendToPrinter(fullCmd)
}

export function isWebUSBSupported(): boolean {
  return !!navigator.usb
}
