import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { TrendingUp, CreditCard, PieChart, Wallet, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';

export function AdvancedParticleField() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Financial data cards
  const financialCards = [
    { 
      title: 'Portfolio Value', 
      value: '₹2,45,890', 
      change: '+12.5%', 
      trend: 'up',
      icon: TrendingUp,
      delay: 0,
      x: '15%',
      y: '20%'
    },
    { 
      title: 'Total Investment', 
      value: '₹1,85,000', 
      change: '+8.2%', 
      trend: 'up',
      icon: Wallet,
      delay: 0.2,
      x: '20%',
      y: '60%'
    },
    { 
      title: 'Monthly Returns', 
      value: '₹18,450', 
      change: '+15.8%', 
      trend: 'up',
      icon: PieChart,
      delay: 0.4,
      x: '8%',
      y: '40%'
    },
  ];

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {/* Massive glowing orb - left side */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          left: '25%',
          top: '50%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(211, 175, 55, 0.4), rgba(211, 175, 55, 0.1), transparent)',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      {/* Central Core with pulsing energy */}
      <motion.div
        className="absolute"
        style={{
          left: '25%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Core rupee symbol */}
        <motion.div
          className="relative flex items-center justify-center rounded-full backdrop-blur-xl"
          style={{
            width: 120,
            height: 120,
            background: 'radial-gradient(circle, rgba(211, 175, 55, 0.4), rgba(0, 0, 0, 0.8))',
            border: '3px solid #D3AF37',
            boxShadow: '0 0 60px rgba(211, 175, 55, 0.8), inset 0 0 30px rgba(211, 175, 55, 0.3)',
          }}
          animate={{
            rotate: [0, 360],
            scale: [1, 1.05, 1],
          }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
            scale: { duration: 3, repeat: Infinity },
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="#FFCF2F"
            className="w-16 h-16"
            style={{
              filter: 'drop-shadow(0 0 10px #FFCF2F)',
            }}
          >
            <path d="M13.66 7H16v2h-2.34c-.32 0-.64.07-.94.2l-4.5 1.93c-.47.2-.97.3-1.47.3H5v-2h1.75c.32 0 .64-.07.94-.2l4.5-1.93c.47-.2.97-.3 1.47-.3zM13.66 12H16v2h-2.34c-.32 0-.64.07-.94.2l-4.5 1.93c-.47.2-.97.3-1.47.3H5v-2h1.75c.32 0 .64-.07.94-.2l4.5-1.93c.47-.2.97-.3 1.47-.3zM17 6v13h2V6h-2z" />
          </svg>
        </motion.div>

        {/* Energy pulse rings */}
        {[0, 1, 2].map((index) => (
          <motion.div
            key={`pulse-${index}`}
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: '#FFCF2F',
              width: 120,
              height: 120,
            }}
            animate={{
              scale: [1, 2.5, 2.5],
              opacity: [0.8, 0.2, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: index * 1,
            }}
          />
        ))}
      </motion.div>

      {/* Orbital rings with icons */}
      {[
        { radius: 180, duration: 15, icons: [TrendingUp, CreditCard, PieChart, Wallet], count: 4 },
        { radius: 280, duration: 20, icons: [DollarSign, TrendingUp, Wallet, CreditCard], count: 4 },
        { radius: 380, duration: 25, icons: [PieChart, Wallet, TrendingUp, CreditCard], count: 4 },
      ].map((ring, ringIndex) => (
        <motion.div
          key={`ring-${ringIndex}`}
          className="absolute"
          style={{
            left: '25%',
            top: '50%',
            width: ring.radius * 2,
            height: ring.radius * 2,
            marginLeft: -ring.radius,
            marginTop: -ring.radius,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: ring.duration, repeat: Infinity, ease: 'linear' }}
        >
          {/* Orbital path */}
          <div
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: `rgba(211, 175, 55, ${0.15 - ringIndex * 0.03})`,
              borderStyle: 'dashed',
            }}
          />

          {/* Orbiting elements */}
          {ring.icons.map((Icon, iconIndex) => {
            const angle = (iconIndex * 360) / ring.count;
            return (
              <motion.div
                key={`${ringIndex}-${iconIndex}`}
                className="absolute left-1/2 top-0"
                style={{
                  marginLeft: -25,
                  marginTop: -25,
                }}
                animate={{
                  rotate: -360,
                }}
                transition={{
                  duration: ring.duration,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                initial={{ rotate: -angle }}
              >
                <motion.div
                  className="relative rounded-xl backdrop-blur-lg p-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(211, 175, 55, 0.2), rgba(0, 0, 0, 0.6))',
                    border: '2px solid rgba(211, 175, 55, 0.4)',
                    boxShadow: '0 8px 32px rgba(211, 175, 55, 0.3)',
                  }}
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    y: { duration: 2, repeat: Infinity, delay: iconIndex * 0.2 },
                  }}
                >
                  <Icon size={24} color="#FFCF2F" strokeWidth={2} />
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      ))}

      {/* Floating rupee symbols */}
      {Array.from({ length: 15 }, (_, i) => {
        const x = 5 + (i % 5) * 8;
        const y = 10 + Math.floor(i / 5) * 25;
        return (
          <motion.div
            key={`rupee-${i}`}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 10, -10, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 4 + (i % 3),
              repeat: Infinity,
              delay: i * 0.3,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="#D3AF37"
              className="w-8 h-8"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(211, 175, 55, 0.6))',
              }}
            >
              <path d="M13.66 7H16v2h-2.34c-.32 0-.64.07-.94.2l-4.5 1.93c-.47.2-.97.3-1.47.3H5v-2h1.75c.32 0 .64-.07.94-.2l4.5-1.93c.47-.2.97-.3 1.47-.3zM13.66 12H16v2h-2.34c-.32 0-.64.07-.94.2l-4.5 1.93c-.47.2-.97.3-1.47.3H5v-2h1.75c.32 0 .64-.07.94-.2l4.5-1.93c.47-.2.97-.3 1.47-.3zM17 6v13h2V6h-2z" />
            </svg>
          </motion.div>
        );
      })}

      {/* Floating financial cards */}
      {financialCards.map((card, index) => (
        <motion.div
          key={`card-${index}`}
          className="absolute rounded-2xl backdrop-blur-xl p-6 shadow-2xl"
          style={{
            left: card.x,
            top: card.y,
            background: 'linear-gradient(135deg, rgba(211, 175, 55, 0.15), rgba(0, 0, 0, 0.8))',
            border: '2px solid rgba(211, 175, 55, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(211, 175, 55, 0.2)',
            minWidth: '220px',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: [0.8, 1, 0.8],
            y: [0, -15, 0],
            rotateY: [0, 5, 0, -5, 0],
          }}
          transition={{
            opacity: { duration: 3, repeat: Infinity },
            y: { duration: 4, repeat: Infinity, delay: card.delay },
            rotateY: { duration: 6, repeat: Infinity, delay: card.delay },
          }}
          whileHover={{
            scale: 1.05,
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.6), 0 0 50px rgba(211, 175, 55, 0.4)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="rounded-lg p-2"
              style={{
                background: 'rgba(211, 175, 55, 0.2)',
              }}
            >
              <card.icon size={24} color="#FFCF2F" />
            </div>
            <div className="flex-1">
              <div className="text-gray-400 text-sm mb-1">{card.title}</div>
              <div className="text-white text-2xl mb-1" style={{ fontWeight: 600 }}>
                {card.value}
              </div>
              <div className="flex items-center gap-1">
                {card.trend === 'up' ? (
                  <ArrowUpRight size={14} color="#4ade80" />
                ) : (
                  <ArrowDownRight size={14} color="#ef4444" />
                )}
                <span
                  className="text-sm"
                  style={{ color: card.trend === 'up' ? '#4ade80' : '#ef4444' }}
                >
                  {card.change}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Connecting lines and data streams */}
      <svg className="absolute inset-0 w-full h-full">
        {/* Animated bezier curves */}
        {Array.from({ length: 8 }, (_, i) => {
          const startX = window.innerWidth * 0.25;
          const startY = window.innerHeight * 0.5;
          const endX = window.innerWidth * (0.1 + i * 0.05);
          const endY = window.innerHeight * (0.2 + i * 0.1);
          const controlX = (startX + endX) / 2 + (i % 2 === 0 ? 100 : -100);
          const controlY = (startY + endY) / 2;

          return (
            <motion.path
              key={`line-${i}`}
              d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
              stroke="#D3AF37"
              strokeWidth="2"
              fill="none"
              strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'linear',
              }}
            />
          );
        })}

        {/* Animated particles along paths */}
        {Array.from({ length: 12 }, (_, i) => {
          const startX = window.innerWidth * 0.25;
          const startY = window.innerHeight * 0.5;
          const angle = (i * 360) / 12;
          const distance = 200 + i * 30;
          const endX = startX + Math.cos((angle * Math.PI) / 180) * distance;
          const endY = startY + Math.sin((angle * Math.PI) / 180) * distance;

          return (
            <motion.circle
              key={`particle-${i}`}
              r="4"
              fill="#FFCF2F"
              filter="blur(1px)"
              style={{
                boxShadow: '0 0 10px #FFCF2F',
              }}
              animate={{
                cx: [startX, endX, startX],
                cy: [startY, endY, startY],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.25,
                ease: 'linear',
              }}
            />
          );
        })}
      </svg>

      {/* Floating data metrics */}
      {Array.from({ length: 6 }, (_, i) => (
        <motion.div
          key={`metric-${i}`}
          className="absolute font-mono rounded-lg px-3 py-2 backdrop-blur-md"
          style={{
            left: `${10 + i * 8}%`,
            top: `${15 + (i % 2) * 60}%`,
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(211, 175, 55, 0.3)',
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          <span className="text-[#FFCF2F]">
            ₹{(Math.random() * 100).toFixed(1)}K
          </span>
        </motion.div>
      ))}

      {/* Ambient glow particles */}
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={`glow-${i}`}
          className="absolute rounded-full blur-xl"
          style={{
            left: `${Math.random() * 50}%`,
            top: `${Math.random() * 100}%`,
            width: 40 + Math.random() * 60,
            height: 40 + Math.random() * 60,
            background: i % 2 === 0 ? 'rgba(211, 175, 55, 0.15)' : 'rgba(255, 207, 47, 0.1)',
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, (Math.random() - 0.5) * 100, 0],
            y: [0, (Math.random() - 0.5) * 100, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}

      {/* Mouse cursor glow effect */}
      <motion.div
        className="absolute rounded-full blur-3xl pointer-events-none"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(211, 175, 55, 0.3), transparent)',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Animated grid pattern */}
      <div className="absolute inset-0" style={{ opacity: 0.1 }}>
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(211, 175, 55, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(211, 175, 55, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
          }}
          animate={{
            backgroundPosition: ['0px 0px', '100px 100px'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Scanline effect */}
      <motion.div
        className="absolute left-0 right-0 h-1 blur-sm"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 207, 47, 0.4), transparent)',
        }}
        animate={{
          top: ['-5%', '105%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Vertical light beams */}
      {[5, 15, 35, 45].map((left, i) => (
        <motion.div
          key={`beam-${i}`}
          className="absolute top-0 bottom-0 blur-xl"
          style={{
            left: `${left}%`,
            width: '2px',
            background: 'linear-gradient(180deg, transparent, rgba(211, 175, 55, 0.3), transparent)',
          }}
          animate={{
            opacity: [0, 0.6, 0],
            scaleY: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 0.8,
          }}
        />
      ))}

      {/* Floating dot formations */}
      {Array.from({ length: 30 }, (_, i) => {
        const x = (i % 6) * 8;
        const y = Math.floor(i / 6) * 15;
        return (
          <motion.div
            key={`dot-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: '#D3AF37',
              boxShadow: '0 0 4px rgba(211, 175, 55, 0.6)',
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        );
      })}

      {/* Circular ripples */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`ripple-${i}`}
          className="absolute rounded-full border"
          style={{
            left: '25%',
            top: '50%',
            width: 600,
            height: 600,
            marginLeft: -300,
            marginTop: -300,
            borderColor: 'rgba(211, 175, 55, 0.1)',
            borderWidth: '1px',
          }}
          animate={{
            scale: [0.5, 1.5],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            delay: i * 2,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Floating hexagons */}
      {Array.from({ length: 8 }, (_, i) => (
        <motion.div
          key={`hex-${i}`}
          className="absolute"
          style={{
            left: `${10 + i * 6}%`,
            top: `${20 + (i % 2) * 50}%`,
            width: 40,
            height: 40,
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 360],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon
              points="50 1 95 25 95 75 50 99 5 75 5 25"
              fill="none"
              stroke="#D3AF37"
              strokeWidth="2"
              opacity="0.4"
            />
          </svg>
        </motion.div>
      ))}

      {/* Data stream bars */}
      {Array.from({ length: 5 }, (_, i) => (
        <motion.div
          key={`bar-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${12 + i * 5}%`,
            bottom: '10%',
            width: '3px',
            background: 'linear-gradient(180deg, rgba(211, 175, 55, 0.6), transparent)',
          }}
          animate={{
            height: [
              `${20 + Math.random() * 40}px`,
              `${60 + Math.random() * 80}px`,
              `${20 + Math.random() * 40}px`,
            ],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}

      {/* Shimmer waves */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`shimmer-${i}`}
          className="absolute left-0 right-1/2 h-px"
          style={{
            top: `${30 + i * 20}%`,
            background: 'linear-gradient(90deg, transparent, rgba(255, 207, 47, 0.5), transparent)',
          }}
          animate={{
            x: ['-100%', '200%'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 1.5,
            ease: 'linear',
          }}
        />
      ))}

      {/* Constellation lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.2 }}>
        {Array.from({ length: 15 }, (_, i) => {
          const x1 = Math.random() * 50;
          const y1 = Math.random() * 100;
          const x2 = x1 + (Math.random() * 20 - 10);
          const y2 = y1 + (Math.random() * 20 - 10);
          
          return (
            <motion.line
              key={`constellation-${i}`}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="#D3AF37"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          );
        })}
      </svg>

      {/* Gradient orbs floating */}
      {Array.from({ length: 10 }, (_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-2xl"
          style={{
            left: `${5 + i * 5}%`,
            top: `${10 + (i % 3) * 30}%`,
            width: 80 + i * 10,
            height: 80 + i * 10,
            background: `radial-gradient(circle, ${
              i % 3 === 0 ? 'rgba(211, 175, 55, 0.15)' : 
              i % 3 === 1 ? 'rgba(255, 207, 47, 0.1)' : 
              'rgba(255, 248, 106, 0.08)'
            }, transparent)`,
          }}
          animate={{
            y: [0, -50, 0],
            x: [(i % 2) * -20, (i % 2) * 20, (i % 2) * -20],
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 10 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Digital rain effect */}
      {Array.from({ length: 6 }, (_, i) => (
        <motion.div
          key={`rain-${i}`}
          className="absolute w-px"
          style={{
            left: `${8 + i * 7}%`,
            height: '100px',
            background: 'linear-gradient(180deg, transparent, rgba(211, 175, 55, 0.4), transparent)',
          }}
          animate={{
            top: ['-100px', '100vh'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'linear',
          }}
        />
      ))}

      {/* Pulsing nodes */}
      {Array.from({ length: 12 }, (_, i) => (
        <motion.div
          key={`node-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${5 + (i % 4) * 10}%`,
            top: `${15 + Math.floor(i / 4) * 25}%`,
            width: 8,
            height: 8,
            background: '#FFCF2F',
            boxShadow: '0 0 10px rgba(255, 207, 47, 0.8)',
          }}
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}

      {/* Spiral particles */}
      <motion.div
        className="absolute"
        style={{
          left: '25%',
          top: '50%',
          width: 500,
          height: 500,
          marginLeft: -250,
          marginTop: -250,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {Array.from({ length: 20 }, (_, i) => {
          const angle = (i * 360) / 20;
          const radius = 150 + i * 10;
          return (
            <motion.div
              key={`spiral-${i}`}
              className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
              style={{
                background: '#D3AF37',
                boxShadow: '0 0 6px rgba(211, 175, 55, 0.8)',
                marginLeft: Math.cos((angle * Math.PI) / 180) * radius,
                marginTop: Math.sin((angle * Math.PI) / 180) * radius,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          );
        })}
      </motion.div>

      {/* Corner accent glows */}
      {[
        { top: '5%', left: '5%' },
        { top: '5%', left: '45%' },
        { bottom: '5%', left: '5%' },
        { bottom: '5%', left: '45%' },
      ].map((position, i) => (
        <motion.div
          key={`corner-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{
            ...position,
            width: 150,
            height: 150,
            background: 'radial-gradient(circle, rgba(211, 175, 55, 0.2), transparent)',
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            delay: i * 1.2,
          }}
        />
      ))}
    </div>
  );
}