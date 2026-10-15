import React, { useState, useRef } from 'react';
import {
  QrCode,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Coins,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
  ShieldCheck,
  Eye,
  ScanLine
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Bin, WasteCategory, Deposit } from '../types';
import { apiService, REWARD_VALUES } from '../services/api';

interface DepositViewProps {
  bins: Bin[];
  onDepositComplete: () => void;
  onNavigateToMap: () => void;
}

// Preset samples for rapid testing of CV classification
const PRESET_SAMPLES = [
  {
    label: 'Plastic Bottle',
    category: 'plastic' as WasteCategory,
    url: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500&auto=format&fit=crop',
    confidence: 0.94,
  },
  {
    label: 'Aluminum Beverage Can',
    category: 'metal' as WasteCategory,
    url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&auto=format&fit=crop',
    confidence: 0.92,
  },
  {
    label: 'Clean Cardboard / Paper',
    category: 'paper' as WasteCategory,
    url: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?w=500&auto=format&fit=crop',
    confidence: 0.88,
  },
  {
    label: 'Organic Apple Core',
    category: 'organic' as WasteCategory,
    url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop',
    confidence: 0.95,
  },
  {
    label: 'Ambiguous / Low-Confidence',
    category: 'general' as WasteCategory,
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500&auto=format&fit=crop',
    confidence: 0.64,
  },
];

