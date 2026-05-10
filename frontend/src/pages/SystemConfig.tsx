import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, GradientButton } from '../components/UI';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Settings, Save, RotateCcw, Shield, HardDrive, Laptop } from 'lucide-react';

const DEFAULTS = {
  gazeDeviationThresholdSeconds: 3,
  frameCaptureInterval: 2,
  maxConcurrentStudents: 100,
  evidenceRetentionDays: 90,
  maxExamDuration: 240
};

export default function SystemConfig() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'systemConfig', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data());
        } else {
          setConfig(DEFAULTS);
        }
      } catch (err) {
        toast.error("Failed to load configuration");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'systemConfig', 'global'), {
        ...config,
        updatedAt: serverTimestamp(),
        updatedBy: 'System Admin' // In a real app, use user name
      });
      toast.success("System configuration updated successfully!");
    } catch (err) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset all settings to system defaults?")) {
      setConfig(DEFAULTS);
      toast.info("Settings reset to defaults (not saved yet)");
    }
  };



  if (loading) return null;

  return (
    <Layout role="admin">
      <PageHeader 
        title="System Configuration" 
        subtitle="Fine-tune AI thresholds, system limits, and global proctoring policies." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Monitoring Settings */}
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="w-5 h-5 text-[#00B4D8]" />
              <h3 className="text-lg font-display font-bold text-white">Monitoring Thresholds</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-white/60">Gaze Deviation Threshold (seconds)</label>
                  <span className="text-[#00B4D8] font-bold">{config.gazeDeviationThresholdSeconds}s</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1"
                  value={config.gazeDeviationThresholdSeconds}
                  onChange={e => setConfig({ ...config, gazeDeviationThresholdSeconds: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#00B4D8]"
                />
              </div>



              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-white/60">Frame Capture Interval (seconds)</label>
                  <span className="text-[#00B4D8] font-bold">{config.frameCaptureInterval}s</span>
                </div>
                <input 
                  type="number"
                  value={config.frameCaptureInterval}
                  onChange={e => setConfig({ ...config, frameCaptureInterval: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#00B4D8]/30"
                />
              </div>
            </div>
          </GlassCard>


        </div>

        <div className="space-y-8">
          {/* System Limits */}
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <HardDrive className="w-5 h-5 text-[#00B4D8]" />
              <h3 className="text-lg font-display font-bold text-white">Infrastructure Limits</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60">Max Concurrent Students</label>
                <input 
                  type="number"
                  value={config.maxConcurrentStudents}
                  onChange={e => setConfig({ ...config, maxConcurrentStudents: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#00B4D8]/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60">Evidence Retention (Days)</label>
                <input 
                  type="number"
                  value={config.evidenceRetentionDays}
                  onChange={e => setConfig({ ...config, evidenceRetentionDays: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#00B4D8]/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60">Max Exam Duration (Minutes)</label>
                <input 
                  type="number"
                  value={config.maxExamDuration}
                  onChange={e => setConfig({ ...config, maxExamDuration: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#00B4D8]/30"
                />
              </div>
            </div>
          </GlassCard>

          {/* Action Card */}
          <GlassCard className="p-8 bg-[#00B4D8]/5 border-[#00B4D8]/10">
            <h3 className="text-lg font-display font-bold text-white mb-2">Save Changes</h3>
            <p className="text-sm text-white/40 mb-8">These changes will take effect immediately for all new exam sessions.</p>
            
            <div className="flex gap-4">
              <GradientButton 
                onClick={handleSave} 
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Settings</>}
              </GradientButton>
              <GradientButton 
                variant="secondary" 
                onClick={handleReset}
                className="flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </GradientButton>
            </div>
            
            {config.updatedAt && (
              <p className="mt-6 text-[10px] text-white/30 font-bold uppercase tracking-widest text-center">
                Last updated by {config.updatedBy} at {config.updatedAt?.toDate ? config.updatedAt.toDate().toLocaleString() : new Date(config.updatedAt).toLocaleString()}
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
}
