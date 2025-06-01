interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="flex items-center mb-4">
      {Array.from({ length: totalSteps }, (_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`flex-1 h-2 rounded ${
              index < currentStep ? "bg-medical-blue" : "bg-gray-200"
            }`}
          />
          {index < totalSteps - 1 && <div className="w-2" />}
        </div>
      ))}
    </div>
  );
}
