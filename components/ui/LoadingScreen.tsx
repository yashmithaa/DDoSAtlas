interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = "Loading DDoSAtlas...",
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-xl text-green-400">{message}</div>
    </div>
  );
}
