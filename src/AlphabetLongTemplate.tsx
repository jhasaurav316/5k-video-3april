import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  AbsoluteFill,
  staticFile,
  Img,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadFontPoppins } from "@remotion/google-fonts/Poppins";
import React from "react";

const { fontFamily: funFont } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const { fontFamily: cleanFont } = loadFontPoppins("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin"],
});

export type AlphabetLongProps = {
  title: string;
  videoId: string;
  bgGradient: [string, string];
  accentColor: string;
  letters: {
    letter: string;
    word: string;
    emoji: string;
    imageUrl?: string;
    bgColor: string;
  }[];
  letterDuration?: number;
  introDuration?: number;
  outroDuration?: number;
  targetDuration?: number;
};

// ---------------------------------------------------------------------------
// Sparkle / Particle helper - BIGGER sparkles
// ---------------------------------------------------------------------------
const Sparkle: React.FC<{
  x: number;
  y: number;
  size: number;
  delay: number;
  color: string;
  frame: number;
}> = ({ x, y, size, delay, color, frame }) => {
  const cycle = (frame + delay * 10) % 60;
  const opacity = interpolate(cycle, [0, 15, 30, 45, 60], [0, 1, 0.6, 1, 0]);
  const scale = interpolate(cycle, [0, 30, 60], [0.5, 1.2, 0.5]);
  const drift = Math.sin((frame + delay * 17) / 20) * 12;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + drift,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        transform: `scale(${scale})`,
        pointerEvents: "none",
      }}
    />
  );
};

// Floating mini-emoji helper - BIGGER
const FloatingEmoji: React.FC<{
  emoji: string;
  imageUrl?: string;
  x: number;
  y: number;
  size: number;
  frame: number;
  delay: number;
}> = ({ emoji, imageUrl, x, y, size, frame, delay }) => {
  const floatY = Math.sin((frame + delay * 13) / 25) * 18;
  const floatX = Math.cos((frame + delay * 7) / 30) * 10;
  const rotation = Math.sin((frame + delay * 11) / 35) * 15;
  const opacity = interpolate(
    (frame + delay * 5) % 90,
    [0, 20, 70, 90],
    [0.4, 0.9, 0.9, 0.4]
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x + floatX,
        top: y + floatY,
        fontSize: size,
        transform: `rotate(${rotation}deg)`,
        opacity,
        pointerEvents: "none",
      }}
    >
      {imageUrl ? (
        <Img src={imageUrl} style={{ width: size * 0.8, height: size * 0.8, objectFit: "contain" }} />
      ) : (
        emoji
      )}
    </div>
  );
};

// Generate deterministic sparkle positions - BIGGER sizes
function generateSparkles(count: number, seed: number) {
  const sparkles: { x: number; y: number; size: number; delay: number }[] = [];
  for (let i = 0; i < count; i++) {
    const hash = ((seed * 31 + i * 97) % 1000) / 1000;
    const hash2 = ((seed * 53 + i * 71) % 1000) / 1000;
    sparkles.push({
      x: hash * 1080,
      y: hash2 * 1920,
      size: 12 + (hash * 32),
      delay: i * 3,
    });
  }
  return sparkles;
}

// Generate positions for side decorations - BIGGER
function generateSideEmojis(count: number, seed: number) {
  const positions: { x: number; y: number; size: number; delay: number }[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 0 : 1;
    const hash = ((seed * 41 + i * 89) % 1000) / 1000;
    positions.push({
      x: side === 0 ? 10 + hash * 100 : 880 + hash * 100,
      y: 300 + (i * 220) + hash * 80,
      size: 150 + hash * 50,
      delay: i * 5,
    });
  }
  return positions;
}