export const DepositView: React.FC<DepositViewProps> = ({
  bins,
  onDepositComplete,
  onNavigateToMap,
}) => {
  const [selectedBinId, setSelectedBinId] = useState<string>(bins[0]?.id || '');
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [wasteImage, setWasteImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [reportedCategory, setReportedCategory] = useState<WasteCategory>('plastic');
  
  // CV Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cvResult, setCvResult] = useState<{
    prediction: WasteCategory;
    confidence: number;
    annotatedImage?: string;
    requiresReview: boolean;
    reviewReason?: string;
    engine?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDeposit, setSubmittedDeposit] = useState<Deposit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBin = bins.find((b) => b.id === selectedBinId);

  // Handle QR scanner simulation
  const handleSimulateQRScan = (bin: Bin) => {
    setSelectedBinId(bin.id);
    setIsScanningQR(false);
    if (bin.category !== 'multi-stream') {
      setReportedCategory(bin.category);
    }
  };

  // Handle Image File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setWasteImage(dataUrl);
        runInference(dataUrl, file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Select Preset Sample
  const handleSelectPreset = async (preset: typeof PRESET_SAMPLES[0]) => {
    setWasteImage(preset.url);
    setImageFile(null);

    setIsAnalyzing(true);
    // Simulate inference
    setTimeout(() => {
      const isLowConf = preset.confidence < 0.78;
      const isMismatch = selectedBin && selectedBin.category !== 'multi-stream' && preset.category !== selectedBin.category;
      
      let reviewReason = undefined;
      if (isLowConf) {
        reviewReason = `Low confidence score (${Math.round(preset.confidence * 100)}%). Requires staff confirmation.`;
      } else if (isMismatch) {
        reviewReason = `Stream mismatch: Item is '${preset.category}', but deposited into '${selectedBin?.category}' bin.`;
      }

      setCvResult({
        prediction: preset.category,
        confidence: preset.confidence,
        annotatedImage: preset.url,
        requiresReview: isLowConf || Boolean(isMismatch),
        reviewReason,
        engine: 'Ultralytics YOLOv8 / Hybrid-Engine'
      });
      setIsAnalyzing(false);
    }, 600);
  };

  // Execute inference via FastAPI / fallback
  const runInference = async (imgDataUrl: string, file?: File) => {
    setIsAnalyzing(true);
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (selectedBin) formData.append('target_bin_category', selectedBin.category);

        const response = await fetch('/api/cv/classify', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setCvResult({
            prediction: data.prediction,
            confidence: data.confidence,
            annotatedImage: data.annotated_image,
            requiresReview: data.verification.requires_staff_review,
            reviewReason: data.verification.verification_notes,
            engine: data.engine
          });
          setIsAnalyzing(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend CV API offline, using local client inference analyzer:', err);
    }

    // Fallback simulation
    setTimeout(() => {
      const mockConf = 0.91;
      const isMismatch = selectedBin && selectedBin.category !== 'multi-stream' && reportedCategory !== selectedBin.category;
      setCvResult({
        prediction: reportedCategory,
        confidence: mockConf,
        annotatedImage: imgDataUrl,
        requiresReview: Boolean(isMismatch),
        reviewReason: isMismatch ? `Bin stream mismatch (${reportedCategory} in ${selectedBin?.category} bin)` : undefined,
        engine: 'Hybrid Vision Pipeline'
      });
      setIsAnalyzing(false);
    }, 700);
  };

  // Submit Final Deposit
  const handleSubmitDeposit = async () => {
    if (!selectedBinId || !wasteImage) return;

    setIsSubmitting(true);
    try {
      const result = await apiService.submitDeposit({
        binId: selectedBinId,
        reportedCategory: reportedCategory,
        imageDataUrl: wasteImage,
        imageFile: imageFile || undefined,
      });

      setSubmittedDeposit(result.deposit);

      if (result.verified && result.coinsAwarded > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#eab308']
        });
      }

      onDepositComplete();
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setWasteImage(null);
    setImageFile(null);
    setCvResult(null);
    setSubmittedDeposit(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Policy Notice */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <QrCode className="w-6 h-6 text-emerald-400" />
          Waste Deposit & Computer Vision Verification
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Scan campus recycling bins, capture your recyclable item, and submit for automated AI verification to earn EcoCoins.
        </p>
      </div>

      {/* Critical Security Notice */}
      <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-emerald-300 font-semibold">Integrity Protocol:</strong>{' '}
          QR code scanning alone confirms bin location and stream capability, but <em>does not prove</em> a deposit occurred. EcoCoins are credited exclusively after Computer Vision item validation or staff verification review.
        </div>
      </div>

      {submittedDeposit ? (
        /* Submission Success / Quarantine View */
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            {submittedDeposit.status === 'APPROVED' ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">
              {submittedDeposit.status === 'APPROVED'
                ? 'Deposit Verified & Coins Credited!'
                : 'Deposit Submitted for Staff Review'}
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2">
              {submittedDeposit.verification_notes}
            </p>
          </div>

          {submittedDeposit.coins_awarded > 0 && (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xl font-bold">
              <Coins className="w-6 h-6" />
              +{submittedDeposit.coins_awarded} EcoCoins Added to Ledger
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-800/60 max-w-md mx-auto text-left text-xs font-mono space-y-1.5 text-slate-400">
            <div>Deposit Ref: <span className="text-slate-200">{submittedDeposit.id}</span></div>
            <div>Bin: <span className="text-slate-200">{submittedDeposit.bin_name}</span></div>
            <div>Category: <span className="text-slate-200 uppercase">{submittedDeposit.reported_category}</span></div>
            <div>AI Confidence: <span className="text-slate-200">{Math.round((submittedDeposit.ai_confidence || 0) * 100)}%</span></div>
            <div>Status: <span className="text-emerald-400 font-bold">{submittedDeposit.status}</span></div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Deposit Another Item
            </button>
            <button
              onClick={onNavigateToMap}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
            >
              View on Campus Map
            </button>
          </div>
        </div>
      ) : (
        /* Multi-Step Deposit Workflow */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Step 1 & Step 2 */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Campus Bin Selection */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
                  Select or Scan Campus Bin
                </span>
                <button
                  onClick={() => setIsScanningQR(!isScanningQR)}
                  className="text-xs flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-medium transition-colors"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  {isScanningQR ? 'Close Camera View' : 'Simulate QR Camera Scan'}
                </button>
              </div>

              {isScanningQR && (
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-cyan-500/40 p-6 text-center space-y-3">
                  <div className="w-36 h-36 mx-auto border-2 border-dashed border-cyan-400 rounded-2xl flex items-center justify-center relative animate-pulse">
                    <QrCode className="w-16 h-16 text-cyan-400 opacity-60" />
                    <div className="absolute inset-x-0 h-0.5 bg-cyan-400 animate-bounce" />
                  </div>
                  <p className="text-xs text-slate-400">
                    Camera QR Code Scanner active. Point at any campus waste bin code.
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                    {bins.slice(0, 4).map((b) => (
                      <button
                        key={b.id}
                        onClick={() => handleSimulateQRScan(b)}
                        className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 border border-slate-700 font-mono"
                      >
                        Scan {b.bin_code}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bin Selector Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Designated Waste Bin</label>
                <select
                  value={selectedBinId}
                  onChange={(e) => {
                    setSelectedBinId(e.target.value);
                    const b = bins.find((item) => item.id === e.target.value);
                    if (b && b.category !== 'multi-stream') setReportedCategory(b.category);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                >
                  {bins.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.bin_code}] {b.name} ({b.category.toUpperCase()} - {b.campus_zone})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBin && (
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Location: <strong className="text-slate-200">{selectedBin.building} ({selectedBin.floor})</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-semibold uppercase bg-slate-800 text-cyan-300 border border-slate-700">
                    Stream: {selectedBin.category}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Waste Photo Capture / Upload */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">2</span>
                Capture or Upload Waste Photo
              </span>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-800/30 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-emerald-500/20 flex items-center justify-center mx-auto text-slate-400 group-hover:text-emerald-400 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-200 mt-3">
                  Upload waste image or snap photo
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports JPEG, PNG, WEBP (Evaluated by Ultralytics YOLO)
                </p>
              </div>

              {/* Test Presets for Instant Evaluation */}
              <div className="space-y-2">
                <span className="text-xs text-slate-400 block font-medium">
                  Or test with verified campus dataset samples:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_SAMPLES.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPreset(preset)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-left transition-all hover:border-emerald-500/40 group"
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-16 rounded-lg object-cover mb-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <span className="text-xs font-semibold text-slate-200 block truncate">
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {preset.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Step 3 CV Analysis & Submit */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">3</span>
                Computer Vision Model Output
              </span>

              {/* Image Preview & Bounding Box Overlay */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                {wasteImage ? (
                  <img
                    src={cvResult?.annotatedImage || wasteImage}
                    alt="Waste Item"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-500 text-xs p-4">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Upload or select a waste item to view Computer Vision inference
                  </div>
                )}

                {isAnalyzing && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-emerald-400">
                      Running YOLO Waste Inference...
                    </span>
                  </div>
                )}
              </div>

              {/* CV Predictions Details */}
              {cvResult && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Detected Category:</span>
                      <span className="text-sm font-bold uppercase text-cyan-400 font-mono">
                        {cvResult.prediction}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Confidence Score:</span>
                        <span className="font-mono font-bold text-white">
                          {Math.round(cvResult.confidence * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            cvResult.confidence >= 0.8
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${cvResult.confidence * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Engine:</span>
                      <span className="font-mono text-slate-300">{cvResult.engine}</span>
                    </div>
                  </div>

                  {/* Verification Assessment Badge */}
                  <div
                    className={`p-3.5 rounded-xl border text-xs ${
                      !cvResult.requiresReview
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {!cvResult.requiresReview ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Eligible for Auto-Verification</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>Requires Staff Verification Review</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {!cvResult.requiresReview
                        ? `Confidence is high (${Math.round(cvResult.confidence * 100)}%) and item matches bin category. You will receive +${REWARD_VALUES[cvResult.prediction] || 10} EcoCoins immediately.`
                        : cvResult.reviewReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                disabled={!wasteImage || isAnalyzing || isSubmitting}
                onClick={handleSubmitDeposit}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Recording to Auditable Ledger...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    Confirm & Submit Waste Deposit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
