"use client"

import { QRCodeCanvas } from "qrcode.react"
import html2canvas from "html2canvas"
import { useRef } from "react"

type Props = {
  token: string
  name?: string
}

export default function PlantQrCard({ token, name }: Props) {
  const qrUrl = `http://localhost:3008/plants/qr/${token}`
  const qrRef = useRef<HTMLDivElement>(null)

  // ✅ ดาวน์โหลด PNG
  const handleDownload = async () => {
    if (!qrRef.current) return

    const canvas = await html2canvas(qrRef.current)
    const link = document.createElement("a")

    link.download = `plant-qr-${token}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrUrl)
    alert("คัดลอกลิงก์แล้ว")
  }

  // ✅ print label
  const handlePrint = () => {
    const printContent = qrRef.current
    if (!printContent) return

    const newWindow = window.open("", "", "width=400,height=600")

    if (!newWindow) return

    newWindow.document.write(`
      <html>
        <head>
          <title>Print QR</title>
          <style>
            body {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: sans-serif;
            }
            .label {
              text-align: center;
              width: 200px;
            }
          </style>
        </head>
        <body>
          <div class="label">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `)

    newWindow.document.close()
    newWindow.focus()
    newWindow.print()
    newWindow.close()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 🔥 ส่วนที่จะ capture */}
      <div
        ref={qrRef}
        className="border rounded-xl p-4 bg-white text-black flex flex-col items-center gap-2"
      >
        <QRCodeCanvas value={qrUrl} size={180} />

        {name && (
          <div className="text-sm font-medium text-center">
            {name}
          </div>
        )}

        <div className="text-[10px] text-gray-500 break-all text-center">
          {token}
        </div>
      </div>

      {/* 🔥 ปุ่ม */}
      <div className="flex gap-2 w-full">
        <button
          onClick={handleDownload}
          className="flex-1 px-3 py-2 rounded bg-blue-600 text-white text-sm"
        >
          ดาวน์โหลด
        </button>

        <button
          onClick={handlePrint}
          className="flex-1 px-3 py-2 rounded bg-green-600 text-white text-sm"
        >
          พิมพ์
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 px-3 py-2 rounded bg-gray-700 text-white text-sm"
        >
          Copy Link
        </button>
      </div>
    </div>
  )
}