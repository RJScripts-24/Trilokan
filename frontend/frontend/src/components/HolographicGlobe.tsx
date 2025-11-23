import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export function HolographicGlobe() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Generate latitude lines
  const latLines = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 180) / 12 - 90;
    const radius = Math.cos((angle * Math.PI) / 180) * 150;
    const yPos = Math.sin((angle * Math.PI) / 180) * 150;
    return { radius, yPos, index: i };
  });

  // Generate longitude lines
  const longLines = Array.from({ length: 16 }, (_, i) => i);

  // Generate orbital rings
  const orbitalRings = [
    { radius: 200, duration: 15, color: '#D3AF37', opacity: 0.3 },
    { radius: 240, duration: 20, color: '#FFCF2F', opacity: 0.2 },
    { radius: 280, duration: 25, color: '#FFF86A', opacity: 0.15 },
  ];

  // Generate data nodes
  const dataNodes = Array.from({ length: 20 }, (_, i) => ({
    angle: (i * 360) / 20,
    radius: 180 + Math.random() * 50,
    delay: i * 0.1,
    size: 4 + Math.random() * 4,
  }));

  // Generate connecting lines
  const connectionLines = Array.from({ length: 15 }, (_, i) => ({
    from: Math.floor(Math.random() * 20),
    to: Math.floor(Math.random() * 20),
    delay: i * 0.2,
  }));

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        className="relative w-[600px] h-[600px]"
        style={{
          rotateX: mousePosition.y * 0.5,
          rotateY: mousePosition.x * 0.5,
        }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
      >
        {/* Central Glow */}
        <motion.div
          className="absolute inset-[25%] rounded-full blur-3xl"
          style={{ backgroundColor: '#D3AF37' }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Main Globe */}
        <div className="absolute inset-[20%] rounded-full border-2 border-[#D3AF37]/30 backdrop-blur-sm"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(211, 175, 55, 0.1), rgba(0, 0, 0, 0.4))',
            boxShadow: '0 0 60px rgba(211, 175, 55, 0.3), inset 0 0 40px rgba(211, 175, 55, 0.1)',
          }}
        >
          {/* Latitude Lines */}
          {latLines.map((line) => (
            <motion.div
              key={`lat-${line.index}`}
              className="absolute left-1/2 top-1/2 border border-[#D3AF37]/20"
              style={{
                width: line.radius * 2,
                height: line.radius * 2,
                marginLeft: -line.radius,
                marginTop: -line.radius,
                transform: `translateY(${line.yPos}px)`,
                borderRadius: '50%',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: line.index * 0.1,
              }}
            />
          ))}

          {/* Longitude Lines */}
          {longLines.map((i) => (
            <motion.div
              key={`long-${i}`}
              className="absolute inset-0 border-l border-[#D3AF37]/20"
              style={{
                transform: `rotateY(${(i * 360) / 16}deg)`,
                transformStyle: 'preserve-3d',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}

          {/* Holographic Scan Lines */}
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(211, 175, 55, 0.1) 50%, transparent 100%)',
            }}
            animate={{ y: ['-100%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Orbital Rings */}
        {orbitalRings.map((ring, index) => (
          <motion.div
            key={`ring-${index}`}
            className="absolute left-1/2 top-1/2 rounded-full border-2"
            style={{
              width: ring.radius * 2,
              height: ring.radius * 2,
              marginLeft: -ring.radius,
              marginTop: -ring.radius,
              borderColor: ring.color,
              opacity: ring.opacity,
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: ring.duration,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {/* Orbital particles */}
            {[0, 120, 240].map((angle) => (
              <motion.div
                key={angle}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ring.color,
                  left: '50%',
                  top: '0%',
                  marginLeft: -4,
                  marginTop: -4,
                  boxShadow: `0 0 10px ${ring.color}`,
                }}
                animate={{
                  rotate: -360,
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  rotate: { duration: ring.duration, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 2, repeat: Infinity },
                }}
                initial={{ rotate: angle }}
              />
            ))}
          </motion.div>
        ))}

        {/* Data Nodes */}
        {dataNodes.map((node, index) => {
          const x = Math.cos((node.angle * Math.PI) / 180) * node.radius;
          const y = Math.sin((node.angle * Math.PI) / 180) * node.radius;
          
          return (
            <motion.div
              key={`node-${index}`}
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: node.size,
                height: node.size,
                backgroundColor: '#FFCF2F',
                marginLeft: x - node.size / 2,
                marginTop: y - node.size / 2,
                boxShadow: '0 0 8px #FFCF2F',
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: node.delay,
              }}
            />
          );
        })}

        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connectionLines.map((conn, index) => {
            const fromNode = dataNodes[conn.from];
            const toNode = dataNodes[conn.to];
            const x1 = 300 + Math.cos((fromNode.angle * Math.PI) / 180) * fromNode.radius;
            const y1 = 300 + Math.sin((fromNode.angle * Math.PI) / 180) * fromNode.radius;
            const x2 = 300 + Math.cos((toNode.angle * Math.PI) / 180) * toNode.radius;
            const y2 = 300 + Math.sin((toNode.angle * Math.PI) / 180) * toNode.radius;
            
            return (
              <motion.line
                key={`line-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#D3AF37"
                strokeWidth="1"
                strokeOpacity="0.3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: conn.delay,
                }}
              />
            );
          })}
        </svg>

        {/* Floating Data Streams */}
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <motion.div
            key={`stream-${angle}`}
            className="absolute left-1/2 top-1/2 w-1 h-20 rounded-full"
            style={{
              background: 'linear-gradient(180deg, transparent, #D3AF37, transparent)',
              transformOrigin: 'top center',
            }}
            animate={{
              rotate: [angle, angle + 360],
              y: [-100, 100],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
              y: { duration: 4, repeat: Infinity, ease: 'linear' },
              opacity: { duration: 4, repeat: Infinity, ease: 'linear' },
            }}
          />
        ))}

        {/* Energy Pulses */}
        <motion.div
          className="absolute inset-[20%] rounded-full border-2 border-[#FFCF2F]"
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.6, 0.3, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        />

        <motion.div
          className="absolute inset-[20%] rounded-full border-2 border-[#D3AF37]"
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.6, 0.3, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: 1.5,
          }}
        />
      </motion.div>

      {/* Ambient Particles */}
      {Array.from({ length: 30 }, (_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: i % 2 === 0 ? '#D3AF37' : '#FFCF2F',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
}
