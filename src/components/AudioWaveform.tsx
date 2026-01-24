'use client'

import { useRef, useEffect, useState } from 'react'

interface AudioWaveformProps {
  /**
   * 是否正在錄音/聆聽
   */
  isListening: boolean
  /**
   * 波形顏色
   */
  color?: string
  /**
   * 波形高度
   */
  height?: number
  /**
   * 是否顯示動畫
   */
  animated?: boolean
}

/**
 * 音頻波形可視化組件
 * 使用 Web Audio API 繪製實時音頻波形
 */
export function AudioWaveform({
  isListening,
  color = 'rgb(59, 130, 246)',
  height = 96,
  animated = true,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const [isActive, setIsActive] = useState(false)

  // 初始化 Web Audio API
  useEffect(() => {
    if (typeof window === 'undefined') return

    let audioContext: AudioContext | null = null
    let mediaStream: MediaStream | null = null
    let source: MediaStreamAudioSourceNode | null = null

    const initAudio = async () => {
      try {
        // 請求麥克風權限並獲取音頻流
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // 創建音頻上下文
        audioContext = new AudioContext()
        analyserRef.current = audioContext.createAnalyser()
        analyserRef.current.fftSize = 256
        analyserRef.current.smoothingTimeConstant = 0.8

        // 連接音頻源
        source = audioContext.createMediaStreamSource(mediaStream)
        source.connect(analyserRef.current)

        setIsActive(true)
        startDrawing()
      } catch (error) {
        console.warn('無法訪問麥克風:', error)
        // 無法訪問麥克風時使用模擬波形
        setIsActive(false)
        if (isListening) {
          startSimulatedWaveform()
        }
      }
    }

    const startDrawing = () => {
      if (!canvasRef.current || !analyserRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 設置 canvas 尺寸
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const width = canvas.width / (window.devicePixelRatio || 1)
        const height = canvas.height / (window.devicePixelRatio || 1)

        // 清除畫布
        ctx.clearRect(0, 0, width, height)

        // 獲取音頻數據
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteTimeDomainData(dataArray)

        // 繪製波形
        ctx.lineWidth = 2
        ctx.strokeStyle = color
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()

        const sliceWidth = width / bufferLength
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0
          const y = (v * height) / 2

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }

          x += sliceWidth
        }

        ctx.stroke()

        // 繼續動畫
        if (isListening && animated) {
          animationRef.current = requestAnimationFrame(draw)
        }
      }

      draw()
    }

    const startSimulatedWaveform = () => {
      if (!canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 設置 canvas 尺寸
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      let phase = 0

      const drawSimulated = () => {
        if (!canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const width = canvas.width / (window.devicePixelRatio || 1)
        const height = canvas.height / (window.devicePixelRatio || 1)

        // 清除畫布
        ctx.clearRect(0, 0, width, height)

        // 繪製模擬波形（正弦波）
        ctx.lineWidth = 2
        ctx.strokeStyle = color
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()

        const points = 100
        const amplitude = isListening ? 20 : 5
        const frequency = 0.02

        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width
          const y = height / 2 + Math.sin(i * frequency + phase) * amplitude * Math.sin(i * 0.1)

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.stroke()

        phase += 0.1

        if (isListening && animated) {
          animationRef.current = requestAnimationFrame(drawSimulated)
        }
      }

      drawSimulated()
    }

    if (isListening) {
      initAudio()
    }

    // 清理函數
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (source) {
        source.disconnect()
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isListening, animated, color])

  // 停止動畫
  useEffect(() => {
    if (!isListening && animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [isListening])

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
      aria-label="音頻波形"
    />
  )
}

/**
 * 靜態波形組件（無需麥克風權限）
 * 用於裝飾性目的
 */
export function StaticWaveform({
  color = 'rgb(59, 130, 246)',
  height = 96,
  amplitude = 20,
}: {
  color?: string
  height?: number
  amplitude?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 設置 canvas 尺寸
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const h = rect.height

    // 清除畫布
    ctx.clearRect(0, 0, width, h)

    // 繪製靜態波形
    ctx.lineWidth = 2
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()

    const points = 100
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width
      const y = h / 2 + Math.sin(i * 0.1) * amplitude * Math.sin(i * 0.05)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()
  }, [color, height, amplitude])

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
      aria-label="音頻波形"
    />
  )
}
