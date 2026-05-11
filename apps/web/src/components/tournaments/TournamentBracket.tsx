'use client';

import type { TournamentBracket as TournamentBracketType, BracketMatch } from '~/types/api';

interface TournamentBracketProps {
  bracket: TournamentBracketType;
  onMatchClick: (match: BracketMatch) => void;
}

const MATCH_CARD_WIDTH = 200;
const MATCH_CARD_HEIGHT = 80;
const ROUND_GAP = 80;
const MATCH_GAP = 20;

export function TournamentBracket({ bracket, onMatchClick }: TournamentBracketProps) {
  // Calculate layout
  const totalRounds = bracket.rounds.length;
  const bracketWidth = totalRounds * (MATCH_CARD_WIDTH + ROUND_GAP) + ROUND_GAP;

  // Calculate the SVG height based on the first round (largest)
  const firstRoundMatchCount = bracket.rounds[0]?.matches.length ?? 0;
  const svgHeight = firstRoundMatchCount * (MATCH_CARD_HEIGHT + MATCH_GAP) + MATCH_GAP * 2;

  // Calculate vertical position for a match in a given round
  const getMatchY = (roundIndex: number, matchIndex: number): number => {
    const matchesInRound = bracket.rounds[roundIndex]?.matches.length ?? 0;
    const roundHeight = matchesInRound * (MATCH_CARD_HEIGHT + MATCH_GAP) + MATCH_GAP;
    const availableHeight = svgHeight;

    // Center the matches vertically within the available height
    const totalMatchHeight = matchesInRound * MATCH_CARD_HEIGHT + (matchesInRound - 1) * MATCH_GAP;
    const topPadding = (availableHeight - totalMatchHeight) / 2;

    return topPadding + matchIndex * (MATCH_CARD_HEIGHT + MATCH_GAP);
  };

  // Calculate horizontal position for a round
  const getRoundX = (roundIndex: number): number => {
    return ROUND_GAP + roundIndex * (MATCH_CARD_WIDTH + ROUND_GAP);
  };

  return (
    <div className="overflow-x-auto">
      <svg
        width={bracketWidth}
        height={svgHeight}
        className="min-w-full"
        style={{ minWidth: `${bracketWidth}px` }}
      >
        {/* Draw connector lines first (behind match cards) */}
        {bracket.rounds.map((round, roundIndex) => {
          if (roundIndex >= totalRounds - 1) return null; // No connectors after last round

          const nextRound = bracket.rounds[roundIndex + 1];
          const currentMatches = round.matches;
          const nextMatches = nextRound?.matches ?? [];

          return currentMatches.map((match, matchIndex) => {
            const matchY = getMatchY(roundIndex, matchIndex);
            const matchX = getRoundX(roundIndex);

            // For each match, draw a line to the next round
            // Winner goes to position matchIndex / 2 in next round
            const nextMatchIndex = Math.floor(matchIndex / 2);
            const nextMatchY = getMatchY(roundIndex + 1, nextMatchIndex);
            const nextMatchX = getRoundX(roundIndex + 1);

            const startX = matchX + MATCH_CARD_WIDTH;
            const startY = matchY + MATCH_CARD_HEIGHT / 2;
            const endX = nextMatchX;
            const endY = nextMatchY + MATCH_CARD_HEIGHT / 2;

            // Determine which connector this is (top or bottom half)
            const isTopHalf = matchIndex % 2 === 0;

            return (
              <g key={`connector-${roundIndex}-${matchIndex}`}>
                {/* Main horizontal connector */}
                <path
                  d={`M ${startX} ${startY} L ${endX} ${startY}`}
                  stroke="#d1d5db"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Vertical line to next match */}
                <path
                  d={`M ${endX} ${startY} L ${endX} ${endY}`}
                  stroke="#d1d5db"
                  strokeWidth="2"
                  fill="none"
                />
              </g>
            );
          });
        })}

        {/* Draw match cards */}
        {bracket.rounds.map((round, roundIndex) => (
          <g key={`round-${roundIndex}`} className="round">
            {/* Round label */}
            <text
              x={getRoundX(roundIndex) + MATCH_CARD_WIDTH / 2}
              y={20}
              textAnchor="middle"
              className="fill-secondary-600 text-sm font-semibold"
            >
              {round.name}
            </text>

            {/* Matches */}
            {round.matches.map((match, matchIndex) => {
              const x = getRoundX(roundIndex);
              const y = getMatchY(roundIndex, matchIndex);
              const isBye = match.status === 'BYE';
              const isClickable = !isBye && match.status !== 'COMPLETED' && match.playerA !== null && match.playerB !== null;

              return (
                <g
                  key={`match-${roundIndex}-${matchIndex}`}
                  onClick={() => isClickable && onMatchClick(match)}
                  style={{ cursor: isClickable ? 'pointer' : 'default' }}
                >
                  {/* Match card background */}
                  <rect
                    x={x}
                    y={y}
                    width={MATCH_CARD_WIDTH}
                    height={MATCH_CARD_HEIGHT}
                    rx={8}
                    ry={8}
                    className={`
                      ${isBye ? 'fill-gray-200' : 'fill-white'}
                      ${isClickable ? 'stroke-primary-500 hover:fill-primary-50' : 'stroke-gray-300'}
                      stroke-2 transition-all duration-200
                    `}
                  />

                  {/* Bye indicator */}
                  {isBye && (
                    <text
                      x={x + MATCH_CARD_WIDTH / 2}
                      y={y + MATCH_CARD_HEIGHT / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-gray-500 text-sm font-medium"
                    >
                      BYE
                    </text>
                  )}

                  {/* Player A */}
                  <text
                    x={x + 10}
                    y={y + 24}
                    className={`text-sm font-medium ${match.winnerId && match.playerA ? (match.winnerId === match.playerA.userId ? 'fill-green-600' : 'fill-gray-400') : 'fill-gray-900'}`}
                  >
                    {match.playerA?.displayName ?? 'TBD'}
                  </text>
                  {match.playerA && (
                    <text
                      x={x + MATCH_CARD_WIDTH - 10}
                      y={y + 24}
                      textAnchor="end"
                      className="text-xs fill-secondary-500"
                    >
                      #{match.playerA.seedPosition}
                    </text>
                  )}

                  {/* Divider */}
                  <line
                    x1={x + 10}
                    y1={y + MATCH_CARD_HEIGHT / 2}
                    x2={x + MATCH_CARD_WIDTH - 10}
                    y2={y + MATCH_CARD_HEIGHT / 2}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />

                  {/* Player B */}
                  <text
                    x={x + 10}
                    y={y + MATCH_CARD_HEIGHT - 16}
                    className={`text-sm font-medium ${match.winnerId && match.playerB ? (match.winnerId === match.playerB.userId ? 'fill-green-600' : 'fill-gray-400') : 'fill-gray-900'}`}
                  >
                    {match.playerB?.displayName ?? 'TBD'}
                  </text>
                  {match.playerB && (
                    <text
                      x={x + MATCH_CARD_WIDTH - 10}
                      y={y + MATCH_CARD_HEIGHT - 16}
                      textAnchor="end"
                      className="text-xs fill-secondary-500"
                    >
                      #{match.playerB.seedPosition}
                    </text>
                  )}

                  {/* Score (if completed) */}
                  {match.score && match.score.length > 0 && (
                    <text
                      x={x + MATCH_CARD_WIDTH / 2}
                      y={y + MATCH_CARD_HEIGHT / 2 + 4}
                      textAnchor="middle"
                      className="text-xs fill-secondary-600 font-semibold"
                    >
                      {match.score.map((s) => s.points).join(' - ')}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
