/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Wand2, 
  Upload, 
  Download, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  Ratio
} from 'lucide-react';

export default function ImageStudio() {
  const [prompt, setPrompt] = useState('High fashion bridal makeup with pearlescent highlighter, soft winged eyeliner, and satin rosewood lips on glass skin');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setBaseImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          baseImageBase64: baseImage || undefined,
          imageMimeType: 'image/jpeg'
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.statusText}`);
      }

      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        if (data.notice) setNotice(data.notice);
      } else {
        throw new Error(data.error || 'Failed to synthesize beauty look.');
      }
    } catch (err: any) {
      setError(err.message || 'Image generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 text-[#E6E5E4]">
      {/* Top Header */}
      <div className="p-6 rounded-3xl border border-[#221E16] bg-[#0F0D0A] space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#574D3C]/20 border border-[#574D3C]/40 text-[#E6E5E4] text-[10px] font-mono">
          <Wand2 className="h-3 w-3 text-accent-text" />
          <span>Gemini Flash Image · Create & Edit (gemini-3.1-flash-image-preview)</span>
        </div>

        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#E6E5E4]">
          AI Beauty Lookbook Studio
        </h2>

        <p className="text-xs sm:text-sm text-[#ADA69A] max-w-2xl leading-relaxed">
          Create bespoke editorial makeup designs from text prompts, or upload a portrait to edit specific facial features, smoky eyes, contouring, and lip finishes using Gemini.
        </p>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleGenerate} className="p-6 rounded-3xl border border-[#221E16] bg-[#0F0D0A] space-y-4 shadow-xl">
            {/* Mode selection / Optional Base Image */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-[#ADA69A]">
                  Base Face Reference (Optional for Editing)
                </label>
                {baseImage && (
                  <button
                    type="button"
                    onClick={() => setBaseImage(null)}
                    className="text-[10px] font-mono text-rose-400 hover:underline"
                  >
                    Clear base image
                  </button>
                )}
              </div>

              {baseImage ? (
                <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-[#3E3628] bg-black">
                  <img src={baseImage} alt="Base Face" className="h-full w-full object-cover" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-emerald-400 border border-emerald-500/40">
                    Editing Mode Active
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-accent-soft hover:border-accent-text bg-[#221E16] cursor-pointer transition-colors">
                  <Upload className="h-5 w-5 text-[#ADA69A] mb-1" />
                  <span className="text-[11px] font-mono text-[#E6E5E4]">Upload face or trial photo to edit</span>
                  <span className="text-[9px] font-mono text-[#968B78]">JPG, PNG under 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Prompt textarea */}
            <div>
              <label className="text-xs font-mono text-[#ADA69A] block mb-1.5">
                {baseImage ? 'Makeup Edit Instructions' : 'Couture Makeup Look Prompt'}
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={baseImage ? "e.g. Add bold cherry red satin lips and smoked wing eyeliner..." : "e.g. 2026 red carpet glam with blurred porcelain skin and soft taupe crease..."}
                className="w-full p-3.5 rounded-2xl border border-accent-soft bg-[#221E16] text-xs text-[#E6E5E4] placeholder-[#968B78] focus:border-accent-strong focus:outline-none"
              />
            </div>

            {/* Aspect Ratio Switcher */}
            <div>
              <label className="text-xs font-mono text-[#ADA69A] block mb-1.5">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['1:1', '9:16', '16:9'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer text-center ${
                      aspectRatio === ratio
                        ? 'bg-[#574D3C] border-[#574D3C] text-white font-bold'
                        : 'bg-[#221E16] border-[#221E16] text-[#ADA69A] hover:text-[#E6E5E4]'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Prompt Presets */}
            <div className="pt-2">
              <span className="text-[10px] font-mono uppercase text-[#968B78] block mb-1.5">
                Trending Aesthetics
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPrompt('Couture South Asian bridal glam with emerald jewel cut-crease, 3D lashes, and flawless velvet baking')}
                  className="text-[10px] font-mono bg-[#221E16] hover:bg-[#221E16] text-[#ADA69A] px-2.5 py-1 rounded-full border border-[#221E16]"
                >
                  South Asian Jewel Bridal
                </button>
                <button
                  type="button"
                  onClick={() => setPrompt('Clean girl glass skin aesthetic with laminated soap brows, dewy cheek flush, and glossy peptidic lips')}
                  className="text-[10px] font-mono bg-[#221E16] hover:bg-[#221E16] text-[#ADA69A] px-2.5 py-1 rounded-full border border-[#221E16]"
                >
                  Glass Skin & Soap Brow
                </button>
                <button
                  type="button"
                  onClick={() => setPrompt('Red carpet 4K airbrush matte complexion with sculpted cheekbones and nude cashmere ombré pout')}
                  className="text-[10px] font-mono bg-[#221E16] hover:bg-[#221E16] text-[#ADA69A] px-2.5 py-1 rounded-full border border-[#221E16]"
                >
                  Red Carpet Airbrush
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#574D3C] hover:bg-[#796D59] disabled:opacity-50 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Synthesizing Look...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-white" />
                  <span>{baseImage ? 'Apply AI Makeup Edits' : 'Synthesize Beauty Look'}</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3.5 rounded-2xl border border-rose-900/50 bg-rose-950/40 text-xs text-rose-300 flex items-center gap-2 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Output Display Column */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="p-6 rounded-3xl border border-[#221E16] bg-[#0F0D0A] min-h-[460px] flex flex-col items-center justify-center shadow-xl">
            {isGenerating ? (
              <div className="text-center space-y-4 p-8 max-w-sm">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-[#574D3C]/20 animate-ping" />
                  <div className="relative rounded-full h-full w-full bg-[#221E16] border-2 border-[#574D3C] flex items-center justify-center">
                    <Wand2 className="h-7 w-7 text-[#E6E5E4] animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-base text-[#E6E5E4]">
                    Gemini Flash Image Synthesizing
                  </h4>
                  <p className="text-xs text-[#ADA69A] font-mono">
                    Rendering micro-pigment foundation, lash symmetry, and soft lighting...
                  </p>
                </div>
              </div>
            ) : generatedImage ? (
              <div className="w-full space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-[#3E3628] bg-black max-h-[500px] flex items-center justify-center">
                  <img
                    src={generatedImage}
                    alt="Synthesized Beauty Look"
                    className="max-h-[500px] w-auto object-contain mx-auto"
                  />
                </div>

                {notice && (
                  <p className="text-[11px] font-mono text-[#E6E5E4] italic text-center">
                    {notice}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-[#ADA69A] px-2 font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Gemini 3.1 Flash Image Look Ready</span>
                  </span>

                  <a
                    href={generatedImage}
                    download="leish-couture-look.png"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#221E16] hover:bg-[#221E16] text-[#E6E5E4] border border-[#3E3628]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Save Look</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 p-8 text-[#968B78]">
                <ImageIcon className="h-12 w-12 mx-auto stroke-1" />
                <h4 className="font-serif text-base text-[#E6E5E4]">
                  No Look Synthesized Yet
                </h4>
                <p className="text-xs text-[#ADA69A] max-w-xs mx-auto">
                  Type your desired makeup look or upload a reference face on the left to create luxury beauty imagery with Gemini.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
