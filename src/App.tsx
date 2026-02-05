import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Float, MeshTransmissionMaterial, Stars, ContactShadows, Html } from '@react-three/drei'
import * as THREE from 'three'

// Diamond colors with names
const DIAMOND_TYPES = [
  { color: '#ff3366', emissive: '#ff1144', name: 'Ruby' },
  { color: '#33ccff', emissive: '#00aaff', name: 'Sapphire' },
  { color: '#ffcc00', emissive: '#ffaa00', name: 'Topaz' },
  { color: '#33ff99', emissive: '#00ff77', name: 'Emerald' },
  { color: '#ff66ff', emissive: '#ff33ff', name: 'Amethyst' },
  { color: '#ffffff', emissive: '#ccccff', name: 'Diamond' },
]

interface Card {
  id: number
  typeIndex: number
  isFlipped: boolean
  isMatched: boolean
  position: [number, number, number]
}

// Diamond geometry component
function Diamond({
  color,
  emissive,
  isRevealed,
  isMatched,
  onClick,
  position
}: {
  color: string
  emissive: string
  isRevealed: boolean
  isMatched: boolean
  onClick: () => void
  position: [number, number, number]
}) {
  const meshRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)
  const targetRotation = useRef(0)
  const currentRotation = useRef(Math.PI)
  const sparkleRef = useRef<THREE.Points>(null!)

  useFrame((state, delta) => {
    if (!meshRef.current) return

    // Flip animation
    targetRotation.current = isRevealed ? 0 : Math.PI
    currentRotation.current = THREE.MathUtils.lerp(
      currentRotation.current,
      targetRotation.current,
      delta * 5
    )
    meshRef.current.rotation.y = currentRotation.current

    // Hover effect
    const targetScale = hovered && !isMatched ? 1.1 : 1
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      delta * 10
    )

    // Matched animation - float up and sparkle
    if (isMatched) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.1
      meshRef.current.rotation.y += delta * 2
    }

    // Sparkles animation
    if (sparkleRef.current && isRevealed) {
      sparkleRef.current.rotation.y += delta * 0.5
    }
  })

  // Create sparkle particles
  const sparkleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const particles = 20
    const positions = new Float32Array(particles * 3)

    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2
      const radius = 0.4 + Math.random() * 0.2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [])

  return (
    <group position={position}>
      <group
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          if (!isMatched) onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!isMatched) {
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {/* Back of card (dark) */}
        <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.01]}>
          <boxGeometry args={[0.8, 0.8, 0.05]} />
          <meshStandardMaterial
            color="#1a1a2e"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Card border */}
        <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.02]}>
          <boxGeometry args={[0.85, 0.85, 0.02]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={1}
            roughness={0.3}
          />
        </mesh>

        {/* Front - Diamond */}
        <Float
          speed={2}
          rotationIntensity={isRevealed ? 0.3 : 0}
          floatIntensity={isRevealed ? 0.2 : 0}
          floatingRange={[-0.05, 0.05]}
        >
          <mesh position={[0, 0, 0.1]} scale={0.25}>
            {/* Diamond shape using octahedron */}
            <octahedronGeometry args={[1, 0]} />
            <MeshTransmissionMaterial
              color={color}
              transmission={0.9}
              thickness={0.5}
              roughness={0}
              metalness={0.1}
              ior={2.4}
              chromaticAberration={0.5}
              backside
              samples={8}
              resolution={256}
            />
          </mesh>

          {/* Inner glow */}
          <pointLight
            position={[0, 0, 0.15]}
            color={emissive}
            intensity={isRevealed ? 0.5 : 0}
            distance={1}
          />
        </Float>

        {/* Sparkles around matched diamonds */}
        {isMatched && (
          <points ref={sparkleRef} geometry={sparkleGeometry}>
            <pointsMaterial
              size={0.03}
              color="#ffffff"
              transparent
              opacity={0.8}
              sizeAttenuation
            />
          </points>
        )}
      </group>
    </group>
  )
}

// Particle explosion effect
function MatchExplosion({ position, color }: { position: [number, number, number], color: string }) {
  const ref = useRef<THREE.Points>(null!)
  const [opacity, setOpacity] = useState(1)

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const particles = 50
    const positions = new Float32Array(particles * 3)
    const velocities: number[] = []

    for (let i = 0; i < particles; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      velocities.push(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      )
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    ;(geometry as any).velocities = velocities
    return geometry
  }, [])

  useFrame((_, delta) => {
    if (!ref.current) return

    const positions = ref.current.geometry.attributes.position.array as Float32Array
    const velocities = (ref.current.geometry as any).velocities as number[]

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += velocities[i * 3] * delta * 10
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 10
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 10
    }

    ref.current.geometry.attributes.position.needsUpdate = true
    setOpacity(prev => Math.max(0, prev - delta * 2))
  })

  return (
    <points ref={ref} position={position} geometry={particleGeometry}>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
      />
    </points>
  )
}

// Game board component
function GameBoard({
  cards,
  onCardClick,
  explosions
}: {
  cards: Card[]
  onCardClick: (id: number) => void
  explosions: { id: number, position: [number, number, number], color: string }[]
}) {
  return (
    <group>
      {cards.map((card) => (
        <Diamond
          key={card.id}
          color={DIAMOND_TYPES[card.typeIndex].color}
          emissive={DIAMOND_TYPES[card.typeIndex].emissive}
          isRevealed={card.isFlipped || card.isMatched}
          isMatched={card.isMatched}
          onClick={() => onCardClick(card.id)}
          position={card.position}
        />
      ))}

      {explosions.map((exp) => (
        <MatchExplosion key={exp.id} position={exp.position} color={exp.color} />
      ))}
    </group>
  )
}

