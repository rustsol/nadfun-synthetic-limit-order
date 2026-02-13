'use client';

interface Props {
  progress: string;
  isGraduated: boolean;
}

export function BondingCurveProgress({ progress, isGraduated }: Props) {
  const progressBps = parseInt(progress) || 0;
  const percent = Math.min(progressBps / 100, 100);

  if (isGraduated) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Bonding Curve</span>
          <span className="text-green-400">Graduated</span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Bonding Curve Progress</span>
        <span>{percent.toFixed(2)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-monad-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
