'use client';

import { useEffect, useRef } from 'react';

interface PlayerRatingCardProps {
  playerName: string;
  position: string;
  rating: number;
  teamRank?: number;
  teamTotal?: number;
  minutesPlayed?: number;
  age?: number;
  form?: string;
  series?: string;
  ratingChange?: number;
  clubName?: string;
  clubLogo?: string;
}

export default function PlayerRatingCard({
  playerName,
  position,
  rating,
  teamRank = 16,
  teamTotal = 17,
  minutesPlayed = 540,
  age = 22,
  form = 'Хорошая',
  series = '+3 матча',
  ratingChange = 1,
  clubName = 'Клуб',
  clubLogo,
}: PlayerRatingCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Очищаем canvas
    ctx.clearRect(0, 0, size, size);

    // Рисуем градиент круга
    const gradient = ctx.createConicGradient(0, size / 2, size / 2);
    gradient.addColorStop(0, '#a855f7'); // Purple
    gradient.addColorStop(0.25, '#06b6d4'); // Cyan
    gradient.addColorStop(0.5, '#a855f7');
    gradient.addColorStop(0.75, '#06b6d4');
    gradient.addColorStop(1, '#a855f7');

    // Внешний круг (полоса)
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 5, 0, Math.PI * 2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = gradient;
    ctx.stroke();

    // Белый круг внутри
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 15, 0, Math.PI * 2);
    ctx.fillStyle = '#1f2937'; // Dark bg
    ctx.fill();

    // Текст рейтинга
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(rating), size / 2, size / 2 - 10);

    // "OVR" текст
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText('OVR', size / 2, size / 2 + 25);
  }, [rating]);

  return (
    <div className="w-full max-w-md bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-purple-500/30 overflow-hidden hover:border-purple-400/50 transition-all duration-300">
      {/* Шапка с логотипом клуба */}
      <div className="bg-gradient-to-r from-purple-900/40 to-cyan-900/40 px-6 py-4 border-b border-purple-500/20 flex items-center gap-3">
        {clubLogo ? (
          <img
            src={clubLogo}
            alt={clubName}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">⚽</span>
          </div>
        )}
        <div>
          <h3 className="text-sm text-gray-400 font-medium">{clubName}</h3>
          <p className="text-xs text-gray-500">{clubName}</p>
        </div>
      </div>

      {/* Основной контент */}
      <div className="p-6">
        {/* Имя и позиция */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">{playerName}</h2>
          <p className="text-sm text-purple-300 font-semibold">{position}</p>
        </div>

        {/* Рейтинг с кругом */}
        <div className="flex justify-center mb-8">
          <div className="relative w-56 h-56 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="absolute inset-0"
            />
            <div className="relative z-10 text-center">
              <div className="text-5xl font-bold text-white mb-1">{rating}</div>
              <div className="text-xs text-gray-400 font-semibold">OVR</div>
              {ratingChange !== 0 && (
                <div className={`text-sm font-bold mt-2 flex items-center justify-center gap-1 ${ratingChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{ratingChange > 0 ? '▲' : '▼'}</span>
                  <span>{ratingChange > 0 ? '+' : ''}{ratingChange}</span>
                  <span className="text-xs">за матч</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 gap-4">
          {/* Место в команде */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⭐</span>
              <span className="text-xs text-gray-400 font-medium">Место в команде</span>
            </div>
            <div className="text-xl font-bold text-white">
              {teamRank} <span className="text-sm text-gray-400">из {teamTotal}</span>
            </div>
          </div>

          {/* Минуты сыграно */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⏱️</span>
              <span className="text-xs text-gray-400 font-medium">Минут сыграно</span>
            </div>
            <div className="text-xl font-bold text-white">{minutesPlayed}</div>
          </div>

          {/* Возраст */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">👤</span>
              <span className="text-xs text-gray-400 font-medium">Возраст</span>
            </div>
            <div className="text-xl font-bold text-white">{age} лет</div>
          </div>

          {/* Форма */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📊</span>
              <span className="text-xs text-gray-400 font-medium">Форма</span>
            </div>
            <div className="text-sm font-bold text-green-400">{form}</div>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Серия</p>
              <p className="text-sm font-semibold text-white">{series}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Последнее обновление</p>
              <p className="text-sm font-semibold text-gray-300">Сегодня</p>
            </div>
          </div>
        </div>
      </div>

      {/* Нижняя полоса */}
      <div className="h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500"></div>
    </div>
  );
}