// ---------------------------------------------------------------------------
// Intro Scene
// ---------------------------------------------------------------------------
const IntroScene: React.FC<{
  title: string;
  bgGradient: [string, string];
  accentColor: string;
}> = ({ title, bgGradient, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 8, mass: 0.8 } });
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const subtitleProgress = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 10 },
  });

  const abcLetters = ["A", "B", "C"];
  const sparkles = generateSparkles(20, 42);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${bgGradient[0]}, ${bgGradient[1]})`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {sparkles.map((s, i) => (
        <Sparkle
          key={i}
          x={s.x}
          y={s.y}
          size={s.size}
          delay={s.delay}
          color={i % 2 === 0 ? "#FFD700" : "#FF69B4"}
          frame={frame}
        />
      ))}

      {abcLetters.map((letter, i) => {
        const letterSpring = spring({
          frame: Math.max(0, frame - i * 8),
          fps,
          config: { damping: 5, mass: 1.2 },
        });
        const floatY = Math.sin((frame + i * 30) / 15) * 30;
        const floatX = Math.cos((frame + i * 20) / 20) * 40;
        const rotation = Math.sin((frame + i * 25) / 18) * 20;

        return (
          <div
            key={letter}
            style={{
              position: "absolute",
              left: 150 + i * 300 + floatX,
              top: 300 + floatY,
              fontSize: 250,
              fontWeight: 900,
              fontFamily: funFont,
              color: "rgba(255,255,255,0.3)",
              transform: `scale(${letterSpring}) rotate(${rotation}deg)`,
              textShadow: `0 0 60px rgba(255,255,255,0.4), 0 0 120px ${accentColor}33`,
            }}
          >
            {letter}
          </div>
        );
      })}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            fontFamily: funFont,
            color: "#FFFFFF",
            textAlign: "center",
            textShadow: `8px 8px 0 ${accentColor}, 0 0 60px rgba(255,255,255,0.6), 0 0 120px ${accentColor}44`,
            lineHeight: 1.2,
            padding: "0 40px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 50,
            fontSize: 70,
            fontWeight: 700,
            fontFamily: cleanFont,
            color: "#FFD700",
            textShadow: "3px 3px 0 rgba(0,0,0,0.4), 0 0 30px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3)",
            transform: `scale(${subtitleProgress})`,
            opacity: subtitleProgress,
          }}
        >
          Let's Learn!
        </div>
      </div>

      {Array.from({ length: 30 }).map((_, i) => {
        const cx = ((i * 137 + 50) % 1080);
        const cy = ((i * 193 + 100) % 1920);
        const confettiOpacity = interpolate(
          (frame + i * 7) % 50,
          [0, 15, 35, 50],
          [0, 1, 1, 0]
        );
        const colors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A8E6CF", "#FF69B4", "#88D8FF"];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx,
              top: cy + Math.sin((frame + i * 11) / 12) * 15,
              width: 14 + (i % 8),
              height: 14 + (i % 8),
              borderRadius: i % 3 === 0 ? "50%" : "2px",
              backgroundColor: colors[i % colors.length],
              opacity: confettiOpacity,
              transform: `rotate(${frame * 3 + i * 45}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Letter Scene - BIGGER emoji (600px) and letter (800px) + image support
// ---------------------------------------------------------------------------
const LetterScene: React.FC<{
  letter: string;
  word: string;
  emoji: string;
  imageUrl?: string;
  bgColor: string;
  accentColor: string;
  letterIndex: number;
  totalLetters: number;
  passNumber: number;
}> = ({ letter, word, emoji, imageUrl, bgColor, accentColor, letterIndex, totalLetters, passNumber }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const letterSpring = spring({
    frame,
    fps,
    config: { damping: 6, mass: 1.0, stiffness: 80 },
  });

  const emojiSpring = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 7, mass: 1.2, stiffness: 60 },
  });

  const wordSlide = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 12, mass: 0.8 },
  });

  const glowPulse = interpolate(
    Math.sin(frame / 8),
    [-1, 1],
    [20, 60]
  );

  const emojiFloat = Math.sin(frame / 12) * 20;

  const progress = (letterIndex + 1) / totalLetters;

  const sparkles = generateSparkles(15, letterIndex * 7 + passNumber * 100 + 13);
  const sideEmojis = generateSideEmojis(12, letterIndex * 11 + passNumber * 50 + 3);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${bgColor}CC 0%, ${bgColor} 40%, ${bgColor}EE 100%)`,
        overflow: "hidden",
      }}
    >
      {sparkles.map((s, i) => (
        <Sparkle
          key={i}
          x={s.x}
          y={s.y}
          size={s.size}
          delay={s.delay}
          color={i % 3 === 0 ? "#FFFFFF" : i % 3 === 1 ? "#FFD700" : accentColor}
          frame={frame}
        />
      ))}

      {sideEmojis.map((pos, i) => (
        <FloatingEmoji
          key={i}
          emoji={emoji}
          imageUrl={imageUrl}
          x={pos.x}
          y={pos.y}
          size={pos.size}
          frame={frame}
          delay={pos.delay}
        />
      ))}

      {/* TOP area: "A for" label - BIGGER */}
      <div
        style={{
          position: "absolute",
          top: 90,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 130,
            fontWeight: 700,
            fontFamily: cleanFont,
            color: "rgba(255,255,255,0.95)",
            textShadow: "4px 4px 8px rgba(0,0,0,0.4)",
            opacity: interpolate(frame, [0, 15], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {letter.toUpperCase()} for
        </div>
      </div>

      {/* CENTER: GIANT letter (800px) */}
      <div
        style={{
          position: "absolute",
          top: 170,
          width: "100%",
          height: 800,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 800,
            fontWeight: 900,
            fontFamily: funFont,
            color: "#FFFFFF",
            transform: `scale(${letterSpring})`,
            textShadow: `
              10px 10px 0 ${accentColor},
              20px 20px 0 rgba(0,0,0,0.2),
              0 0 ${glowPulse * 1.5}px rgba(255,255,255,0.5),
              0 0 ${glowPulse * 3}px ${accentColor}55
            `,
            lineHeight: 1,
          }}
        >
          {letter.toUpperCase()}
        </div>
      </div>

      {/* MIDDLE-BOTTOM: HUGE emoji/image (600px) */}
      <div
        style={{
          position: "absolute",
          top: 950 + emojiFloat,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {imageUrl ? (
          <div
            style={{
              transform: `scale(${emojiSpring})`,
              filter: `drop-shadow(0 18px 40px rgba(0,0,0,0.4))`,
            }}
          >
            <Img
              src={imageUrl}
              style={{
                width: 500,
                height: 500,
                objectFit: "contain",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              fontSize: 600,
              transform: `scale(${emojiSpring})`,
              lineHeight: 1,
              filter: `drop-shadow(0 18px 40px rgba(0,0,0,0.4))`,
            }}
          >
            {emoji}
          </div>
        )}
      </div>

      {/* BOTTOM: Word text - BIGGER */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 170,
            fontWeight: 900,
            fontFamily: cleanFont,
            color: "#FFFFFF",
            textShadow: `6px 6px 0 ${accentColor}, 0 0 40px rgba(0,0,0,0.4)`,
            transform: `translateY(${interpolate(wordSlide, [0, 1], [60, 0])}px)`,
            opacity: wordSlide,
          }}
        >
          {word}
        </div>
      </div>

      {/* Progress bar - BIGGER */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 60,
          right: 60,
          height: 20,
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            borderRadius: 10,
            background: `linear-gradient(90deg, #FFD700, ${accentColor}, #FF69B4)`,
            boxShadow: `0 0 10px ${accentColor}80`,
          }}
        />
      </div>

      {/* Letter counter badge - BIGGER */}
      <div
        style={{
          position: "absolute",
          top: 45,
          right: 45,
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: "rgba(255,255,255,0.2)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backdropFilter: "blur(10px)",
        }}
      >
        <span
          style={{
            fontSize: 40,
            fontWeight: 900,
            fontFamily: cleanFont,
            color: "#FFFFFF",
          }}
        >
          {letterIndex + 1}
        </span>
      </div>

      {/* Background confetti */}
      {Array.from({ length: 12 }).map((_, i) => {
        const confX = ((i * 157 + letterIndex * 37 + passNumber * 71) % 980) + 50;
        const confY = ((i * 211 + letterIndex * 53 + passNumber * 43) % 1800) + 60;
        const confOpacity = interpolate(
          (frame + i * 9) % 70,
          [0, 20, 50, 70],
          [0, 0.5, 0.5, 0]
        );
        const confColors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A8E6CF", "#FF69B4", "#88D8FF"];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: confX,
              top: confY + Math.sin((frame + i * 13) / 15) * 10,
              width: 12 + (i % 6),
              height: 12 + (i % 6),
              borderRadius: i % 2 === 0 ? "50%" : "2px",
              backgroundColor: confColors[i % confColors.length],
              opacity: confOpacity,
              transform: `rotate(${frame * 2 + i * 30}deg)`,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Outro Scene
// ---------------------------------------------------------------------------
const OutroScene: React.FC<{
  bgGradient: [string, string];
  accentColor: string;
  letters: AlphabetLongProps["letters"];
}> = ({ bgGradient, accentColor, letters }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const greatJobSpring = spring({
    frame,
    fps,
    config: { damping: 6, mass: 1.0 },
  });

  const subtitleSpring = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 10 },
  });

  const emojiIndex = Math.floor(frame / 3) % letters.length;
  const currentEmoji = letters[emojiIndex]?.emoji || "";

  const sparkles = generateSparkles(25, 99);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${bgGradient[0]}, ${bgGradient[1]})`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {sparkles.map((s, i) => (
        <Sparkle
          key={i}
          x={s.x}
          y={s.y}
          size={s.size}
          delay={s.delay}
          color={i % 2 === 0 ? "#FFD700" : "#FF69B4"}
          frame={frame}
        />
      ))}

      {Array.from({ length: 40 }).map((_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        const dist = interpolate(frame, [0, 30, 60], [0, 400, 500], {
          extrapolateRight: "clamp",
        });
        const cx = 540 + Math.cos(angle) * dist;
        const cy = 960 + Math.sin(angle) * dist;
        const confOpacity = interpolate(frame, [0, 10, 50, 90], [0, 1, 0.8, 0], {
          extrapolateRight: "clamp",
        });
        const confColors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A8E6CF", "#FF69B4", "#88D8FF", "#FFD700"];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: 14,
              height: 14,
              borderRadius: i % 2 === 0 ? "50%" : "2px",
              backgroundColor: confColors[i % confColors.length],
              opacity: confOpacity,
              transform: `rotate(${frame * 4 + i * 45}deg)`,
            }}
          />
        );
      })}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            fontFamily: funFont,
            color: "#FFFFFF",
            textShadow: `6px 6px 0 ${accentColor}, 0 0 50px rgba(255,255,255,0.6)`,
            transform: `scale(${greatJobSpring})`,
            textAlign: "center",
          }}
        >
          Great Job! {"\uD83C\uDF89"}
        </div>

        <div
          style={{
            fontSize: 150,
            lineHeight: 1,
            transform: `scale(${interpolate(frame % 3, [0, 1, 2], [1, 1.1, 1])})`,
          }}
        >
          {currentEmoji}
        </div>

        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            fontFamily: cleanFont,
            color: "#FFD700",
            textShadow: "3px 3px 0 rgba(0,0,0,0.4)",
            transform: `scale(${subtitleSpring})`,
            opacity: subtitleSpring,
            textAlign: "center",
          }}
        >
          A to Z Complete! {"\u2705"}
        </div>

        <div
          style={{
            marginTop: 60,
            fontSize: 56,
            fontWeight: 700,
            fontFamily: cleanFont,
            color: "rgba(255,255,255,0.9)",
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            opacity: interpolate(frame, [30, 50], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            textAlign: "center",
            padding: "0 60px",
          }}
        >
          Like & Subscribe for more!
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 20,
            opacity: interpolate(frame, [40, 60], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span style={{ fontSize: 70 }}>{"\uD83D\uDC4D"}</span>
          <span style={{ fontSize: 70 }}>{"\uD83D\uDD14"}</span>
          <span style={{ fontSize: 70 }}>{"\u2764\uFE0F"}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Main Component - with LOOPING support (2:00-2:50 duration range)
// ---------------------------------------------------------------------------
export const AlphabetLongTemplate: React.FC<AlphabetLongProps> = ({
  title,
  videoId,
  bgGradient,
  accentColor,
  letters,
  letterDuration = 3,
  introDuration = 3,
  outroDuration = 3,
  targetDuration = 150,
}) => {
  const { fps } = useVideoConfig();

  const introFrames = introDuration * fps;
  const letterFrames = letterDuration * fps;
  const outroFrames = outroDuration * fps;

  // Calculate how many letter slots we need to fill targetDuration
  const availableForLetters = targetDuration - introDuration - outroDuration;
  const totalLetterSlots = Math.floor(availableForLetters / letterDuration);
  const originalCount = letters.length;

  // Build the expanded letter sequence (looping)
  const expandedLetters: { item: typeof letters[0]; originalIndex: number; passNumber: number }[] = [];
  for (let i = 0; i < totalLetterSlots; i++) {
    const origIdx = i % originalCount;
    const pass = Math.floor(i / originalCount);
    expandedLetters.push({
      item: letters[origIdx],
      originalIndex: origIdx,
      passNumber: pass,
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background music */}
      <Audio src={staticFile(`${videoId}-audio/bgm.mp3`)} volume={0.3} />

      {/* Intro */}
      <Sequence from={0} durationInFrames={introFrames}>
        <IntroScene
          title={title}
          bgGradient={bgGradient}
          accentColor={accentColor}
        />
      </Sequence>

      {/* Letter scenes - looped */}
      {expandedLetters.map((entry, i) => (
        <Sequence
          key={i}
          from={introFrames + i * letterFrames}
          durationInFrames={letterFrames}
        >
          {/* Audio: reuse original letter audio via modulo */}
          <Audio src={staticFile(`${videoId}-audio/letter_${entry.originalIndex}.mp3`)} />
          <LetterScene
            letter={entry.item.letter}
            word={entry.item.word}
            emoji={entry.item.emoji}
            imageUrl={entry.item.imageUrl}
            bgColor={entry.item.bgColor}
            accentColor={accentColor}
            letterIndex={i}
            totalLetters={totalLetterSlots}
            passNumber={entry.passNumber}
          />
        </Sequence>
      ))}

      {/* Outro */}
      <Sequence
        from={introFrames + totalLetterSlots * letterFrames}
        durationInFrames={outroFrames}
      >
        <OutroScene
          bgGradient={bgGradient}
          accentColor={accentColor}
          letters={letters}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
