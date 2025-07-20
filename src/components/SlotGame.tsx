import React, { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Volume2, VolumeX, Play, Pause, Trophy, Star } from 'lucide-react'

// Tropical slot symbols with values
const SYMBOLS = {
  '🍹': { name: 'Cocktail', value: 200, rarity: 0.05 },
  '🥥': { name: 'Coconut', value: 150, rarity: 0.08 },
  '🍍': { name: 'Pineapple', value: 100, rarity: 0.12 },
  '🌺': { name: 'Hibiscus', value: 80, rarity: 0.15 },
  '🏖️': { name: 'Beach', value: 60, rarity: 0.18 },
  '🕶️': { name: 'Sunglasses', value: 40, rarity: 0.22 },
  '🏄': { name: 'Surfer', value: 30, rarity: 0.20 }
}

const WILD_SYMBOL = '⭐'
const SCATTER_SYMBOL = '💎'

const SlotGame: React.FC = () => {
  const [reels, setReels] = useState<string[][]>([
    ['🍹', '🥥', '🍍'],
    ['🌺', '🏖️', '🕶️'],
    ['🏄', '🍹', '🥥'],
    ['🍍', '🌺', '🏖️'],
    ['🕶️', '🏄', '🍹']
  ])
  
  const [balance, setBalance] = useState(1000)
  const [bet, setBet] = useState(10)
  const [isSpinning, setIsSpinning] = useState(false)
  const [autoSpin, setAutoSpin] = useState(0)
  const [autoSpinCount, setAutoSpinCount] = useState(0)
  const [lastWin, setLastWin] = useState(0)
  const [totalWins, setTotalWins] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showPaytable, setShowPaytable] = useState(false)
  const [bonusRound, setBonusRound] = useState(false)
  const [freeSpins, setFreeSpins] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [winningLines, setWinningLines] = useState<number[]>([])
  const [jackpot, setJackpot] = useState(50000)

  // Generate random symbol based on rarity
  const getRandomSymbol = useCallback(() => {
    const rand = Math.random()
    let cumulative = 0
    
    for (const [symbol, data] of Object.entries(SYMBOLS)) {
      cumulative += data.rarity
      if (rand <= cumulative) return symbol
    }
    
    // Add chance for wild and scatter
    if (Math.random() < 0.03) return WILD_SYMBOL
    if (Math.random() < 0.02) return SCATTER_SYMBOL
    
    return '🏄' // fallback
  }, [])

  const calculateLineWin = useCallback((line: string[]) => {
    const counts: { [key: string]: number } = {}
    line.forEach(symbol => {
      if (symbol === WILD_SYMBOL) return // Wild substitutes
      counts[symbol] = (counts[symbol] || 0) + 1
    })
    
    for (const [symbol, count] of Object.entries(counts)) {
      if (count >= 3) {
        const symbolData = SYMBOLS[symbol as keyof typeof SYMBOLS]
        return symbolData ? symbolData.value * bet * count / 100 : 0
      }
    }
    return 0
  }, [bet])

  // Check for winning combinations
  const checkWins = useCallback((currentReels: string[][]) => {
    const wins: number[] = []
    let totalWin = 0
    
    // Check horizontal lines
    for (let row = 0; row < 3; row++) {
      const line = currentReels.map(reel => reel[row])
      const winAmount = calculateLineWin(line)
      if (winAmount > 0) {
        wins.push(row)
        totalWin += winAmount
      }
    }
    
    // Check diagonal lines
    const diag1 = [currentReels[0][0], currentReels[1][1], currentReels[2][2], currentReels[3][1], currentReels[4][0]]
    const diag2 = [currentReels[0][2], currentReels[1][1], currentReels[2][0], currentReels[3][1], currentReels[4][2]]
    
    if (calculateLineWin(diag1) > 0) {
      wins.push(3)
      totalWin += calculateLineWin(diag1)
    }
    if (calculateLineWin(diag2) > 0) {
      wins.push(4)
      totalWin += calculateLineWin(diag2)
    }
    
    // Check for scatter bonus
    const scatterCount = currentReels.flat().filter(symbol => symbol === SCATTER_SYMBOL).length
    if (scatterCount >= 3) {
      setFreeSpins(prev => prev + 10)
      setBonusRound(true)
      totalWin += bet * scatterCount * 5
    }
    
    setWinningLines(wins)
    return totalWin * multiplier
  }, [bet, multiplier, calculateLineWin])



  // Spin animation
  const spin = useCallback(async () => {
    if (balance < bet && freeSpins === 0) return
    
    setIsSpinning(true)
    setWinningLines([])
    setLastWin(0)
    
    if (freeSpins > 0) {
      setFreeSpins(prev => prev - 1)
    } else {
      setBalance(prev => prev - bet)
    }
    
    // Animate reels spinning
    const spinDuration = 2000 + Math.random() * 1000
    const intervals: NodeJS.Timeout[] = []
    
    reels.forEach((_, reelIndex) => {
      const interval = setInterval(() => {
        setReels(prev => {
          const newReels = [...prev]
          newReels[reelIndex] = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]
          return newReels
        })
      }, 100)
      intervals.push(interval)
      
      // Stop each reel at different times
      setTimeout(() => {
        clearInterval(interval)
        if (reelIndex === 4) {
          // All reels stopped, check for wins
          setTimeout(() => {
            const finalReels = Array(5).fill(null).map(() => [
              getRandomSymbol(), getRandomSymbol(), getRandomSymbol()
            ])
            setReels(finalReels)
            
            const winAmount = checkWins(finalReels)
            if (winAmount > 0) {
              setLastWin(winAmount)
              setBalance(prev => prev + winAmount)
              setTotalWins(prev => prev + winAmount)
              
              // Jackpot chance
              if (Math.random() < 0.001) {
                setBalance(prev => prev + jackpot)
                setJackpot(50000) // Reset jackpot
              }
            }
            
            setIsSpinning(false)
            
            // Continue auto spin
            if (autoSpin > 0) {
              setAutoSpinCount(prev => {
                const newCount = prev - 1
                if (newCount > 0) {
                  setTimeout(() => spin(), 1000)
                } else {
                  setAutoSpin(0)
                }
                return newCount
              })
            }
          }, 500)
        }
      }, spinDuration + reelIndex * 200)
    })
  }, [balance, bet, freeSpins, autoSpin, reels, getRandomSymbol, checkWins, jackpot])

  // Auto spin effect
  useEffect(() => {
    if (autoSpin > 0 && !isSpinning) {
      const timer = setTimeout(() => spin(), 1000)
      return () => clearTimeout(timer)
    }
  }, [autoSpin, isSpinning, spin])

  // Bonus round effect
  useEffect(() => {
    if (bonusRound && freeSpins === 0) {
      setBonusRound(false)
      setMultiplier(1)
    }
  }, [bonusRound, freeSpins])

  const startAutoSpin = (count: number) => {
    setAutoSpin(count)
    setAutoSpinCount(count)
    if (!isSpinning) spin()
  }

  const stopAutoSpin = () => {
    setAutoSpin(0)
    setAutoSpinCount(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Background tropical elements */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">🌴</div>
        <div className="absolute top-20 right-20 text-4xl animate-bounce">🌺</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">🏖️</div>
        <div className="absolute bottom-10 right-10 text-4xl animate-bounce">🍹</div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-4 font-orbitron">
            🌴 CLUB TROPICANA 🌴
          </h1>
          <p className="text-xl text-orange-200">Happy Hour Slot Machine</p>
          
          {/* Jackpot Display */}
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg inline-block">
            <div className="flex items-center gap-2 text-black font-bold">
              <Trophy className="w-6 h-6" />
              <span className="text-2xl">JACKPOT: ${jackpot.toLocaleString()}</span>
              <Trophy className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-black/50 border-orange-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">${balance}</div>
              <div className="text-sm text-gray-400">Balance</div>
            </div>
          </Card>
          <Card className="p-4 bg-black/50 border-orange-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">${bet}</div>
              <div className="text-sm text-gray-400">Bet</div>
            </div>
          </Card>
          <Card className="p-4 bg-black/50 border-orange-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">${lastWin}</div>
              <div className="text-sm text-gray-400">Last Win</div>
            </div>
          </Card>
          <Card className="p-4 bg-black/50 border-orange-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">${totalWins}</div>
              <div className="text-sm text-gray-400">Total Wins</div>
            </div>
          </Card>
        </div>

        {/* Bonus Round Indicator */}
        {bonusRound && (
          <div className="text-center mb-4">
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg px-6 py-2">
              <Star className="w-4 h-4 mr-2" />
              BONUS ROUND - {freeSpins} Free Spins - {multiplier}x Multiplier
            </Badge>
          </div>
        )}

        {/* Slot Machine */}
        <Card className="p-8 bg-gradient-to-br from-gray-900 to-black border-4 border-orange-500 shadow-2xl shadow-orange-500/20">
          <div className="grid grid-cols-5 gap-4 mb-8">
            {reels.map((reel, reelIndex) => (
              <div key={reelIndex} className="space-y-2">
                {reel.map((symbol, symbolIndex) => (
                  <div
                    key={`${reelIndex}-${symbolIndex}`}
                    className={`
                      h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 
                      border-2 border-orange-400 rounded-lg flex items-center justify-center
                      text-4xl transition-all duration-300
                      ${isSpinning ? 'animate-pulse scale-110' : ''}
                      ${winningLines.includes(symbolIndex) ? 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse' : ''}
                    `}
                  >
                    {symbol}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Win Lines Indicator */}
          {winningLines.length > 0 && (
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-yellow-400 animate-bounce">
                🎉 WINNING LINES: {winningLines.join(', ')} 🎉
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Bet Amount</label>
              <select
                value={bet}
                onChange={(e) => setBet(Number(e.target.value))}
                disabled={isSpinning || autoSpin > 0}
                className="w-full p-2 bg-gray-800 border border-orange-500 rounded text-white"
              >
                <option value={1}>$1</option>
                <option value={5}>$5</option>
                <option value={10}>$10</option>
                <option value={25}>$25</option>
                <option value={50}>$50</option>
                <option value={100}>$100</option>
              </select>
            </div>

            <Button
              onClick={spin}
              disabled={isSpinning || balance < bet || autoSpin > 0}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-lg h-12"
            >
              {isSpinning ? 'SPINNING...' : 'SPIN'}
            </Button>

            <Button
              onClick={() => startAutoSpin(10)}
              disabled={isSpinning || balance < bet || autoSpin > 0}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold"
            >
              AUTO 10
            </Button>

            <Button
              onClick={() => startAutoSpin(25)}
              disabled={isSpinning || balance < bet || autoSpin > 0}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold"
            >
              AUTO 25
            </Button>
          </div>

          {/* Auto Spin Status */}
          {autoSpin > 0 && (
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-4">
                <Badge className="bg-blue-500 text-white">
                  Auto Spinning: {autoSpinCount} left
                </Badge>
                <Button
                  onClick={stopAutoSpin}
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  STOP
                </Button>
              </div>
            </div>
          )}

          {/* Additional Controls */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <Button
              onClick={() => setShowPaytable(!showPaytable)}
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              PAYTABLE
            </Button>

            <Button
              onClick={() => {
                setBalance(1000)
                setTotalWins(0)
                setLastWin(0)
                setFreeSpins(0)
                setBonusRound(false)
                setMultiplier(1)
              }}
              variant="outline"
              className="border-gray-500 text-gray-500 hover:bg-gray-500 hover:text-white"
            >
              RESET
            </Button>
          </div>
        </Card>

        {/* Paytable Modal */}
        {showPaytable && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full p-6 bg-gray-900 border-orange-500">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-orange-400">PAYTABLE</h2>
                <Button
                  onClick={() => setShowPaytable(false)}
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-500"
                >
                  ✕
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(SYMBOLS).map(([symbol, data]) => (
                  <div key={symbol} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{symbol}</span>
                      <span className="text-white">{data.name}</span>
                    </div>
                    <span className="text-yellow-400 font-bold">{data.value}x</span>
                  </div>
                ))}
                
                <div className="flex items-center justify-between p-2 bg-purple-800 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{WILD_SYMBOL}</span>
                    <span className="text-white">Wild</span>
                  </div>
                  <span className="text-yellow-400 font-bold">Substitutes</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-pink-800 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{SCATTER_SYMBOL}</span>
                    <span className="text-white">Scatter</span>
                  </div>
                  <span className="text-yellow-400 font-bold">Free Spins</span>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-400">
                <p>• Get 3+ matching symbols on a payline to win</p>
                <p>• 3+ Scatter symbols trigger 10 free spins</p>
                <p>• Wild symbols substitute for any symbol</p>
                <p>• Jackpot has a 0.1% chance on any spin</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default SlotGame