// Scene lighting and atmosphere
function SceneSetup() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} color="#ffffff" />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#d4af37" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffffff" />

      <Stars
        radius={50}
        depth={50}
        count={2000}
        factor={4}
        saturation={0.5}
        fade
        speed={0.5}
      />

      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
        color="#000000"
      />

      <Environment preset="night" />

      {/* Reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#0a0a15"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </>
  )
}

// Shuffle array function
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

// Initialize game board
function createCards(): Card[] {
  const cards: Card[] = []
  const pairs = 6

  // Create pairs
  for (let i = 0; i < pairs; i++) {
    cards.push({ id: i * 2, typeIndex: i, isFlipped: false, isMatched: false, position: [0, 0, 0] })
    cards.push({ id: i * 2 + 1, typeIndex: i, isFlipped: false, isMatched: false, position: [0, 0, 0] })
  }

  // Shuffle
  const shuffled = shuffleArray(cards)

  // Assign positions (4x3 grid)
  const cols = 4
  const rows = 3
  const spacing = 1.1

  shuffled.forEach((card, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    card.position = [
      (col - (cols - 1) / 2) * spacing,
      (row - (rows - 1) / 2) * spacing * 0.9,
      0
    ]
  })

  return shuffled
}

export default function App() {
  const [cards, setCards] = useState<Card[]>(() => createCards())
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [explosions, setExplosions] = useState<{ id: number, position: [number, number, number], color: string }[]>([])
  const explosionIdRef = useRef(0)

  const handleCardClick = useCallback((id: number) => {
    if (isLocked) return

    const card = cards.find(c => c.id === id)
    if (!card || card.isFlipped || card.isMatched) return

    // Flip the card
    setCards(prev => prev.map(c =>
      c.id === id ? { ...c, isFlipped: true } : c
    ))

    const newFlipped = [...flippedCards, id]
    setFlippedCards(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1)
      setIsLocked(true)

      const [first, second] = newFlipped
      const card1 = cards.find(c => c.id === first)!
      const card2 = cards.find(c => c.id === second)!

      if (card1.typeIndex === card2.typeIndex) {
        // Match found!
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second
              ? { ...c, isMatched: true }
              : c
          ))

          // Add explosions
          const color = DIAMOND_TYPES[card1.typeIndex].color
          setExplosions(prev => [
            ...prev,
            { id: explosionIdRef.current++, position: card1.position, color },
            { id: explosionIdRef.current++, position: card2.position, color }
          ])

          // Clear explosions after animation
          setTimeout(() => {
            setExplosions([])
          }, 1000)

          setMatches(prev => {
            const newMatches = prev + 1
            if (newMatches === 6) {
              setGameWon(true)
            }
            return newMatches
          })
          setFlippedCards([])
          setIsLocked(false)
        }, 500)
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second
              ? { ...c, isFlipped: false }
              : c
          ))
          setFlippedCards([])
          setIsLocked(false)
        }, 1000)
      }
    }
  }, [cards, flippedCards, isLocked])

  const resetGame = useCallback(() => {
    setCards(createCards())
    setFlippedCards([])
    setMoves(0)
    setMatches(0)
    setIsLocked(false)
    setGameWon(false)
    setExplosions([])
  }, [])

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0f0f1a] overflow-hidden relative">
      {/* Header UI */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <h1
            className="text-2xl md:text-4xl font-light tracking-[0.2em] text-white"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            <span className="text-[#d4af37]">DIAMOND</span> MATCH
          </h1>

          <div className="flex items-center gap-4 md:gap-8">
            <div className="text-center">
              <div
                className="text-xs md:text-sm tracking-widest text-[#d4af37]/60 uppercase"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Moves
              </div>
              <div
                className="text-2xl md:text-3xl font-light text-white"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {moves}
              </div>
            </div>

            <div className="w-px h-10 bg-gradient-to-b from-transparent via-[#d4af37]/30 to-transparent" />

            <div className="text-center">
              <div
                className="text-xs md:text-sm tracking-widest text-[#d4af37]/60 uppercase"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Matched
              </div>
              <div
                className="text-2xl md:text-3xl font-light text-white"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {matches}<span className="text-[#d4af37]/40">/6</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        className="touch-none"
        dpr={[1, 2]}
      >
        <SceneSetup />
        <GameBoard
          cards={cards}
          onCardClick={handleCardClick}
          explosions={explosions}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={8}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none">
        <p
          className="text-xs md:text-sm text-white/40 tracking-wide"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Click cards to flip • Match pairs of diamonds • Drag to rotate view
        </p>
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-8 md:p-12">
            <div
              className="text-5xl md:text-7xl font-light text-[#d4af37] mb-4 animate-pulse"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              ✦ BRILLIANT ✦
            </div>
            <p
              className="text-lg md:text-xl text-white/80 mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              All diamonds matched!
            </p>
            <p
              className="text-sm text-[#d4af37]/60 mb-8"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Completed in {moves} moves
            </p>
            <button
              onClick={resetGame}
              className="px-8 py-3 border border-[#d4af37] text-[#d4af37] tracking-widest uppercase text-sm
                         hover:bg-[#d4af37] hover:text-black transition-all duration-300
                         active:scale-95"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* New Game Button */}
      {!gameWon && (
        <button
          onClick={resetGame}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-10 px-4 py-2
                     border border-[#d4af37]/30 text-[#d4af37]/60 text-xs tracking-widest uppercase
                     hover:border-[#d4af37] hover:text-[#d4af37] transition-all duration-300
                     active:scale-95"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          New Game
        </button>
      )}

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center z-10">
        <p
          className="text-[10px] md:text-xs text-white/20 tracking-wide"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Requested by @thoingu73733651 · Built by @clonkbot
        </p>
      </div>
    </div>
  )
}
